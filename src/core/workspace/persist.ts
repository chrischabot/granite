import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { workspaceStore } from "./store";
import type { LeafState, WorkspaceState } from "./types";

const KEY_PREFIX = "granite.workspace.last.";
const SAVE_DEBOUNCE_MS = 500;
const DISK_CONFIG_NAME = "workspace";

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
  if (columns.length === 1 && columns[0]?.length === 1 && onlyGroup?.leaves[0]?.type === "empty") {
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
  // Disk write — best-effort; failures (e.g. no active vault yet) are ignored.
  if (snap === null) {
    // Leave any existing disk snapshot in place — clearing on transient
    // single-empty-leaf state risks losing a workspace mid-reset.
    return;
  }
  void writeConfigJson(DISK_CONFIG_NAME, snap).catch(() => {});
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

/**
 * Begin persisting the workspace for the given vault id. Subsequent calls
 * replace the previous binding. Returns a function that stops persistence.
 */
export function bindPersistence(vaultId: string): () => void {
  if (unsub) unsub();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  activeVaultId = vaultId;
  bindBeforeUnload();
  unsub = workspaceStore.subscribe(() => {
    if (!activeVaultId) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  });
  return () => {
    flushWorkspacePersistence();
    if (unsub) unsub();
    unsub = null;
    unbindBeforeUnload();
    activeVaultId = null;
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
 * Disk-first restore: try `.granite/workspace.json` first, fall back to the
 * legacy localStorage key, then write the disk file if it was missing.
 * Returns true if a snapshot was applied.
 */
export async function restoreForAsync(vaultId: string): Promise<boolean> {
  const onDisk = await readConfigJson<SerializedSnapshot>(DISK_CONFIG_NAME);
  if (onDisk) {
    const ok = applySnapshot(onDisk);
    if (ok) return true;
  }
  const legacy = readLocalStorage(vaultId);
  if (!legacy) return false;
  const ok = applySnapshot(legacy);
  if (!ok) return false;
  // Mirror legacy → disk so future opens prefer the disk copy.
  await writeConfigJson(DISK_CONFIG_NAME, legacy).catch(() => {});
  return true;
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
