import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { renameTagAcrossVault } from "@core/plugins-core/tag-rename";
import { openMenu } from "@/ui/overlay/Menu";
import { setSearchQuery } from "./SearchView";

interface TagNode {
  segment: string;
  fullName: string;
  count: number;
  children: Map<string, TagNode>;
}

function buildTree(entries: ReadonlyArray<{ name: string; count: number }>): TagNode {
  const root: TagNode = { segment: "", fullName: "", count: 0, children: new Map() };
  for (const entry of entries) {
    const parts = entry.name.split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i]!;
      if (!seg) continue;
      let next = cur.children.get(seg);
      if (!next) {
        next = {
          segment: seg,
          fullName: parts.slice(0, i + 1).join("/"),
          count: 0,
          children: new Map(),
        };
        cur.children.set(seg, next);
      }
      cur = next;
    }
    // Add the entry's count to the leaf node only.
    cur.count = entry.count;
  }
  // Compute folder counts as the sum of leaf counts under them.
  const computeTotals = (node: TagNode): number => {
    if (node.children.size === 0) return node.count;
    let total = node.count;
    for (const child of node.children.values()) total += computeTotals(child);
    node.count = total;
    return total;
  };
  computeTotals(root);
  return root;
}

function filterByTag(fullName: string): void {
  setSearchQuery(`tag:${fullName}`);
  window.dispatchEvent(
    new CustomEvent("granite:select-sidebar-tab", {
      detail: { side: "left", id: "search" },
    }),
  );
}

export function TagsView() {
  useMetadataVersion();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    setTags(metadataCache.getAllTags());
  }, []);

  useEffect(() => {
    const unsub = metadataCache.subscribe(() => setTags(metadataCache.getAllTags()));
    return unsub;
  }, []);

  const tree = useMemo(() => buildTree(tags), [tags]);

  if (tags.length === 0) {
    return <div className="workspace-sidedock-empty-state">No tags found.</div>;
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
      {[...tree.children.values()]
        .sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment))
        .map((node) => (
          <TagRow
            key={node.fullName}
            node={node}
            depth={0}
            collapsed={collapsed}
            onToggle={toggle}
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
}: {
  node: TagNode;
  depth: number;
  collapsed: Set<string>;
  onToggle: (fullName: string) => void;
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
          label: `Filter search by #${node.fullName}`,
          callback: () => filterByTag(node.fullName),
        },
        {
          id: "rename",
          label: `Rename #${node.fullName} across the vault…`,
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
        onClick={(e) => {
          // Click → search; click on the chevron → toggle.
          if ((e.target as HTMLElement).closest(".collapse-icon")) return;
          filterByTag(node.fullName);
        }}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") filterByTag(node.fullName);
        }}
      >
        {hasChildren ? (
          <span
            className="collapse-icon"
            style={{
              width: 14,
              display: "inline-flex",
              alignItems: "center",
              cursor: "var(--cursor)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.fullName);
            }}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </span>
        ) : (
          <span style={{ width: 14, display: "inline-block" }} />
        )}
        <span className="tree-item-inner" style={{ flex: 1, minWidth: 0 }}>
          <span className="tag-pane-tag-text">{node.segment}</span>
        </span>
        <span className="tree-item-flair-outer">
          <span className="tree-item-flair">{node.count}</span>
        </span>
      </div>
      {!isCollapsed &&
        hasChildren &&
        [...node.children.values()]
          .sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment))
          .map((child) => (
            <TagRow
              key={child.fullName}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
    </>
  );
}