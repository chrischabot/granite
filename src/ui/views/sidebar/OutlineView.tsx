import { useEffect, useMemo, useState } from "react";
import { useFileMetadata } from "@core/metadata/useMetadata";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";

export function OutlineView() {
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState("");

  // Reset selection + filter on path change.
  useEffect(() => {
    setActiveIndex(null);
    setFilter("");
  }, [activePath]);

  const filtered = useMemo(() => {
    const list = meta?.headings ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list.map((h, i) => ({ heading: h, index: i }));
    return list
      .map((h, i) => ({ heading: h, index: i }))
      .filter(({ heading }) => heading.text.toLowerCase().includes(q));
  }, [meta, filter]);

  if (!activePath) {
    return <div className="workspace-sidedock-empty-state">Open a note to see its outline.</div>;
  }
  if (!meta || meta.headings.length === 0) {
    return <div className="workspace-sidedock-empty-state">No headings in this note.</div>;
  }

  return (
    <div className="outline">
      <div className="nav-header" style={{ padding: "var(--size-4-1) var(--size-4-3)" }}>
        <input
          type="search"
          placeholder="Filter headings…"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          style={{ width: "100%" }}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="workspace-sidedock-empty-state">No headings match filter.</div>
      ) : (
        <div className="nav-files-container">
          {filtered.map(({ heading: h, index: i }) => (
            <div
              key={i}
              className={`tree-item-self is-clickable${activeIndex === i ? " is-active" : ""}`}
              style={{ paddingInlineStart: 24 + (h.level - 1) * 16 }}
              onClick={() => {
                setActiveIndex(i);
                const group = activeGroupId ? groups.get(activeGroupId) : null;
                if (group?.activeLeafId) {
                  workspaceStore.setMode(group.activeLeafId, "source");
                }
                window.dispatchEvent(
                  new CustomEvent("granite:goto-line", {
                    detail: { path: activePath, line: h.line },
                  }),
                );
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).click();
                }
              }}
            >
              <span className="tree-item-inner">
                <span className="tree-item-inner-text">{h.text}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}