import { useFileMetadata } from "@core/metadata/useMetadata";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { useI18n } from "../../i18n/useI18n";

export function OutgoingLinksView() {
  const t = useI18n();
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);

  if (!activePath) {
    return <div className="workspace-sidedock-empty-state">{t("outgoing.empty.noActive")}</div>;
  }
  if (!meta || meta.links.length === 0) {
    return <div className="workspace-sidedock-empty-state">{t("outgoing.empty.noLinks")}</div>;
  }

  return (
    <div className="outgoing-link-pane">
      <div className="sidedock-pane-header">
        {t("outgoing.count", { count: meta.links.length })}
      </div>
      <div className="search-result-container mod-global-search">
        {meta.links.map((l) => {
          const path = l.target.endsWith(".md") ? l.target : `${l.target}.md`;
          const display = l.display ?? l.target;
          const key = [
            l.target,
            l.heading ?? "",
            l.block ?? "",
            l.display ?? "",
            l.embed ? "embed" : "link",
            l.line,
          ].join(":");
          return (
            <div key={key} className="search-result">
              <button
                type="button"
                className="tree-item-self is-clickable search-result-file-title"
                onClick={(e) => {
                  workspaceStore.setMode(
                    activeGroupId ? (groups.get(activeGroupId)?.activeLeafId ?? "") : "",
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
              >
                <span className="tree-item-inner">
                  <span className="tree-item-inner-text">
                    {l.embed ? "↳ " : ""}
                    {display}
                  </span>
                </span>
                <span className="tree-item-flair-outer">
                  <span className="tree-item-flair">
                    {t("outgoing.lineShort", { line: l.line + 1 })}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
