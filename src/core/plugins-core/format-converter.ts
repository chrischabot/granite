import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { t } from "@core/i18n";
import { renderMarkdown } from "@core/markdown/renderer";
import {
  parseFrontmatter,
  removeFrontmatterValue,
  updateFrontmatterValue,
} from "@core/metadata/frontmatter";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

function activeMarkdownPath(): string | null {
  const s = workspaceStore.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state.type === "markdown" ? leaf.state.path : null;
}

/** Convert `[[Note]]` and `[[Note|Alias]]` to `[Note](Note.md)` and `[Alias](Note.md)`. */
export function convertWikilinksToMarkdown(text: string): {
  text: string;
  count: number;
} {
  let count = 0;
  const out = text.replace(/(!?)\[\[([^\]\n]+)\]\]/g, (whole, bang: string, inner: string) => {
    // Skip embeds — they don't translate to markdown image links cleanly.
    if (bang) return whole;
    const pipeIdx = inner.indexOf("|");
    const target = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
    const alias = pipeIdx === -1 ? null : inner.slice(pipeIdx + 1);
    const hashIdx = target.indexOf("#");
    const beforeHash = hashIdx === -1 ? target : target.slice(0, hashIdx);
    const hashSuffix = hashIdx === -1 ? "" : target.slice(hashIdx);
    const display = alias ?? beforeHash;
    const path = `${beforeHash}.md${hashSuffix}`;
    count += 1;
    return `[${display}](${encodeURI(path)})`;
  });
  return { text: out, count };
}

const LEGACY_PROPERTY_KEYS = [
  ["tag", "tags"],
  ["alias", "aliases"],
  ["cssclass", "cssclasses"],
] as const;

function toList(value: unknown, stripHash = false): unknown[] {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .map((item) => (typeof item === "string" && stripHash ? item.replace(/^#/, "") : item))
    .filter((item) => item !== null && item !== undefined && String(item).length > 0);
}

function mergeUnique(existing: unknown, incoming: unknown[], stripHash = false): unknown[] {
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const item of [...toList(existing, stripHash), ...incoming]) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function migrateLegacyPropertyKeys(text: string): { text: string; count: number } {
  const fm = parseFrontmatter(text);
  let next = text;
  let count = 0;
  for (const [legacyKey, canonicalKey] of LEGACY_PROPERTY_KEYS) {
    if (!(legacyKey in fm)) continue;
    const stripHash = canonicalKey === "tags";
    const incoming = toList(fm[legacyKey], stripHash);
    const merged = mergeUnique(fm[canonicalKey], incoming, stripHash);
    next = updateFrontmatterValue(next, canonicalKey, merged);
    next = removeFrontmatterValue(next, legacyKey);
    count += 1;
  }
  return { text: next, count };
}

export function registerFormatConverterPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "format:wikilinks-to-markdown",
    category: t("plugin.format.category"),
    name: t("plugin.format.wikilinksToMarkdown"),
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      try {
        const text = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readText(path);
          }),
        );
        const { text: next, count } = convertWikilinksToMarkdown(text);
        if (count === 0) {
          noticeManager.show(t("plugin.format.noWikilinks"), { kind: "info" });
          return;
        }
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            yield* fs.writeText(path, next);
          }),
        );
        noticeManager.show(
          t("plugin.format.converted", {
            count: String(count),
            wikilinkLabel: t(count === 1 ? "plugin.format.wikilink" : "plugin.format.wikilinks"),
          }),
          { kind: "success" },
        );
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("plugin.format.error.convert"), {
          kind: "error",
        });
      }
    },
  });

  register({
    id: "format:migrate-legacy-properties",
    category: t("plugin.format.category"),
    name: t("plugin.format.migrateLegacyProperties"),
    callback: async () => {
      try {
        const result = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const files = yield* fs.listAll({ extensions: ["md"] });
            let notesUpdated = 0;
            let keysMigrated = 0;
            for (const file of files) {
              const text = yield* fs.readText(file.path);
              const migrated = migrateLegacyPropertyKeys(text);
              if (migrated.count === 0 || migrated.text === text) continue;
              yield* fs.writeText(file.path, migrated.text);
              notesUpdated += 1;
              keysMigrated += migrated.count;
            }
            return { notesUpdated, keysMigrated };
          }),
        );
        if (result.keysMigrated === 0) {
          noticeManager.show(t("plugin.format.noLegacyProperties"), { kind: "info" });
          return;
        }
        noticeManager.show(
          t("plugin.format.migratedProperties", {
            keys: String(result.keysMigrated),
            propertyLabel: t(
              result.keysMigrated === 1 ? "plugin.format.property" : "plugin.format.properties",
            ),
            notes: String(result.notesUpdated),
            noteLabel: t(result.notesUpdated === 1 ? "plugin.format.note" : "plugin.format.notes"),
          }),
          { kind: "success" },
        );
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("plugin.format.error.migrate"), {
          kind: "error",
        });
      }
    },
  });

  register({
    id: "format:copy-as-html",
    category: t("plugin.format.category"),
    name: t("plugin.format.copyAsHtml"),
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      try {
        const text = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readText(path);
          }),
        );
        const html = renderMarkdown(text);
        await navigator.clipboard.writeText(html);
        noticeManager.show(t("plugin.format.copiedHtml"), { kind: "success" });
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("plugin.format.error.copyHtml"), {
          kind: "error",
        });
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}
