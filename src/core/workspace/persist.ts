import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { workspaceStore } from "./store";
import { type CreateWorkspaceSyncOptions, type WorkspaceSync, createWorkspaceSync } from "./sync";
import type { LeafState, WorkspaceState } from "./types";

const KEY_PREFIX = "granite.workspace.last.";
const SAVE_DEBOUNCE_MS = 500;
const DISK_CONFIG_NAME = "workspace";
const DISK_SCHEMA_VERSION = 2;

interface SerializedGroup {
  leaves: ReadonlyArray<LeafState>;
  activeIndex: number;
  stacked?: boolean;
}

interface SerializedColumnsSnapshot {
  shape: "columns";
  columns: ReadonlyArray<ReadonlyArray<SerializedGroup>>;
  activeGroupIndex: number;
}

interface SerializedLegacySnapshot {
  shape?: "legacy";
  groups: ReadonlyArray<SerializedGroup>;
  activeGroupIndex: number;
}

type SerializedSnapshot = SerializedColumnsSnapshot | SerializedLegacySnapshot;

/**
 * Disk-format envelope for `.granite/workspace.json`. The envelope adds a
 * version field and an `updatedMs` timestamp used by the cross-window sync
 * layer to reconcile concurrent writes ("disk wins if newer").
 *
 * The bare `SerializedSnapshot` is still accepted on read for backward
 * compatibility with any older disk files written before v2.
 */
interface DiskEnvelopeV2 {
  readonly version: 2;
  readonly updatedMs: number;
  /** Writer id of the window that produced this snapshot (for diagnostics). */
  readonly writerId?: string;
  readonly snapshot: SerializedSnapshot;
}

type DiskPayload = DiskEnvelopeV2 | SerializedSnapshot;

function isEnvelope(value: unknown): value is DiskEnvelopeV2 {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { version?: unknown }).version === DISK_SCHEMA_VERSION &&
    typeof (value as { updatedMs?: unknown }).updatedMs === "number" &&
    typeof (value as { snapshot?: unknown }).snapshot === "object"
  );
}

function extractSnapshot(payload: DiskPayload | null): {
  snapshot: SerializedSnapshot | null;
  updatedMs: number;
} {
  if (!payload) return { snapshot: null, updatedMs: 0 };
  if (isEnvelope(payload)) {
    return { snapshot: payload.snapshot, updatedMs: payload.updatedMs };
  }
  // Legacy bare-snapshot file (pre-envelope).
  return { snapshot: payload as SerializedSnapshot, updatedMs: 0 };
}

function snapshotState(state: WorkspaceState): SerializedColumnsSnapshot | null {
  const columns: SerializedGroup[][] = [];
  for (const col of state.columns) {
    const colGroups: SerializedGroup[] = [];
    for (const gid of col) {
      const group = state.groups.get(gid);
      if (!group) continue;
      const leaves: LeafState[] = [];
      let activeIndex = 0;
      let j = 0;
      for (const lid of group.leafIds) {
        const leaf = state.leaves.get(lid);
        if (!leaf) continue;
        leaves.push(leaf.state);
        if (lid === group.activeLeafId) activeIndex = j;
        j += 1;
      }
      if (leaves.length === 0) continue;
      const serialized: SerializedGroup = group.stacked
        ? { leaves, activeIndex, stacked: true }
        : { leaves, activeIndex };
      colGroups.push(serialized);
    }
    if (colGroups.length > 0) columns.push(colGroups);
  }
  if (columns.length === 0) return null;
  // Skip persisting a workspace that's just the initial single empty leaf.
  const onlyGroup = columns.length === 1 ? columns[0]?.[0] : null;
  if (
    columns.length === 1 &&
    columns[0]?.length === 1 &&
    onlyGroup?.leaves.length === 1 &&
    onlyGroup.leaves[0]?.type === "empty"
  ) {
    return null;
  }
  let flatIdx = 0;
  let activeGroupIndex = 0;
  for (const col of state.columns) {
    for (const gid of col) {
      if (gid === state.activeGroupId) activeGroupIndex = flatIdx;
      flatIdx += 1;
    }
  }
  return { shape: "columns", columns, activeGroupIndex };
}

let activeVaultId: string | null = null;
let unsub: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let beforeUnloadBound = false;
let activeSync: WorkspaceSync | null = null;
/**
 * Timestamp of the most-recent snapshot we either wrote or accepted from a
 * peer window. Used by the cross-window reconciliation: inbound updates with
 * an older timestamp are ignored (out-of-order delivery is harmless).
 */
let lastKnownUpdatedMs = 0;
/**
 * Suppress writing back the snapshot we just hydrated from a peer broadcast.
 * Without this guard, applying a peer snapshot would itself trigger our
 * subscriber, debounce a save, and re-broadcast — a feedback loop.
 */
let suppressPersistOnce = false;
/**
 * Set whenever the workspace store changes locally (i.e. NOT as a result of
 * applying a peer broadcast). Cleared on every `flushSave`. The flag is the
 * second leg of the loop-suppression guarantee: even if `flushSave` is
 * invoked manually (e.g. from `beforeunload` immediately after we just
 * applied a peer snapshot), it must NOT echo unless there's an actual
 * locally-originating change to broadcast.
 */
let dirtyForBroadcast = false;

function flushSave(): void {
  saveTimer = null;
  if (!activeVaultId) return;
  const snap = snapshotState(workspaceStore.getState());
  const key = KEY_PREFIX + activeVaultId;
  try {
    if (snap === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(snap));
  } catch {
    /* ignore (private mode etc.) */
  }
  if (snap === null) {
    // Leave any existing disk snapshot in place — clearing on transient
    // single-empty-leaf state risks losing a workspace mid-reset.
    dirtyForBroadcast = false;
    return;
  }
  if (!dirtyForBroadcast) {
    // No local change since the last broadcast — skip disk + broadcast to
    // avoid echoing a snapshot we just hydrated from a peer window.
    return;
  }
  const updatedMs = Date.now();
  lastKnownUpdatedMs = updatedMs;
  dirtyForBroadcast = false;
  const envelope: DiskEnvelopeV2 = {
    version: DISK_SCHEMA_VERSION,
    updatedMs,
    ...(activeSync ? { writerId: activeSync.writerId } : {}),
    snapshot: snap,
  };
  // Best-effort disk write. The FileSystem layer handles atomicity; failures
  // (e.g. no active vault yet, FS errors) are tolerable — the in-memory store
  // and localStorage cover the gap.
  void writeConfigJson(DISK_CONFIG_NAME, envelope).catch(() => {});
  if (activeSync) activeSync.postWorkspaceUpdated(snap, updatedMs);
}

export function flushWorkspacePersistence(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  flushSave();
}

function bindBeforeUnload(): void {
  if (beforeUnloadBound || typeof window === "undefined") return;
  window.addEventListener("beforeunload", flushWorkspacePersistence);
  beforeUnloadBound = true;
}

function unbindBeforeUnload(): void {
  if (!beforeUnloadBound || typeof window === "undefined") return;
  window.removeEventListener("beforeunload", flushWorkspacePersistence);
  beforeUnloadBound = false;
}

export interface BindPersistenceOptions {
  /**
   * Channel factory / writer-id / clock overrides for the cross-window
   * sync. Tests inject an in-process channel hub here so the feedback-loop
   * suppression can be exercised without a real `BroadcastChannel`.
   */
  readonly syncOptions?: CreateWorkspaceSyncOptions;
}

/**
 * Begin persisting the workspace for the given vault id. Subsequent calls
 * replace the previous binding. Returns a function that stops persistence.
 *
 * `options.syncOptions` lets callers (tests) inject a deterministic channel
 * factory; defaults to the real `BroadcastChannel`-backed implementation.
 */
export function bindPersistence(vaultId: string, options: BindPersistenceOptions = {}): () => void {
  if (unsub) unsub();
  if (saveTimer) clearTimeout(saveTimer);
  if (activeSync) {
    activeSync.close();
    activeSync = null;
  }
  saveTimer = null;
  activeVaultId = vaultId;
  lastKnownUpdatedMs = 0;
  dirtyForBroadcast = false;
  bindBeforeUnload();

  // Open the cross-window bus for this vault. Even if no listener is attached
  // we still broadcast workspace updates so other windows can react.
  activeSync = createWorkspaceSync(vaultId, options.syncOptions);
  // React to peer workspace updates: re-hydrate if newer than what we have.
  const unsubSync = activeSync.subscribe((message) => {
    if (message.type !== "workspaceUpdated") return;
    if (message.updatedMs <= lastKnownUpdatedMs) return;
    const snap = message.snapshot as SerializedSnapshot | null;
    if (!snap) return;
    lastKnownUpdatedMs = message.updatedMs;
    suppressPersistOnce = true;
    try {
      applySnapshot(snap);
    } finally {
      // The store.subscribe callback will run synchronously below this; the
      // flag is cleared there. As a safety net, also clear after a microtask.
      queueMicrotask(() => {
        suppressPersistOnce = false;
      });
    }
  });

  unsub = (() => {
    const storeUnsub = workspaceStore.subscribe(() => {
      if (!activeVaultId) return;
      if (suppressPersistOnce) {
        // Peer-broadcast apply: do NOT mark dirty, do NOT schedule a save.
        suppressPersistOnce = false;
        return;
      }
      dirtyForBroadcast = true;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    });
    return () => {
      storeUnsub();
      unsubSync();
    };
  })();

  return () => {
    flushWorkspacePersistence();
    if (unsub) unsub();
    unsub = null;
    if (activeSync) {
      activeSync.close();
      activeSync = null;
    }
    unbindBeforeUnload();
    activeVaultId = null;
    lastKnownUpdatedMs = 0;
    dirtyForBroadcast = false;
  };
}

function readLocalStorage(vaultId: string): SerializedSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + vaultId);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedSnapshot;
  } catch {
    return null;
  }
}

/**
 * Synchronous fallback: read from localStorage and apply. Used when the
 * caller can't await a disk read (e.g. legacy code paths). Newer code paths
 * should prefer `restoreForAsync` which checks disk first.
 */
export function restoreFor(vaultId: string): boolean {
  const snap = readLocalStorage(vaultId);
  if (!snap) return false;
  return applySnapshot(snap);
}

/**
 * Restore workspace state for `vaultId`. Disk is the authoritative source —
 * if a workspace.json envelope exists, we apply it and disregard localStorage
 * (because the envelope's `updatedMs` is by definition the most recent
 * persisted state across windows). localStorage stays as the synchronous fast
 * path used by `restoreFor` and as the migration source on first run.
 *
 * Migration semantics: when disk is missing but localStorage has content, we
 * write the localStorage snapshot to disk with `updatedMs = 0` so any
 * subsequent in-window edit (which stamps `Date.now()`) trumps it.
 *
 * Returns true if a snapshot was applied.
 */
export async function restoreForAsync(vaultId: string): Promise<boolean> {
  const local = readLocalStorage(vaultId);
  const onDisk = await readConfigJson<DiskPayload>(DISK_CONFIG_NAME);
  const { snapshot: diskSnap, updatedMs: diskMs } = extractSnapshot(onDisk);

  if (diskSnap) {
    lastKnownUpdatedMs = diskMs;
    const applied = applySnapshot(diskSnap);
    // Also mirror to localStorage so the next sync `restoreFor` shows the
    // disk content immediately.
    try {
      localStorage.setItem(KEY_PREFIX + vaultId, JSON.stringify(diskSnap));
    } catch {
      /* ignore */
    }
    return applied;
  }

  if (local) {
    const applied = applySnapshot(local);
    if (!applied) return false;
    // Migrate: stamp updatedMs=0 so a real in-window save will overwrite it.
    const envelope: DiskEnvelopeV2 = {
      version: DISK_SCHEMA_VERSION,
      updatedMs: 0,
      snapshot: local,
    };
    await writeConfigJson(DISK_CONFIG_NAME, envelope).catch(() => {});
    lastKnownUpdatedMs = 0;
    return true;
  }

  return false;
}

function applySnapshot(snap: SerializedSnapshot): boolean {
  if ("columns" in snap && Array.isArray(snap.columns) && snap.columns.length > 0) {
    return workspaceStore.hydrate({
      shape: "columns",
      columns: snap.columns,
      activeGroupIndex: snap.activeGroupIndex,
    });
  }
  if ("groups" in snap && Array.isArray(snap.groups) && snap.groups.length > 0) {
    return workspaceStore.hydrate({
      shape: "legacy",
      groups: snap.groups,
      activeGroupIndex: snap.activeGroupIndex,
    });
  }
  return false;
}

/** Drop the persisted workspace for the given vault id (both locations). */
export function clearPersistedFor(vaultId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + vaultId);
  } catch {
    /* ignore */
  }
  void (async () => {
    try {
      const { removeConfigJson } = await import("@core/vault/granite-config");
      await removeConfigJson(DISK_CONFIG_NAME);
    } catch {
      /* ignore */
    }
  })();
}
