import { openMenu } from "@/ui/overlay/Menu";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { renameTagAcrossVault } from "@core/plugins-core/tag-rename";
import { settingsStore } from "@core/settings/store";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../i18n/useI18n";
import { setSearchQuery } from "./SearchView";
import { type TagNode, buildTagsModel, sortTagNodes } from "./tags-model";

function filterByTag(fullName: string): void {
  setSearchQuery(`tag:${fullName}`);
  window.dispatchEvent(
    new CustomEvent("granite:select-sidebar-tab", {
      detail: { side: "left", id: "search" },
    }),
  );
}

export function TagsView() {
  const t = useI18n();
  useMetadataVersion();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Array<{ name: string; count: number }>>([]);
  const showNestedTags = useSyncExternalStore(
    settingsStore.subscribe,
    () => settingsStore.getState().showNestedTags,
    () => settingsStore.getState().showNestedTags,
  );

  useEffect(() => {
    setTags(metadataCache.getAllTags());
  }, []);

  useEffect(() => {
    const unsub = metadataCache.subscribe(() => setTags(metadataCache.getAllTags()));
    return unsub;
  }, []);

  const tree = useMemo(() => buildTagsModel(tags, showNestedTags), [tags, showNestedTags]);

  if (tags.length === 0) {
    return <div className="workspace-sidedock-empty-state">{t("tags.empty")}</div>;
  }

  const toggle = (fullName: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      return next;
    });

  return (
    <div className="tag-container">
      <label className="tag-pane-options">
        <input
          type="checkbox"
          checked={showNestedTags}
          onChange={(e) => settingsStore.update({ showNestedTags: e.currentTarget.checked })}
        />
        {t("tags.showNested")}
      </label>
      {sortTagNodes(tree.children.values()).map((node) => (
        <TagRow
          key={node.fullName}
          node={node}
          depth={0}
          collapsed={collapsed}
          onToggle={toggle}
          t={t}
        />
      ))}
    </div>
  );
}

function TagRow({
  node,
  depth,
  collapsed,
  onToggle,
  t,
}: {
  node: TagNode;
  depth: number;
  collapsed: Set<string>;
  onToggle: (fullName: string) => void;
  t: ReturnType<typeof useI18n>;
}) {
  const hasChildren = node.children.size > 0;
  const isCollapsed = collapsed.has(node.fullName);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          id: "filter",
          label: t("tags.menu.filter", { tag: node.fullName }),
          callback: () => filterByTag(node.fullName),
        },
        {
          id: "rename",
          label: t("tags.menu.rename", { tag: node.fullName }),
          callback: () => void renameTagAcrossVault(node.fullName),
        },
      ],
    });
  };

  return (
    <>
      <div
        className="tree-item-self tag-pane-tag is-clickable"
        style={{
          paddingInlineStart: 12 + depth * 16,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        onContextMenu={onContextMenu}
      >
        {hasChildren ? (
          <button
            type="button"
            className="collapse-icon"
            aria-label={t(isCollapsed ? "tags.expand" : "tags.collapse", {
              tag: node.fullName,
            })}
            style={{
              width: 14,
              display: "inline-flex",
              alignItems: "center",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.fullName);
            }}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span style={{ width: 14, display: "inline-block" }} />
        )}
        <button
          type="button"
          className="tree-item-inner tag-pane-tag-button"
          style={{ flex: 1, minWidth: 0 }}
          onClick={() => filterByTag(node.fullName)}
        >
          <span className="tag-pane-tag-text">{node.segment}</span>
        </button>
        <span className="tree-item-flair-outer">
          <span className="tree-item-flair">{node.count}</span>
        </span>
      </div>
      {!isCollapsed &&
        hasChildren &&
        sortTagNodes(node.children.values()).map((child) => (
          <TagRow
            key={child.fullName}
            node={child}
            depth={depth + 1}
            collapsed={collapsed}
            onToggle={onToggle}
            t={t}
          />
        ))}
    </>
  );
}
