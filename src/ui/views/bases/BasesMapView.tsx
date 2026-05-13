import type { BaseConfig } from "@core/bases/schema";
import type { SummaryResult } from "@core/bases/summary";
import { stem } from "@core/fs/path";
import { workspaceStore } from "@core/workspace/store";
import { useI18n } from "../../i18n/useI18n";
import { type Row, formatCellValue } from "./shared";

export interface MapPoint {
  readonly row: Row;
  readonly lat: number;
  readonly lng: number;
  readonly xPct: number;
  readonly yPct: number;
}

function asCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function collectMapPoints(rows: ReadonlyArray<Row>, config: BaseConfig): MapPoint[] {
  const out: MapPoint[] = [];
  for (const row of rows) {
    const lat = asCoordinate(row.cells[config.mapLatitude]);
    const lng = asCoordinate(row.cells[config.mapLongitude]);
    if (lat === null || lng === null) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    out.push({
      row,
      lat,
      lng,
      xPct: ((lng + 180) / 360) * 100,
      yPct: ((90 - lat) / 180) * 100,
    });
  }
  return out;
}

export interface BasesMapViewProps {
  readonly config: BaseConfig;
  readonly rows: ReadonlyArray<Row>;
  readonly grouped: Map<string, ReadonlyArray<Row>> | null;
  readonly summaries: ReadonlyArray<SummaryResult>;
}

function SummaryBar({ summaries }: { readonly summaries: ReadonlyArray<SummaryResult> }) {
  if (summaries.length === 0) return null;
  return (
    <div
      style={{
        padding: "var(--size-4-3)",
        borderTop: "1px solid var(--background-modifier-border)",
        fontSize: "var(--font-ui-smaller)",
        color: "var(--text-muted)",
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--size-4-4)",
      }}
    >
      {summaries.map((s) => (
        <span key={s.label}>
          <strong style={{ color: "var(--text-normal)" }}>{s.label}:</strong>{" "}
          {s.value === null ? "—" : Number.isInteger(s.value) ? s.value : s.value.toFixed(2)}
        </span>
      ))}
    </div>
  );
}

export function BasesMapView({ config, rows, grouped, summaries }: BasesMapViewProps) {
  const t = useI18n();
  const points = collectMapPoints(rows, config);
  const groups = grouped
    ? [...grouped.entries()].map(([key, rs]) => [key, collectMapPoints(rs, config)] as const)
    : null;

  const renderMap = (pts: ReadonlyArray<MapPoint>) => (
    <div
      className="bases-map-plane"
      aria-label={t("bases.map.aria")}
      style={{
        position: "relative",
        minHeight: 420,
        border: "1px solid var(--background-modifier-border)",
        borderRadius: "var(--radius-m)",
        overflow: "hidden",
        background:
          "linear-gradient(var(--background-modifier-border) 1px, transparent 1px), linear-gradient(90deg, var(--background-modifier-border) 1px, transparent 1px), var(--background-secondary)",
        backgroundSize: "10% 10%",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, transparent 0 34%, var(--background-primary-alt) 35% 36%, transparent 37%)",
          opacity: 0.45,
        }}
      />
      {pts.map((point) => (
        <button
          key={point.row.file.path}
          type="button"
          className="bases-map-pin"
          title={`${stem(point.row.file.path)} (${point.lat}, ${point.lng})`}
          onClick={(e) =>
            workspaceStore.openFile(point.row.file.path, {
              newTab: e.metaKey || e.ctrlKey,
            })
          }
          style={{
            position: "absolute",
            left: `${point.xPct}%`,
            top: `${point.yPct}%`,
            transform: "translate(-50%, -50%)",
            width: 16,
            height: 16,
            borderRadius: 999,
            border: "2px solid var(--background-primary)",
            background: "var(--interactive-accent)",
            boxShadow: "0 0 0 2px var(--text-accent)",
            cursor: "var(--cursor-link)",
          }}
          aria-label={t("bases.map.open", { name: stem(point.row.file.path) })}
        />
      ))}
    </div>
  );

  return (
    <div style={{ flex: "1 1 auto", overflow: "auto", padding: "var(--size-4-3)" }}>
      <div style={{ marginBottom: "var(--size-4-3)", color: "var(--text-muted)" }}>
        {t("bases.map.coordinatesFrom")} <code>{config.mapLatitude}</code> /{" "}
        <code>{config.mapLongitude}</code>
      </div>
      {points.length === 0 ? (
        <div
          style={{
            padding: "var(--size-4-6)",
            textAlign: "center",
            color: "var(--text-faint)",
            border: "1px solid var(--background-modifier-border)",
            borderRadius: "var(--radius-m)",
          }}
        >
          {t("bases.map.empty")}
        </div>
      ) : groups ? (
        groups.map(([key, pts]) => (
          <section key={key} style={{ marginBottom: "var(--size-4-5)" }}>
            <h3 style={{ fontSize: "var(--font-ui-medium)" }}>
              {formatCellValue(key, config.groupBy ?? "file.name")} · {pts.length}
            </h3>
            {renderMap(pts)}
          </section>
        ))
      ) : (
        renderMap(points)
      )}
      <SummaryBar summaries={summaries} />
    </div>
  );
}
