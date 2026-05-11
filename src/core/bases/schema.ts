import yaml from "js-yaml";

export type SortOrder = "asc" | "desc";

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
}

export const DEFAULT_BASE: BaseConfig = {
  name: "Untitled base",
  filter: "",
  columns: ["file.name", "file.path", "file.modified", "tags"],
  sort: "file.name",
  sortOrder: "asc",
};

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function asStringArray(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return fallback;
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
  return {
    name: asString(obj["name"], DEFAULT_BASE.name),
    filter: asString(obj["filter"], DEFAULT_BASE.filter),
    columns: asStringArray(obj["columns"], [...DEFAULT_BASE.columns]) as ColumnKey[],
    sort: asString(obj["sort"], DEFAULT_BASE.sort) as ColumnKey,
    sortOrder,
  };
}

/** Serialize a BaseConfig back to YAML (no comments preserved). */
export function serializeBaseConfig(config: BaseConfig): string {
  return yaml.dump({
    name: config.name,
    filter: config.filter,
    columns: [...config.columns],
    sort: config.sort,
    sortOrder: config.sortOrder,
  });
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