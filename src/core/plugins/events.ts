import { workspaceStore } from "@core/workspace/store";

export type PluginEventName = "file-open" | "active-leaf-change" | "layout-change" | "file-rename";

export interface PluginEventMap {
  "file-open": { path: string };
  "active-leaf-change": { leafId: string | null; path: string | null };
  "layout-change": Record<string, never>;
  "file-rename": { from: string; to: string };
}

type AnyListener = (data: PluginEventMap[PluginEventName]) => void;

interface Entry {
  pluginId: string;
  listener: AnyListener;
}

const entries: Map<PluginEventName, Set<Entry>> = new Map([
  ["file-open", new Set<Entry>()],
  ["active-leaf-change", new Set<Entry>()],
  ["layout-change", new Set<Entry>()],
  ["file-rename", new Set<Entry>()],
]);

function emit<K extends PluginEventName>(name: K, data: PluginEventMap[K]): void {
  const set = entries.get(name);
  if (!set) return;
  for (const e of set) {
    try {
      e.listener(data as PluginEventMap[PluginEventName]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[granite] plugin event listener "${name}" threw:`, err);
    }
  }
}

export function onPluginEvent<K extends PluginEventName>(
  pluginId: string,
  name: K,
  listener: (data: PluginEventMap[K]) => void,
): () => void {
  const set = entries.get(name);
  if (!set) throw new Error(`Unknown plugin event: ${name}`);
  const entry: Entry = { pluginId, listener: listener as AnyListener };
  set.add(entry);
  return () => {
    set.delete(entry);
  };
}

export function removeAllListenersForPlugin(pluginId: string): void {
  for (const set of entries.values()) {
    for (const e of [...set]) {
      if (e.pluginId === pluginId) set.delete(e);
    }
  }
}

/** Programmatically dispatch a file-rename event. Called by the rename
 *  rewriter when a vault file moves. */
export function emitFileRename(from: string, to: string): void {
  emit("file-rename", { from, to });
}

let prevLeafId: string | null = null;
let prevPath: string | null = null;
let prevLayoutKey = "";
let unsubWorkspace: (() => void) | null = null;

function snapshotLayoutKey(): string {
  const s = workspaceStore.getState();
  const parts: string[] = [];
  for (const col of s.columns) parts.push(col.join("|"));
  parts.push("--");
  for (const [id, g] of s.groups) {
    parts.push(`${id}:${g.leafIds.join(",")}:${g.activeLeafId ?? ""}:${g.stacked ? "s" : ""}`);
  }
  return parts.join(";");
}

/** Bind the workspace-event bridge. Idempotent; safe to call repeatedly. */
export function bindWorkspaceEvents(): void {
  if (unsubWorkspace) return;
  // Initialize so the first store snapshot doesn't fire a spurious event.
  prevLayoutKey = snapshotLayoutKey();
  const s0 = workspaceStore.getState();
  const ag0 = s0.activeGroupId ? s0.groups.get(s0.activeGroupId) : null;
  prevLeafId = ag0?.activeLeafId ?? null;
  const al0 = prevLeafId ? s0.leaves.get(prevLeafId) : null;
  prevPath = al0?.state.type === "markdown" ? al0.state.path : null;

  unsubWorkspace = workspaceStore.subscribe(() => {
    const s = workspaceStore.getState();
    const layoutKey = snapshotLayoutKey();
    if (layoutKey !== prevLayoutKey) {
      prevLayoutKey = layoutKey;
      emit("layout-change", {});
    }
    const activeGroup = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
    const activeLeafId = activeGroup?.activeLeafId ?? null;
    const activeLeaf = activeLeafId ? s.leaves.get(activeLeafId) : null;
    const activePath = activeLeaf?.state.type === "markdown" ? activeLeaf.state.path : null;
    if (activeLeafId !== prevLeafId) {
      prevLeafId = activeLeafId;
      emit("active-leaf-change", { leafId: activeLeafId, path: activePath });
    }
    if (activePath !== prevPath) {
      prevPath = activePath;
      if (activePath !== null) emit("file-open", { path: activePath });
    }
  });
}

/** Test helper: drop everything and unbind the workspace bridge. */
export function _resetEventsForTesting(): void {
  for (const set of entries.values()) set.clear();
  unsubWorkspace?.();
  unsubWorkspace = null;
  prevLeafId = null;
  prevPath = null;
  prevLayoutKey = "";
}
