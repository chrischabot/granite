import type { BaseConfig, ColumnKey, SortOrder } from "@core/bases/schema";
import type { SummaryResult } from "@core/bases/summary";
import { workspaceStore } from "@core/workspace/store";
import type { KeyboardEvent, ReactNode } from "react";
import { useI18n } from "../../i18n/useI18n";
import { type Row, formatCellValue, localizedColumnLabel } from "./shared";

export interface BasesTableViewProps {
  readonly config: BaseConfig;
  readonly rows: ReadonlyArray<Row>;
  readonly grouped: Map<string, ReadonlyArray<Row>> | null;
  readonly summaries: ReadonlyArray<SummaryResult>;
  readonly sortColumn: ColumnKey;
  readonly sortOrder: SortOrder;
  readonly onToggleSort: (column: ColumnKey) => void;
  readonly displayColumns: ReadonlyArray<ColumnKey>;
}

function renderCell(v: unknown, key: ColumnKey): ReactNode {
  if (key === "tags" && Array.isArray(v)) {
    return (
      <span className="bases-cell-tags">
        {v.map((t, i) => (
          <span key={`${String(t)}-${i}`} className="tag bases-cell-tag">
            #{String(t)}
          </span>
        ))}
      </span>
    );
  }
  return formatCellValue(v, key);
}

function openRow(row: Row, newTab = false) {
  workspaceStore.openFile(row.file.path, { newTab });
}

function isActivationKey(e: KeyboardEvent): boolean {
  return e.key === "Enter" || e.key === " ";
}

export function BasesTableView({
  config,
  rows,
  grouped,
  summaries,
  sortColumn,
  sortOrder,
  onToggleSort,
  displayColumns,
}: BasesTableViewProps) {
  const t = useI18n();
  const renderRows = (rs: ReadonlyArray<Row>) =>
    rs.map((row) => (
      <tr
        key={row.file.path}
        onClick={(e) => {
          if (e.target instanceof HTMLAnchorElement || (e.target as HTMLElement).closest("a"))
            return;
          openRow(row, e.metaKey || e.ctrlKey);
        }}
        onKeyDown={(e) => {
          if (!isActivationKey(e)) return;
          e.preventDefault();
          openRow(row, e.metaKey || e.ctrlKey);
        }}
        tabIndex={0}
        className="bases-table-row"
      >
        {displayColumns.map((col) => (
          <td key={col} className={`bases-table-cell${col === "file.path" ? " mod-nowrap" : ""}`}>
            {renderCell(row.cells[col], col)}
          </td>
        ))}
      </tr>
    ));

  const groupHeadingRow = (label: string, count: number, key: string) => (
    <tr key={key}>
      <td colSpan={displayColumns.length} className="bases-group-heading">
        {label} · {count}
      </td>
    </tr>
  );

  return (
    <div className="bases-table-container">
      <table className="bases-table">
        <thead>
          <tr>
            {displayColumns.map((col) => {
              const isActive = col === sortColumn;
              return (
                <th key={col} className="bases-table-header">
                  <button
                    type="button"
                    onClick={() => onToggleSort(col)}
                    className="bases-table-header-button"
                  >
                    {localizedColumnLabel(col, config.formulas, t)}
                    {isActive && (
                      <span className="bases-table-header-sort">
                        {sortOrder === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={displayColumns.length} className="bases-table-empty">
                {t("bases.empty.noMatchingFiles")}
              </td>
            </tr>
          ) : grouped ? (
            [...grouped.entries()].flatMap(([key, rs]) => [
              groupHeadingRow(key, rs.length, `g-${key}`),
              ...renderRows(rs),
            ])
          ) : (
            renderRows(rows)
          )}
        </tbody>
        {summaries.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={displayColumns.length} className="bases-table-summary-cell">
                {summaries.map((s) => (
                  <span key={s.label}>
                    <strong>{s.label}:</strong>{" "}
                    {s.value === null
                      ? "—"
                      : Number.isInteger(s.value)
                        ? s.value
                        : s.value.toFixed(2)}
                  </span>
                ))}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
