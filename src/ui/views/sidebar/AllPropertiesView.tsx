import { useEffect, useState, useSyncExternalStore } from "react";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import {
  getRegistryVersion,
  getTypeOverride,
  PROPERTY_TYPES,
  setTypeOverride,
  subscribeTypeRegistry,
  type PropertyType,
} from "@core/metadata/type-registry";
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

export function AllPropertiesView() {
  const version = useMetadataVersion();
  useSyncExternalStore(subscribeTypeRegistry, getRegistryVersion, getRegistryVersion);
  const [aggregate, setAggregate] = useState<PropertyAggregate[]>([]);

  useEffect(() => {
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
    return (
      <div className="workspace-sidedock-empty-state">
        No properties found across vault.
      </div>
    );
  }

  return (
    <div className="metadata-container">
      <div className="metadata-properties">
        {aggregate.map((p) => {
          const override = getTypeOverride(p.name);
          const effective = override ?? p.inferredType;
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
              <div
                className="metadata-property-key"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontWeight: "var(--font-medium)",
                  color: "var(--text-normal)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "var(--cursor-link)",
                }}
                onClick={() => setSearchQuery(p.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSearchQuery(p.name);
                  }
                }}
              >
                {p.name}
              </div>
              <select
                className="dropdown"
                value={override ?? ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  void setTypeOverride(p.name, v ? (v as PropertyType) : null);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  minWidth: 110,
                  fontSize: "var(--font-ui-smaller)",
                }}
                title={
                  override
                    ? `Override set to "${override}". Reset to clear.`
                    : `Inferred type: ${effective}`
                }
              >
                <option value="">{`(inferred: ${p.inferredType})`}</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
                title={`${p.count} note${p.count === 1 ? "" : "s"} use this property`}
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