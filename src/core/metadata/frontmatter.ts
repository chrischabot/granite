import yaml from "js-yaml";

const FENCE_RE = /^---\r?\n/;

/** Splits a markdown document into [yamlText | null, body]. */
export function splitFrontmatter(text: string): {
  yamlText: string | null;
  body: string;
  newline: "\n" | "\r\n";
} {
  const newline: "\n" | "\r\n" = text.includes("\r\n") ? "\r\n" : "\n";
  if (!FENCE_RE.test(text)) {
    return { yamlText: null, body: text, newline };
  }
  // Find the closing `---` on a line by itself.
  const startLen = 3 + newline.length; // length of "---" + newline
  const endMarker = `${newline}---${newline}`;
  const end = text.indexOf(endMarker, startLen);
  if (end === -1) return { yamlText: null, body: text, newline };
  const yamlText = text.slice(startLen, end);
  const body = text.slice(end + endMarker.length);
  return { yamlText, body, newline };
}

/** Parse the frontmatter block as a record. Empty/invalid → empty object. */
export function parseFrontmatter(text: string): Record<string, unknown> {
  const { yamlText } = splitFrontmatter(text);
  if (yamlText === null) return {};
  try {
    const parsed = yaml.load(yamlText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fallthrough */
  }
  return {};
}

function rebuild(
  fm: Record<string, unknown>,
  body: string,
  newline: "\n" | "\r\n",
): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) {
    // Drop frontmatter entirely if it's empty.
    return body.replace(/^\s+/, "");
  }
  const dumped = yaml
    .dump(fm, { lineWidth: 1000, noRefs: true })
    .trimEnd();
  return `---${newline}${dumped}${newline}---${newline}${body.startsWith(newline) ? body.slice(newline.length) : body}`;
}

/** Set a single frontmatter property. Returns the new file text. Creates a
 *  frontmatter block if missing. */
export function updateFrontmatterValue(
  text: string,
  key: string,
  value: unknown,
): string {
  const { body, newline } = splitFrontmatter(text);
  const fm = parseFrontmatter(text);
  fm[key] = value;
  return rebuild(fm, body, newline);
}

/** Remove a frontmatter property. */
export function removeFrontmatterValue(text: string, key: string): string {
  const { body, newline } = splitFrontmatter(text);
  const fm = parseFrontmatter(text);
  delete fm[key];
  return rebuild(fm, body, newline);
}

/** Rename a frontmatter property in place (preserves order best-effort via reassembly). */
export function renameFrontmatterKey(
  text: string,
  oldKey: string,
  newKey: string,
): string {
  if (oldKey === newKey) return text;
  const { body, newline } = splitFrontmatter(text);
  const fm = parseFrontmatter(text);
  if (!(oldKey in fm)) return text;
  const ordered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fm)) {
    if (k === oldKey) ordered[newKey] = v;
    else ordered[k] = v;
  }
  return rebuild(ordered, body, newline);
}