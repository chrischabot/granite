import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";
import type { LeafState, WorkspaceState } from "@core/workspace/types";

const STORAGE_KEY = "granite.workspaces.v1";

interface SerializedGroup {
  leaves: ReadonlyArray<LeafState>;
  activeIndex: number;
  stacked?: boolean;
}

interface SerializedColumnsLayout {
  shape: "columns";
  columns: ReadonlyArray<ReadonlyArray<SerializedGroup>>;
  activeGroupIndex: number;
}

interface SerializedLegacyLayout {
  shape?: "legacy";
  groups: ReadonlyArray<SerializedGroup>;
  activeGroupIndex: number;
}

type SerializedWorkspace = SerializedColumnsLayout | SerializedLegacyLayout;

interface WorkspacesData {
  layouts: Record<string, SerializedWorkspace>;
}

function load(): WorkspacesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { layouts: {} };
    return JSON.parse(raw) as WorkspacesData;
  } catch {
    return { layouts: {} };
  }
}

function save(data: WorkspacesData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

function serialize(state: WorkspaceState): SerializedColumnsLayout {
  const columns: SerializedGroup[][] = [];
  let activeGroupIndex = 0;
  let flatIdx = 0;
  for (const colGroups of state.columns) {
    const col: SerializedGroup[] = [];
    for (const gid of colGroups) {
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
      if (gid === state.activeGroupId) activeGroupIndex = flatIdx;
      const entry: SerializedGroup = { leaves, activeIndex };
      if (group.stacked) entry.stacked = true;
      col.push(entry);
      flatIdx += 1;
    }
    if (col.length > 0) columns.push(col);
  }
  return { shape: "columns", columns, activeGroupIndex };
}

function applyLayout(layout: SerializedWorkspace): boolean {
  if ("columns" in layout && Array.isArray(layout.columns)) {
    return workspaceStore.hydrate({
      shape: "columns",
      columns: layout.columns,
      activeGroupIndex: layout.activeGroupIndex,
    });
  }
  if ("groups" in layout && Array.isArray(layout.groups)) {
    return workspaceStore.hydrate({
      shape: "legacy",
      groups: layout.groups,
      activeGroupIndex: layout.activeGroupIndex,
    });
  }
  return false;
}

export function registerWorkspacesPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "workspaces:save",
    category: "Workspaces",
    name: "Save workspace layout…",
    callback: () => {
      const name = prompt("Save layout as:", "");
      if (!name) return;
      const data = load();
      data.layouts[name] = serialize(workspaceStore.getState());
      save(data);
      noticeManager.show(`Saved layout "${name}"`, { kind: "success" });
    },
  });

  register({
    id: "workspaces:load",
    category: "Workspaces",
    name: "Load workspace layout…",
    callback: () => {
      const data = load();
      const names = Object.keys(data.layouts);
      if (names.length === 0) {
        noticeManager.show("No saved layouts.", { kind: "warning" });
        return;
      }
      const labels = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
      const pick = prompt(`Load which layout?\n${labels}\n\nEnter number:`);
      const n = pick ? parseInt(pick, 10) - 1 : -1;
      const chosenName = names[n];
      if (!chosenName) return;
      const layout = data.layouts[chosenName];
      if (layout && applyLayout(layout)) {
        noticeManager.show(`Loaded layout "${chosenName}"`, { kind: "success" });
      } else {
        noticeManager.show(`Could not load layout "${chosenName}"`, { kind: "error" });
      }
    },
  });

  register({
    id: "workspaces:delete",
    category: "Workspaces",
    name: "Delete workspace layout…",
    callback: () => {
      const data = load();
      const names = Object.keys(data.layouts);
      if (names.length === 0) {
        noticeManager.show("No saved layouts.", { kind: "warning" });
        return;
      }
      const labels = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
      const pick = prompt(`Delete which layout?\n${labels}\n\nEnter number:`);
      const n = pick ? parseInt(pick, 10) - 1 : -1;
      const chosenName = names[n];
      if (!chosenName) return;
      delete data.layouts[chosenName];
      save(data);
      noticeManager.show(`Deleted layout "${chosenName}"`, { kind: "success" });
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}