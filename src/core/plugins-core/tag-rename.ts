import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { t } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
import { Effect } from "effect";

const TAG_BODY_FULL = /^[\p{L}\p{N}_/-]+$/u;
const INLINE_TAG_RE = /(^|[\s(\[])#([\p{L}\p{N}_/-]+)/gu;

/** Rewrite inline `#oldTag` occurrences in markdown body, preserving hierarchy
 *  prefixes like `#oldTag/sub` → `#newTag/sub`. */
export function rewriteInlineTags(text: string, oldTag: string, newTag: string): string {
  return text.replace(INLINE_TAG_RE, (whole, prefix: string, tag: string) => {
    if (tag === oldTag || tag.startsWith(`${oldTag}/`)) {
      const tail = tag.slice(oldTag.length);
      return `${prefix}#${newTag}${tail}`;
    }
    return whole;
  });
}

/** Rewrite a YAML frontmatter `tags:` array (only string values; YAML in inline
 *  flow form is supported). The function is intentionally string-based to avoid
 *  re-serializing user-formatted YAML; if it can't recognize the pattern, it
 *  leaves the source untouched. */
export function rewriteFrontmatterTags(text: string, oldTag: string, newTag: string): string {
  const fenceStart = /^---\r?\n/.exec(text);
  if (!fenceStart) return text;
  const fence = fenceStart[0];
  if (!fence) return text;
  const startLen = fence.length;
  const newline = fence.endsWith("\r\n") ? "\r\n" : "\n";
  const endMarker = `${newline}---${newline}`;
  const endIdx = text.indexOf(endMarker, startLen);
  if (endIdx === -1) return text;
  const yamlBlock = text.slice(startLen, endIdx);
  const body = text.slice(endIdx + endMarker.length);

  const lines = yamlBlock.split(/\r?\n/);
  const out: string[] = [];
  let inTagBlock = false;
  for (const line of lines) {
    const inline = line.match(/^(\s*tags\s*:\s*)\[([^\]]*)\]\s*$/);
    if (inline) {
      const prefix = inline[1] ?? "";
      const replaced = (inline[2] ?? "")
        .split(",")
        .map((s) => s.trim())
        .map((raw) => {
          const stripped = raw.replace(/^["']|["']$/g, "");
          if (!stripped) return raw;
          if (stripped === oldTag || stripped.startsWith(`${oldTag}/`)) {
            return raw.includes('"')
              ? `"${newTag}${stripped.slice(oldTag.length)}"`
              : raw.includes("'")
                ? `'${newTag}${stripped.slice(oldTag.length)}'`
                : `${newTag}${stripped.slice(oldTag.length)}`;
          }
          return raw;
        })
        .join(", ");
      out.push(`${prefix}[${replaced}]`);
      continue;
    }
    if (/^\s*tags\s*:\s*$/.test(line)) {
      out.push(line);
      inTagBlock = true;
      continue;
    }
    if (inTagBlock) {
      const item = line.match(/^(\s*-\s*)(["']?)([^"'\n]*)(["']?)\s*$/);
      if (item) {
        const value = (item[3] ?? "").trim();
        if (value === oldTag || value.startsWith(`${oldTag}/`)) {
          out.push(`${item[1]}${item[2]}${newTag}${value.slice(oldTag.length)}${item[4]}`);
          continue;
        }
        out.push(line);
        continue;
      }
      // Any non-`-`-prefixed line ends the tag block.
      if (!/^\s*$/.test(line)) {
        inTagBlock = false;
      }
    }
    out.push(line);
  }
  return `${text.slice(0, startLen)}${out.join(newline)}${endMarker}${body}`;
}

export function rewriteTags(text: string, oldTag: string, newTag: string): string {
  return rewriteFrontmatterTags(rewriteInlineTags(text, oldTag, newTag), oldTag, newTag);
}

/** Helper for diagnostics: how many places will/did `rewriteTags` change for
 *  `oldTag → newTag` in `text`? Counts both inline body tags and YAML
 *  frontmatter tag entries (inline list + block list). */
export function countTagOccurrences(text: string, oldTag: string): number {
  let count = 0;
  for (const m of text.matchAll(INLINE_TAG_RE)) {
    const tag = m[2] ?? "";
    if (tag === oldTag || tag.startsWith(`${oldTag}/`)) count += 1;
  }
  const fenceMatch = /^---\r?\n/.exec(text);
  if (fenceMatch) {
    const fence = fenceMatch[0];
    if (!fence) return count;
    const newline = fence.endsWith("\r\n") ? "\r\n" : "\n";
    const endMarker = `${newline}---${newline}`;
    const startLen = fence.length;
    const endIdx = text.indexOf(endMarker, startLen);
    if (endIdx !== -1) {
      const yaml = text.slice(startLen, endIdx);
      let inTagBlock = false;
      for (const line of yaml.split(/\r?\n/)) {
        const inline = line.match(/^\s*tags\s*:\s*\[([^\]]*)\]\s*$/);
        if (inline) {
          inTagBlock = false;
          for (const raw of (inline[1] ?? "").split(",")) {
            const val = raw.trim().replace(/^["']|["']$/g, "");
            if (val === oldTag || val.startsWith(`${oldTag}/`)) count += 1;
          }
          continue;
        }
        if (/^\s*tags\s*:\s*$/.test(line)) {
          inTagBlock = true;
          continue;
        }
        if (inTagBlock) {
          const item = line.match(/^\s*-\s*["']?([^"'\n]*)["']?\s*$/);
          if (item) {
            const val = (item[1] ?? "").trim();
            if (val === oldTag || val.startsWith(`${oldTag}/`)) count += 1;
            continue;
          }
          if (!/^\s*$/.test(line)) {
            inTagBlock = false;
          }
        }
      }
    }
  }
  return count;
}

function validateTag(name: string): boolean {
  const stripped = name.replace(/^#/, "");
  if (!stripped) return false;
  return TAG_BODY_FULL.test(stripped) && stripped.length <= 200;
}

export async function renameTagAcrossVault(prefilledFrom?: string): Promise<void> {
  const tags = metadataCache.getAllTags();
  if (tags.length === 0) {
    noticeManager.show(t("plugin.tagRename.noTags"), { kind: "warning" });
    return;
  }
  const initialFrom = (prefilledFrom ?? "").replace(/^#/, "").trim();
  let oldTag: string;
  if (initialFrom && validateTag(initialFrom)) {
    oldTag = initialFrom;
  } else {
    const tagList = `${tags
      .slice(0, 30)
      .map((tag) => `#${tag.name}`)
      .join(", ")}${tags.length > 30 ? "…" : ""}`;
    const fromRaw = prompt(
      t("plugin.tagRename.prompt.from", { tags: tagList }),
      initialFrom ? `#${initialFrom}` : "",
    );
    if (!fromRaw) return;
    const cleaned = fromRaw.replace(/^#/, "").trim();
    if (!validateTag(cleaned)) {
      noticeManager.show(t("plugin.tagRename.error.invalidSource"), { kind: "error" });
      return;
    }
    oldTag = cleaned;
  }
  const toRaw = prompt(t("plugin.tagRename.prompt.to", { tag: oldTag }));
  if (!toRaw) return;
  const newTag = toRaw.replace(/^#/, "").trim();
  if (!validateTag(newTag)) {
    noticeManager.show(t("plugin.tagRename.error.invalidDestination"), { kind: "error" });
    return;
  }
  if (oldTag === newTag) return;

  let filesTouched = 0;
  let replacements = 0;
  try {
    await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const files = yield* fs.listAll({ extensions: ["md"] });
        for (const file of files) {
          const text = yield* fs.readText(file.path);
          const next = rewriteTags(text, oldTag, newTag);
          if (next !== text) {
            yield* fs.writeText(file.path, next);
            filesTouched += 1;
            replacements += countTagOccurrences(text, oldTag);
          }
        }
      }),
    );
    if (filesTouched === 0) {
      noticeManager.show(t("plugin.tagRename.noOccurrences", { tag: oldTag }), {
        kind: "warning",
      });
    } else {
      noticeManager.show(
        t("plugin.tagRename.renamed", {
          oldTag,
          newTag,
          occurrences: String(replacements),
          occurrenceLabel: t(
            replacements === 1 ? "plugin.tagRename.occurrence" : "plugin.tagRename.occurrences",
          ),
          files: String(filesTouched),
          fileLabel: t(filesTouched === 1 ? "plugin.tagRename.file" : "plugin.tagRename.files"),
        }),
        { kind: "success" },
      );
    }
  } catch (err) {
    noticeManager.show(err instanceof Error ? err.message : t("plugin.tagRename.error.rename"), {
      kind: "error",
    });
  }
}

export function registerTagRenamePlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "tags:rename-across-vault",
    category: t("plugin.tagRename.category"),
    name: t("plugin.tagRename.name"),
    callback: () => renameTagAcrossVault(),
  });

  return disposer;
}
