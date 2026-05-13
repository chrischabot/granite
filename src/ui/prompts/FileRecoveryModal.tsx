import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { noticeManager } from "@core/notices/notice";
import {
  type RecoverySnapshot,
  clearRecoverySnapshots,
  listRecoverySnapshots,
  restoreRecoverySnapshot,
} from "@core/plugins-core/file-recovery";
import { Effect } from "effect";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { Modal } from "../overlay/Modal";

export interface FileRecoveryModalProps {
  readonly path: string | null;
  readonly onClose: () => void;
}

async function readCurrentContent(path: string): Promise<string> {
  try {
    return await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(path);
      }),
    );
  } catch {
    return "";
  }
}

function formatSnapshotTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

function buildLineDiff(current: string, snapshot: string): string {
  const currentLines = current.split("\n");
  const snapshotLines = snapshot.split("\n");
  const max = Math.max(currentLines.length, snapshotLines.length);
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const before = currentLines[i];
    const after = snapshotLines[i];
    if (before === after) {
      if (after !== undefined) out.push(`  ${after}`);
      continue;
    }
    if (before !== undefined) out.push(`- ${before}`);
    if (after !== undefined) out.push(`+ ${after}`);
  }
  return out.join("\n");
}

export function FileRecoveryModal({ path, onClose }: FileRecoveryModalProps) {
  const [snapshots, setSnapshots] = useState<RecoverySnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const [showChanges, setShowChanges] = useState(true);
  const [currentContent, setCurrentContent] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useI18n();

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([listRecoverySnapshots(path), readCurrentContent(path)])
      .then(([list, current]) => {
        if (cancelled) return;
        setSnapshots(list);
        setCurrentContent(current);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch((err) => {
        noticeManager.show(err instanceof Error ? err.message : t("fileRecovery.error.load"), {
          kind: "error",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, t]);

  const filteredSnapshots = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return snapshots;
    return snapshots.filter((s) =>
      `${s.path} ${formatSnapshotTime(s.mtimeMs)}`.toLowerCase().includes(q),
    );
  }, [snapshots, filter]);

  const selected = snapshots.find((s) => s.id === selectedId) ?? filteredSnapshots[0] ?? null;
  const preview = selected
    ? showChanges
      ? buildLineDiff(currentContent, selected.content)
      : selected.content
    : "";

  const copy = async () => {
    if (!selected) return;
    await navigator.clipboard?.writeText(selected.content);
    noticeManager.show(t("fileRecovery.notice.copied"), { kind: "success" });
  };

  const restore = async () => {
    if (!selected) return;
    await restoreRecoverySnapshot(selected);
    noticeManager.show(t("fileRecovery.notice.restored"), { kind: "success" });
    onClose();
  };

  const clear = async () => {
    const ok = confirm(t("fileRecovery.confirm.clear"));
    if (!ok) return;
    await clearRecoverySnapshots();
    setSnapshots([]);
    setSelectedId(null);
    noticeManager.show(t("fileRecovery.notice.cleared"), { kind: "success" });
  };

  return (
    <Modal
      open={path !== null}
      onClose={onClose}
      title={t("fileRecovery.title")}
      modifier="mod-sidebar-layout"
    >
      <div className="file-recovery-modal">
        <section className="file-recovery-list" aria-label={t("fileRecovery.snapshots")}>
          <label className="setting-item-name" htmlFor="file-recovery-filter">
            {t("fileRecovery.filename")}
          </label>
          <input
            id="file-recovery-filter"
            className="prompt-input"
            value={filter}
            placeholder={path ?? t("fileRecovery.filterPlaceholder")}
            onChange={(e) => setFilter(e.currentTarget.value)}
          />
          <div className="file-recovery-list-container">
            {loading ? (
              <div className="file-recovery-list-empty">{t("fileRecovery.loading")}</div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="file-recovery-list-empty">{t("fileRecovery.empty")}</div>
            ) : (
              filteredSnapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  type="button"
                  className={`file-recovery-list-item-header${snapshot.id === selected?.id ? " is-active" : ""}`}
                  onClick={() => setSelectedId(snapshot.id)}
                >
                  <span className="file-recovery-list-item-details">
                    {formatSnapshotTime(snapshot.mtimeMs)}
                  </span>
                  <br />
                  <span className="u-muted">
                    {t("fileRecovery.bytes", { bytes: snapshot.content.length })}
                  </span>
                </button>
              ))
            )}
          </div>
          <button type="button" onClick={clear} disabled={!path || snapshots.length === 0}>
            {t("fileRecovery.clear")}
          </button>
        </section>
        <section className="file-recovery-content">
          <label className="file-recovery-toggle">
            <input
              type="checkbox"
              checked={showChanges}
              onChange={(e) => setShowChanges(e.currentTarget.checked)}
            />
            {t("fileRecovery.showChanges")}
          </label>
          <textarea
            className="file-recovery-text"
            data-ext={path?.split(".").pop() ?? ""}
            readOnly
            value={preview}
          />
          <div className="modal-button-container file-recovery-actions">
            <button type="button" onClick={copy} disabled={!selected}>
              {t("fileRecovery.copy")}
            </button>
            <button type="button" className="mod-cta" onClick={restore} disabled={!selected}>
              {t("fileRecovery.restore")}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
