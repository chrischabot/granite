import { inputPrompt } from "@/ui/overlay/inputPrompt";
import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import type { VaultFile } from "@core/fs/types";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { settingsStore } from "@core/settings/store";
import { Effect } from "effect";

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
  const re = opts.regex ? new RegExp(find, flags) : new RegExp(escapeRegex(find), flags);
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
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "vault:find-replace",
    category: t("plugin.findReplace.category"),
    name: t("plugin.findReplace.name"),
    callback: async () => {
      const find = await inputPrompt({
        title: t("plugin.findReplace.prompt.find"),
        requireValue: true,
      });
      if (!find) return;
      const replace = await inputPrompt({
        title: t("plugin.findReplace.prompt.replace", { find }),
      });
      if (replace === null) return;
      const caseSensitive = confirm(t("plugin.findReplace.confirm.matchCase"));
      const regex = confirm(t("plugin.findReplace.confirm.regex"));
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
              patterns.length === 0 ? files : files.filter((f) => !isExcluded(f.path, patterns));
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
          err instanceof Error ? err.message : t("plugin.findReplace.error.scan"),
          { kind: "error" },
        );
        return;
      }

      if (pending.length === 0) {
        noticeManager.show(
          t("plugin.findReplace.noMatches", {
            count: String(filesScanned),
            fileLabel: t(
              filesScanned === 1 ? "plugin.findReplace.file" : "plugin.findReplace.files",
            ),
          }),
          { kind: "info" },
        );
        return;
      }

      const totalCount = pending.reduce((s, p) => s + p.count, 0);
      const previewLines = pending.slice(0, 5).map((p) => `• ${p.file.path} (${p.count})`);
      const suffix =
        pending.length > 5
          ? `\n${t("plugin.findReplace.moreFiles", {
              count: String(pending.length - 5),
            })}`
          : "";
      const okToWrite = confirm(
        t("plugin.findReplace.confirm.write", {
          occurrences: String(totalCount),
          occurrenceLabel: t(
            totalCount === 1 ? "plugin.findReplace.occurrence" : "plugin.findReplace.occurrences",
          ),
          files: String(pending.length),
          fileLabel: t(
            pending.length === 1 ? "plugin.findReplace.file" : "plugin.findReplace.files",
          ),
          preview: previewLines.join("\n"),
          suffix,
        }),
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
        const tail =
          pending.length > 3
            ? t("plugin.findReplace.summaryTail", { count: String(pending.length - 3) })
            : "";
        noticeManager.show(
          t("plugin.findReplace.replaced", {
            occurrences: String(replaceCount),
            occurrenceLabel: t(
              replaceCount === 1
                ? "plugin.findReplace.occurrence"
                : "plugin.findReplace.occurrences",
            ),
            files: String(filesTouched),
            fileLabel: t(
              filesTouched === 1 ? "plugin.findReplace.file" : "plugin.findReplace.files",
            ),
            summary: `${top}${tail}`,
          }),
          { kind: "success", timeoutMs: 8000 },
        );
      } catch (err) {
        noticeManager.show(
          err instanceof Error
            ? t("plugin.findReplace.error.writeWithMessage", { message: err.message })
            : t("plugin.findReplace.error.write"),
          { kind: "error" },
        );
      }
    },
  });

  return disposer;
}
