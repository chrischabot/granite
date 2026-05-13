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
    <div className="bases-summary-bar">
      {summaries.map((s) => (
        <span key={s.label}>
          <strong>{s.label}:</strong>{" "}
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
    <div className="bases-map-plane" aria-label={t("bases.map.aria")}>
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
            left: `${point.xPct}%`,
            top: `${point.yPct}%`,
          }}
          aria-label={t("bases.map.open", { name: stem(point.row.file.path) })}
        />
      ))}
    </div>
  );

  return (
    <div className="bases-map-container">
      <div className="bases-map-description">
        {t("bases.map.coordinatesFrom")} <code>{config.mapLatitude}</code> /{" "}
        <code>{config.mapLongitude}</code>
      </div>
      {points.length === 0 ? (
        <div className="bases-empty">{t("bases.map.empty")}</div>
      ) : groups ? (
        groups.map(([key, pts]) => (
          <section key={key} className="bases-map-group">
            <h3 className="bases-cards-line">
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
