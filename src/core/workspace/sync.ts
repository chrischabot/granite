/**
 * Cross-window vault state synchronization.
 *
 * Each window that opens a given vault gets its own BroadcastChannel keyed by
 * vault id. Writers (persistWorkspace, settings save, metadata invalidation,
 * active-leaf changes) `post*` a message; other windows that have
 * `subscribe()`d receive it and may react (e.g. re-hydrate workspace state if
 * the inbound update is newer than the local one).
 *
 * Reconciliation is timestamp-based on `updatedMs`: each window stamps its
 * outbound messages with `Date.now()`. A subscriber compares the inbound
 * timestamp to its own last-known timestamp and ignores stale messages, which
 * lets us tolerate out-of-order delivery without losing the latest snapshot.
 *
 * A unique `writerId` is generated per-channel instance so a window can ignore
 * its own broadcasts ("send-to-self guard") — required because the spec
 * doesn't broadcast to the sending context but tests that simulate two
 * channels in the same realm need an explicit guard.
 */
export type WorkspaceSyncSnapshot = unknown;

export interface WorkspaceUpdatedMessage {
  readonly type: "workspaceUpdated";
  readonly writerId: string;
  readonly updatedMs: number;
  readonly snapshot: WorkspaceSyncSnapshot;
}

export interface SettingsUpdatedMessage {
  readonly type: "settingsUpdated";
  readonly writerId: string;
  readonly updatedMs: number;
}

export interface MetadataInvalidatedMessage {
  readonly type: "metadataInvalidated";
  readonly writerId: string;
  readonly updatedMs: number;
  readonly paths: ReadonlyArray<string>;
}

export interface ActiveLeafChangedMessage {
  readonly type: "activeLeafChanged";
  readonly writerId: string;
  readonly updatedMs: number;
  readonly leafId: string | null;
}

export type WorkspaceSyncMessage =
  | WorkspaceUpdatedMessage
  | SettingsUpdatedMessage
  | MetadataInvalidatedMessage
  | ActiveLeafChangedMessage;

export type WorkspaceSyncListener = (message: WorkspaceSyncMessage) => void;

/**
 * Minimal subset of `BroadcastChannel` we actually use. Defined so callers can
 * inject an in-process channel impl from tests.
 */
export interface SyncChannel {
  postMessage(data: unknown): void;
  addEventListener(type: "message", handler: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", handler: (event: MessageEvent) => void): void;
  close(): void;
}

export interface WorkspaceSync {
  readonly writerId: string;
  readonly vaultId: string;
  postWorkspaceUpdated(snapshot: WorkspaceSyncSnapshot, updatedMs?: number): void;
  postSettingsUpdated(updatedMs?: number): void;
  postMetadataInvalidated(paths: ReadonlyArray<string>, updatedMs?: number): void;
  postActiveLeafChanged(leafId: string | null, updatedMs?: number): void;
  subscribe(listener: WorkspaceSyncListener): () => void;
  close(): void;
}

export function channelNameFor(vaultId: string): string {
  return `granite:vault:${vaultId}`;
}

function defaultChannelFactory(name: string): SyncChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(name) as unknown as SyncChannel;
  } catch {
    return null;
  }
}

let writerCounter = 0;
function freshWriterId(): string {
  writerCounter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `w-${rand}-${writerCounter.toString(36)}-${Date.now().toString(36)}`;
}

export interface CreateWorkspaceSyncOptions {
  /** Override the channel factory (tests inject an in-process channel). */
  readonly channelFactory?: (name: string) => SyncChannel | null;
  /** Override writer id (tests). */
  readonly writerId?: string;
  /** Override clock (tests). */
  readonly now?: () => number;
}

export function createWorkspaceSync(
  vaultId: string,
  options: CreateWorkspaceSyncOptions = {},
): WorkspaceSync {
  const factory = options.channelFactory ?? defaultChannelFactory;
  const writerId = options.writerId ?? freshWriterId();
  const now = options.now ?? (() => Date.now());
  const channel = factory(channelNameFor(vaultId));
  const listeners = new Set<WorkspaceSyncListener>();

  const onMessage = (event: MessageEvent) => {
    const data = event.data as WorkspaceSyncMessage | null;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;
    // Send-to-self guard: required because in-process test channels relay to
    // the sender, and even real BC implementations can in theory deliver to
    // the same realm in unusual configurations.
    if (data.writerId === writerId) return;
    for (const listener of listeners) {
      try {
        listener(data);
      } catch {
        /* swallow listener errors so one bad subscriber doesn't kill the bus */
      }
    }
  };

  channel?.addEventListener("message", onMessage);

  function post(message: WorkspaceSyncMessage): void {
    if (!channel) return;
    try {
      channel.postMessage(message);
    } catch {
      /* private mode / detached document — silently drop */
    }
  }

  return {
    writerId,
    vaultId,
    postWorkspaceUpdated(snapshot, updatedMs) {
      post({
        type: "workspaceUpdated",
        writerId,
        updatedMs: updatedMs ?? now(),
        snapshot,
      });
    },
    postSettingsUpdated(updatedMs) {
      post({
        type: "settingsUpdated",
        writerId,
        updatedMs: updatedMs ?? now(),
      });
    },
    postMetadataInvalidated(paths, updatedMs) {
      post({
        type: "metadataInvalidated",
        writerId,
        updatedMs: updatedMs ?? now(),
        paths: [...paths],
      });
    },
    postActiveLeafChanged(leafId, updatedMs) {
      post({
        type: "activeLeafChanged",
        writerId,
        updatedMs: updatedMs ?? now(),
        leafId,
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      listeners.clear();
      channel?.removeEventListener("message", onMessage);
      channel?.close();
    },
  };
}

/**
 * In-process channel hub for tests: simulates two BroadcastChannel endpoints
 * sharing a name within the same realm. Each `connect()` call returns a fresh
 * channel; calling `postMessage` on one delivers to all *other* channels on
 * the same name asynchronously (queued microtask), matching real BC semantics
 * where the sender does NOT receive its own message.
 */
export interface InProcessChannelHub {
  factory: (name: string) => SyncChannel;
  flush: () => Promise<void>;
  /** Total messages posted to `name`, across all senders, since hub creation. */
  postCount: (name: string) => number;
  /** Snapshot of all messages posted to `name`, in post order. */
  log: (name: string) => ReadonlyArray<{ readonly from: string; readonly data: unknown }>;
}

export function createInProcessChannelHub(): InProcessChannelHub {
  const channels = new Map<string, Set<InProcessChannel>>();
  const pending: Array<() => void> = [];
  const logs = new Map<string, Array<{ from: string; data: unknown }>>();

  class InProcessChannel implements SyncChannel {
    private handlers = new Set<(event: MessageEvent) => void>();
    private closed = false;
    public readonly senderId: string;
    constructor(public readonly name: string) {
      this.senderId = `c-${Math.random().toString(36).slice(2, 10)}`;
      const set = channels.get(name) ?? new Set();
      set.add(this);
      channels.set(name, set);
    }
    postMessage(data: unknown): void {
      if (this.closed) return;
      // Record every post to a global log so tests can count broadcasts
      // (and prove the suppress guard prevents an echo loop).
      const cloned = JSON.parse(JSON.stringify(data));
      const log = logs.get(this.name) ?? [];
      log.push({ from: this.senderId, data: cloned });
      logs.set(this.name, log);

      const peers = channels.get(this.name);
      if (!peers) return;
      // Snapshot peers at post time; deliver to everyone except sender.
      const recipients = [...peers].filter((c) => c !== this && !c.closed);
      for (const peer of recipients) {
        pending.push(() => {
          if (peer.closed) return;
          const ev = { data: cloned } as unknown as MessageEvent;
          for (const h of peer.handlers) h(ev);
        });
      }
    }
    addEventListener(_type: "message", handler: (event: MessageEvent) => void): void {
      this.handlers.add(handler);
    }
    removeEventListener(_type: "message", handler: (event: MessageEvent) => void): void {
      this.handlers.delete(handler);
    }
    close(): void {
      this.closed = true;
      this.handlers.clear();
      channels.get(this.name)?.delete(this);
    }
  }

  return {
    factory: (name) => new InProcessChannel(name),
    flush: async () => {
      while (pending.length > 0) {
        const next = pending.shift();
        next?.();
        await Promise.resolve();
      }
    },
    postCount: (name) => logs.get(name)?.length ?? 0,
    log: (name) => logs.get(name) ?? [],
  };
}
