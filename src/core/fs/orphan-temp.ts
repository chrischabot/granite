import { run } from "@core/effect/runtime";
import { Effect } from "effect";
import { FileSystem } from "./FileSystem";
import { basename, dirname } from "./path";
import type { VaultFile, VaultPath } from "./types";

const ORPHAN_TEMP_RE = /(?:\.tmp~|\.granite-tmp~)$/;
const COMMIT_MARKER_RE = /\.granite-commit~$/;

export function findOrphanAtomicWriteTemps(
  files: ReadonlyArray<VaultFile>,
): ReadonlyArray<VaultPath> {
  return files
    .filter((file) => ORPHAN_TEMP_RE.test(file.path) || COMMIT_MARKER_RE.test(file.path))
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b));
}

export async function scanOrphanAtomicWriteTemps(): Promise<ReadonlyArray<VaultPath>> {
  const files = await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return yield* fs.listAll();
    }),
  );
  return findOrphanAtomicWriteTemps(files);
}

interface CommitMarker {
  readonly v: 1;
  readonly tmp: string;
  readonly target: string;
  readonly size: number;
}

function parseCommitMarker(body: string): CommitMarker | null {
  try {
    const parsed = JSON.parse(body) as Partial<CommitMarker> | null;
    if (!parsed || parsed.v !== 1) return null;
    if (typeof parsed.tmp !== "string" || typeof parsed.target !== "string") return null;
    if (typeof parsed.size !== "number" || !Number.isFinite(parsed.size)) return null;
    return parsed as CommitMarker;
  } catch {
    return null;
  }
}

export interface OrphanRecoveryStats {
  /** Markers that pointed at a complete tmp and were promoted to target. */
  readonly promoted: number;
  /** Tmp/marker pairs that were incomplete and discarded. */
  readonly discarded: number;
  /** Bare tmp leftovers (no marker) that were swept. */
  readonly swept: number;
}

interface ParentDirHandle {
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
}

async function walkDir(
  root: FileSystemDirectoryHandle,
  segments: ReadonlyArray<string>,
): Promise<FileSystemDirectoryHandle | null> {
  let current: FileSystemDirectoryHandle = root;
  for (const seg of segments) {
    try {
      current = await current.getDirectoryHandle(seg);
    } catch {
      return null;
    }
  }
  return current;
}

async function readMarker(
  parent: ParentDirHandle,
  markerName: string,
): Promise<CommitMarker | null> {
  let handle: FileSystemFileHandle;
  try {
    handle = await parent.getFileHandle(markerName);
  } catch {
    return null;
  }
  try {
    const file = await handle.getFile();
    return parseCommitMarker(await file.text());
  } catch {
    return null;
  }
}

async function tmpBytes(parent: ParentDirHandle, tmpName: string): Promise<Uint8Array | null> {
  let handle: FileSystemFileHandle;
  try {
    handle = await parent.getFileHandle(tmpName);
  } catch {
    return null;
  }
  try {
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Drain orphan atomic-write artefacts left by an interrupted save.
 *
 * For each `<file>.granite-commit~` marker:
 *  - if the named tmp exists and its size matches the marker, copy the tmp
 *    bytes into the target (i.e. finish the commit) and clean up;
 *  - otherwise discard both marker and tmp -- the target is guaranteed to
 *    still hold the previous good bytes because the new-protocol writer
 *    never deletes the target before tmp+marker are durable.
 *
 * For tmp leftovers without a marker, simply remove the tmp.
 *
 * Returns the list of original orphan paths (markers + tmps) and a stats
 * record describing what happened.
 */
export async function recoverPendingAtomicWrites(root: FileSystemDirectoryHandle): Promise<{
  readonly paths: ReadonlyArray<VaultPath>;
  readonly stats: OrphanRecoveryStats;
}> {
  // Walk the tree to collect candidates. We don't reuse listAll here so
  // recovery can run before any Effect runtime is up.
  const tmps: VaultPath[] = [];
  const markers: VaultPath[] = [];
  async function walk(handle: FileSystemDirectoryHandle, parentPath: VaultPath) {
    // values() yields FileSystemHandle but TS only knows AsyncIterable on this
    // type via the spec — cast to keep the loop simple.
    const dir = handle as FileSystemDirectoryHandle & {
      values(): AsyncIterable<FileSystemHandle>;
    };
    for await (const child of dir.values()) {
      const childPath = parentPath ? `${parentPath}/${child.name}` : child.name;
      if (child.kind === "directory") {
        await walk(child as FileSystemDirectoryHandle, childPath);
      } else if (COMMIT_MARKER_RE.test(child.name)) {
        markers.push(childPath);
      } else if (ORPHAN_TEMP_RE.test(child.name)) {
        tmps.push(childPath);
      }
    }
  }
  await walk(root, "");

  const stats = { promoted: 0, discarded: 0, swept: 0 };
  const claimedTmps = new Set<VaultPath>();

  for (const markerPath of markers) {
    const dir = dirname(markerPath);
    const markerName = basename(markerPath);
    const parentDir = await walkDir(root, dir ? dir.split("/") : []);
    if (!parentDir) continue;
    const marker = await readMarker(parentDir, markerName);
    if (!marker) {
      try {
        await parentDir.removeEntry(markerName);
      } catch {
        /* best effort */
      }
      stats.discarded += 1;
      continue;
    }
    const tmpPath = dir ? `${dir}/${marker.tmp}` : marker.tmp;
    claimedTmps.add(tmpPath);
    const bytes = await tmpBytes(parentDir, marker.tmp);
    if (!bytes || bytes.byteLength !== marker.size) {
      // Tmp missing or incomplete: original target is untouched. Roll back.
      try {
        await parentDir.removeEntry(marker.tmp);
      } catch {
        /* tmp may not exist */
      }
      try {
        await parentDir.removeEntry(markerName);
      } catch {
        /* best effort */
      }
      stats.discarded += 1;
      continue;
    }
    // Promote: copy tmp bytes into the target.
    try {
      const target = await parentDir.getFileHandle(marker.target, { create: true });
      const targetW = await target.createWritable();
      await targetW.write(bytes as unknown as BufferSource);
      await targetW.close();
      stats.promoted += 1;
    } catch {
      // Could not promote (e.g. permission). Leave artefacts in place for a
      // future retry rather than risk dropping the new bytes.
      continue;
    }
    try {
      await parentDir.removeEntry(markerName);
    } catch {
      /* best effort */
    }
    try {
      await parentDir.removeEntry(marker.tmp);
    } catch {
      /* best effort */
    }
  }

  // Sweep bare tmp orphans (no marker).
  for (const tmpPath of tmps) {
    if (claimedTmps.has(tmpPath)) continue;
    const dir = dirname(tmpPath);
    const name = basename(tmpPath);
    const parentDir = await walkDir(root, dir ? dir.split("/") : []);
    if (!parentDir) continue;
    try {
      await parentDir.removeEntry(name);
      stats.swept += 1;
    } catch {
      /* best effort */
    }
  }

  const paths = [...markers, ...tmps].sort((a, b) => a.localeCompare(b));
  return { paths, stats };
}
