import { useSyncExternalStore } from "react";
import { Trash2 } from "lucide-react";
import { stem } from "@core/fs/path";
import { listRecents, removeRecent, subscribeRecents } from "@core/workspace/recents";
import { workspaceStore } from "@core/workspace/store";

export function RecentsView() {
  const recents = useSyncExternalStore(subscribeRecents, listRecents, listRecents);
  if (recents.length === 0) {
    return (
      <div className="workspace-sidedock-empty-state">
        No recent files yet. Open a note to start the list.
      </div>
    );
  }
  return (
    <div className="recents-pane">
      <div className="nav-files-container">
        {recents.map((p) => (
          <div
            key={p}
            className="tree-item-self is-clickable"
            style={{
              paddingInlineStart: 24,
              display: "flex",
              alignItems: "center",
              gap: "var(--size-4-2)",
            }}
            onClick={(e) =>
              workspaceStore.openFile(p, { newTab: e.metaKey || e.ctrlKey })
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                workspaceStore.openFile(p);
              }
            }}
          >
            <span className="tree-item-inner" style={{ flex: 1, minWidth: 0 }}>
              <span className="tree-item-inner-text">{stem(p)}</span>
            </span>
            <span
              className="tree-item-flair-outer"
              style={{ marginInlineStart: "auto" }}
            >
              <span
                className="tree-item-flair"
                style={{ color: "var(--text-faint)" }}
                title={p}
              >
                {p.split("/").slice(0, -1).join("/") || "/"}
              </span>
            </span>
            <button
              type="button"
              aria-label="Remove from recents"
              className="clickable-icon"
              onClick={(e) => {
                e.stopPropagation();
                removeRecent(p);
              }}
              style={{ marginInlineStart: "auto", padding: 2 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}