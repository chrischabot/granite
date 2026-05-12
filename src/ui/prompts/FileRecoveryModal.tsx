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
        noticeManager.show(err instanceof Error ? err.message : "Could not load snapshots", {
          kind: "error",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

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
    noticeManager.show("Snapshot copied.", { kind: "success" });
  };

  const restore = async () => {
    if (!selected) return;
    await restoreRecoverySnapshot(selected);
    noticeManager.show("Snapshot restored.", { kind: "success" });
    onClose();
  };

  const clear = async () => {
    const ok = confirm("Clear all recovery snapshots?");
    if (!ok) return;
    await clearRecoverySnapshots();
    setSnapshots([]);
    setSelectedId(null);
    noticeManager.show("Recovery snapshots cleared.", { kind: "success" });
  };

  return (
    <Modal
      open={path !== null}
      onClose={onClose}
      title="File recovery"
      modifier="mod-sidebar-layout"
    >
      <div
        className="file-recovery-modal"
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1fr)",
          gap: "var(--size-4-4)",
          minHeight: 420,
        }}
      >
        <section className="file-recovery-list" aria-label="Recovery snapshots">
          <label className="setting-item-name" htmlFor="file-recovery-filter">
            Filename
          </label>
          <input
            id="file-recovery-filter"
            className="prompt-input"
            value={filter}
            placeholder={path ?? "Filter files"}
            onChange={(e) => setFilter(e.currentTarget.value)}
          />
          <div
            className="file-recovery-list-container"
            style={{
              marginTop: "var(--size-4-3)",
              border: "1px solid var(--background-modifier-border)",
              borderRadius: "var(--radius-s)",
              overflow: "auto",
              maxHeight: 340,
            }}
          >
            {loading ? (
              <div style={{ padding: "var(--size-4-3)", color: "var(--text-faint)" }}>
                Loading snapshots…
              </div>
            ) : filteredSnapshots.length === 0 ? (
              <div style={{ padding: "var(--size-4-3)", color: "var(--text-faint)" }}>
                No snapshots found.
              </div>
            ) : (
              filteredSnapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  type="button"
                  className={`file-recovery-list-item-header${snapshot.id === selected?.id ? " is-active" : ""}`}
                  onClick={() => setSelectedId(snapshot.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "var(--size-4-2)",
                    border: 0,
                    borderBottom: "1px solid var(--background-modifier-border)",
                    background:
                      snapshot.id === selected?.id
                        ? "var(--background-modifier-hover)"
                        : "transparent",
                    color: "var(--text-normal)",
                  }}
                >
                  <span className="file-recovery-list-item-details">
                    {formatSnapshotTime(snapshot.mtimeMs)}
                  </span>
                  <br />
                  <span className="u-muted">{snapshot.content.length} bytes</span>
                </button>
              ))
            )}
          </div>
          <button type="button" onClick={clear} disabled={!path || snapshots.length === 0}>
            Clear
          </button>
        </section>
        <section style={{ display: "flex", minWidth: 0, flexDirection: "column" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={showChanges}
              onChange={(e) => setShowChanges(e.currentTarget.checked)}
            />
            Show changes
          </label>
          <textarea
            className="file-recovery-text"
            data-ext={path?.split(".").pop() ?? ""}
            readOnly
            value={preview}
            style={{ marginTop: "var(--size-4-2)", minHeight: 340, resize: "none" }}
          />
          <div
            className="modal-button-container"
            style={{ justifyContent: "flex-end", paddingInlineEnd: 0 }}
          >
            <button type="button" onClick={copy} disabled={!selected}>
              Copy
            </button>
            <button type="button" className="mod-cta" onClick={restore} disabled={!selected}>
              Restore
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
