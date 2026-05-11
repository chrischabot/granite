import { Effect } from "effect";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { settingsStore } from "@core/settings/store";
import { noticeManager } from "@core/notices/notice";
import type { VaultFile } from "@core/fs/types";

export interface ReplaceOptions {
  caseSensitive: boolean;
  /** When true, treat `find` as a regular expression. */
  regex: boolean;
}

/** Escape regex metacharacters so a literal `find` string can be embedded in
 *  a RegExp source. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape `$` in a literal-mode replacement so `String.replace`'s built-in
 *  `$&` / `$1` / `$$` substitution is bypassed and `$` characters survive. */
function escapeReplacement(s: string): string {
  return s.replace(/\$/g, "$$$$");
}

/**
 * Pure replacement helper used by the command and the test suite. Returns the
 * mutated text and the number of replacements. In regex mode, the caller's
 * replacement string is passed through verbatim so capture-group references
 * like `$1`, `$<name>`, and the standard `$&`/`$$` tokens work natively.
 */
export function replaceInText(
  text: string,
  find: string,
  replace: string,
  opts: ReplaceOptions,
): { text: string; count: number } {
  if (!find) return { text, count: 0 };
  const flags = opts.caseSensitive ? "g" : "gi";
  const re = opts.regex
    ? new RegExp(find, flags)
    : new RegExp(escapeRegex(find), flags);
  const replacement = opts.regex ? replace : escapeReplacement(replace);
  // Count via a separate scan so the in-place replace can use the native
  // capture-group substitution path.
  const matches = text.match(re);
  const count = matches ? matches.length : 0;
  if (count === 0) return { text, count: 0 };
  const out = text.replace(re, replacement);
  return { text: out, count };
}

export function registerVaultFindReplacePlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "vault:find-replace",
    category: "Vault",
    name: "Find and replace across vault…",
    callback: async () => {
      const find = prompt("Find what?", "");
      if (!find) return;
      const replace = prompt(`Replace "${find}" with:`, "");
      if (replace === null) return;
      const caseSensitive = confirm("Match case? OK = yes, Cancel = no");
      const regex = confirm("Treat the find string as a regular expression?");
      const opts: ReplaceOptions = { caseSensitive, regex };

      const patterns = parseExcludePatterns(settingsStore.getState().excludedFiles);

      // First pass: count occurrences per file without modifying anything.
      interface Pending {
        file: VaultFile;
        nextText: string;
        count: number;
      }
      const pending: Pending[] = [];
      let filesScanned = 0;
      try {
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const files = yield* fs.listAll({ extensions: ["md"] });
            const eligible =
              patterns.length === 0
                ? files
                : files.filter((f) => !isExcluded(f.path, patterns));
            for (const file of eligible) {
              filesScanned += 1;
              const text = yield* fs.readText(file.path);
              const result = replaceInText(text, find, replace, opts);
              if (result.count > 0) {
                pending.push({ file, nextText: result.text, count: result.count });
              }
            }
          }),
        );
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Find & replace failed during scan",
          { kind: "error" },
        );
        return;
      }

      if (pending.length === 0) {
        noticeManager.show(
          `No matches across ${filesScanned} file${filesScanned === 1 ? "" : "s"}.`,
          { kind: "info" },
        );
        return;
      }

      const totalCount = pending.reduce((s, p) => s + p.count, 0);
      const previewLines = pending
        .slice(0, 5)
        .map((p) => `• ${p.file.path} (${p.count})`);
      const suffix =
        pending.length > 5 ? `\n…and ${pending.length - 5} more file(s)` : "";
      const okToWrite = confirm(
        `Replace ${totalCount} occurrence${totalCount === 1 ? "" : "s"} across ${pending.length} file${pending.length === 1 ? "" : "s"}?\n\n${previewLines.join("\n")}${suffix}\n\nThis cannot be undone.`,
      );
      if (!okToWrite) return;

      let filesTouched = 0;
      let replaceCount = 0;
      try {
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            for (const p of pending) {
              yield* fs.writeText(p.file.path, p.nextText);
              filesTouched += 1;
              replaceCount += p.count;
            }
          }),
        );
        const top = pending
          .slice(0, 3)
          .map((p) => `${p.count}× ${p.file.path}`)
          .join("; ");
        const tail = pending.length > 3 ? `; …+${pending.length - 3} more` : "";
        noticeManager.show(
          `Replaced ${replaceCount} occurrence${replaceCount === 1 ? "" : "s"} in ${filesTouched} file${filesTouched === 1 ? "" : "s"} (${top}${tail}).`,
          { kind: "success", timeoutMs: 8000 },
        );
      } catch (err) {
        noticeManager.show(
          err instanceof Error
            ? `Find & replace failed mid-write: ${err.message}`
            : "Find & replace failed mid-write",
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}