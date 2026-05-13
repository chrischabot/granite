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
      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
        {v.map((t, i) => (
          <span
            key={`${String(t)}-${i}`}
            className="tag"
            style={{
              background: "var(--tag-background)",
              color: "var(--tag-color)",
              padding: "0 0.5em",
              borderRadius: "var(--tag-radius)",
              fontSize: "0.85em",
            }}
          >
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
        style={{ cursor: "var(--cursor-link)" }}
      >
        {displayColumns.map((col) => (
          <td
            key={col}
            style={{
              padding: "var(--size-2-3) var(--size-4-3)",
              borderBottom: "1px solid var(--background-modifier-border)",
              color: "var(--text-normal)",
              whiteSpace: col === "file.path" ? "nowrap" : "normal",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 360,
            }}
          >
            {renderCell(row.cells[col], col)}
          </td>
        ))}
      </tr>
    ));

  const groupHeadingRow = (label: string, count: number, key: string) => (
    <tr key={key}>
      <td
        colSpan={displayColumns.length}
        style={{
          padding: "var(--size-4-2) var(--size-4-3)",
          background: "var(--background-secondary)",
          color: "var(--text-muted)",
          fontWeight: "var(--font-semibold)",
          fontSize: "var(--font-ui-smaller)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label} · {count}
      </td>
    </tr>
  );

  return (
    <div
      style={{
        flex: "1 1 auto",
        overflow: "auto",
        padding: "0 var(--size-4-3) var(--size-4-3)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--font-ui-small)",
        }}
      >
        <thead>
          <tr>
            {displayColumns.map((col) => {
              const isActive = col === sortColumn;
              return (
                <th
                  key={col}
                  style={{
                    textAlign: "left",
                    padding: "var(--size-2-3) var(--size-4-3)",
                    background: "var(--background-secondary)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    position: "sticky",
                    top: 0,
                    userSelect: "none",
                    borderBottom: "1px solid var(--background-modifier-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSort(col)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {localizedColumnLabel(col, config.formulas, t)}
                    {isActive && (
                      <span style={{ marginInlineStart: 4 }}>
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
              <td
                colSpan={displayColumns.length}
                style={{
                  padding: "var(--size-4-4)",
                  color: "var(--text-faint)",
                  textAlign: "center",
                }}
              >
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
              <td
                colSpan={displayColumns.length}
                style={{
                  padding: "var(--size-4-2) var(--size-4-3)",
                  background: "var(--background-secondary)",
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
