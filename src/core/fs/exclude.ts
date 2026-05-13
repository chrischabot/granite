/**
 * Excluded-files helper.
 *
 * Patterns:
 *   - Bare segment ("archive" or "drafts"): matches if any path segment equals it.
 *     Useful for "hide this folder anywhere it shows up".
 *   - Glob with `*` / `**` / `?`: matched against the full path.
 *       `*`   — any characters except `/`
 *       `**`  — any characters including `/`
 *       `?`   — exactly one character except `/`
 *   - Comment lines start with `#` and are skipped.
 *   - Blank lines are skipped.
 */

export function parseExcludePatterns(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("#"));
}

function globToRegex(glob: string): RegExp {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 1;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^${}()|[]\\".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re);
}

function matchOne(pattern: string, path: string): boolean {
  const trimmed = pattern.replace(/^\/+|\/+$/g, "");
  if (trimmed.length === 0) return false;
  if (!trimmed.includes("/") && !trimmed.includes("*") && !trimmed.includes("?")) {
    return path.split("/").includes(trimmed);
  }
  return globToRegex(trimmed).test(path);
}

export function isExcluded(path: string, patterns: ReadonlyArray<string>): boolean {
  if (patterns.length === 0) return false;
  for (const p of patterns) {
    if (matchOne(p, path)) return true;
  }
  return false;
}

/** Convenience: filter an iterable of items by a path selector + patterns. */
export function filterExcluded<T>(
  items: Iterable<T>,
  patterns: ReadonlyArray<string>,
  getPath: (item: T) => string,
): T[] {
  if (patterns.length === 0) return [...items];
  const out: T[] = [];
  for (const item of items) {
    if (!isExcluded(getPath(item), patterns)) out.push(item);
  }
  return out;
}
