import type { BaseConfig, ColumnKey } from "@core/bases/schema";
import type { SummaryResult } from "@core/bases/summary";
import { stem } from "@core/fs/path";
import { workspaceStore } from "@core/workspace/store";
import { useI18n } from "../../i18n/useI18n";
import { type Row, formatCellValue, localizedColumnLabel } from "./shared";

export interface BasesListViewProps {
  readonly config: BaseConfig;
  readonly rows: ReadonlyArray<Row>;
  readonly grouped: Map<string, ReadonlyArray<Row>> | null;
  readonly summaries: ReadonlyArray<SummaryResult>;
  readonly displayColumns: ReadonlyArray<ColumnKey>;
}

function openRow(row: Row, newTab = false) {
  workspaceStore.openFile(row.file.path, { newTab });
}

function ListRow({
  row,
  meta,
  formulas,
}: {
  row: Row;
  meta: ReadonlyArray<ColumnKey>;
  formulas: Readonly<Record<string, string>>;
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
        padding: "var(--size-4-2) var(--size-4-3)",
        borderBottom: "1px solid var(--background-modifier-border)",
        borderTop: 0,
        borderInline: 0,
        background: "transparent",
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
          fontWeight: "var(--font-medium)",
          color: "var(--text-normal)",
        }}
      >
        {stem(row.file.path)}
      </div>
      {meta.length > 0 && (
        <div
          style={{
            fontSize: "var(--font-ui-smaller)",
            color: "var(--text-muted)",
            display: "flex",
            gap: "var(--size-4-3)",
            flexWrap: "wrap",
          }}
        >
          {meta.map((col) => {
            const value = formatCellValue(row.cells[col], col);
            if (!value) return null;
            return (
              <span key={col}>
                <span style={{ color: "var(--text-faint)" }}>
                  {localizedColumnLabel(col, formulas, t)}:
                </span>{" "}
                {value}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}

export function BasesListView({
  config,
  rows,
  grouped,
  summaries,
  displayColumns,
}: BasesListViewProps) {
  const t = useI18n();
  // The "title" of each list row is always the filename; the remaining
  // columns become the muted metadata strip beneath.
  const metaCols = displayColumns.filter((c) => c !== "file.name");

  const renderRows = (rs: ReadonlyArray<Row>) =>
    rs.map((row) => (
      <ListRow key={row.file.path} row={row} meta={metaCols} formulas={config.formulas} />
    ));

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
                padding: "var(--size-4-3) var(--size-4-3) var(--size-4-1)",
                color: "var(--text-muted)",
                fontWeight: "var(--font-semibold)",
                fontSize: "var(--font-ui-smaller)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {key} · {rs.length}
            </div>
            {renderRows(rs)}
          </div>
        ))
      ) : (
        renderRows(rows)
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
