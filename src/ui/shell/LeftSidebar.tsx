import { Bookmark, Files, Search, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { FileExplorerView } from "../views/file-explorer/FileExplorerView";
import { BookmarksView } from "../views/sidebar/BookmarksView";
import { SearchView } from "../views/sidebar/SearchView";
import { TagsView } from "../views/sidebar/TagsView";
import { VaultProfile } from "./VaultProfile";

const SIDEBAR_TABS = [
  { id: "explorer", label: "Files", icon: <Files /> },
  { id: "search", label: "Search", icon: <Search /> },
  { id: "bookmarks", label: "Bookmarks", icon: <Bookmark /> },
  { id: "tags", label: "Tags", icon: <Tag /> },
] as const;

type SidebarTabId = (typeof SIDEBAR_TABS)[number]["id"];

export function LeftSidebar() {
  const [active, setActive] = useState<SidebarTabId>("explorer");

  useEffect(() => {
    const onSelect = (e: Event) => {
      const ce = e as CustomEvent<{ side: "left" | "right"; id: string }>;
      if (ce.detail.side !== "left") return;
      const matching = SIDEBAR_TABS.find((t) => t.id === ce.detail.id);
      if (matching) setActive(matching.id);
    };
    window.addEventListener("granite:select-sidebar-tab", onSelect);
    return () => window.removeEventListener("granite:select-sidebar-tab", onSelect);
  }, []);

  return (
    <div className="workspace-split mod-left-split mod-horizontal">
      <div className="workspace-sidebar-inner">
        <div className="workspace-sidebar-tabs">
          {SIDEBAR_TABS.map((t) => (
            <ClickableIcon
              key={t.id}
              ariaLabel={t.label}
              icon={t.icon}
              active={active === t.id}
              onClick={() => setActive(t.id)}
            />
          ))}
        </div>
        <div className="workspace-sidebar-content" data-active-tab={active}>
          {active === "explorer" && <FileExplorerView />}
          {active === "search" && <SearchView />}
          {active === "bookmarks" && <BookmarksView />}
          {active === "tags" && <TagsView />}
        </div>
        <VaultProfile />
      </div>
      <div className="workspace-leaf-resize-handle" />
    </div>
  );
}