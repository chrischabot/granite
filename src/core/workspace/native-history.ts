import { workspaceStore } from "./store";
import type { LeafState } from "./types";

const HISTORY_FLAG = "__granite_history__";

interface HistoryStateBlob {
  [HISTORY_FLAG]: true;
  leaf: LeafState;
}

function isPopout(): boolean {
  return new URLSearchParams(window.location.search).get("popout") === "1";
}

function buildUrlForLeaf(leaf: LeafState): string {
  const url = new URL(window.location.href);
  url.search = ""; // clear existing params
  switch (leaf.type) {
    case "markdown":
      url.searchParams.set("path", leaf.path);
      if (leaf.fragment) url.searchParams.set("fragment", leaf.fragment);
      break;
    case "graph":
      url.searchParams.set("graph", "1");
      break;
    case "webviewer":
      url.searchParams.set("web", leaf.url);
      break;
    case "asset":
      url.searchParams.set("asset", leaf.path);
      url.searchParams.set("kind", leaf.kind);
      break;
    case "canvas":
      url.searchParams.set("canvas", leaf.path ?? "");
      break;
    case "bases":
      url.searchParams.set("base", leaf.path ?? "");
      break;
    default:
      // empty / file-explorer / settings — clear params.
      break;
  }
  url.hash = "";
  return url.toString();
}

let suppressNextPush = false;
let lastUrl = "";

function activeLeafState(): LeafState | null {
  const s = workspaceStore.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  if (!group?.activeLeafId) return null;
  return s.leaves.get(group.activeLeafId)?.state ?? null;
}

function applyLeafState(leaf: LeafState): void {
  switch (leaf.type) {
    case "markdown":
      workspaceStore.openFile(leaf.path, {
        ...(leaf.fragment ? { fragment: leaf.fragment } : {}),
        mode: leaf.mode,
      });
      break;
    case "graph":
      workspaceStore.openGraph();
      break;
    case "webviewer":
      workspaceStore.openWebviewer(leaf.url);
      break;
    case "asset":
      workspaceStore.openAsset({ path: leaf.path, kind: leaf.kind });
      break;
    case "canvas":
      workspaceStore.openCanvas(leaf.path ? { path: leaf.path } : {});
      break;
    case "bases":
      workspaceStore.openBase(leaf.path ? { path: leaf.path } : {});
      break;
    default:
      break;
  }
}

/**
 * Activate native history binding. Returns a disposer that detaches all
 * listeners. Skips entirely when in a pop-out window.
 */
export function bindNativeHistory(): () => void {
  if (isPopout()) return () => undefined;

  const update = () => {
    if (suppressNextPush) {
      suppressNextPush = false;
      return;
    }
    const leaf = activeLeafState();
    if (!leaf) return;
    const url = buildUrlForLeaf(leaf);
    if (url === lastUrl) return;
    lastUrl = url;
    const blob: HistoryStateBlob = { [HISTORY_FLAG]: true, leaf };
    try {
      window.history.pushState(blob, "", url);
    } catch {
      /* navigation blocked (e.g. cross-origin); ignore */
    }
  };

  const onPopState = (e: PopStateEvent) => {
    const state = e.state as HistoryStateBlob | null;
    if (!state || !state[HISTORY_FLAG] || !state.leaf) return;
    suppressNextPush = true;
    lastUrl = buildUrlForLeaf(state.leaf);
    applyLeafState(state.leaf);
  };

  // Replace the initial entry with a tagged state so back+forward returns to
  // the current leaf.
  const initial = activeLeafState();
  if (initial) {
    lastUrl = buildUrlForLeaf(initial);
    try {
      window.history.replaceState(
        { [HISTORY_FLAG]: true, leaf: initial } as HistoryStateBlob,
        "",
        lastUrl,
      );
    } catch {
      /* ignore */
    }
  }

  const unsub = workspaceStore.subscribe(update);
  window.addEventListener("popstate", onPopState);
  return () => {
    unsub();
    window.removeEventListener("popstate", onPopState);
  };
}
