import { useFileMetadata } from "@core/metadata/useMetadata";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";

export function OutgoingLinksView() {
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);

  if (!activePath) {
    return (
      <div className="workspace-sidedock-empty-state">Open a note to see its outgoing links.</div>
    );
  }
  if (!meta || meta.links.length === 0) {
    return <div className="workspace-sidedock-empty-state">No outgoing links in this note.</div>;
  }

  return (
    <div className="outgoing-link-pane">
      <div className="search-result-container mod-global-search">
        {meta.links.map((l, i) => {
          const path = l.target.endsWith(".md") ? l.target : `${l.target}.md`;
          const display = l.display ?? l.target;
          return (
            <div key={i} className="search-result">
              <div
                className="tree-item-self is-clickable search-result-file-title"
                onClick={(e) => {
                  workspaceStore.setMode(
                    activeGroupId ? groups.get(activeGroupId)?.activeLeafId ?? "" : "",
                    "source",
                  );
                  if (e.shiftKey) {
                    // Shift = scroll source line
                    window.dispatchEvent(
                      new CustomEvent("granite:goto-line", {
                        detail: { path: activePath, line: l.line },
                      }),
                    );
                  } else {
                    workspaceStore.openFile(path, { newTab: e.metaKey || e.ctrlKey });
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="tree-item-inner">
                  <span className="tree-item-inner-text">
                    {l.embed ? "↳ " : ""}
                    {display}
                  </span>
                </span>
                <span className="tree-item-flair-outer">
                  <span className="tree-item-flair">L{l.line + 1}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}