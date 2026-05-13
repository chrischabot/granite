import { nativeFileKindForExtension, type NativeFileKind } from "@core/fs/file-formats";
import { extension } from "@core/fs/path";
import type { VaultPath } from "@core/fs/types";
import { settingsStore } from "@core/settings/store";
import { addRecent } from "./recents";
import type {
  Leaf,
  LeafId,
  LeafState,
  MarkdownViewMode,
  TabGroup,
  TabGroupId,
  WorkspaceState,
} from "./types";

let counter = 0;
const newId = (prefix: string) =>
  `${prefix}-${(++counter).toString(36)}-${Date.now().toString(36)}`;

interface NavEntry {
  path: VaultPath;
  fragment?: string;
}

const navHistory = new Map<LeafId, { entries: NavEntry[]; cursor: number }>();

function pushHistory(leafId: LeafId, entry: NavEntry): void {
  const slot = navHistory.get(leafId) ?? { entries: [], cursor: -1 };
  if (slot.cursor < slot.entries.length - 1) {
    slot.entries = slot.entries.slice(0, slot.cursor + 1);
  }
  const last = slot.entries[slot.entries.length - 1];
  if (last && last.path === entry.path && (last.fragment ?? null) === (entry.fragment ?? null)) {
    return;
  }
  slot.entries.push(entry);
  slot.cursor = slot.entries.length - 1;
  navHistory.set(leafId, slot);
}

function flatten(columns: ReadonlyArray<ReadonlyArray<TabGroupId>>): TabGroupId[] {
  const out: TabGroupId[] = [];
  for (const col of columns) for (const g of col) out.push(g);
  return out;
}

function findColumnIndex(
  columns: ReadonlyArray<ReadonlyArray<TabGroupId>>,
  groupId: TabGroupId,
): number {
  for (let i = 0; i < columns.length; i++) {
    if (columns[i]?.includes(groupId)) return i;
  }
  return -1;
}

function buildInitial(): WorkspaceState {
  const groupId = newId("g");
  const emptyLeafId = newId("l");
  const leaf: Leaf = { id: emptyLeafId, state: { type: "empty" } };
  const group: TabGroup = {
    id: groupId,
    leafIds: [emptyLeafId],
    activeLeafId: emptyLeafId,
  };
  const columns = [[groupId]];
  return {
    leaves: new Map([[emptyLeafId, leaf]]),
    groups: new Map([[groupId, group]]),
    columns,
    rootGroupIds: flatten(columns),
    activeGroupId: groupId,
  };
}

let state: WorkspaceState = buildInitial();
const subscribers = new Set<() => void>();

function emit() {
  for (const s of subscribers) s();
}

function setState(
  next: Omit<WorkspaceState, "rootGroupIds"> & { rootGroupIds?: ReadonlyArray<TabGroupId> },
) {
  state = { ...next, rootGroupIds: flatten(next.columns) } as WorkspaceState;
  emit();
}

export const workspaceStore = {
  getState(): WorkspaceState {
    return state;
  },

  getServerSnapshot(): WorkspaceState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },

  openPath(path: VaultPath, opts: { newTab?: boolean; fragment?: string } = {}): LeafId {
    const kind = nativeFileKindForExtension(extension(path));
    const tabOpt = opts.newTab === undefined ? {} : { newTab: opts.newTab };
    switch (kind) {
      case "canvas":
        return workspaceStore.openCanvas({ path, ...tabOpt });
      case "base":
        return workspaceStore.openBase({ path, ...tabOpt });
      case "image":
      case "audio":
      case "video":
      case "pdf":
        return workspaceStore.openAsset({ path, kind, ...tabOpt });
      default:
        return workspaceStore.openFile(path, {
          ...tabOpt,
          ...(opts.fragment ? { fragment: opts.fragment } : {}),
        });
    }
  },

  openFile(
    path: VaultPath,
    opts: { newTab?: boolean; mode?: MarkdownViewMode; fragment?: string } = {},
  ): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);

    const mode: MarkdownViewMode = opts.mode ?? settingsStore.getState().defaultViewMode;
    const desired: LeafState = {
      type: "markdown",
      path,
      mode,
      ...(opts.fragment ? { fragment: opts.fragment } : {}),
    };

    for (const id of group.leafIds) {
      const leaf = state.leaves.get(id);
      if (leaf?.state.type === "markdown" && leaf.state.path === path) {
        const baseState: LeafState = {
          type: "markdown",
          path: leaf.state.path,
          mode: leaf.state.mode,
          ...(leaf.state.cursorOffset !== undefined
            ? { cursorOffset: leaf.state.cursorOffset }
            : {}),
          ...(leaf.state.folds !== undefined ? { folds: leaf.state.folds } : {}),
          ...(leaf.state.pinned !== undefined ? { pinned: leaf.state.pinned } : {}),
          ...(opts.fragment ? { fragment: opts.fragment } : {}),
        };
        const updated: Leaf = { ...leaf, state: baseState };
        const groups = new Map(state.groups);
        const leaves = new Map(state.leaves);
        leaves.set(id, updated);
        groups.set(group.id, { ...group, activeLeafId: id });
        setState({ ...state, leaves, groups });
        addRecent(path);
        return id;
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace =
      !opts.newTab &&
      activeLeaf &&
      (activeLeaf.state.type === "empty" ||
        (activeLeaf.state.type === "markdown" && !activeLeaf.state.pinned));

    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      pushHistory(updated.id, { path, ...(opts.fragment ? { fragment: opts.fragment } : {}) });
      addRecent(path);
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const groupNext: TabGroup = {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, groupNext);
    setState({ ...state, leaves, groups });
    pushHistory(id, { path, ...(opts.fragment ? { fragment: opts.fragment } : {}) });
    addRecent(path);
    return id;
  },

  newTab(): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const id = newId("l");
    const leaf: Leaf = { id, state: { type: "empty" } };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  openWebviewer(url: string, opts: { newTab?: boolean } = {}): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const desired: LeafState = { type: "webviewer", url };

    for (const id of group.leafIds) {
      const leaf = state.leaves.get(id);
      if (leaf?.state.type === "webviewer" && leaf.state.url === url) {
        setState({
          ...state,
          groups: new Map(state.groups).set(group.id, { ...group, activeLeafId: id }),
        });
        return id;
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace =
      !opts.newTab &&
      activeLeaf &&
      (activeLeaf.state.type === "empty" ||
        (activeLeaf.state.type === "markdown" && !activeLeaf.state.pinned));

    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  openGraph(opts: { newTab?: boolean } = {}): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const desired: LeafState = { type: "graph" };

    for (const id of group.leafIds) {
      const leaf = state.leaves.get(id);
      if (leaf?.state.type === "graph") {
        setState({
          ...state,
          groups: new Map(state.groups).set(group.id, { ...group, activeLeafId: id }),
        });
        return id;
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace =
      !opts.newTab &&
      activeLeaf &&
      (activeLeaf.state.type === "empty" ||
        (activeLeaf.state.type === "markdown" && !activeLeaf.state.pinned));

    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  openSidebarView(side: "left" | "right", tabId: string, opts: { newTab?: boolean } = {}): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const desired: LeafState = { type: "sidebar", side, id: tabId };

    for (const id of group.leafIds) {
      const leaf = state.leaves.get(id);
      if (leaf?.state.type === "sidebar" && leaf.state.side === side && leaf.state.id === tabId) {
        setState({
          ...state,
          groups: new Map(state.groups).set(group.id, { ...group, activeLeafId: id }),
        });
        return id;
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace = !opts.newTab && activeLeaf?.state.type === "empty";
    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  openCanvas(opts: { newTab?: boolean; path?: string } = {}): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const desired: LeafState = opts.path ? { type: "canvas", path: opts.path } : { type: "canvas" };

    if (opts.path) {
      for (const id of group.leafIds) {
        const leaf = state.leaves.get(id);
        if (leaf?.state.type === "canvas" && leaf.state.path === opts.path) {
          setState({
            ...state,
            groups: new Map(state.groups).set(group.id, { ...group, activeLeafId: id }),
          });
          return id;
        }
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace =
      !opts.newTab &&
      activeLeaf &&
      (activeLeaf.state.type === "empty" ||
        (activeLeaf.state.type === "markdown" && !activeLeaf.state.pinned));

    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  /** Open or focus a bases (database) leaf. Currently a placeholder type —
   *  the full bases editor is on the roadmap. Same semantics as openCanvas. */
  openBase(opts: { newTab?: boolean; path?: string } = {}): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const desired: LeafState = opts.path ? { type: "bases", path: opts.path } : { type: "bases" };

    if (opts.path) {
      for (const id of group.leafIds) {
        const leaf = state.leaves.get(id);
        if (leaf?.state.type === "bases" && leaf.state.path === opts.path) {
          setState({
            ...state,
            groups: new Map(state.groups).set(group.id, { ...group, activeLeafId: id }),
          });
          return id;
        }
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace =
      !opts.newTab &&
      activeLeaf &&
      (activeLeaf.state.type === "empty" ||
        (activeLeaf.state.type === "markdown" && !activeLeaf.state.pinned));

    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  openAsset(opts: { newTab?: boolean; path: VaultPath; kind: NativeFileKind }): LeafId {
    const groupId = state.activeGroupId;
    if (!groupId) throw new Error("Workspace has no active group");
    const group = state.groups.get(groupId);
    if (!group) throw new Error(`Active group ${groupId} not in workspace`);
    const desired: LeafState = { type: "asset", path: opts.path, kind: opts.kind };

    for (const id of group.leafIds) {
      const leaf = state.leaves.get(id);
      if (leaf?.state.type === "asset" && leaf.state.path === opts.path) {
        setState({
          ...state,
          groups: new Map(state.groups).set(group.id, { ...group, activeLeafId: id }),
        });
        return id;
      }
    }

    const activeLeaf = group.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
    const canReplace =
      !opts.newTab &&
      activeLeaf &&
      (activeLeaf.state.type === "empty" ||
        (activeLeaf.state.type === "markdown" && !activeLeaf.state.pinned));

    if (canReplace && activeLeaf) {
      const updated: Leaf = { id: activeLeaf.id, state: desired };
      setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
      return updated.id;
    }

    const id = newId("l");
    const leaf: Leaf = { id, state: desired };
    const leaves = new Map(state.leaves);
    leaves.set(id, leaf);
    const groups = new Map(state.groups);
    groups.set(group.id, {
      ...group,
      leafIds: [...group.leafIds, id],
      activeLeafId: id,
    });
    setState({ ...state, leaves, groups });
    return id;
  },

  closeTab(leafId: LeafId): void {
    const groups = new Map(state.groups);
    const leaves = new Map(state.leaves);
    leaves.delete(leafId);
    navHistory.delete(leafId);
    const columns = state.columns.map((c) => [...c]);
    for (const [gid, g] of groups) {
      if (!g.leafIds.includes(leafId)) continue;
      const nextIds = g.leafIds.filter((id) => id !== leafId);
      let nextActive: LeafId | null = g.activeLeafId;
      if (nextActive === leafId) {
        const wasIndex = g.leafIds.indexOf(leafId);
        nextActive = nextIds[wasIndex] ?? nextIds[wasIndex - 1] ?? null;
      }
      if (nextIds.length === 0) {
        // Re-seed group with a single empty leaf so we keep the invariant
        // of every group having ≥1 leaf, identical to the pre-columns code.
        const emptyId = newId("l");
        leaves.set(emptyId, { id: emptyId, state: { type: "empty" } });
        groups.set(gid, { ...g, leafIds: [emptyId], activeLeafId: emptyId });
      } else {
        groups.set(gid, { ...g, leafIds: nextIds, activeLeafId: nextActive });
      }
    }
    setState({ ...state, leaves, groups, columns });
  },

  closeOtherTabs(leafId: LeafId): void {
    let sourceGroupId: TabGroupId | null = null;
    for (const [gid, g] of state.groups) {
      if (g.leafIds.includes(leafId)) {
        sourceGroupId = gid;
        break;
      }
    }
    if (!sourceGroupId) return;
    const group = state.groups.get(sourceGroupId);
    if (!group) return;
    const leaves = new Map(state.leaves);
    for (const id of group.leafIds) {
      if (id !== leafId) {
        leaves.delete(id);
        navHistory.delete(id);
      }
    }
    const groups = new Map(state.groups);
    groups.set(sourceGroupId, { ...group, leafIds: [leafId], activeLeafId: leafId });
    setState({ ...state, leaves, groups });
  },

  closeRightTabs(leafId: LeafId): void {
    let sourceGroupId: TabGroupId | null = null;
    for (const [gid, g] of state.groups) {
      if (g.leafIds.includes(leafId)) {
        sourceGroupId = gid;
        break;
      }
    }
    if (!sourceGroupId) return;
    const group = state.groups.get(sourceGroupId);
    if (!group) return;
    const idx = group.leafIds.indexOf(leafId);
    if (idx === -1 || idx === group.leafIds.length - 1) return;
    const leaves = new Map(state.leaves);
    const kept = group.leafIds.slice(0, idx + 1);
    for (const id of group.leafIds.slice(idx + 1)) {
      leaves.delete(id);
      navHistory.delete(id);
    }
    const groups = new Map(state.groups);
    groups.set(sourceGroupId, { ...group, leafIds: kept, activeLeafId: leafId });
    setState({ ...state, leaves, groups });
  },

  focusTab(leafId: LeafId): void {
    for (const [gid, g] of state.groups) {
      if (!g.leafIds.includes(leafId)) continue;
      const groups = new Map(state.groups);
      groups.set(gid, { ...g, activeLeafId: leafId });
      setState({ ...state, groups, activeGroupId: gid });
      return;
    }
  },

  setMode(leafId: LeafId, mode: MarkdownViewMode): void {
    const leaf = state.leaves.get(leafId);
    if (!leaf || leaf.state.type !== "markdown") return;
    const updated: Leaf = { ...leaf, state: { ...leaf.state, mode } };
    setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
  },

  setMarkdownFolds(
    leafId: LeafId,
    folds: ReadonlyArray<{ readonly from: number; readonly to: number }>,
  ): void {
    const leaf = state.leaves.get(leafId);
    if (!leaf || leaf.state.type !== "markdown") return;
    const { folds: _prevFolds, ...stateWithoutFolds } = leaf.state;
    const updated: Leaf = {
      ...leaf,
      state: folds.length > 0 ? { ...stateWithoutFolds, folds } : stateWithoutFolds,
    };
    setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
  },

  togglePinned(leafId: LeafId): void {
    const leaf = state.leaves.get(leafId);
    if (!leaf || leaf.state.type !== "markdown") return;
    const updated: Leaf = {
      ...leaf,
      state: { ...leaf.state, pinned: !leaf.state.pinned },
    };
    setState({ ...state, leaves: new Map(state.leaves).set(updated.id, updated) });
  },

  cycleTab(direction: "next" | "previous"): void {
    const s = state;
    const groupId = s.activeGroupId;
    if (!groupId) return;
    const group = s.groups.get(groupId);
    if (!group || group.leafIds.length < 2) return;
    const currentIdx = group.activeLeafId ? group.leafIds.indexOf(group.activeLeafId) : -1;
    if (currentIdx === -1) return;
    const len = group.leafIds.length;
    const nextIdx = direction === "next" ? (currentIdx + 1) % len : (currentIdx - 1 + len) % len;
    const nextId = group.leafIds[nextIdx];
    if (!nextId) return;
    const groups = new Map(s.groups);
    groups.set(group.id, { ...group, activeLeafId: nextId });
    setState({ ...s, groups });
  },

  closeActiveTab(): void {
    const s = state;
    const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
    if (!group?.activeLeafId) return;
    workspaceStore.closeTab(group.activeLeafId);
  },

  toggleStacked(groupId: TabGroupId): void {
    const group = state.groups.get(groupId);
    if (!group) return;
    const groups = new Map(state.groups);
    groups.set(groupId, { ...group, stacked: !group.stacked });
    setState({ ...state, groups });
  },

  /**
   * Split a leaf into a new sibling tab-group. `right` creates a new column
   * positioned just to the right of the leaf's column. `down` creates a new
   * group inside the same column, just below the leaf's group.
   */
  splitLeaf(leafId: LeafId, direction: "right" | "down" = "right"): TabGroupId {
    const sourceLeaf = state.leaves.get(leafId);
    if (!sourceLeaf) throw new Error(`Unknown leaf ${leafId}`);
    let sourceGroupId: TabGroupId | null = null;
    for (const [gid, g] of state.groups) {
      if (g.leafIds.includes(leafId)) {
        sourceGroupId = gid;
        break;
      }
    }
    if (!sourceGroupId) throw new Error(`Leaf ${leafId} is not in any group`);
    const sourceColIdx = findColumnIndex(state.columns, sourceGroupId);
    if (sourceColIdx === -1) throw new Error(`Group ${sourceGroupId} not in any column`);

    const newGroupId = newId("g");
    const newLeafId = newId("l");
    const duplicateState: LeafState = sourceLeaf.state;
    const newLeaf: Leaf = { id: newLeafId, state: duplicateState };
    const newGroup: TabGroup = {
      id: newGroupId,
      leafIds: [newLeafId],
      activeLeafId: newLeafId,
    };
    const leaves = new Map(state.leaves);
    leaves.set(newLeafId, newLeaf);
    const groups = new Map(state.groups);
    groups.set(newGroupId, newGroup);

    const columns = state.columns.map((c) => [...c]);
    if (direction === "right") {
      columns.splice(sourceColIdx + 1, 0, [newGroupId]);
    } else {
      const col = columns[sourceColIdx];
      if (!col) throw new Error(`Column ${sourceColIdx} not found`);
      const sourceIdxInCol = col.indexOf(sourceGroupId);
      col.splice(sourceIdxInCol + 1, 0, newGroupId);
    }
    setState({ ...state, leaves, groups, columns, activeGroupId: newGroupId });
    return newGroupId;
  },

  closeGroup(groupId: TabGroupId): void {
    if (state.rootGroupIds.length <= 1) return;
    const group = state.groups.get(groupId);
    if (!group) return;
    // Find column + position.
    const colIdx = findColumnIndex(state.columns, groupId);
    if (colIdx === -1) return;
    const leaves = new Map(state.leaves);
    for (const id of group.leafIds) {
      leaves.delete(id);
      navHistory.delete(id);
    }
    const groups = new Map(state.groups);
    groups.delete(groupId);
    const columns = state.columns.map((c) => c.filter((g) => g !== groupId));
    // Drop empty columns.
    const filteredColumns = columns.filter((c) => c.length > 0);
    let nextActive: TabGroupId | null = state.activeGroupId;
    if (state.activeGroupId === groupId) {
      // Prefer the previous group in the same column, then the column to the
      // left, then the first remaining group.
      const sourceCol = state.columns[colIdx];
      if (!sourceCol) return;
      const sourceIdxInCol = sourceCol.indexOf(groupId);
      nextActive =
        sourceCol[sourceIdxInCol - 1] ??
        filteredColumns[Math.max(0, colIdx - 1)]?.[0] ??
        filteredColumns[0]?.[0] ??
        null;
    }
    setState({
      ...state,
      leaves,
      groups,
      columns: filteredColumns,
      activeGroupId: nextActive,
    });
  },

  goBack(leafId: LeafId): boolean {
    const slot = navHistory.get(leafId);
    if (!slot || slot.cursor <= 0) return false;
    slot.cursor -= 1;
    const entry = slot.entries[slot.cursor];
    if (!entry) return false;
    const leaf = state.leaves.get(leafId);
    if (!leaf) return false;
    const desired: LeafState = {
      type: "markdown",
      path: entry.path,
      mode: leaf.state.type === "markdown" ? leaf.state.mode : "source",
      ...(entry.fragment ? { fragment: entry.fragment } : {}),
    };
    setState({ ...state, leaves: new Map(state.leaves).set(leaf.id, { ...leaf, state: desired }) });
    return true;
  },

  goForward(leafId: LeafId): boolean {
    const slot = navHistory.get(leafId);
    if (!slot || slot.cursor >= slot.entries.length - 1) return false;
    slot.cursor += 1;
    const entry = slot.entries[slot.cursor];
    if (!entry) return false;
    const leaf = state.leaves.get(leafId);
    if (!leaf) return false;
    const desired: LeafState = {
      type: "markdown",
      path: entry.path,
      mode: leaf.state.type === "markdown" ? leaf.state.mode : "source",
      ...(entry.fragment ? { fragment: entry.fragment } : {}),
    };
    setState({ ...state, leaves: new Map(state.leaves).set(leaf.id, { ...leaf, state: desired }) });
    return true;
  },

  canGoBack(leafId: LeafId): boolean {
    const slot = navHistory.get(leafId);
    return !!slot && slot.cursor > 0;
  },

  canGoForward(leafId: LeafId): boolean {
    const slot = navHistory.get(leafId);
    return !!slot && slot.cursor < slot.entries.length - 1;
  },

  reset(): void {
    counter = 0;
    navHistory.clear();
    state = buildInitial();
    emit();
  },

  /**
   * Replace the entire workspace state with a snapshot. Two shapes accepted:
   *  - new: `columns: [[group, …], …]` for nested layouts;
   *  - legacy: `groups: [group, …]` flattens into one column per group.
   */
  hydrate(
    snapshot:
      | {
          shape?: "columns";
          columns: ReadonlyArray<
            ReadonlyArray<{
              leaves: ReadonlyArray<LeafState>;
              activeIndex: number;
              stacked?: boolean;
            }>
          >;
          activeGroupIndex: number;
        }
      | {
          shape?: "legacy";
          groups: ReadonlyArray<{
            leaves: ReadonlyArray<LeafState>;
            activeIndex: number;
            stacked?: boolean;
          }>;
          activeGroupIndex: number;
        },
  ): boolean {
    const isLegacy = "groups" in snapshot && !("columns" in snapshot);
    const cols = isLegacy ? snapshot.groups.map((g) => [g]) : snapshot.columns;
    if (cols.length === 0) return false;

    navHistory.clear();
    const leaves = new Map<LeafId, Leaf>();
    const groups = new Map<TabGroupId, TabGroup>();
    const columns: TabGroupId[][] = [];
    for (const col of cols) {
      const colGroups: TabGroupId[] = [];
      for (const g of col) {
        if (g.leaves.length === 0) continue;
        const groupId = newId("g");
        const leafIds: LeafId[] = [];
        for (const leafState of g.leaves) {
          const id = newId("l");
          leafIds.push(id);
          leaves.set(id, { id, state: leafState });
        }
        const activeLeafId =
          leafIds[Math.max(0, Math.min(leafIds.length - 1, g.activeIndex))] ?? null;
        const newGroup: TabGroup = {
          id: groupId,
          leafIds,
          activeLeafId,
          ...(g.stacked ? { stacked: true } : {}),
        };
        groups.set(groupId, newGroup);
        colGroups.push(groupId);
      }
      if (colGroups.length > 0) columns.push(colGroups);
    }
    if (columns.length === 0) return false;
    const flat = flatten(columns);
    const activeGroupId =
      flat[Math.max(0, Math.min(flat.length - 1, snapshot.activeGroupIndex))] ?? null;
    state = { leaves, groups, columns, rootGroupIds: flat, activeGroupId };
    emit();
    return true;
  },

  moveTab(leafId: LeafId, targetGroupId: TabGroupId, beforeLeafId: LeafId | null): void {
    let sourceGroupId: TabGroupId | null = null;
    for (const [gid, g] of state.groups) {
      if (g.leafIds.includes(leafId)) {
        sourceGroupId = gid;
        break;
      }
    }
    if (!sourceGroupId) return;
    const targetGroup = state.groups.get(targetGroupId);
    if (!targetGroup) return;
    if (sourceGroupId === targetGroupId && beforeLeafId === leafId) return;
    if (
      sourceGroupId === targetGroupId &&
      beforeLeafId === null &&
      targetGroup.leafIds[targetGroup.leafIds.length - 1] === leafId
    ) {
      return;
    }

    const leaves = new Map(state.leaves);
    const groups = new Map(state.groups);

    const sourceGroup = groups.get(sourceGroupId);
    if (!sourceGroup) return;
    const sourceLeafIds = sourceGroup.leafIds.filter((id) => id !== leafId);
    let sourceActive: LeafId | null = sourceGroup.activeLeafId;
    if (sourceActive === leafId) {
      const idx = sourceGroup.leafIds.indexOf(leafId);
      sourceActive = sourceLeafIds[idx] ?? sourceLeafIds[idx - 1] ?? null;
    }
    groups.set(sourceGroupId, {
      ...sourceGroup,
      leafIds: sourceLeafIds,
      activeLeafId: sourceActive,
    });

    const refreshedTarget =
      sourceGroupId === targetGroupId ? groups.get(targetGroupId) : targetGroup;
    if (!refreshedTarget) return;
    let insertIdx = refreshedTarget.leafIds.length;
    if (beforeLeafId) {
      const at = refreshedTarget.leafIds.indexOf(beforeLeafId);
      if (at !== -1) insertIdx = at;
    }
    const nextTargetIds = [
      ...refreshedTarget.leafIds.slice(0, insertIdx),
      leafId,
      ...refreshedTarget.leafIds.slice(insertIdx),
    ];
    groups.set(targetGroupId, {
      ...refreshedTarget,
      leafIds: nextTargetIds,
      activeLeafId: leafId,
    });

    let columns = state.columns.map((c) => [...c]);
    const activeGroupId: TabGroupId | null = targetGroupId;
    const sourceGroupAfter = groups.get(sourceGroupId);
    if (!sourceGroupAfter) return;
    if (
      sourceGroupId !== targetGroupId &&
      sourceGroupAfter.leafIds.length === 0 &&
      flatten(columns).length > 1
    ) {
      groups.delete(sourceGroupId);
      columns = columns
        .map((c) => c.filter((g) => g !== sourceGroupId))
        .filter((c) => c.length > 0);
    } else if (sourceGroupAfter.leafIds.length === 0 && flatten(columns).length === 1) {
      const emptyId = newId("l");
      leaves.set(emptyId, { id: emptyId, state: { type: "empty" } });
      groups.set(sourceGroupId, {
        ...sourceGroupAfter,
        leafIds: [emptyId],
        activeLeafId: emptyId,
      });
    }

    setState({ ...state, leaves, groups, columns, activeGroupId });
  },
};

export type { TabGroupId };
