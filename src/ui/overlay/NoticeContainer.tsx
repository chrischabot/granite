import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { noticeManager, type Notice } from "@core/notices/notice";

function getList(): ReadonlyArray<Notice> {
  return noticeManager.list();
}

export function NoticeContainer() {
  const notices = useSyncExternalStore(noticeManager.subscribe, getList, getList);
  if (notices.length === 0) return null;

  return createPortal(
    <div className="notice-container">
      {notices.map((n) => (
        <div
          key={n.id}
          className={`notice notice-${n.kind}`}
          role="alert"
          onClick={() => {
            if (n.onActivate) n.onActivate();
            else noticeManager.dismiss(n.id);
          }}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{n.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              noticeManager.dismiss(n.id);
            }}
            style={{
              background: "transparent",
              border: 0,
              padding: 2,
              color: "inherit",
              cursor: "pointer",
              opacity: 0.7,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}