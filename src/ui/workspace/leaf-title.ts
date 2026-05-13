import type { Leaf } from "@core/workspace/types";

type Translate = (key: string, params?: Record<string, string>) => string;

const SIDEBAR_TITLE_KEYS: Record<string, string> = {
  files: "sidebar.tab.files",
  search: "sidebar.tab.search",
  bookmarks: "sidebar.tab.bookmarks",
  tags: "sidebar.tab.tags",
  backlinks: "sidebar.tab.backlinks",
  outgoing: "sidebar.tab.outgoing",
  outline: "sidebar.tab.outline",
  recents: "sidebar.tab.recents",
  "local-graph": "sidebar.tab.localGraph",
  "file-properties": "sidebar.tab.fileProperties",
  "all-properties": "sidebar.tab.allProperties",
  footnotes: "sidebar.tab.footnotes",
};

export function displayLeafTitle(leaf: Leaf, t: Translate): string {
  const s = leaf.state;
  switch (s.type) {
    case "markdown": {
      const last = s.path.split("/").pop() ?? t("workspace.leaf.untitled");
      return last.replace(/\.md$/i, "");
    }
    case "file-explorer":
      return t("workspace.leaf.files");
    case "settings":
      return t("workspace.leaf.settings");
    case "webviewer": {
      try {
        return new URL(s.url).host;
      } catch {
        return t("workspace.leaf.webViewer");
      }
    }
    case "asset":
      return s.path.split("/").pop() ?? t("workspace.leaf.asset");
    case "graph":
      return t("workspace.leaf.graph");
    case "canvas":
      return s.path
        ? (s.path
            .split("/")
            .pop()
            ?.replace(/\.canvas$/i, "") ?? t("workspace.leaf.canvas"))
        : t("workspace.leaf.canvas");
    case "bases":
      return s.path
        ? (s.path
            .split("/")
            .pop()
            ?.replace(/\.base$/i, "") ?? t("workspace.leaf.base"))
        : t("workspace.leaf.base");
    case "sidebar":
      return t(SIDEBAR_TITLE_KEYS[s.id] ?? "workspace.leaf.sidebar", { id: s.id });
    case "empty":
      return t("workspace.leaf.newTab");
  }
}
