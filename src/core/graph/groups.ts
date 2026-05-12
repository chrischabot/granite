import { stem } from "@core/fs/path";
import { type ParsedQuery, parseQuery } from "@core/search/query";

export interface GraphGroupSpec {
  /** Stable id (uuid-ish). Used to key React elements. */
  readonly id: string;
  /** Display name in the controls panel. */
  readonly name: string;
  /** Search query string. Free terms match against the file stem & path. */
  readonly query: string;
  /** CSS color applied to matching nodes. */
  readonly color: string;
}

export interface GraphGroupCtx {
  readonly path: string;
  readonly tags: ReadonlyArray<string>;
  readonly frontmatter: Record<string, unknown>;
}

function matches(q: ParsedQuery, ctx: GraphGroupCtx): boolean {
  const pathLower = ctx.path.toLowerCase();
  const fileStemLower = stem(ctx.path).toLowerCase();

  for (const term of q.include) {
    const t = term.toLowerCase();
    if (!pathLower.includes(t) && !fileStemLower.includes(t)) return false;
  }
  for (const term of q.exclude) {
    const t = term.toLowerCase();
    if (pathLower.includes(t) || fileStemLower.includes(t)) return false;
  }
  for (const p of q.paths) {
    if (!pathLower.includes(p.toLowerCase())) return false;
  }
  for (const f of q.files) {
    if (!fileStemLower.includes(f.toLowerCase())) return false;
  }
  if (q.tags.length > 0) {
    const tagSet = new Set(ctx.tags.map((t) => t.toLowerCase()));
    for (const wanted of q.tags) {
      if (!tagSet.has(wanted.toLowerCase())) return false;
    }
  }
  if (q.props.length > 0 || q.negatedProps.length > 0) {
    for (const c of q.props) {
      if (!propertyMatches(c.key, c.value, ctx.frontmatter)) return false;
    }
    for (const c of q.negatedProps) {
      if (propertyMatches(c.key, c.value, ctx.frontmatter)) return false;
    }
  }
  return true;
}

function propertyMatches(
  key: string,
  value: ParsedQuery["props"][number]["value"],
  fm: Record<string, unknown>,
): boolean {
  const has = Object.prototype.hasOwnProperty.call(fm, key);
  const v = has ? fm[key] : undefined;
  if (value === null) return has && v !== null && v !== undefined;
  switch (value.kind) {
    case "null":
      return !has || v === null || v === undefined;
    case "not-null":
      return has && v !== null && v !== undefined;
    case "equals": {
      if (!has) return false;
      const wanted = value.value.toLowerCase();
      if (Array.isArray(v)) return v.some((x) => String(x).toLowerCase() === wanted);
      return String(v).toLowerCase() === wanted;
    }
  }
}

/** Test whether a file belongs to a graph group. Content-free — only path,
 *  stem, tags, and frontmatter are used. */
export function matchGraphGroup(spec: GraphGroupSpec, ctx: GraphGroupCtx): boolean {
  const q = parseQuery(spec.query);
  return matches(q, ctx);
}

/** Return the first group whose query matches the context, in array order. */
export function firstMatchingGroup(
  groups: ReadonlyArray<GraphGroupSpec>,
  ctx: GraphGroupCtx,
): GraphGroupSpec | null {
  for (const g of groups) {
    if (matchGraphGroup(g, ctx)) return g;
  }
  return null;
}
