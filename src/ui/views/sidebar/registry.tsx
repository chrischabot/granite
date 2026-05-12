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
  readonly label: string;
  readonly icon: ReactNode;
  render(): ReactNode;
}

export const LEFT_SIDEBAR_TABS = [
  { id: "explorer", label: "Files", icon: <Files />, render: () => <FileExplorerView /> },
  { id: "search", label: "Search", icon: <Search />, render: () => <SearchView /> },
  { id: "bookmarks", label: "Bookmarks", icon: <Bookmark />, render: () => <BookmarksView /> },
  { id: "tags", label: "Tags", icon: <Tag />, render: () => <TagsView /> },
] as const satisfies ReadonlyArray<SidebarTabDefinition>;

export const RIGHT_SIDEBAR_TABS = [
  {
    id: "backlinks",
    label: "Backlinks",
    icon: <ArrowDownToLine />,
    render: () => <BacklinksView />,
  },
  {
    id: "outgoing",
    label: "Outgoing links",
    icon: <ArrowUpFromLine />,
    render: () => <OutgoingLinksView />,
  },
  { id: "outline", label: "Outline", icon: <ListTree />, render: () => <OutlineView /> },
  { id: "recents", label: "Recent files", icon: <History />, render: () => <RecentsView /> },
  { id: "graph", label: "Local graph", icon: <Network />, render: () => <LocalGraphView /> },
  { id: "properties", label: "File properties", icon: <List />, render: () => <PropertiesView /> },
  {
    id: "all-properties",
    label: "All properties (vault)",
    icon: <ListChecks />,
    render: () => <AllPropertiesView />,
  },
  { id: "footnotes", label: "Footnotes", icon: <Hash />, render: () => <FootnotesView /> },
] as const satisfies ReadonlyArray<SidebarTabDefinition>;

export function sidebarTabsForSide(side: SidebarSide): ReadonlyArray<SidebarTabDefinition> {
  return side === "left" ? LEFT_SIDEBAR_TABS : RIGHT_SIDEBAR_TABS;
}

export function findSidebarTab(side: SidebarSide, id: string): SidebarTabDefinition | null {
  return sidebarTabsForSide(side).find((tab) => tab.id === id) ?? null;
}
