import { stem } from "@core/fs/path";
import { listRecents, removeRecent, subscribeRecents } from "@core/workspace/recents";
import { workspaceStore } from "@core/workspace/store";
import { Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "../../i18n/useI18n";

export function RecentsView() {
  const t = useI18n();
  const recents = useSyncExternalStore(subscribeRecents, listRecents, listRecents);
  if (recents.length === 0) {
    return <div className="workspace-sidedock-empty-state">{t("recents.empty")}</div>;
  }
  return (
    <div className="recents-pane">
      <div className="nav-files-container">
        {recents.map((p) => (
          <div
            key={p}
            className="tree-item-self"
            style={{
              paddingInlineStart: 24,
              display: "flex",
              alignItems: "center",
              gap: "var(--size-4-2)",
            }}
          >
            <button
              type="button"
              onClick={(e) => workspaceStore.openFile(p, { newTab: e.metaKey || e.ctrlKey })}
              style={{
                alignItems: "center",
                background: "transparent",
                border: 0,
                color: "inherit",
                cursor: "var(--cursor)",
                display: "flex",
                flex: 1,
                font: "inherit",
                gap: "var(--size-4-2)",
                minWidth: 0,
                padding: 0,
                textAlign: "start",
              }}
            >
              <span className="tree-item-inner" style={{ flex: 1, minWidth: 0 }}>
                <span className="tree-item-inner-text">{stem(p)}</span>
              </span>
              <span className="tree-item-flair-outer" style={{ marginInlineStart: "auto" }}>
                <span className="tree-item-flair" style={{ color: "var(--text-faint)" }} title={p}>
                  {p.split("/").slice(0, -1).join("/") || "/"}
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-label={t("recents.remove")}
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
