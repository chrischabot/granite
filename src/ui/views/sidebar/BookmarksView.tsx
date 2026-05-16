import { ClickableIcon } from "@/ui/controls/ClickableIcon";
import { useI18n } from "@/ui/i18n/useI18n";
import { inputPrompt } from "@/ui/overlay/inputPrompt";
import { useVault } from "@/ui/vault/VaultContext";
import { stem } from "@core/fs/path";
import { getDefaultLocaleText } from "@core/i18n";
import { useFileMetadata } from "@core/metadata/useMetadata";
import { noticeManager } from "@core/notices/notice";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Heading,
  type LucideIcon,
  Search as SearchIcon,
  SquareStack,
  Trash2,
} from "lucide-react";
import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { setSearchQuery } from "./SearchView";

type BookmarkKind = "file" | "heading" | "block" | "search";

interface BookmarkBase {
  readonly kind: BookmarkKind;
  readonly title: string;
  readonly addedMs: number;
  /** Group folder name. Empty/undefined means the localized default group. */
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
const DEFAULT_GROUP = "__granite_default_bookmarks__";
const LEGACY_DEFAULT_GROUP = getDefaultLocaleText("bookmarks.defaultGroup");
const MENU_BUTTON_STYLE = {
  width: "100%",
  border: 0,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "inherit",
  boxShadow: "none",
} satisfies CSSProperties;

function normalizeGroupName(group: string | undefined): string {
  const trimmed = group?.trim();
  if (!trimmed || trimmed === LEGACY_DEFAULT_GROUP) return DEFAULT_GROUP;
  return trimmed;
}

function persistedGroupName(group: string): string | undefined {
  return group === DEFAULT_GROUP ? undefined : group;
}

function bookmarkGroupProps(group: string): Pick<BookmarkBase, "group"> | Record<string, never> {
  const persisted = persistedGroupName(group);
  return persisted ? { group: persisted } : {};
}

function normalizeBookmark<T extends Bookmark>(bookmark: T): T {
  const group = persistedGroupName(normalizeGroupName(bookmark.group));
  if (group === bookmark.group) return bookmark;
  const { group: previousGroup, ...rest } = bookmark;
  void previousGroup;
  return (group ? { ...rest, group } : rest) as T;
}

function normalizeBookmarks(list: Bookmark[]): Bookmark[] {
  return list.map(normalizeBookmark);
}

function load(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeBookmarks(JSON.parse(raw) as Bookmark[]);
    const v2 = localStorage.getItem(LEGACY_KEY_V2);
    if (v2) {
      const list = JSON.parse(v2) as Bookmark[];
      return normalizeBookmarks(list.map((b) => ({ ...b })));
    }
    const v1 = localStorage.getItem(LEGACY_KEY_V1);
    if (v1) {
      const list = JSON.parse(v1) as Array<{ title: string; path: string; addedMs: number }>;
      return normalizeBookmarks(
        list.map((b) => ({
          kind: "file" as const,
          title: b.title,
          path: b.path,
          addedMs: b.addedMs,
        })),
      );
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
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const addMenuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const t = useI18n();
  const displayGroupName = useCallback(
    (name: string) => (name === DEFAULT_GROUP ? t("bookmarks.defaultGroup") : name),
    [t],
  );

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
        if (Array.isArray(doc.bookmarks)) setBookmarks(normalizeBookmarks(doc.bookmarks));
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

  useEffect(() => {
    if (!menuOpen) {
      menuItemRefs.current.length = 0;
      return;
    }
    setActiveMenuIndex(0);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    menuItemRefs.current[activeMenuIndex]?.focus();
  }, [menuOpen, activeMenuIndex]);

  const groupedBookmarks = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    for (const b of bookmarks) {
      const g = normalizeGroupName(b.group);
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
      if (
        prev.some(
          (b) =>
            b.kind === "file" &&
            b.path === activePath &&
            normalizeGroupName(b.group) === activeGroup,
        )
      )
        return prev;
      return [
        ...prev,
        {
          kind: "file",
          title: stem(activePath),
          path: activePath,
          addedMs: Date.now(),
          ...bookmarkGroupProps(activeGroup),
        },
      ];
    });
  }, [activePath, activeGroup]);

  const addHeading = useCallback(async () => {
    if (!activePath || !meta || meta.headings.length === 0) {
      noticeManager.show(t("bookmarks.notice.noHeadings"), { kind: "warning" });
      return;
    }
    const labels = meta.headings.map((h, i) => `${i + 1}. ${h.text}`).join("\n");
    const pick = await inputPrompt({ title: t("bookmarks.prompt.pickHeading", { labels }) });
    const n = pick ? Number.parseInt(pick, 10) - 1 : -1;
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
        ...bookmarkGroupProps(activeGroup),
      },
    ]);
  }, [activePath, meta, activeGroup, t]);

  const addBlock = useCallback(async () => {
    if (!activePath || !meta || meta.blocks.length === 0) {
      noticeManager.show(t("bookmarks.notice.noBlocks"), {
        kind: "warning",
      });
      return;
    }
    const labels = meta.blocks
      .map((b, i) => `${i + 1}. ^${b.id} (${t("bookmarks.line", { line: b.line + 1 })})`)
      .join("\n");
    const pick = await inputPrompt({ title: t("bookmarks.prompt.pickBlock", { labels }) });
    const n = pick ? Number.parseInt(pick, 10) - 1 : -1;
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
        ...bookmarkGroupProps(activeGroup),
      },
    ]);
  }, [activePath, meta, activeGroup, t]);

  const addSearch = useCallback(async () => {
    const query = await inputPrompt({
      title: t("bookmarks.prompt.searchQuery"),
      requireValue: true,
    });
    if (!query) return;
    setBookmarks((prev) => [
      ...prev,
      {
        kind: "search",
        title: query,
        query,
        addedMs: Date.now(),
        ...bookmarkGroupProps(activeGroup),
      },
    ]);
  }, [activeGroup, t]);

  const addGroup = useCallback(async () => {
    const name = await inputPrompt({ title: t("bookmarks.prompt.groupName"), requireValue: true });
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setExtraGroups((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setActiveGroup(trimmed);
  }, [t]);

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
    for (const b of bookmarks) set.add(normalizeGroupName(b.group));
    return [...set];
  }, [bookmarks, extraGroups]);

  const bookmarkMenuItems = useMemo(
    () => [
      {
        id: "current-note",
        icon: <BookmarkPlus size={14} />,
        label: t("bookmarks.menu.currentNote"),
        action: addFile,
      },
      {
        id: "current-heading",
        icon: <Heading size={14} />,
        label: t("bookmarks.menu.currentHeading"),
        action: addHeading,
      },
      {
        id: "block",
        icon: <SquareStack size={14} />,
        label: t("bookmarks.menu.block"),
        action: addBlock,
      },
      {
        id: "search",
        icon: <SearchIcon size={14} />,
        label: t("bookmarks.menu.search"),
        action: addSearch,
      },
      {
        id: "new-group",
        icon: <FolderPlus size={14} />,
        label: t("bookmarks.menu.newGroup"),
        action: addGroup,
        separated: true,
      },
    ],
    [addFile, addHeading, addBlock, addSearch, addGroup, t],
  );

  const activateMenuItem = useCallback(
    (index: number) => {
      const item = bookmarkMenuItems[index];
      if (!item) return;
      item.action();
      setMenuOpen(false);
      addMenuButtonRef.current?.focus();
    },
    [bookmarkMenuItems],
  );

  const onMenuKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (bookmarkMenuItems.length === 0) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
        addMenuButtonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMenuIndex((i) => (i + 1) % bookmarkMenuItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMenuIndex((i) => (i - 1 + bookmarkMenuItems.length) % bookmarkMenuItems.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveMenuIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveMenuIndex(bookmarkMenuItems.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateMenuItem(activeMenuIndex);
      }
    },
    [activateMenuItem, activeMenuIndex, bookmarkMenuItems.length],
  );

  return (
    <div className="bookmark-pane">
      <div
        className="nav-header"
        style={{ position: "relative", display: "flex", gap: 4, alignItems: "center" }}
      >
        <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <ClickableIcon
            ref={addMenuButtonRef}
            ariaLabel={t("bookmarks.add")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
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
              onKeyDown={onMenuKeyDown}
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
                {bookmarkMenuItems.map((item, index) => (
                  <Fragment key={item.id}>
                    {item.separated && <div className="menu-separator" />}
                    <button
                      type="button"
                      ref={(node) => {
                        menuItemRefs.current[index] = node;
                      }}
                      className={`menu-item${activeMenuIndex === index ? " selected" : ""}`}
                      role="menuitem"
                      tabIndex={activeMenuIndex === index ? 0 : -1}
                      style={MENU_BUTTON_STYLE}
                      onMouseEnter={() => setActiveMenuIndex(index)}
                      onClick={() => activateMenuItem(index)}
                    >
                      <span className="menu-item-icon">{item.icon}</span>
                      <span className="menu-item-title">{item.label}</span>
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
        <select
          value={activeGroup}
          onChange={(e) => setActiveGroup(e.currentTarget.value)}
          className="dropdown"
          title={t("bookmarks.activeGroupTitle")}
          style={{ flex: "1 1 auto", minWidth: 0 }}
        >
          {allGroupNames.map((g) => (
            <option key={g} value={g}>
              {displayGroupName(g)}
            </option>
          ))}
        </select>
      </div>
      {bookmarks.length === 0 && extraGroups.length === 0 ? (
        <div className="workspace-sidedock-empty-state">{t("bookmarks.empty")}</div>
      ) : (
        <div className="nav-files-container">
          {groupedBookmarks.map(([groupName, items]) => {
            const collapsed = collapsedGroups.has(groupName);
            return (
              <div key={groupName} className="bookmark-group" style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  className="tree-item-self mod-collapsible"
                  style={{
                    paddingInlineStart: 8,
                    fontWeight: "var(--font-semibold)",
                    color: "var(--text-muted)",
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    font: "inherit",
                    textAlign: "inherit",
                    boxShadow: "none",
                  }}
                  onClick={() => toggleGroupCollapsed(groupName)}
                >
                  <span
                    className={`collapse-icon ${collapsed ? "is-collapsed" : ""}`}
                    style={{ marginInlineEnd: 4 }}
                  >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                  <span className="tree-item-inner">
                    <span className="tree-item-inner-text">{displayGroupName(groupName)}</span>
                  </span>
                  <span className="tree-item-flair-outer" style={{ marginInlineStart: "auto" }}>
                    <span className="tree-item-flair">{items.length}</span>
                  </span>
                </button>
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
                        // biome-ignore lint/a11y/useSemanticElements: this composite row has its own nested remove button; using a button wrapper would create invalid nested interactive controls.
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
                          aria-label={t("bookmarks.remove")}
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
