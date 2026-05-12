import { type FormulaValue, tryEvaluateFormula } from "@core/bases/formula";
import {
  type BaseConfig,
  type ColumnKey,
  type SortOrder,
  columnLabel as schemaColumnLabel,
} from "@core/bases/schema";
import { stem } from "@core/fs/path";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { metadataCache } from "@core/metadata/cache";
import type { ReactNode } from "react";

export interface Row {
  readonly file: VaultFile;
  readonly cells: Readonly<Record<string, unknown>>;
}

export interface BasesThisContext {
  readonly file: {
    readonly name: string;
    readonly path: string;
    readonly modified: number;
    readonly created: number;
    readonly size: number;
  };
  readonly fm: Record<string, FormulaValue>;
  readonly tags: ReadonlyArray<FormulaValue>;
}

export function makeThisContext(file: VaultFile): BasesThisContext {
  const meta = metadataCache.getMetadata(file.path as VaultPath);
  const tags = meta ? [...new Set(meta.tags.map((t) => t.name))] : [];
  const frontmatter = meta ? meta.frontmatter : {};
  return {
    file: {
      name: stem(file.path),
      path: file.path,
      modified: file.mtimeMs,
      created: file.ctimeMs,
      size: file.size,
    },
    fm: frontmatter as Record<string, FormulaValue>,
    tags: tags.map((t) => t as FormulaValue),
  };
}

function cellForBuiltin(
  file: VaultFile,
  key: ColumnKey,
  tagsArr: string[],
  frontmatter: Record<string, unknown>,
): unknown {
  switch (key) {
    case "file.name":
      return stem(file.path);
    case "file.path":
      return file.path;
    case "file.modified":
      return file.mtimeMs;
    case "file.created":
      return file.ctimeMs;
    case "file.size":
      return file.size;
    case "tags":
      return tagsArr;
    default:
      return frontmatter[key];
  }
}

/** Build a Row for a file: gather every column the user asked for, including
 *  formula columns, plus a `_file.*` bag exposed to formulas. */
export function computeRow(
  file: VaultFile,
  config: BaseConfig,
  thisContext?: BasesThisContext | null,
): Row {
  const meta = metadataCache.getMetadata(file.path);
  const tagsArr = meta ? [...new Set(meta.tags.map((t) => t.name))] : [];
  const frontmatter = meta ? meta.frontmatter : {};
  const cells: Record<string, unknown> = {};
  const allKeys = new Set<string>([...config.columns]);
  if (config.groupBy) allKeys.add(config.groupBy);
  allKeys.add(config.mapLatitude);
  allKeys.add(config.mapLongitude);
  for (const sum of config.summaries) allKeys.add(sum.column);
  for (const key of allKeys) {
    cells[key] = cellForBuiltin(file, key, tagsArr, frontmatter);
  }

  // Evaluate formula columns last so they can reference everything above.
  const formulaKeys = Object.keys(config.formulas);
  if (formulaKeys.length > 0) {
    const bindings: Record<string, FormulaValue> = {
      file: {
        name: stem(file.path),
        path: file.path,
        modified: file.mtimeMs,
        created: file.ctimeMs,
        size: file.size,
      },
      tags: tagsArr.map((t) => t as FormulaValue),
      fm: frontmatter as Record<string, FormulaValue>,
    };
    if (thisContext) {
      Reflect.set(bindings, "this", thisContext as unknown as FormulaValue);
    }
    for (const [k, v] of Object.entries(frontmatter)) {
      // Treat non-conflicting frontmatter keys as top-level variables so
      // formulas can write `status == "done"` instead of `fm.status == ...`.
      if (!(k in bindings)) {
        bindings[k] = v as FormulaValue;
      }
    }
    for (const key of formulaKeys) {
      const source = config.formulas[key];
      if (source !== undefined) cells[key] = tryEvaluateFormula(source, bindings);
    }
  }
  return { file, cells };
}

export function cellSortKey(v: unknown): number | string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  if (Array.isArray(v))
    return v
      .map((x) => String(x))
      .join(", ")
      .toLowerCase();
  return String(v).toLowerCase();
}

export function sortRows(rows: ReadonlyArray<Row>, column: ColumnKey, order: SortOrder): Row[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const ka = cellSortKey(a.cells[column]);
    const kb = cellSortKey(b.cells[column]);
    if (ka < kb) return order === "asc" ? -1 : 1;
    if (ka > kb) return order === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}

export function columnLabel(key: ColumnKey, formulas: Readonly<Record<string, string>>): string {
  // Formula columns inherit the key as their label.
  if (key in formulas) return key;
  return schemaColumnLabel(key);
}

export function formatCellValue(v: unknown, key: ColumnKey): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  if (key === "file.modified" || key === "file.created") {
    const t = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(t) || t === 0) return "";
    return new Date(t).toLocaleString();
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Render a cell to a ReactNode — wraps array values for known column types. */
export function renderCell(v: unknown, key: ColumnKey): ReactNode {
  if (key === "tags" && Array.isArray(v)) {
    return v.map((t, i) => `#${String(t)}${i < v.length - 1 ? " " : ""}`).join("");
  }
  return formatCellValue(v, key);
}
