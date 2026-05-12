import { Effect } from "effect";
import type { FileSystemImpl, FsUnsubscribe } from "./FileSystem";
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
  /** Polling interval for the watcher in ms. */
  readonly pollIntervalMs?: number;
  /**
   * Native host bridge for OS trash. Browser FSA does not expose absolute
   * paths or recycle-bin APIs, so this must be supplied by a trusted host.
   */
  readonly systemTrash?: NativeSystemTrashBridge | null;
}

const DEFAULT_SKIP = [".granite", ".git", "node_modules"] as const;

export function handleAdapter(
  root: FileSystemDirectoryHandle,
  opts: HandleAdapterOptions = {},
): FileSystemImpl {
  const skipDirs = new Set([...DEFAULT_SKIP, ...(opts.skipDirs ?? [])]);
  const pollIntervalMs = opts.pollIntervalMs ?? 1500;
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
   * Atomic write: write to `<name>.tmp~`, then copy to target and delete tmp.
   * The tmp first guarantees we never leave a half-written target if the user
   * closes the tab mid-save.
   */
  async function atomicWrite(path: VaultPath, payload: string | Uint8Array) {
    if (!path) throw new FsAccessDenied({ path, reason: "Empty path" });
    const dir = dirname(path);
    const name = basename(path);
    const parent = await ensureDir(root, dir);
    const tmpName = `${name}.granite-tmp~`;
    const tmpHandle = await parent.getFileHandle(tmpName, { create: true });
    const tmpW = await tmpHandle.createWritable();
    if (typeof payload === "string") {
      await tmpW.write(payload);
    } else {
      // FileSystemWriteChunkType expects BufferSource | Blob | string. Cast
      // through unknown to bypass the ArrayBuffer/SharedArrayBuffer variance
      // strictness in the latest DOM lib types.
      await tmpW.write(payload as unknown as BufferSource);
    }
    await tmpW.close();
    try {
      await parent.removeEntry(name);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "NotFoundError")) throw err;
    }
    const target = await parent.getFileHandle(name, { create: true });
    const targetW = await target.createWritable();
    const tmpFile = await tmpHandle.getFile();
    const buf = await tmpFile.arrayBuffer();
    await targetW.write(buf);
    await targetW.close();
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
            reason: "Directory rename not yet implemented",
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
   * Polling watcher. Returns an unsubscribe function. Diffs the listAll
   * snapshot against the previous snapshot every `pollIntervalMs`.
   */
  const watchImpl = (handler: (e: FsEvent) => void): FsUnsubscribe => {
    let cancelled = false;
    let prev: Map<string, number> | null = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        const list: VaultFile[] = [];
        async function walk(handle: FileSystemDirectoryHandle, parentPath: VaultPath) {
          for await (const item of iterDir(handle, parentPath)) {
            if (item.entry.type === "directory") {
              if (skipDirs.has(item.entry.name)) continue;
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
            if (old === undefined) handler({ type: "create", path: p });
            else if (old !== m) handler({ type: "modify", path: p });
          }
          for (const p of prev.keys()) {
            if (!next.has(p)) handler({ type: "delete", path: p });
          }
        }
        prev = next;
      } catch {
        /* watcher is best-effort; swallow transient errors */
      }
      if (!cancelled) setTimeout(tick, pollIntervalMs);
    };

    void tick();
    return () => {
      cancelled = true;
    };
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
    throw new Error("File System Access API is not available in this browser");
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
      throw new Error("Read/write permission not granted for this folder");
    }
  }
  return handle;
}

export async function openOPFS(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory) {
    throw new Error("Origin Private File System is not available in this browser");
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
