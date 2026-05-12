import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { removeFrontmatterValue, updateFrontmatterValue } from "@core/metadata/frontmatter";
import {
  getRegistryVersion,
  getTypeOverride,
  subscribeTypeRegistry,
} from "@core/metadata/type-registry";
import { useFileMetadata } from "@core/metadata/useMetadata";
import { noticeManager } from "@core/notices/notice";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { Effect } from "effect";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../i18n/useI18n";

type ValueType = "text" | "number" | "checkbox" | "list" | "json" | "date" | "datetime";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function inferType(v: unknown): ValueType {
  if (typeof v === "boolean") return "checkbox";
  if (typeof v === "number") return "number";
  if (Array.isArray(v)) return "list";
  if (typeof v === "string") {
    if (ISO_DATETIME_RE.test(v)) return "datetime";
    if (ISO_DATE_RE.test(v)) return "date";
    return "text";
  }
  return "json";
}

function effectiveType(key: string, value: unknown): ValueType {
  const override = getTypeOverride(key);
  if (override) return override;
  return inferType(value);
}

function toDatetimeLocal(value: string): string {
  const m = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return m?.[1] ?? "";
}

async function persist(path: string, mutate: (text: string) => string): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const text = yield* fs.readText(path);
      const next = mutate(text);
      if (next !== text) yield* fs.writeText(path, next);
    }),
  );
}

export function PropertiesView() {
  const t = useI18n();
  const { activeGroupId, groups, leaves } = useWorkspace();
  // Subscribe to type-registry changes so override edits cause a re-render.
  useSyncExternalStore(subscribeTypeRegistry, getRegistryVersion, getRegistryVersion);
  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();
  const meta = useFileMetadata(activePath);

  const handleSetValue = useCallback(
    async (key: string, value: unknown) => {
      if (!activePath) return;
      try {
        await persist(activePath, (t) => updateFrontmatterValue(t, key, value));
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("properties.error.update"), {
          kind: "error",
        });
      }
    },
    [activePath, t],
  );

  const handleRemove = useCallback(
    async (key: string) => {
      if (!activePath) return;
      try {
        await persist(activePath, (t) => removeFrontmatterValue(t, key));
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("properties.error.remove"), {
          kind: "error",
        });
      }
    },
    [activePath, t],
  );

  const handleAdd = useCallback(async () => {
    if (!activePath) return;
    const key = prompt(t("properties.addPrompt"));
    if (!key) return;
    const trimmed = key.trim();
    if (!trimmed) return;
    await handleSetValue(trimmed, "");
  }, [activePath, handleSetValue, t]);

  if (!activePath) {
    return <div className="workspace-sidedock-empty-state">{t("properties.empty.noActive")}</div>;
  }

  const entries = Object.entries(meta?.frontmatter ?? {});

  return (
    <div className="metadata-container" style={{ padding: "var(--size-4-3)" }}>
      <div className="metadata-properties">
        {entries.length === 0 ? (
          <div
            style={{
              color: "var(--text-faint)",
              fontSize: "var(--font-ui-small)",
              padding: "var(--size-4-3) 0",
            }}
          >
            {t("properties.empty.noProperties", { addLabel: t("properties.addLabel") })}
          </div>
        ) : (
          entries.map(([key, value]) => (
            <PropertyRow
              key={key}
              propKey={key}
              value={value}
              onChange={(v) => void handleSetValue(key, v)}
              onRemove={() => void handleRemove(key)}
              t={t}
            />
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => void handleAdd()}
        style={{ marginTop: "var(--size-4-3)" }}
      >
        <Plus size={14} style={{ marginRight: "var(--size-2-2)" }} />
        {t("properties.addAction")}
      </button>
    </div>
  );
}

function PropertyRow({
  propKey,
  value,
  onChange,
  onRemove,
  t,
}: {
  propKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
  onRemove: () => void;
  t: ReturnType<typeof useI18n>;
}) {
  const type = effectiveType(propKey, value);
  const [draft, setDraft] = useState<string>(() => stringify(value));
  useEffect(() => {
    setDraft(stringify(value));
  }, [value]);

  const commit = (newRaw: string) => {
    setDraft(newRaw);
    if (type === "number") {
      const n = Number(newRaw);
      if (Number.isFinite(n)) onChange(n);
      return;
    }
    if (type === "list") {
      const arr = newRaw
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      onChange(arr);
      return;
    }
    if (type === "json") {
      try {
        onChange(JSON.parse(newRaw));
      } catch {
        // hold the draft until valid; do nothing
      }
      return;
    }
    onChange(newRaw);
  };

  return (
    <div
      className="metadata-property"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--size-4-2)",
        padding: "var(--size-2-2) var(--size-4-1)",
      }}
    >
      <div
        className="metadata-property-key"
        style={{
          minWidth: 100,
          maxWidth: 140,
          fontWeight: "var(--font-medium)",
          color: "var(--text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {propKey}
      </div>
      <div className="metadata-property-value" style={{ flex: "1 1 auto", minWidth: 0 }}>
        {type === "checkbox" ? (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        ) : type === "number" ? (
          <input
            type="number"
            value={draft}
            onChange={(e) => commit(e.currentTarget.value)}
            style={{ width: "100%" }}
          />
        ) : type === "list" ? (
          <input
            type="text"
            value={draft}
            placeholder={t("properties.listPlaceholder")}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            style={{ width: "100%" }}
          />
        ) : type === "json" ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={(e) => commit(e.currentTarget.value)}
            rows={2}
            style={{
              width: "100%",
              fontFamily: "var(--font-monospace)",
              fontSize: "var(--font-ui-smaller)",
            }}
          />
        ) : type === "date" ? (
          <input
            type="date"
            value={ISO_DATE_RE.test(draft) ? draft : ""}
            onChange={(e) => commit(e.currentTarget.value)}
            style={{ width: "100%" }}
          />
        ) : type === "datetime" ? (
          <input
            type="datetime-local"
            value={toDatetimeLocal(draft)}
            onChange={(e) => commit(e.currentTarget.value)}
            style={{ width: "100%" }}
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            style={{ width: "100%" }}
          />
        )}
      </div>
      <button
        type="button"
        aria-label={t("properties.remove", { name: propKey })}
        className="clickable-icon"
        onClick={onRemove}
        style={{ padding: 2 }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
