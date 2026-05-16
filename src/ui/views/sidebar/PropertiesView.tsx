import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { getLocale, subscribeI18n } from "@core/i18n";
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
import {
  AlignLeft,
  Braces,
  Calendar,
  CalendarClock,
  CheckSquare,
  Hash,
  List,
  Plus,
  Trash2,
} from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../i18n/useI18n";
import { inputPrompt } from "../../overlay/inputPrompt";

type ValueType = "text" | "number" | "checkbox" | "list" | "json" | "date" | "datetime";

const TYPE_ICON: Record<ValueType, (props: { size: number }) => ReactElement> = {
  text: ({ size }) => <AlignLeft size={size} />,
  number: ({ size }) => <Hash size={size} />,
  checkbox: ({ size }) => <CheckSquare size={size} />,
  list: ({ size }) => <List size={size} />,
  json: ({ size }) => <Braces size={size} />,
  date: ({ size }) => <Calendar size={size} />,
  datetime: ({ size }) => <CalendarClock size={size} />,
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function inferType(v: unknown): ValueType {
  if (typeof v === "boolean") return "checkbox";
  if (typeof v === "number") return "number";
  if (v instanceof Date) return isDateOnly(v) ? "date" : "datetime";
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

function isDateOnly(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

function toDateInputValue(value: unknown, draft: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return ISO_DATE_RE.test(draft) ? draft : "";
}

function toDatetimeInputValue(value: unknown, draft: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 16);
  return toDatetimeLocal(draft);
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
  const locale = useSyncExternalStore(subscribeI18n, getLocale, getLocale);
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
    const key = await inputPrompt({ title: t("properties.addPrompt"), requireValue: true });
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
    <div className="metadata-container">
      <div className="metadata-properties">
        {entries.length === 0 ? (
          <div
            style={{
              color: "var(--text-faint)",
              fontSize: "var(--font-ui-small)",
              padding: "var(--size-4-3) var(--size-2-3)",
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
              locale={locale}
            />
          ))
        )}
      </div>
      <button type="button" className="metadata-add-property" onClick={() => void handleAdd()}>
        <Plus size={14} />
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
  locale,
}: {
  propKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
  onRemove: () => void;
  t: ReturnType<typeof useI18n>;
  locale: string;
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

  const TypeIcon = TYPE_ICON[type];
  return (
    <div className="metadata-property">
      <div className="metadata-property-key" title={propKey}>
        <span className="metadata-property-key-icon" aria-hidden="true">
          <TypeIcon size={14} />
        </span>
        <span className="metadata-property-key-text">{propKey}</span>
      </div>
      <div className="metadata-property-value">
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
            lang={locale}
            value={toDateInputValue(value, draft)}
            onChange={(e) => commit(e.currentTarget.value)}
            style={{ width: "100%" }}
          />
        ) : type === "datetime" ? (
          <input
            type="datetime-local"
            lang={locale}
            value={toDatetimeInputValue(value, draft)}
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
        className="clickable-icon metadata-property-remove"
        onClick={onRemove}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
