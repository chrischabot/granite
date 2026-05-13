import type { BaseConfig, ColumnKey } from "@core/bases/schema";
import type { SummaryResult } from "@core/bases/summary";
import { stem } from "@core/fs/path";
import { workspaceStore } from "@core/workspace/store";
import { useI18n } from "../../i18n/useI18n";
import { type Row, formatCellValue, localizedColumnLabel } from "./shared";

export interface BasesCardsViewProps {
  readonly config: BaseConfig;
  readonly rows: ReadonlyArray<Row>;
  readonly grouped: Map<string, ReadonlyArray<Row>> | null;
  readonly summaries: ReadonlyArray<SummaryResult>;
  readonly displayColumns: ReadonlyArray<ColumnKey>;
}

function openRow(row: Row, newTab = false) {
  workspaceStore.openFile(row.file.path, { newTab });
}

function Card({
  row,
  config,
  cols,
}: {
  row: Row;
  config: BaseConfig;
  cols: ReadonlyArray<ColumnKey>;
}) {
  const t = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => {
        openRow(row, e.metaKey || e.ctrlKey);
      }}
      className="bases-cards-item"
    >
      <div className="bases-cards-line">{stem(row.file.path)}</div>
      <div className="bases-cards-property">
        {cols.map((col) => {
          const value = formatCellValue(row.cells[col], col);
          return (
            <div key={col} style={{ display: "contents" }}>
              <div className="bases-cards-label">
                {localizedColumnLabel(col, config.formulas, t)}
              </div>
              <div className="bases-cards-value">{value || "—"}</div>
            </div>
          );
        })}
      </div>
    </button>
  );
}

export function BasesCardsView({
  config,
  rows,
  grouped,
  summaries,
  displayColumns,
}: BasesCardsViewProps) {
  const t = useI18n();
  // file.name becomes the card title; remaining columns are kv rows.
  const kvCols = displayColumns.filter((c) => c !== "file.name");

  const renderGrid = (rs: ReadonlyArray<Row>) => (
    <div className="bases-cards-grid">
      {rs.map((row) => (
        <Card key={row.file.path} row={row} config={config} cols={kvCols} />
      ))}
    </div>
  );

  return (
    <div className="bases-cards-container">
      {rows.length === 0 ? (
        <div className="bases-empty">{t("bases.empty.noMatchingFiles")}</div>
      ) : grouped ? (
        [...grouped.entries()].map(([key, rs]) => (
          <div key={key} className="bases-cards-group">
            <div className="bases-group-heading">
              {key} · {rs.length}
            </div>
            {renderGrid(rs)}
          </div>
        ))
      ) : (
        renderGrid(rows)
      )}
      {summaries.length > 0 && (
        <div className="bases-summary-bar">
          {summaries.map((s) => (
            <span key={s.label}>
              <strong>{s.label}:</strong>{" "}
              {s.value === null ? "—" : Number.isInteger(s.value) ? s.value : s.value.toFixed(2)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
