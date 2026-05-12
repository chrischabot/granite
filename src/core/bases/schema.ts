import yaml from "js-yaml";
import type { SummaryOp, SummarySpec } from "./summary";

export type SortOrder = "asc" | "desc";

export type BaseViewType = "table" | "list" | "cards";

/** A column key — either a structural pseudo-property or a frontmatter key. */
export type ColumnKey =
  | "file.name"
  | "file.path"
  | "file.modified"
  | "file.created"
  | "file.size"
  | "tags"
  | (string & {}); // frontmatter property keys flow through here.

export interface BaseConfig {
  readonly name: string;
  /** Search query string (same syntax as the Search panel). */
  readonly filter: string;
  readonly columns: ReadonlyArray<ColumnKey>;
  readonly sort: ColumnKey;
  readonly sortOrder: SortOrder;
  /** Visual layout. Defaults to "table". */
  readonly view: BaseViewType;
  /** Column to group rows by (optional). */
  readonly groupBy?: ColumnKey;
  /** Aggregations over the filtered rows. */
  readonly summaries: ReadonlyArray<SummarySpec>;
  /** Named computed columns. Keys are column names; values are formula sources. */
  readonly formulas: Readonly<Record<string, string>>;
}

export const DEFAULT_BASE: BaseConfig = {
  name: "Untitled base",
  filter: "",
  columns: ["file.name", "file.path", "file.modified", "tags"],
  sort: "file.name",
  sortOrder: "asc",
  view: "table",
  summaries: [],
  formulas: {},
};

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function asStringArray(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return fallback;
}

function parseView(v: unknown): BaseViewType {
  return v === "list" || v === "cards" ? v : "table";
}

const SUMMARY_OPS: ReadonlySet<SummaryOp> = new Set([
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "median",
]);

function parseSummaries(v: unknown): SummarySpec[] {
  if (!Array.isArray(v)) return [];
  const out: SummarySpec[] = [];
  for (const entry of v) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec = entry as Record<string, unknown>;
    const column = typeof rec["column"] === "string" ? (rec["column"] as string) : null;
    const op = typeof rec["op"] === "string" ? (rec["op"] as string) : null;
    if (!column || !op || !SUMMARY_OPS.has(op as SummaryOp)) continue;
    const label = typeof rec["label"] === "string" ? (rec["label"] as string) : undefined;
    out.push({ column, op: op as SummaryOp, ...(label ? { label } : {}) });
  }
  return out;
}

function parseFormulas(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

/** Parse a `.base` YAML document into a BaseConfig with defaults filled in. */
export function parseBaseConfig(text: string): BaseConfig {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    return DEFAULT_BASE;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return DEFAULT_BASE;
  }
  const obj = parsed as Record<string, unknown>;
  const sortOrderRaw = obj["sortOrder"];
  const sortOrder: SortOrder = sortOrderRaw === "desc" ? "desc" : "asc";
  const config: BaseConfig = {
    name: asString(obj["name"], DEFAULT_BASE.name),
    filter: asString(obj["filter"], DEFAULT_BASE.filter),
    columns: asStringArray(obj["columns"], [...DEFAULT_BASE.columns]) as ColumnKey[],
    sort: asString(obj["sort"], DEFAULT_BASE.sort) as ColumnKey,
    sortOrder,
    view: parseView(obj["view"]),
    summaries: parseSummaries(obj["summaries"]),
    formulas: parseFormulas(obj["formulas"]),
  };
  const groupBy =
    typeof obj["groupBy"] === "string" && (obj["groupBy"] as string).length > 0
      ? (obj["groupBy"] as ColumnKey)
      : undefined;
  return groupBy ? { ...config, groupBy } : config;
}

/** Serialize a BaseConfig back to YAML (no comments preserved). */
export function serializeBaseConfig(config: BaseConfig): string {
  const out: Record<string, unknown> = {
    name: config.name,
    filter: config.filter,
    columns: [...config.columns],
    sort: config.sort,
    sortOrder: config.sortOrder,
    view: config.view,
  };
  if (config.groupBy) out["groupBy"] = config.groupBy;
  if (config.summaries.length > 0) {
    out["summaries"] = config.summaries.map((s) =>
      s.label ? { column: s.column, op: s.op, label: s.label } : { column: s.column, op: s.op },
    );
  }
  if (Object.keys(config.formulas).length > 0) {
    out["formulas"] = { ...config.formulas };
  }
  return yaml.dump(out);
}

/** Friendly column label for the header row. */
export function columnLabel(key: ColumnKey): string {
  switch (key) {
    case "file.name":
      return "Name";
    case "file.path":
      return "Path";
    case "file.modified":
      return "Modified";
    case "file.created":
      return "Created";
    case "file.size":
      return "Size";
    case "tags":
      return "Tags";
    default:
      return key;
  }
}
