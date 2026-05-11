import { useFileMetadata } from "@core/metadata/useMetadata";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { workspaceStore } from "@core/workspace/store";

export function FootnotesView() {
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);

  if (!activePath) {
    return <div className="workspace-sidedock-empty-state">Open a note to see its footnotes.</div>;
  }
  if (!meta || meta.footnotes.length === 0) {
    return <div className="workspace-sidedock-empty-state">No footnotes in this note.</div>;
  }

  return (
    <div className="footnotes-view">
      <div className="nav-files-container">
        {meta.footnotes.map((fn) => {
          const targetLine = fn.definitionLine ?? fn.references[0] ?? null;
          const orphan = fn.definitionLine === null;
          return (
            <div
              key={fn.id}
              className="tree-item-self is-clickable"
              style={{ paddingInlineStart: 24, paddingTop: 6, paddingBottom: 6 }}
              onClick={() => {
                if (targetLine === null) return;
                const group = activeGroupId ? groups.get(activeGroupId) : null;
                if (group?.activeLeafId) workspaceStore.setMode(group.activeLeafId, "source");
                window.dispatchEvent(
                  new CustomEvent("granite:goto-line", {
                    detail: { path: activePath, line: targetLine },
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
                <span className="tree-item-inner-text">
                  <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>
                    [^{fn.id}]
                  </span>
                  {fn.definitionBody && (
                    <span style={{ color: "var(--text-muted)", marginInlineStart: 6 }}>
                      {fn.definitionBody.slice(0, 80)}
                      {fn.definitionBody.length > 80 ? "…" : ""}
                    </span>
                  )}
                </span>
              </span>
              <span className="tree-item-flair-outer">
                <span
                  className="tree-item-flair"
                  title={
                    orphan
                      ? "No definition for this footnote reference"
                      : `${fn.references.length} reference${fn.references.length === 1 ? "" : "s"}`
                  }
                  style={{
                    color: orphan ? "var(--text-error)" : undefined,
                  }}
                >
                  {orphan ? "missing" : fn.references.length}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}