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
      style={{
        width: "100%",
        background: "var(--background-primary)",
        border: "1px solid var(--background-modifier-border)",
        borderRadius: "var(--radius-m)",
        padding: "var(--size-4-3)",
        cursor: "var(--cursor-link)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--size-2-2)",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: "var(--font-ui-medium)",
          fontWeight: "var(--font-semibold)",
          color: "var(--text-normal)",
        }}
      >
        {stem(row.file.path)}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(80px, max-content) 1fr",
          rowGap: "var(--size-2-2)",
          columnGap: "var(--size-4-2)",
          fontSize: "var(--font-ui-smaller)",
        }}
      >
        {cols.map((col) => {
          const value = formatCellValue(row.cells[col], col);
          return (
            <div key={col} style={{ display: "contents" }}>
              <div style={{ color: "var(--text-faint)" }}>
                {localizedColumnLabel(col, config.formulas, t)}
              </div>
              <div
                style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {value || "—"}
              </div>
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "var(--size-4-3)",
        padding: "var(--size-4-1) 0",
      }}
    >
      {rs.map((row) => (
        <Card key={row.file.path} row={row} config={config} cols={kvCols} />
      ))}
    </div>
  );

  return (
    <div
      style={{
        flex: "1 1 auto",
        overflow: "auto",
        padding: "0 var(--size-4-3) var(--size-4-3)",
      }}
    >
      {rows.length === 0 ? (
        <div
          style={{
            padding: "var(--size-4-6)",
            textAlign: "center",
            color: "var(--text-faint)",
          }}
        >
          {t("bases.empty.noMatchingFiles")}
        </div>
      ) : grouped ? (
        [...grouped.entries()].map(([key, rs]) => (
          <div key={key}>
            <div
              style={{
                padding: "var(--size-4-3) 0 var(--size-4-1)",
                color: "var(--text-muted)",
                fontWeight: "var(--font-semibold)",
                fontSize: "var(--font-ui-smaller)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {key} · {rs.length}
            </div>
            {renderGrid(rs)}
          </div>
        ))
      ) : (
        renderGrid(rows)
      )}
      {summaries.length > 0 && (
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
      )}
    </div>
  );
}
