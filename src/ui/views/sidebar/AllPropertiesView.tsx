import { metadataCache } from "@core/metadata/cache";
import {
  PROPERTY_TYPES,
  type PropertyType,
  getRegistryVersion,
  getTypeOverride,
  setTypeOverride,
  subscribeTypeRegistry,
} from "@core/metadata/type-registry";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../i18n/useI18n";
import { setSearchQuery } from "./SearchView";

interface PropertyAggregate {
  name: string;
  count: number;
  inferredType: PropertyType;
}

function inferType(samples: ReadonlyArray<unknown>): PropertyType {
  if (samples.length === 0) return "text";
  const allOf = (pred: (v: unknown) => boolean) => samples.every(pred);
  if (allOf((v) => Array.isArray(v))) return "list";
  if (allOf((v) => typeof v === "boolean")) return "checkbox";
  if (allOf((v) => typeof v === "number")) return "number";
  if (
    allOf(
      (v) =>
        typeof v === "string" &&
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(v),
    )
  ) {
    const hasTime = samples.some((v) => typeof v === "string" && /T/.test(v));
    return hasTime ? "datetime" : "date";
  }
  return "text";
}

function propertyTypeLabel(t: ReturnType<typeof useI18n>, type: PropertyType): string {
  return t(`propertyType.${type}`);
}

export function AllPropertiesView() {
  const t = useI18n();
  const version = useMetadataVersion();
  useSyncExternalStore(subscribeTypeRegistry, getRegistryVersion, getRegistryVersion);
  const [aggregate, setAggregate] = useState<PropertyAggregate[]>([]);

  useEffect(() => {
    void version;
    const props = metadataCache.getAllProperties();
    setAggregate(
      props.map((p) => ({
        name: p.name,
        count: p.count,
        inferredType: inferType(p.samples),
      })),
    );
  }, [version]);

  if (aggregate.length === 0) {
    return <div className="workspace-sidedock-empty-state">{t("allProperties.empty")}</div>;
  }

  return (
    <div className="metadata-container">
      <div className="metadata-properties">
        {aggregate.map((p) => {
          const override = getTypeOverride(p.name);
          const effective = override ?? p.inferredType;
          const effectiveLabel = propertyTypeLabel(t, effective);
          const inferredLabel = propertyTypeLabel(t, p.inferredType);
          const noteLabel = t(p.count === 1 ? "properties.note" : "properties.notes");
          return (
            <div
              key={p.name}
              className="metadata-property"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--size-4-2)",
                padding: "var(--size-2-3) var(--size-4-2)",
                cursor: "var(--cursor)",
              }}
            >
              <button
                type="button"
                className="metadata-property-key"
                style={{
                  background: "transparent",
                  border: 0,
                  flex: 1,
                  minWidth: 0,
                  padding: 0,
                  fontWeight: "var(--font-medium)",
                  color: "var(--text-normal)",
                  font: "inherit",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "var(--cursor-link)",
                  textAlign: "start",
                }}
                onClick={() => setSearchQuery(p.name)}
              >
                {p.name}
              </button>
              <select
                className="dropdown"
                value={override ?? ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  void setTypeOverride(p.name, v ? (v as PropertyType) : null);
                }}
                style={{
                  minWidth: 110,
                  fontSize: "var(--font-ui-smaller)",
                }}
                title={
                  override
                    ? t("allProperties.overrideTitle", { type: effectiveLabel })
                    : t("allProperties.inferredTitle", { type: effectiveLabel })
                }
              >
                <option value="">
                  {t("allProperties.inferredOption", { type: inferredLabel })}
                </option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {propertyTypeLabel(t, type)}
                  </option>
                ))}
              </select>
              <span
                style={{
                  color: "var(--text-faint)",
                  fontSize: "var(--font-ui-smaller)",
                  minWidth: 60,
                  textAlign: "end",
                }}
                title={t("allProperties.usageTitle", {
                  count: p.count,
                  noteLabel,
                })}
              >
                {p.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
