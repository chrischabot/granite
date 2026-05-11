import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { settingsStore } from "@core/settings/store";
import type { VaultPath } from "@core/fs/types";

export interface UnlinkedMatch {
  /** Zero-based line number where the mention was found. */
  readonly line: number;
  /** Trimmed preview of the line, capped at 200 characters. */
  readonly preview: string;
  /** Which needle (file name or alias) matched on this line. */
  readonly needle: string;
}

export interface UnlinkedFileMatch {
  readonly source: VaultPath;
  readonly matches: ReadonlyArray<UnlinkedMatch>;
}

export interface UnlinkedMentionOptions {
  /** When true, only exact-case matches count. Default false. */
  readonly caseSensitive?: boolean;
  /** Hard cap on matches returned per file. Default 10. */
  readonly maxPerFile?: number;
}

const WORD_CHAR_RE = /[A-Za-z0-9_]/;

/**
 * Find text mentions of any `needle` in `text` that are NOT already wrapped in
 * a wikilink, are NOT inside a fenced code block, are NOT inside an inline
 * code span, and are matched on word boundaries (so "John" doesn't match
 * "Johnson"). Each line contributes at most one match.
 */
export function findUnlinkedMentionsInText(
  text: string,
  needles: ReadonlyArray<string>,
  options: UnlinkedMentionOptions = {},
): UnlinkedMatch[] {
  const caseSensitive = options.caseSensitive ?? false;
  const maxPerFile = options.maxPerFile ?? 10;

  const filtered = needles.filter((n) => n.trim().length > 0);
  if (filtered.length === 0) return [];

  const lines = text.split("\n");
  const out: UnlinkedMatch[] = [];

  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length && out.length < maxPerFile; i++) {
    const line = lines[i] ?? "";
    const fenceOpen = line.match(/^(```+|~~~+)/);
    if (fenceOpen) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceOpen[1]!;
      } else if (line.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
      }
      continue;
    }
    if (inFence) continue;

    const haystack = caseSensitive ? line : line.toLowerCase();
    let foundOnLine: UnlinkedMatch | null = null;

    for (const needle of filtered) {
      if (foundOnLine) break;
      const search = caseSensitive ? needle : needle.toLowerCase();
      if (search.length === 0) continue;
      let pos = 0;
      while (pos < haystack.length) {
        const idx = haystack.indexOf(search, pos);
        if (idx === -1) break;
        const end = idx + search.length;
        // Word-boundary check (don't match inside larger identifiers).
        const before = idx > 0 ? line[idx - 1] ?? "" : "";
        const after = end < line.length ? line[end] ?? "" : "";
        if ((before && WORD_CHAR_RE.test(before)) || (after && WORD_CHAR_RE.test(after))) {
          pos = idx + 1;
          continue;
        }
        // Inside a wikilink? Test the "[[" before idx with no following "]]".
        const beforeText = line.substring(0, idx);
        const lastOpen = beforeText.lastIndexOf("[[");
        const lastClose = beforeText.lastIndexOf("]]");
        if (lastOpen > lastClose) {
          pos = idx + 1;
          continue;
        }
        // Inside an inline code span on this line? Count backticks before idx;
        // an odd count means we're inside `…`.
        const ticksBefore = (beforeText.match(/`/g) ?? []).length;
        if (ticksBefore % 2 === 1) {
          pos = idx + 1;
          continue;
        }
        foundOnLine = {
          line: i,
          preview: line.trim().slice(0, 200),
          needle,
        };
        break;
      }
    }

    if (foundOnLine) out.push(foundOnLine);
  }

  return out;
}

/**
 * Walk every `.md` file in the active vault (excluding `excludePath` itself
 * and any paths matching the user's exclude-files setting) and return per-file
 * unlinked mentions of any needle in `needles`. The search reads each file
 * once; it's intended to fire on user-initiated expansion of an "Unlinked
 * mentions" section, not on every render.
 */
export async function findUnlinkedMentions(
  excludePath: VaultPath,
  needles: ReadonlyArray<string>,
  options: UnlinkedMentionOptions = {},
): Promise<UnlinkedFileMatch[]> {
  if (needles.length === 0 || needles.every((n) => !n.trim())) return [];

  const patterns = parseExcludePatterns(settingsStore.getState().excludedFiles);

  const out: UnlinkedFileMatch[] = [];
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const files = yield* fs.listAll({ extensions: ["md"] });
      for (const file of files) {
        if (file.path === excludePath) continue;
        if (patterns.length > 0 && isExcluded(file.path, patterns)) continue;
        const text = yield* Effect.orElseSucceed(fs.readText(file.path), () => "");
        if (!text) continue;
        const matches = findUnlinkedMentionsInText(text, needles, options);
        if (matches.length > 0) {
          out.push({ source: file.path, matches });
        }
      }
    }),
  );
  return out;
}