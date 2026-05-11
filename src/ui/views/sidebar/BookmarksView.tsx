import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Heading,
  Search as SearchIcon,
  SquareStack,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClickableIcon } from "@/ui/controls/ClickableIcon";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { stem } from "@core/fs/path";
import { setSearchQuery } from "./SearchView";
import { useFileMetadata } from "@core/metadata/useMetadata";
import { noticeManager } from "@core/notices/notice";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { useVault } from "@/ui/vault/VaultContext";

type BookmarkKind = "file" | "heading" | "block" | "search";

interface BookmarkBase {
  readonly kind: BookmarkKind;
  readonly title: string;
  readonly addedMs: number;
  /** Group folder name. Empty/undefined means the default "Bookmarks" group. */
  readonly group?: string;
}

interface FileBookmark extends BookmarkBase {
  readonly kind: "file";
  readonly path: string;
}
interface HeadingBookmark extends BookmarkBase {
  readonly kind: "heading";
  readonly path: string;
  readonly heading: string;
}
interface BlockBookmark extends BookmarkBase {
  readonly kind: "block";
  readonly path: string;
  readonly blockId: string;
}
interface SearchBookmark extends BookmarkBase {
  readonly kind: "search";
  readonly query: string;
}
type Bookmark = FileBookmark | HeadingBookmark | BlockBookmark | SearchBookmark;

const STORAGE_KEY = "granite.bookmarks.v3";
const LEGACY_KEY_V2 = "granite.bookmarks.v2";
const LEGACY_KEY_V1 = "granite.bookmarks.v1";
const GROUPS_KEY = "granite.bookmark-groups.v1";
const DISK_CONFIG_NAME = "bookmarks";
const DEFAULT_GROUP = "Bookmarks";

function load(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Bookmark[];
    const v2 = localStorage.getItem(LEGACY_KEY_V2);
    if (v2) {
      const list = JSON.parse(v2) as Bookmark[];
      return list.map((b) => ({ ...b }));
    }
    const v1 = localStorage.getItem(LEGACY_KEY_V1);
    if (v1) {
      const list = JSON.parse(v1) as Array<{ title: string; path: string; addedMs: number }>;
      return list.map((b) => ({
        kind: "file" as const,
        title: b.title,
        path: b.path,
        addedMs: b.addedMs,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function save(list: Bookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

function loadExtraGroups(): string[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function saveExtraGroups(list: ReadonlyArray<string>): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify([...list]));
  } catch {
    /* noop */
  }
}

const ICON_FOR_KIND: Record<BookmarkKind, LucideIcon> = {
  file: BookmarkPlus,
  heading: Heading,
  block: SquareStack,
  search: SearchIcon,
};

interface BookmarksDocument {
  bookmarks: Bookmark[];
  extraGroups: string[];
}

export function BookmarksView() {
  const { activeVault } = useVault();
  const { activeGroupId, groups, leaves } = useWorkspace();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(load);
  const [extraGroups, setExtraGroups] = useState<string[]>(loadExtraGroups);
  const [hydratedFromDisk, setHydratedFromDisk] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<string>(DEFAULT_GROUP);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);

  useEffect(() => {
    save(bookmarks);
    if (activeVault && hydratedFromDisk) {
      void writeConfigJson(DISK_CONFIG_NAME, {
        bookmarks,
        extraGroups,
      } satisfies BookmarksDocument).catch(() => {
        /* non-fatal */
      });
    }
  }, [bookmarks, extraGroups, activeVault, hydratedFromDisk]);

  useEffect(() => {
    saveExtraGroups(extraGroups);
  }, [extraGroups]);

  // On vault open, try to hydrate from `.granite/bookmarks.json`.
  useEffect(() => {
    if (!activeVault) {
      setHydratedFromDisk(false);
      return;
    }
    let cancelled = false;
    void readConfigJson<BookmarksDocument>(DISK_CONFIG_NAME).then((doc) => {
      if (cancelled) return;
      if (doc) {
        if (Array.isArray(doc.bookmarks)) setBookmarks(doc.bookmarks);
        if (Array.isArray(doc.extraGroups)) setExtraGroups(doc.extraGroups);
      }
      setHydratedFromDisk(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeVault]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const groupedBookmarks = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    for (const b of bookmarks) {
      const g = b.group?.trim() || DEFAULT_GROUP;
      const arr = map.get(g) ?? [];
      arr.push(b);
      map.set(g, arr);
    }
    for (const g of extraGroups) {
      if (!map.has(g)) map.set(g, []);
    }
    if (!map.has(DEFAULT_GROUP)) map.set(DEFAULT_GROUP, []);
    return [...map.entries()];
  }, [bookmarks, extraGroups]);

  const addFile = useCallback(() => {
    if (!activePath) return;
    setBookmarks((prev) => {
      if (prev.some((b) => b.kind === "file" && b.path === activePath && (b.group ?? DEFAULT_GROUP) === activeGroup)) return prev;
      return [
        ...prev,
        {
          kind: "file",
          title: stem(activePath),
          path: activePath,
          addedMs: Date.now(),
          group: activeGroup,
        },
      ];
    });
  }, [activePath, activeGroup]);

  const addHeading = useCallback(() => {
    if (!activePath || !meta || meta.headings.length === 0) {
      noticeManager.show("This note has no headings to bookmark.", { kind: "warning" });
      return;
    }
    const labels = meta.headings.map((h, i) => `${i + 1}. ${h.text}`).join("\n");
    const pick = prompt(`Pick a heading:\n${labels}\n\nEnter number:`);
    const n = pick ? parseInt(pick, 10) - 1 : -1;
    const h = meta.headings[n];
    if (!h) return;
    setBookmarks((prev) => [
      ...prev,
      {
        kind: "heading",
        title: `${stem(activePath)} › ${h.text}`,
        path: activePath,
        heading: h.text,
        addedMs: Date.now(),
        group: activeGroup,
      },
    ]);
  }, [activePath, meta, activeGroup]);

  const addBlock = useCallback(() => {
    if (!activePath || !meta || meta.blocks.length === 0) {
      noticeManager.show("No block IDs in this note. Use the 'Insert block id' command first.", {
        kind: "warning",
      });
      return;
    }
    const labels = meta.blocks
      .map((b, i) => `${i + 1}. ^${b.id} (line ${b.line + 1})`)
      .join("\n");
    const pick = prompt(`Pick a block id:\n${labels}\n\nEnter number:`);
    const n = pick ? parseInt(pick, 10) - 1 : -1;
    const blk = meta.blocks[n];
    if (!blk) return;
    setBookmarks((prev) => [
      ...prev,
      {
        kind: "block",
        title: `${stem(activePath)} › ^${blk.id}`,
        path: activePath,
        blockId: blk.id,
        addedMs: Date.now(),
        group: activeGroup,
      },
    ]);
  }, [activePath, meta, activeGroup]);

  const addSearch = useCallback(() => {
    const query = prompt("Search query to bookmark:", "");
    if (!query) return;
    setBookmarks((prev) => [
      ...prev,
      {
        kind: "search",
        title: query,
        query,
        addedMs: Date.now(),
        group: activeGroup,
      },
    ]);
  }, [activeGroup]);

  const addGroup = useCallback(() => {
    const name = prompt("New bookmark group name:", "");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setExtraGroups((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setActiveGroup(trimmed);
  }, []);

  const removeBookmarkAt = useCallback((bookmark: Bookmark) => {
    setBookmarks((prev) => prev.filter((b) => b !== bookmark));
  }, []);

  const activate = useCallback((b: Bookmark, newTab: boolean) => {
    switch (b.kind) {
      case "file":
        workspaceStore.openFile(b.path, { newTab });
        break;
      case "heading":
        workspaceStore.openFile(b.path, { newTab, fragment: b.heading });
        break;
      case "block":
        workspaceStore.openFile(b.path, { newTab, fragment: `^${b.blockId}` });
        break;
      case "search":
        setSearchQuery(b.query);
        window.dispatchEvent(
          new CustomEvent("granite:select-sidebar-tab", {
            detail: { side: "left", id: "search" },
          }),
        );
        break;
    }
  }, []);

  const toggleGroupCollapsed = useCallback((name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const allGroupNames = useMemo(() => {
    const set = new Set<string>([DEFAULT_GROUP, ...extraGroups]);
    for (const b of bookmarks) set.add(b.group?.trim() || DEFAULT_GROUP);
    return [...set];
  }, [bookmarks, extraGroups]);

  return (
    <div className="bookmark-pane">
      <div
        className="nav-header"
        style={{ position: "relative", display: "flex", gap: 4, alignItems: "center" }}
      >
        <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <ClickableIcon
            ariaLabel="Add bookmark…"
            icon={
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <BookmarkPlus />
                <ChevronDown size={12} style={{ marginLeft: 1 }} />
              </span>
            }
            onClick={() => setMenuOpen((o) => !o)}
          />
          {menuOpen && (
            <div
              className="menu"
              role="menu"
              style={{
                position: "absolute",
                top: "100%",
                insetInlineStart: 0,
                marginTop: 4,
                minWidth: 240,
                zIndex: 65,
              }}
            >
              <div className="menu-scroll">
                <div
                  className="menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    addFile();
                    setMenuOpen(false);
                  }}
                >
                  <span className="menu-item-icon">
                    <BookmarkPlus size={14} />
                  </span>
                  <span className="menu-item-title">Bookmark current note</span>
                </div>
                <div
                  className="menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    addHeading();
                    setMenuOpen(false);
                  }}
                >
                  <span className="menu-item-icon">
                    <Heading size={14} />
                  </span>
                  <span className="menu-item-title">Bookmark current heading…</span>
                </div>
                <div
                  className="menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    addBlock();
                    setMenuOpen(false);
                  }}
                >
                  <span className="menu-item-icon">
                    <SquareStack size={14} />
                  </span>
                  <span className="menu-item-title">Bookmark a block id…</span>
                </div>
                <div
                  className="menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    addSearch();
                    setMenuOpen(false);
                  }}
                >
                  <span className="menu-item-icon">
                    <SearchIcon size={14} />
                  </span>
                  <span className="menu-item-title">Bookmark a search query…</span>
                </div>
                <div className="menu-separator" />
                <div
                  className="menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => {
                    addGroup();
                    setMenuOpen(false);
                  }}
                >
                  <span className="menu-item-icon">
                    <FolderPlus size={14} />
                  </span>
                  <span className="menu-item-title">New group…</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <select
          value={activeGroup}
          onChange={(e) => setActiveGroup(e.currentTarget.value)}
          className="dropdown"
          title="New bookmarks land in this group"
          style={{ flex: "1 1 auto", minWidth: 0 }}
        >
          {allGroupNames.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      {bookmarks.length === 0 && extraGroups.length === 0 ? (
        <div className="workspace-sidedock-empty-state">No bookmarks yet.</div>
      ) : (
        <div className="nav-files-container">
          {groupedBookmarks.map(([groupName, items]) => {
            const collapsed = collapsedGroups.has(groupName);
            return (
              <div key={groupName} className="bookmark-group" style={{ marginBottom: 4 }}>
                <div
                  className="tree-item-self mod-collapsible"
                  style={{
                    paddingInlineStart: 8,
                    fontWeight: "var(--font-semibold)",
                    color: "var(--text-muted)",
                  }}
                  onClick={() => toggleGroupCollapsed(groupName)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroupCollapsed(groupName);
                    }
                  }}
                >
                  <span
                    className={`collapse-icon ${collapsed ? "is-collapsed" : ""}`}
                    style={{ marginInlineEnd: 4 }}
                  >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                  <span className="tree-item-inner">
                    <span className="tree-item-inner-text">{groupName}</span>
                  </span>
                  <span
                    className="tree-item-flair-outer"
                    style={{ marginInlineStart: "auto" }}
                  >
                    <span className="tree-item-flair">{items.length}</span>
                  </span>
                </div>
                {!collapsed &&
                  items.map((b) => {
                    const Icon = ICON_FOR_KIND[b.kind];
                    return (
                      <div
                        key={`${b.kind}-${b.addedMs}-${b.title}`}
                        className="tree-item-self is-clickable"
                        style={{
                          paddingInlineStart: 28,
                          paddingTop: 6,
                          paddingBottom: 6,
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--size-4-2)",
                        }}
                        onClick={(e) => activate(b, e.metaKey || e.ctrlKey)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activate(b, e.metaKey || e.ctrlKey);
                          }
                        }}
                      >
                        <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
                          <Icon size={14} />
                        </span>
                        <span className="tree-item-inner" style={{ flex: 1, minWidth: 0 }}>
                          <span className="tree-item-inner-text">{b.title}</span>
                        </span>
                        <button
                          type="button"
                          aria-label="Remove bookmark"
                          className="clickable-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBookmarkAt(b);
                          }}
                          style={{ marginInlineStart: "auto", padding: 2 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}