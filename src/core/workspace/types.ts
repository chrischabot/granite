import type { VaultPath } from "@core/fs/types";

export type LeafId = string;
export type TabGroupId = string;

/** Markdown editor view modes. */
export type MarkdownViewMode = "source" | "live-preview" | "reading";

/** Per-leaf state — type-discriminated. */
export type LeafState =
  | { readonly type: "empty" }
  | { readonly type: "file-explorer" }
  | {
      readonly type: "markdown";
      readonly path: VaultPath;
      readonly mode: MarkdownViewMode;
      /** Cursor offset (CodeMirror) — restored on tab focus. */
      readonly cursorOffset?: number;
      /** Folded CodeMirror document ranges, persisted with the workspace. */
      readonly folds?: ReadonlyArray<{ readonly from: number; readonly to: number }>;
      /** Set true to disable replace-on-link (pinned tabs). */
      readonly pinned?: boolean;
      /** Heading or block fragment to scroll to (without the leading `#` or `#^`). */
      readonly fragment?: string;
    }
  | { readonly type: "settings" }
  | { readonly type: "webviewer"; readonly url: string }
  | { readonly type: "graph" }
  | { readonly type: "canvas"; readonly path?: string }
  | { readonly type: "bases"; readonly path?: string }
  | { readonly type: "sidebar"; readonly side: "left" | "right"; readonly id: string };

export interface Leaf {
  readonly id: LeafId;
  readonly state: LeafState;
}

export interface TabGroup {
  readonly id: TabGroupId;
  readonly leafIds: ReadonlyArray<LeafId>;
  readonly activeLeafId: LeafId | null;
  /** When true, render tabs as a vertical stacked column instead of a row strip. */
  readonly stacked?: boolean;
}

export interface WorkspaceState {
  readonly leaves: ReadonlyMap<LeafId, Leaf>;
  readonly groups: ReadonlyMap<TabGroupId, TabGroup>;
  /**
   * Columns of groups. Each column is a vertical stack of one or more groups
   * arranged top-to-bottom; columns themselves are arranged left-to-right.
   * `rootGroupIds` is derived from this and equals `columns.flat()` in the
   * canonical reading order.
   */
  readonly columns: ReadonlyArray<ReadonlyArray<TabGroupId>>;
  readonly rootGroupIds: ReadonlyArray<TabGroupId>;
  readonly activeGroupId: TabGroupId | null;
}

/** Display title for a leaf (filename, view name, etc.). */
export function leafTitle(leaf: Leaf): string {
  const s = leaf.state;
  switch (s.type) {
    case "markdown": {
      const last = s.path.split("/").pop() ?? "Untitled";
      return last.replace(/\.md$/i, "");
    }
    case "file-explorer":
      return "Files";
    case "settings":
      return "Settings";
    case "webviewer": {
      try {
        return new URL(s.url).host;
      } catch {
        return "Web viewer";
      }
    }
    case "graph":
      return "Graph view";
    case "canvas":
      return s.path
        ? (s.path
            .split("/")
            .pop()
            ?.replace(/\.canvas$/i, "") ?? "Canvas")
        : "Canvas";
    case "bases":
      return s.path
        ? (s.path
            .split("/")
            .pop()
            ?.replace(/\.base$/i, "") ?? "Base")
        : "Base";
    case "sidebar":
      return s.id
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    case "empty":
      return "New tab";
  }
}
