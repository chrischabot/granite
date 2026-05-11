import {
  ArrowDownAZ,
  ChevronDown,
  ChevronRight,
  Clock,
  FilePlus,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Effect } from "effect";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { ClickableIcon } from "@/ui/controls/ClickableIcon";
import { useVault } from "@/ui/vault/VaultContext";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import {
  basename as pathBasename,
  dirname,
  extension,
  isInvalidName,
  join,
  normalize,
  stem,
} from "@core/fs/path";
import { rewriteWikilinksOnRename } from "@core/links/rewrite";
import { settingsStore, type FileExplorerSort } from "@core/settings/store";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { noticeManager } from "@core/notices/notice";
import { openMenu } from "@/ui/overlay/Menu";
import type { VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { sortNodes } from "./sort";

const FILE_DND_MIME = "application/granite-vault-path";

interface TreeNode {
  readonly entry: VaultEntry;
  readonly children?: ReadonlyArray<TreeNode>;
}

async function loadTree(): Promise<TreeNode[]> {
  return run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;

      const collect = (dir: VaultPath): Effect.Effect<TreeNode[], never, FileSystem> =>
        Effect.gen(function* () {
          const entries = yield* Effect.orElseSucceed(
            fs.list(dir),
            () => [] as ReadonlyArray<VaultEntry>,
          );
          const out: TreeNode[] = [];
          for (const entry of entries) {
            if (entry.type === "directory") {
              if (entry.name.startsWith(".")) continue;
              const children = yield* collect(entry.path);
              out.push({ entry, children });
            } else {
              out.push({ entry });
            }
          }
          return out;
        });

      return yield* collect("");
    }),
  );
}

export function FileExplorerView() {
  const { activeVault } = useVault();
  const [tree, setTree] = useState<ReadonlyArray<TreeNode>>([]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<VaultPath>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ path: VaultPath; value: string } | null>(null);
  const [selection, setSelection] = useState<ReadonlySet<VaultPath>>(new Set());
  const lastClickedRef = useRef<VaultPath | null>(null);
  const { activeGroupId, groups, leaves } = useWorkspace();
  const excludedRaw = useSyncExternalStore(
    settingsStore.subscribe,
    () => settingsStore.getState().excludedFiles,
    () => settingsStore.getState().excludedFiles,
  );
  const sortOrder = useSyncExternalStore(
    settingsStore.subscribe,
    () => settingsStore.getState().fileExplorerSort,
    () => settingsStore.getState().fileExplorerSort,
  );

  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();

  const refresh = useCallback(async () => {
    if (!activeVault) {
      setTree([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await loadTree();
      setTree(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [activeVault]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeVault) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      const disposer = await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return fs.watch(() => {
            if (cancelled) return;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => void refresh(), 200);
          });
        }),
      );
      if (cancelled) {
        disposer();
        return;
      }
      unsub = disposer;
    };

    void setup();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsub?.();
    };
  }, [activeVault, refresh]);

  const toggleCollapsed = (path: VaultPath) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const handleNewFile = async () => {
    if (!activeVault) return;
    const name = prompt("New note name:", "Untitled.md");
    if (!name) return;
    const filename = name.endsWith(".md") ? name : `${name}.md`;
    const folder = normalize(settingsStore.getState().newNoteFolder);
    const fullPath = folder ? join(folder, filename) : filename;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          if (folder) yield* fs.mkdir(folder);
          const existing = yield* fs.stat(fullPath);
          if (existing) throw new Error(`A file named "${fullPath}" already exists`);
          yield* fs.writeText(fullPath, "");
        }),
      );
      await refresh();
      workspaceStore.openFile(fullPath);
    } catch (err) {
      noticeManager.show(err instanceof Error ? err.message : String(err), { kind: "error" });
    }
  };

  const handleNewFolder = async () => {
    if (!activeVault) return;
    const name = prompt("New folder name:", "Untitled");
    if (!name) return;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          yield* fs.mkdir(name);
        }),
      );
      await refresh();
    } catch (err) {
      noticeManager.show(err instanceof Error ? err.message : String(err), { kind: "error" });
    }
  };

  const startRename = (path: VaultPath) => {
    setRenaming({ path, value: stem(path) });
  };

  const commitRename = async () => {
    if (!renaming) return;
    const next = renaming.value.trim();
    const orig = stem(renaming.path);
    setRenaming(null);
    if (!next || next === orig) return;
    if (isInvalidName(next)) {
      noticeManager.show("Invalid filename.", { kind: "error" });
      return;
    }
    const dir = dirname(renaming.path);
    const ext = extension(renaming.path);
    const filename = ext ? `${next}.${ext}` : next;
    const newPath: VaultPath = (dir ? join(dir, filename) : filename) as VaultPath;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          const existing = yield* fs.stat(newPath);
          if (existing) throw new Error(`A file named "${newPath}" already exists`);
          yield* fs.rename(renaming.path, newPath);
        }),
      );
      if (activePath === renaming.path) {
        workspaceStore.openFile(newPath);
      }
      await refresh();
    } catch (err) {
      noticeManager.show(err instanceof Error ? err.message : String(err), { kind: "error" });
    }
  };

  useEffect(() => {
    const onReveal = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (!detail?.path) return;
      const segments = detail.path.split("/");
      const ancestors: VaultPath[] = [];
      for (let i = 0; i < segments.length - 1; i++) {
        ancestors.push(segments.slice(0, i + 1).join("/") as VaultPath);
      }
      if (ancestors.length > 0) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          for (const a of ancestors) next.delete(a);
          return next;
        });
      }
      requestAnimationFrame(() => {
        const root = document.querySelector(".nav-files-container");
        if (!root) return;
        const candidates = root.querySelectorAll<HTMLElement>(".tree-item-self");
        for (const el of candidates) {
          const text = el.querySelector(".tree-item-inner-text")?.textContent ?? "";
          const baseName = segments[segments.length - 1] ?? "";
          const expectedText = baseName.endsWith(".md") ? baseName.slice(0, -3) : baseName;
          if (text === expectedText) {
            el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            el.classList.add("is-flashing");
            setTimeout(() => el.classList.remove("is-flashing"), 1500);
            break;
          }
        }
      });
    };
    window.addEventListener("granite:reveal-in-explorer", onReveal);
    return () => window.removeEventListener("granite:reveal-in-explorer", onReveal);
  }, []);

  const visibleTree = useMemo(() => {
    const patterns = parseExcludePatterns(excludedRaw);
    const filter = (nodes: ReadonlyArray<TreeNode>): TreeNode[] => {
      const out: TreeNode[] = [];
      for (const n of nodes) {
        if (patterns.length > 0 && isExcluded(n.entry.path, patterns)) continue;
        if (n.entry.type === "directory" && n.children) {
          out.push({ entry: n.entry, children: filter(n.children) });
        } else {
          out.push(n);
        }
      }
      return out;
    };
    return sortNodes(filter(tree), sortOrder);
  }, [tree, excludedRaw, sortOrder]);

  const flatFilePaths = useMemo(() => {
    const out: VaultPath[] = [];
    const walk = (nodes: ReadonlyArray<TreeNode>) => {
      for (const n of nodes) {
        if (n.entry.type === "file") out.push(n.entry.path);
        if (n.children) walk(n.children);
      }
    };
    walk(visibleTree);
    return out;
  }, [visibleTree]);

  const handleDelete = async (path: VaultPath) => {
    if (!confirm(`Delete "${stem(path)}"? This cannot be undone.`)) return;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          yield* fs.remove(path);
        }),
      );
      await refresh();
      noticeManager.show("Deleted.", { kind: "success" });
    } catch (err) {
      noticeManager.show(err instanceof Error ? err.message : String(err), { kind: "error" });
    }
  };

  const handleDeleteMany = useCallback(
    async (paths: ReadonlyArray<VaultPath>) => {
      if (paths.length === 0) return;
      if (
        !confirm(
          `Delete ${paths.length} selected file${paths.length === 1 ? "" : "s"}? This cannot be undone.`,
        )
      ) {
        return;
      }
      let failures = 0;
      for (const p of paths) {
        try {
          await run(
            Effect.gen(function* () {
              const fs = yield* FileSystem;
              yield* fs.remove(p);
            }),
          );
        } catch {
          failures += 1;
        }
      }
      setSelection(new Set());
      await refresh();
      if (failures === 0) {
        noticeManager.show(`Deleted ${paths.length} file${paths.length === 1 ? "" : "s"}.`, {
          kind: "success",
        });
      } else {
        noticeManager.show(`Deleted with ${failures} failure(s).`, { kind: "warning" });
      }
    },
    [refresh],
  );

  const handleRowClick = useCallback(
    (path: VaultPath, e: React.MouseEvent | React.KeyboardEvent) => {
      const mouse = (e as React.MouseEvent).button !== undefined;
      const ctrlOrMeta = (e as React.MouseEvent).metaKey || (e as React.MouseEvent).ctrlKey;
      const shift = (e as React.MouseEvent).shiftKey;
      if (shift && lastClickedRef.current && flatFilePaths.length > 0) {
        const fromIdx = flatFilePaths.indexOf(lastClickedRef.current);
        const toIdx = flatFilePaths.indexOf(path);
        if (fromIdx !== -1 && toIdx !== -1) {
          const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
          const range = flatFilePaths.slice(lo, hi + 1);
          setSelection(new Set(range));
          return;
        }
      }
      if (ctrlOrMeta) {
        setSelection((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
        lastClickedRef.current = path;
        return;
      }
      setSelection(new Set([path]));
      lastClickedRef.current = path;
      if (mouse) {
        const ext = extension(path);
        if (ext === "md") {
          workspaceStore.openFile(path);
        } else if (ext === "canvas") {
          workspaceStore.openCanvas({ path });
        } else if (ext === "base") {
          workspaceStore.openBase({ path });
        }
      }
    },
    [flatFilePaths],
  );

  const moveTo = async (sourcePath: VaultPath, targetFolder: VaultPath) => {
    const baseName = pathBasename(sourcePath);
    const sourceParent = dirname(sourcePath);
    if (sourceParent === targetFolder) return;
    if (sourcePath === targetFolder) return;
    const newPath: VaultPath = (
      targetFolder ? join(targetFolder, baseName) : baseName
    ) as VaultPath;
    if (newPath === sourcePath) return;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          const existing = yield* fs.stat(newPath);
          if (existing) throw new Error(`A file named "${newPath}" already exists`);
          yield* fs.rename(sourcePath, newPath);
        }),
      );
      if (extension(sourcePath) === "md") {
        try {
          const { linksRewritten, filesUpdated } = await rewriteWikilinksOnRename(
            sourcePath,
            newPath,
          );
          if (linksRewritten > 0) {
            noticeManager.show(
              `Moved and updated ${linksRewritten} link${linksRewritten === 1 ? "" : "s"} in ${filesUpdated} file${filesUpdated === 1 ? "" : "s"}.`,
              { kind: "success" },
            );
          }
        } catch {
          /* non-fatal */
        }
      }
      if (activePath === sourcePath) workspaceStore.openFile(newPath);
      await refresh();
    } catch (err) {
      noticeManager.show(err instanceof Error ? err.message : String(err), { kind: "error" });
    }
  };

  const showContextMenu = (e: React.MouseEvent, path: VaultPath, isDir: boolean) => {
    e.preventDefault();
    const items = isDir
      ? [
          {
            id: "open",
            label: "Reveal contents",
            icon: <FolderOpen size={14} />,
            callback: () => toggleCollapsed(path),
          },
          {
            id: "delete",
            label: "Delete folder",
            icon: <Trash2 size={14} />,
            warning: true,
            callback: () => void handleDelete(path),
          },
        ]
      : [
          {
            id: "open",
            label: "Open in current tab",
            callback: () => {
              const ext = extension(path);
              if (ext === "canvas") workspaceStore.openCanvas({ path });
              else if (ext === "base") workspaceStore.openBase({ path });
              else workspaceStore.openFile(path);
            },
          },
          {
            id: "open-new",
            label: "Open in new tab",
            callback: () => {
              const ext = extension(path);
              if (ext === "canvas") workspaceStore.openCanvas({ path, newTab: true });
              else if (ext === "base") workspaceStore.openBase({ path, newTab: true });
              else workspaceStore.openFile(path, { newTab: true });
            },
          },
          {
            id: "rename",
            label: "Rename",
            icon: <Pencil size={14} />,
            callback: () => startRename(path),
          },
          {
            id: "delete",
            label: "Delete",
            icon: <Trash2 size={14} />,
            warning: true,
            callback: () => void handleDelete(path),
          },
        ];
    openMenu({ x: e.clientX, y: e.clientY, items });
  };

  const showSortMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const current = settingsStore.getState().fileExplorerSort;
    const set = (next: FileExplorerSort) => settingsStore.update({ fileExplorerSort: next });
    const item = (id: FileExplorerSort, label: string) => ({
      id,
      label: current === id ? `✓ ${label}` : label,
      callback: () => set(id),
    });
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        item("name-asc", "Name (A → Z)"),
        item("name-desc", "Name (Z → A)"),
        item("mtime-desc", "Modified (newest first)"),
        item("mtime-asc", "Modified (oldest first)"),
        item("ctime-desc", "Created (newest first)"),
        item("ctime-asc", "Created (oldest first)"),
      ],
    });
  };

  const header = (
    <div className="nav-header">
      <ClickableIcon ariaLabel="New note" icon={<FilePlus />} onClick={handleNewFile} />
      <ClickableIcon ariaLabel="New folder" icon={<FolderPlus />} onClick={handleNewFolder} />
      <ClickableIcon
        ariaLabel="Sort order"
        icon={sortOrder.startsWith("name") ? <ArrowDownAZ /> : <Clock />}
        onClick={showSortMenu}
      />
    </div>
  );

  if (!activeVault) {
    return <div className="workspace-sidedock-empty-state">No vault open. Open a folder to begin.</div>;
  }

  return (
    <div className="nav-files-pane">
      {header}
      {error && <div className="message mod-error">{error}</div>}
      {loading && tree.length === 0 ? (
        <div className="workspace-sidedock-empty-state">Loading…</div>
      ) : tree.length === 0 ? (
        <div className="workspace-sidedock-empty-state">Empty vault. Create a note to start.</div>
      ) : (
        <div
          className="nav-files-container"
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              (e.key === "Delete" || e.key === "Backspace") &&
              (e.metaKey || e.ctrlKey) &&
              selection.size > 0 &&
              !renaming
            ) {
              e.preventDefault();
              void handleDeleteMany([...selection]);
            }
          }}
          onDragOver={(e) => {
            if (Array.from(e.dataTransfer.types).includes(FILE_DND_MIME)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e) => {
            const src = e.dataTransfer.getData(FILE_DND_MIME);
            if (!src) return;
            if (e.target !== e.currentTarget) return;
            e.preventDefault();
            void moveTo(src as VaultPath, "" as VaultPath);
          }}
        >
          {visibleTree.length === 0 ? (
            <div className="workspace-sidedock-empty-state">
              All files in this vault are excluded by your filters.
            </div>
          ) : (
            visibleTree.map((node) => (
              <TreeRow
                key={node.entry.path}
                node={node}
                depth={0}
                collapsed={collapsed}
                activePath={activePath}
                renaming={renaming}
                selection={selection}
                onToggle={toggleCollapsed}
                onStartRename={startRename}
                onCommitRename={commitRename}
                onChangeRename={(v) =>
                  setRenaming((prev) => (prev ? { ...prev, value: v } : prev))
                }
                onCancelRename={() => setRenaming(null)}
                onDelete={handleDelete}
                onContextMenu={showContextMenu}
                onMoveTo={moveTo}
                onRowClick={handleRowClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  node: TreeNode;
  depth: number;
  collapsed: ReadonlySet<VaultPath>;
  activePath: VaultPath | null;
  renaming: { path: VaultPath; value: string } | null;
  selection: ReadonlySet<VaultPath>;
  onToggle: (p: VaultPath) => void;
  onStartRename: (p: VaultPath) => void;
  onCommitRename: () => void;
  onChangeRename: (v: string) => void;
  onCancelRename: () => void;
  onDelete: (p: VaultPath) => void;
  onContextMenu: (e: React.MouseEvent, p: VaultPath, isDir: boolean) => void;
  onMoveTo: (sourcePath: VaultPath, targetFolder: VaultPath) => Promise<void>;
  onRowClick: (path: VaultPath, e: React.MouseEvent | React.KeyboardEvent) => void;
}

function TreeRow(props: RowProps) {
  const {
    node,
    depth,
    collapsed,
    activePath,
    renaming,
    selection,
    onToggle,
    onStartRename,
    onCommitRename,
    onChangeRename,
    onCancelRename,
    onDelete,
    onContextMenu,
    onMoveTo,
    onRowClick,
  } = props;
  const indent = depth * 16;
  const isDir = node.entry.type === "directory";
  const isCollapsed = isDir && collapsed.has(node.entry.path);
  const fileExt = node.entry.type === "file" ? (node.entry as VaultFile).extension : "";
  const showExt = fileExt && fileExt !== "md";
  const isActive = !isDir && activePath === node.entry.path;
  const isSelected = !isDir && selection.has(node.entry.path);
  const isRenaming = renaming?.path === node.entry.path;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleClick = (e: React.MouseEvent) => {
    if (isRenaming) return;
    if (isDir) {
      onToggle(node.entry.path);
    } else {
      onRowClick(node.entry.path, e);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isRenaming) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isDir) onToggle(node.entry.path);
      else if (fileExt === "md") workspaceStore.openFile(node.entry.path);
      else if (fileExt === "canvas") workspaceStore.openCanvas({ path: node.entry.path });
      else if (fileExt === "base") workspaceStore.openBase({ path: node.entry.path });
    } else if (e.key === "F2" && !isDir) {
      e.preventDefault();
      onStartRename(node.entry.path);
    } else if ((e.key === "Delete" || e.key === "Backspace") && !isDir && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onDelete(node.entry.path);
    }
  };

  const labelText = useMemo(() => {
    if (!isDir && fileExt === "md") {
      return node.entry.name.replace(/\.md$/i, "");
    }
    return node.entry.name;
  }, [isDir, fileExt, node.entry.name]);

  return (
    <>
      <div
        className={`tree-item-self ${isDir ? "mod-collapsible" : "is-clickable"}${isActive ? " is-active" : ""}${isSelected ? " is-selected" : ""}${isRenaming ? " is-being-renamed" : ""}${dragOver ? " is-being-dragged-over" : ""}`}
        style={{ paddingInlineStart: 24 + indent }}
        draggable={!isDir && !isRenaming}
        onDragStart={(e) => {
          if (isDir || isRenaming) return;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData(FILE_DND_MIME, node.entry.path);
          e.dataTransfer.setData("text/plain", node.entry.name);
        }}
        onDragOver={(e) => {
          if (!isDir) return;
          if (Array.from(e.dataTransfer.types).includes(FILE_DND_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (!dragOver) setDragOver(true);
          }
        }}
        onDragLeave={() => {
          if (dragOver) setDragOver(false);
        }}
        onDrop={(e) => {
          if (!isDir) return;
          const src = e.dataTransfer.getData(FILE_DND_MIME);
          setDragOver(false);
          if (!src) return;
          e.preventDefault();
          e.stopPropagation();
          void onMoveTo(src as VaultPath, node.entry.path);
        }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node.entry.path, isDir)}
        role="button"
        tabIndex={0}
        onKeyDown={handleKey}
      >
        {isDir && (
          <span className={`collapse-icon ${isCollapsed ? "is-collapsed" : ""}`}>
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </span>
        )}
        <span className="tree-item-inner">
          {isRenaming ? (
            <input
              ref={inputRef}
              value={renaming?.value ?? ""}
              onChange={(e) => onChangeRename(e.currentTarget.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCommitRename();
                } else if (e.key === "Escape") {
                  onCancelRename();
                }
              }}
              onBlur={() => onCommitRename()}
              style={{
                background: "var(--background-modifier-form-field)",
                border: "1px solid var(--background-modifier-border-focus)",
                color: "var(--text-normal)",
                padding: "0 4px",
                width: "100%",
                font: "inherit",
              }}
            />
          ) : (
            <span className="tree-item-inner-text">{labelText}</span>
          )}
        </span>
        {showExt && !isRenaming && <span className="nav-file-tag">{fileExt}</span>}
      </div>
      {isDir && !isCollapsed && node.children && (
        <div className="tree-item-children">
          {node.children.map((child) => (
            <TreeRow
              key={child.entry.path}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              activePath={activePath}
              renaming={renaming}
              selection={selection}
              onToggle={onToggle}
              onStartRename={onStartRename}
              onCommitRename={onCommitRename}
              onChangeRename={onChangeRename}
              onCancelRename={onCancelRename}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onMoveTo={onMoveTo}
              onRowClick={onRowClick}
            />
          ))}
        </div>
      )}
    </>
  );
}