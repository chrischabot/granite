import { type Notice, noticeManager } from "@core/notices/notice";
import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/useI18n";

function getList(): ReadonlyArray<Notice> {
  return noticeManager.list();
}

export function NoticeContainer() {
  const t = useI18n();
  const notices = useSyncExternalStore(noticeManager.subscribe, getList, getList);

  if (notices.length === 0) return null;

  const activateNotice = (notice: Notice) => {
    if (notice.onActivate) notice.onActivate();
    else noticeManager.dismiss(notice.id);
  };

  return createPortal(
    <div className="notice-container">
      {notices.map((n) => (
        <div
          key={n.id}
          className={`notice notice-${n.kind}`}
          role="alert"
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <button
            type="button"
            onClick={() => activateNotice(n)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: 0,
              background: "transparent",
              border: 0,
              color: "inherit",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {n.message}
          </button>
          <button
            type="button"
            aria-label={t("notice.dismiss")}
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
