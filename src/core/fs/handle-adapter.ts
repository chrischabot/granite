import { Effect } from "effect";
import { t } from "../i18n";
import type { FileSystemImpl, FsWatchControl } from "./FileSystem";
import { type NativeSystemTrashBridge, detectNativeSystemTrashBridge } from "./native-trash";
import { basename, dirname, extension } from "./path";
import {
  FsAccessDenied,
  type FsError,
  type FsEvent,
  FsIoError,
  FsNotFound,
  type VaultDirectory,
  type VaultEntry,
  type VaultFile,
  type VaultPath,
} from "./types";

interface ResolvedFile {
  parent: FileSystemDirectoryHandle;
  name: string;
  handle: FileSystemFileHandle;
}

interface ResolvedDir {
  parent: FileSystemDirectoryHandle | null;
  name: string;
  handle: FileSystemDirectoryHandle;
}

export type FileSystemCapabilityErrorCode =
  | "fsa-unavailable"
  | "fsa-permission-denied"
  | "opfs-unavailable";

export class FileSystemCapabilityError extends Error {
  readonly code: FileSystemCapabilityErrorCode;

  constructor(code: FileSystemCapabilityErrorCode) {
    super(code);
    this.name = "FileSystemCapabilityError";
    this.code = code;
  }
}

export function isFileSystemCapabilityError(err: unknown): err is FileSystemCapabilityError {
  return err instanceof FileSystemCapabilityError;
}

/**
 * Walk the segments of `path` from `root`, returning the deepest existing
 * handle, or null if any segment is missing. `kind` filters the final segment.
 */
async function resolvePath(
  root: FileSystemDirectoryHandle,
  path: VaultPath,
  kind: "file" | "directory" | "any" = "any",
): Promise<ResolvedFile | ResolvedDir | null> {
  if (path === "") {
    return { parent: null, name: root.name, handle: root };
  }
  const segments = path.split("/");
  const last = segments.pop();
  if (!last) return null;
  let current: FileSystemDirectoryHandle = root;
  for (const seg of segments) {
    try {
      current = await current.getDirectoryHandle(seg);
    } catch {
      return null;
    }
  }
  if (kind === "any" || kind === "directory") {
    try {
      const handle = await current.getDirectoryHandle(last);
      return { parent: current, name: last, handle };
    } catch {
      if (kind === "directory") return null;
    }
  }
  if (kind === "any" || kind === "file") {
    try {
      const handle = await current.getFileHandle(last);
      return { parent: current, name: last, handle };
    } catch {
      return null;
    }
  }
  return null;
}

async function ensureDir(
  root: FileSystemDirectoryHandle,
  path: VaultPath,
): Promise<FileSystemDirectoryHandle> {
  if (path === "") return root;
  let current: FileSystemDirectoryHandle = root;
  for (const seg of path.split("/")) {
    current = await current.getDirectoryHandle(seg, { create: true });
  }
  return current;
}

async function* iterDir(
  handle: FileSystemDirectoryHandle,
  parentPath: VaultPath,
): AsyncGenerator<{ entry: VaultEntry; child: FileSystemHandle }> {
  for await (const child of handle.values()) {
    const path = parentPath ? `${parentPath}/${child.name}` : child.name;
    if (child.kind === "directory") {
      const entry: VaultDirectory = {
        type: "directory",
        path,
        name: child.name,
      };
      yield { entry, child };
    } else {
      try {
        const file = await (child as FileSystemFileHandle).getFile();
        const entry: VaultFile = {
          type: "file",
          path,
          name: child.name,
          size: file.size,
          mtimeMs: file.lastModified,
          ctimeMs: file.lastModified,
          extension: extension(path),
        };
        yield { entry, child };
      } catch {
        // Skip files we cannot stat.
      }
    }
  }
}

function adaptError(path: VaultPath, err: unknown): FsError {
  if (err instanceof FsNotFound || err instanceof FsAccessDenied || err instanceof FsIoError) {
    return err;
  }
  if (err instanceof DOMException) {
    if (err.name === "NotFoundError") return new FsNotFound({ path });
    if (err.name === "NotAllowedError") {
      return new FsAccessDenied({ path, reason: err.message });
    }
  }
  return new FsIoError({ path, cause: err });
}

export interface HandleAdapterOptions {
  /** Folders to skip during listAll (e.g. `.granite`, `node_modules`). */
  readonly skipDirs?: ReadonlyArray<string>;
  /** Folders to skip while polling for watch events. Defaults keep hidden app data observable. */
  readonly watchSkipDirs?: ReadonlyArray<string>;
  /** Polling interval for the watcher in ms. */
  readonly pollIntervalMs?: number;
  /**
   * Native host bridge for OS trash. Browser FSA does not expose absolute
   * paths or recycle-bin APIs, so this must be supplied by a trusted host.
   */
  readonly systemTrash?: NativeSystemTrashBridge | null;
}

const DEFAULT_SKIP = [".granite", ".git", "node_modules"] as const;
const DEFAULT_WATCH_SKIP = [".git", "node_modules"] as const;
export const DEFAULT_WATCH_POLL_INTERVAL_MS = 200;
/**
 * Idle backoff parameters: after this many consecutive empty polls the
 * watcher multiplies the next-tick delay by {@link WATCH_BACKOFF_FACTOR}
 * up to {@link WATCH_BACKOFF_MAX_MS}. Any diff resets the interval.
 */
export const WATCH_BACKOFF_IDLE_TICKS = 5;
export const WATCH_BACKOFF_FACTOR = 1.5;
export const WATCH_BACKOFF_MAX_MS = 2000;

/**
 * Module-wide registry of active watch controls. A single
 * `document.visibilitychange` listener pauses every active watcher when the
 * tab is hidden and resumes them all when it becomes visible again. This
 * keeps idle-tab CPU at zero without each consumer wiring its own listener.
 *
 * The listener installs lazily on the first registration and is left in
 * place — adding/removing handles is O(1) and the listener cost is one
 * boolean check per visibility transition.
 */
const activeWatchControls = new Set<FsWatchControl>();
let visibilityListenerInstalled = false;

function pauseAllWatchers(): void {
  for (const c of activeWatchControls) c.pause?.();
}

function resumeAllWatchers(): void {
  for (const c of activeWatchControls) c.resume?.();
}

function ensureVisibilityListener(): void {
  if (visibilityListenerInstalled) return;
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
  visibilityListenerInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseAllWatchers();
    else resumeAllWatchers();
  });
}

/** Test helper — returns the live registry so unit tests can assert
 *  pause/resume behaviour without simulating real DOM events. Exported only
 *  because the registry would otherwise be wholly module-private. */
export function _peekActiveWatchControls(): ReadonlySet<FsWatchControl> {
  return activeWatchControls;
}

export function handleAdapter(
  root: FileSystemDirectoryHandle,
  opts: HandleAdapterOptions = {},
): FileSystemImpl {
  const skipDirs = new Set([...DEFAULT_SKIP, ...(opts.skipDirs ?? [])]);
  const watchSkipDirs = new Set([...DEFAULT_WATCH_SKIP, ...(opts.watchSkipDirs ?? [])]);
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_WATCH_POLL_INTERVAL_MS;
  const systemTrash = opts.systemTrash ?? detectNativeSystemTrashBridge();

  const listImpl = (dir: VaultPath) =>
    Effect.tryPromise({
      try: async (): Promise<ReadonlyArray<VaultEntry>> => {
        const resolved = await resolvePath(root, dir, "directory");
        if (!resolved) throw new FsNotFound({ path: dir });
        if (resolved.handle.kind !== "directory") throw new FsNotFound({ path: dir });
        const entries: VaultEntry[] = [];
        for await (const item of iterDir(resolved.handle, dir)) {
          entries.push(item.entry);
        }
        entries.sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return entries;
      },
      catch: (err) => (err instanceof FsNotFound ? err : adaptError(dir, err)),
    });

  const listAllImpl = (filterOpts?: { readonly extensions?: ReadonlyArray<string> }) =>
    Effect.tryPromise({
      try: async (): Promise<ReadonlyArray<VaultFile>> => {
        const out: VaultFile[] = [];
        const allow = filterOpts?.extensions
          ? new Set(filterOpts.extensions.map((e) => e.toLowerCase()))
          : null;

        async function walk(handle: FileSystemDirectoryHandle, parentPath: VaultPath) {
          for await (const item of iterDir(handle, parentPath)) {
            if (item.entry.type === "directory") {
              if (skipDirs.has(item.entry.name)) continue;
              await walk(item.child as FileSystemDirectoryHandle, item.entry.path);
            } else if (!allow || allow.has(item.entry.extension)) {
              out.push(item.entry);
            }
          }
        }
        await walk(root, "");
        return out;
      },
      catch: (err) => adaptError("", err),
    });

  const readTextImpl = (path: VaultPath) =>
    Effect.tryPromise({
      try: async (): Promise<string> => {
        const resolved = await resolvePath(root, path, "file");
        if (!resolved) throw new FsNotFound({ path });
        const file = await (resolved.handle as FileSystemFileHandle).getFile();
        return await file.text();
      },
      catch: (err) => (err instanceof FsNotFound ? err : adaptError(path, err)),
    });

  const readBytesImpl = (path: VaultPath) =>
    Effect.tryPromise({
      try: async (): Promise<Uint8Array> => {
        const resolved = await resolvePath(root, path, "file");
        if (!resolved) throw new FsNotFound({ path });
        const file = await (resolved.handle as FileSystemFileHandle).getFile();
        return new Uint8Array(await file.arrayBuffer());
      },
      catch: (err) => (err instanceof FsNotFound ? err : adaptError(path, err)),
    });

  /**
   * Atomic write: never-lose-the-original protocol.
   *
   * 1. Write payload to a `<name>.granite-tmp~` sibling and close it (the
   *    Writable's close() flushes durably on the FSA backing store).
   * 2. If the underlying FileSystemFileHandle exposes `move(parent, name)`
   *    (Chrome 110+ FSA), use it: that's an atomic rename-replace and the
   *    original target either remains untouched or has been swapped for the
   *    new content -- never a torn middle state.
   * 3. Otherwise fall back to a marker-driven copy: write a small
   *    `<name>.granite-commit~` marker that names the tmp and its expected
   *    size, *then* copy bytes into the target. The marker lets startup
   *    recovery (see {@link recoverPendingAtomicWrite}) replay the copy if
   *    the process died after the marker was written but before the target
   *    was complete. The target is only created/overwritten while the
   *    marker is in place — so a crash leaves either the old target intact
   *    or a marker that recovery can finish.
   */
  async function atomicWrite(path: VaultPath, payload: string | Uint8Array) {
    if (!path) throw new FsAccessDenied({ path, reason: t("fs.error.emptyPath") });
    const dir = dirname(path);
    const name = basename(path);
    const parent = await ensureDir(root, dir);
    const tmpName = `${name}.granite-tmp~`;
    const markerName = `${name}.granite-commit~`;
    const bytes =
      typeof payload === "string" ? new TextEncoder().encode(payload) : Uint8Array.from(payload);

    // Step 1: stage payload into tmp sibling. Use a fresh handle so leftovers
    // from a previous interrupted save are fully truncated.
    try {
      await parent.removeEntry(tmpName);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "NotFoundError")) throw err;
    }
    const tmpHandle = await parent.getFileHandle(tmpName, { create: true });
    const tmpW = await tmpHandle.createWritable();
    // FileSystemWriteChunkType expects BufferSource | Blob | string. Cast
    // through unknown to bypass the ArrayBuffer/SharedArrayBuffer variance
    // strictness in the latest DOM lib types.
    await tmpW.write(bytes as unknown as BufferSource);
    await tmpW.close();

    // Step 2: prefer atomic rename if the platform supports it.
    const moveCapable = tmpHandle as FileSystemFileHandle & {
      move?: (parent: FileSystemDirectoryHandle, name: string) => Promise<void>;
    };
    if (typeof moveCapable.move === "function") {
      await moveCapable.move(parent, name);
      // No marker was ever written in this branch; tmp is now the target.
      return;
    }

    // Step 3: fall back to copy-with-marker. Marker is written before any
    // mutation of the target, so recovery can finish or roll back cleanly.
    const markerBody = JSON.stringify({
      v: 1,
      tmp: tmpName,
      target: name,
      size: bytes.byteLength,
    });
    const markerHandle = await parent.getFileHandle(markerName, { create: true });
    const markerW = await markerHandle.createWritable();
    await markerW.write(markerBody);
    await markerW.close();

    const target = await parent.getFileHandle(name, { create: true });
    const targetW = await target.createWritable();
    await targetW.write(bytes as unknown as BufferSource);
    await targetW.close();

    // Commit point: target now holds the new bytes. Remove marker first, then
    // tmp. If we crash between these two, recovery sees no marker and treats
    // the tmp as a harmless orphan to discard.
    try {
      await parent.removeEntry(markerName);
    } catch {
      /* marker may have been swept */
    }
    try {
      await parent.removeEntry(tmpName);
    } catch {
      /* tmp may have been swept */
    }
  }

  const writeTextImpl = (path: VaultPath, content: string) =>
    Effect.tryPromise({
      try: () => atomicWrite(path, content),
      catch: (err) => adaptError(path, err),
    });

  const writeBytesImpl = (path: VaultPath, bytes: Uint8Array) =>
    Effect.tryPromise({
      try: () => atomicWrite(path, bytes),
      catch: (err) => adaptError(path, err),
    });

  const mkdirImpl = (dir: VaultPath) =>
    Effect.tryPromise({
      try: async () => {
        await ensureDir(root, dir);
      },
      catch: (err) => adaptError(dir, err),
    });

  const removeImpl = (path: VaultPath) =>
    Effect.tryPromise({
      try: async () => {
        const dir = dirname(path);
        const name = basename(path);
        const parent = (await resolvePath(root, dir, "directory"))?.handle as
          | FileSystemDirectoryHandle
          | undefined;
        if (!parent) throw new FsNotFound({ path });
        await parent.removeEntry(name, { recursive: true });
      },
      catch: (err) => (err instanceof FsNotFound ? err : adaptError(path, err)),
    });

  const moveToSystemTrashImpl = systemTrash
    ? (path: VaultPath) =>
        Effect.tryPromise({
          try: () => Promise.resolve(systemTrash.moveToSystemTrash({ rootName: root.name, path })),
          catch: (err) => adaptError(path, err),
        })
    : undefined;

  const renameImpl = (from: VaultPath, to: VaultPath) =>
    Effect.tryPromise({
      try: async () => {
        const fromResolved = await resolvePath(root, from, "any");
        if (!fromResolved) throw new FsNotFound({ path: from });
        if (fromResolved.handle.kind === "directory") {
          // FSA has no native directory rename. Recursive copy+delete is
          // tracked in todo.md.
          throw new FsAccessDenied({
            path: from,
            reason: t("fs.error.directoryRenameUnsupported"),
          });
        }
        const file = await (fromResolved.handle as FileSystemFileHandle).getFile();
        const buf = await file.arrayBuffer();
        await atomicWrite(to, new Uint8Array(buf));
        const fromDir = dirname(from);
        const parent = (await resolvePath(root, fromDir, "directory"))?.handle as
          | FileSystemDirectoryHandle
          | undefined;
        if (parent) {
          try {
            await parent.removeEntry(basename(from));
          } catch {
            /* dest is written, original is now stale — best effort */
          }
        }
      },
      catch: (err) => (err instanceof FsNotFound ? err : adaptError(from, err)),
    });

  const statImpl = (path: VaultPath) =>
    Effect.tryPromise({
      try: async (): Promise<VaultEntry | null> => {
        const resolved = await resolvePath(root, path, "any");
        if (!resolved) return null;
        if (resolved.handle.kind === "directory") {
          return { type: "directory", path, name: resolved.name };
        }
        const file = await (resolved.handle as FileSystemFileHandle).getFile();
        return {
          type: "file",
          path,
          name: resolved.name,
          size: file.size,
          mtimeMs: file.lastModified,
          ctimeMs: file.lastModified,
          extension: extension(path),
        };
      },
      catch: (err) => adaptError(path, err),
    });

  /**
   * Polling watcher. Returns a disposer with `pause`/`resume` controls.
   * Diffs the listAll snapshot against the previous snapshot every
   * `pollIntervalMs` while active, with idle backoff: after
   * {@link WATCH_BACKOFF_IDLE_TICKS} consecutive no-diff polls the interval
   * grows by {@link WATCH_BACKOFF_FACTOR} up to {@link WATCH_BACKOFF_MAX_MS}.
   * Any observed diff snaps the interval back to the base.
   */
  const watchImpl = (handler: (e: FsEvent) => void): FsWatchControl => {
    let cancelled = false;
    let paused = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let prev: Map<string, number> | null = null;
    let currentInterval = pollIntervalMs;
    let idleCount = 0;

    const schedule = (delay: number) => {
      if (cancelled || paused) return;
      timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      timer = null;
      if (cancelled || paused) return;
      let sawDiff = false;
      try {
        const list: VaultFile[] = [];
        async function walk(handle: FileSystemDirectoryHandle, parentPath: VaultPath) {
          for await (const item of iterDir(handle, parentPath)) {
            if (item.entry.type === "directory") {
              if (watchSkipDirs.has(item.entry.name)) continue;
              await walk(item.child as FileSystemDirectoryHandle, item.entry.path);
            } else {
              list.push(item.entry);
            }
          }
        }
        await walk(root, "");

        const next = new Map<string, number>();
        for (const f of list) next.set(f.path, f.mtimeMs);

        if (prev !== null) {
          for (const [p, m] of next) {
            const old = prev.get(p);
            if (old === undefined) {
              handler({ type: "create", path: p });
              sawDiff = true;
            } else if (old !== m) {
              handler({ type: "modify", path: p });
              sawDiff = true;
            }
          }
          for (const p of prev.keys()) {
            if (!next.has(p)) {
              handler({ type: "delete", path: p });
              sawDiff = true;
            }
          }
        }
        prev = next;
      } catch {
        /* watcher is best-effort; swallow transient errors */
      }

      if (sawDiff) {
        idleCount = 0;
        currentInterval = pollIntervalMs;
      } else {
        idleCount += 1;
        if (idleCount > WATCH_BACKOFF_IDLE_TICKS) {
          currentInterval = Math.min(
            Math.ceil(currentInterval * WATCH_BACKOFF_FACTOR),
            WATCH_BACKOFF_MAX_MS,
          );
        }
      }
      schedule(currentInterval);
    };

    schedule(0);

    const control: FsWatchControl = () => {
      cancelled = true;
      activeWatchControls.delete(control);
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    control.pause = () => {
      if (paused || cancelled) return;
      paused = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    control.resume = () => {
      if (!paused || cancelled) return;
      paused = false;
      // Reset the cadence so a freshly-resumed tab notices changes promptly.
      currentInterval = pollIntervalMs;
      idleCount = 0;
      schedule(0);
    };

    // Enrol in the global visibility registry. If the tab is already hidden,
    // immediately pause so we don't burn a poll on a hidden tab.
    activeWatchControls.add(control);
    ensureVisibilityListener();
    if (typeof document !== "undefined" && document.hidden) control.pause?.();

    return control;
  };

  return {
    rootName: root.name,
    list: listImpl,
    listAll: listAllImpl,
    readText: readTextImpl,
    readBytes: readBytesImpl,
    writeText: writeTextImpl,
    writeBytes: writeBytesImpl,
    mkdir: mkdirImpl,
    rename: renameImpl,
    remove: removeImpl,
    ...(moveToSystemTrashImpl ? { moveToSystemTrash: moveToSystemTrashImpl } : {}),
    stat: statImpl,
    watch: watchImpl,
  };
}

export async function pickDirectoryFSA(): Promise<FileSystemDirectoryHandle> {
  const w = window as unknown as {
    showDirectoryPicker?: (opts?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
  };
  if (!w.showDirectoryPicker) {
    throw new FileSystemCapabilityError("fsa-unavailable");
  }
  const handle = await w.showDirectoryPicker({ mode: "readwrite" });
  if ("queryPermission" in handle) {
    const h = handle as FileSystemDirectoryHandle & {
      queryPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
      requestPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
    };
    let state = (await h.queryPermission?.({ mode: "readwrite" })) ?? "granted";
    if (state !== "granted") {
      state = (await h.requestPermission?.({ mode: "readwrite" })) ?? "denied";
    }
    if (state !== "granted") {
      throw new FileSystemCapabilityError("fsa-permission-denied");
    }
  }
  return handle;
}

export async function openOPFS(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory) {
    throw new FileSystemCapabilityError("opfs-unavailable");
  }
  return await navigator.storage.getDirectory();
}

export function fsaSupported(): boolean {
  return (
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
    "function"
  );
}

export function opfsSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
}
