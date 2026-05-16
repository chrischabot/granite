import { ExternalLink, FolderOpen, FolderPlus, Globe, Trash2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { inputPrompt } from "../overlay/inputPrompt";
import { Modal } from "../overlay/Modal";
import { useVault } from "../vault/VaultContext";

export interface VaultPickerProps {
  open: boolean;
  onClose: () => void;
}

export function VaultPicker({ open, onClose }: VaultPickerProps) {
  const {
    vaults,
    activeVault,
    canPickFolder,
    canUseOpfs,
    pickFolder,
    openOpfs,
    reopen,
    openInNewWindow,
    removeVault,
  } = useVault();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useI18n();

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onCreateOpfs = async () => {
    const name = await inputPrompt({
      title: t("vaultPicker.prompt.opfsName"),
      defaultValue: t("vaultPicker.prompt.opfsDefault"),
      requireValue: true,
    });
    if (!name) return;
    void wrap(() => openOpfs(name));
  };

  return (
    <Modal open={open} onClose={onClose} title={t("vaultPicker.title")} modifier="mod-narrow">
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>{t("vaultPicker.description")}</p>

      {error && (
        <div className="message mod-error" style={{ marginBottom: "var(--size-4-3)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--size-4-3)" }}>
        {vaults.length > 0 && (
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "var(--font-ui-medium)",
                fontWeight: "var(--font-semibold)",
              }}
            >
              {t("vaultPicker.recent")}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: "var(--size-4-2) 0 0" }}>
              {vaults.map((v) => {
                const isActive = activeVault?.entry.id === v.id;
                return (
                  <li
                    key={v.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--size-4-2)",
                      padding: "var(--size-4-2)",
                      borderRadius: "var(--radius-s)",
                      background: "var(--background-primary-alt)",
                      marginBottom: "var(--size-2-2)",
                    }}
                  >
                    {v.kind === "fsa" ? <FolderOpen size={16} /> : <Globe size={16} />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: "var(--font-medium)" }}>{v.name}</span>
                      <span
                        style={{
                          fontSize: "var(--font-ui-smaller)",
                          color: "var(--text-faint)",
                          marginLeft: "var(--size-4-2)",
                        }}
                      >
                        {v.kind === "fsa" ? t("vaultPicker.kind.disk") : t("vaultPicker.kind.opfs")}
                      </span>
                    </span>
                    {isActive ? (
                      <span style={{ color: "var(--text-success)" }}>
                        {t("vaultPicker.active")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => wrap(() => reopen(v.id))}
                        disabled={busy}
                      >
                        {t("vaultPicker.open")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="clickable-icon"
                      aria-label={t("vaultPicker.openNewWindow", { name: v.name })}
                      title={t("vaultPicker.openNewWindow", { name: v.name })}
                      onClick={() => openInNewWindow(v.id)}
                      disabled={busy}
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      type="button"
                      className="clickable-icon"
                      aria-label={t("vaultPicker.remove", { name: v.name })}
                      onClick={() => void removeVault(v.id)}
                      disabled={busy}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-ui-medium)",
              fontWeight: "var(--font-semibold)",
            }}
          >
            {t("vaultPicker.new")}
          </h3>
          <div style={{ display: "flex", gap: "var(--size-4-2)", marginTop: "var(--size-4-2)" }}>
            <button
              type="button"
              className="mod-cta"
              onClick={() => wrap(pickFolder)}
              disabled={!canPickFolder || busy}
              title={
                canPickFolder
                  ? t("vaultPicker.pickFolderTitle")
                  : t("vaultPicker.pickFolderUnavailable")
              }
            >
              <FolderPlus size={14} style={{ marginRight: "var(--size-2-2)" }} />
              {t("vaultPicker.pickFolder")}
            </button>
            <button
              type="button"
              onClick={onCreateOpfs}
              disabled={!canUseOpfs || busy}
              title={t("vaultPicker.opfsTitle")}
            >
              <Globe size={14} style={{ marginRight: "var(--size-2-2)" }} />
              {t("vaultPicker.opfs")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
