import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bookmark,
  Files,
  Hash,
  History,
  List,
  ListChecks,
  ListTree,
  Network,
  Search,
  Tag,
} from "lucide-react";
import type { ReactNode } from "react";
import { FileExplorerView } from "../file-explorer/FileExplorerView";
import { AllPropertiesView } from "./AllPropertiesView";
import { BacklinksView } from "./BacklinksView";
import { BookmarksView } from "./BookmarksView";
import { FootnotesView } from "./FootnotesView";
import { LocalGraphView } from "./LocalGraphView";
import { OutgoingLinksView } from "./OutgoingLinksView";
import { OutlineView } from "./OutlineView";
import { PropertiesView } from "./PropertiesView";
import { RecentsView } from "./RecentsView";
import { SearchView } from "./SearchView";
import { TagsView } from "./TagsView";

export type SidebarSide = "left" | "right";

export interface SidebarTabDefinition {
  readonly id: string;
  readonly labelKey: string;
  readonly icon: ReactNode;
  render(): ReactNode;
}

export const LEFT_SIDEBAR_TABS = [
  {
    id: "explorer",
    labelKey: "sidebar.tab.files",
    icon: <Files />,
    render: () => <FileExplorerView />,
  },
  { id: "search", labelKey: "sidebar.tab.search", icon: <Search />, render: () => <SearchView /> },
  {
    id: "bookmarks",
    labelKey: "sidebar.tab.bookmarks",
    icon: <Bookmark />,
    render: () => <BookmarksView />,
  },
  { id: "tags", labelKey: "sidebar.tab.tags", icon: <Tag />, render: () => <TagsView /> },
] as const satisfies ReadonlyArray<SidebarTabDefinition>;

export const RIGHT_SIDEBAR_TABS = [
  {
    id: "backlinks",
    labelKey: "sidebar.tab.backlinks",
    icon: <ArrowDownToLine />,
    render: () => <BacklinksView />,
  },
  {
    id: "outgoing",
    labelKey: "sidebar.tab.outgoing",
    icon: <ArrowUpFromLine />,
    render: () => <OutgoingLinksView />,
  },
  {
    id: "outline",
    labelKey: "sidebar.tab.outline",
    icon: <ListTree />,
    render: () => <OutlineView />,
  },
  {
    id: "recents",
    labelKey: "sidebar.tab.recents",
    icon: <History />,
    render: () => <RecentsView />,
  },
  {
    id: "graph",
    labelKey: "sidebar.tab.localGraph",
    icon: <Network />,
    render: () => <LocalGraphView />,
  },
  {
    id: "properties",
    labelKey: "sidebar.tab.fileProperties",
    icon: <List />,
    render: () => <PropertiesView />,
  },
  {
    id: "all-properties",
    labelKey: "sidebar.tab.allProperties",
    icon: <ListChecks />,
    render: () => <AllPropertiesView />,
  },
  {
    id: "footnotes",
    labelKey: "sidebar.tab.footnotes",
    icon: <Hash />,
    render: () => <FootnotesView />,
  },
] as const satisfies ReadonlyArray<SidebarTabDefinition>;

export function sidebarTabsForSide(side: SidebarSide): ReadonlyArray<SidebarTabDefinition> {
  return side === "left" ? LEFT_SIDEBAR_TABS : RIGHT_SIDEBAR_TABS;
}

export function findSidebarTab(side: SidebarSide, id: string): SidebarTabDefinition | null {
  return sidebarTabsForSide(side).find((tab) => tab.id === id) ?? null;
}
