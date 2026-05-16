import { inputPrompt } from "@/ui/overlay/inputPrompt";
import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
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
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "workspaces:save",
    category: t("plugin.workspaces.category"),
    name: t("plugin.workspaces.save"),
    callback: async () => {
      const name = await inputPrompt({
        title: t("plugin.workspaces.prompt.save"),
        requireValue: true,
      });
      if (!name) return;
      const data = load();
      data.layouts[name] = serialize(workspaceStore.getState());
      save(data);
      noticeManager.show(t("plugin.workspaces.saved", { name }), { kind: "success" });
    },
  });

  register({
    id: "workspaces:load",
    category: t("plugin.workspaces.category"),
    name: t("plugin.workspaces.load"),
    callback: async () => {
      const data = load();
      const names = Object.keys(data.layouts);
      if (names.length === 0) {
        noticeManager.show(t("plugin.workspaces.empty"), { kind: "warning" });
        return;
      }
      const labels = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
      const pick = await inputPrompt({ title: t("plugin.workspaces.prompt.load", { labels }) });
      const n = pick ? Number.parseInt(pick, 10) - 1 : -1;
      const chosenName = names[n];
      if (!chosenName) return;
      const layout = data.layouts[chosenName];
      if (layout && applyLayout(layout)) {
        noticeManager.show(t("plugin.workspaces.loaded", { name: chosenName }), {
          kind: "success",
        });
      } else {
        noticeManager.show(t("plugin.workspaces.error.load", { name: chosenName }), {
          kind: "error",
        });
      }
    },
  });

  register({
    id: "workspaces:delete",
    category: t("plugin.workspaces.category"),
    name: t("plugin.workspaces.delete"),
    callback: async () => {
      const data = load();
      const names = Object.keys(data.layouts);
      if (names.length === 0) {
        noticeManager.show(t("plugin.workspaces.empty"), { kind: "warning" });
        return;
      }
      const labels = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
      const pick = await inputPrompt({ title: t("plugin.workspaces.prompt.delete", { labels }) });
      const n = pick ? Number.parseInt(pick, 10) - 1 : -1;
      const chosenName = names[n];
      if (!chosenName) return;
      delete data.layouts[chosenName];
      save(data);
      noticeManager.show(t("plugin.workspaces.deleted", { name: chosenName }), {
        kind: "success",
      });
    },
  });

  return disposer;
}
