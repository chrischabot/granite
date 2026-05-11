import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { stem } from "@core/fs/path";
import type { VaultPath } from "@core/fs/types";

export interface RewriteResult {
  readonly filesUpdated: number;
  readonly linksRewritten: number;
}

interface ParsedInner {
  beforeHash: string;
  hashSuffix: string;
  after: string;
}

function parseInner(inner: string): ParsedInner {
  const pipeIdx = inner.indexOf("|");
  const target = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
  const after = pipeIdx === -1 ? "" : inner.slice(pipeIdx);
  const hashIdx = target.indexOf("#");
  const beforeHash = hashIdx === -1 ? target : target.slice(0, hashIdx);
  const hashSuffix = hashIdx === -1 ? "" : target.slice(hashIdx);
  return { beforeHash, hashSuffix, after };
}

/**
 * Rewrite both `[[OldStem]]` style references AND markdown-form
 * `[text](OldStem.md)` links throughout the vault. The renamed file itself
 * is skipped. Returns counts for the caller to surface in a notice.
 */
export async function rewriteWikilinksOnRename(
  oldPath: VaultPath,
  newPath: VaultPath,
): Promise<RewriteResult> {
  if (oldPath === newPath) return { filesUpdated: 0, linksRewritten: 0 };

  let filesUpdated = 0;
  let linksRewritten = 0;

  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const files = yield* fs.listAll({ extensions: ["md"] });
      for (const file of files) {
        if (file.path === newPath) continue;
        const text = yield* fs.readText(file.path);
        const result = rewriteWikilinksInText(text, oldPath, newPath);
        if (result.count > 0) {
          yield* fs.writeText(file.path, result.text);
          filesUpdated += 1;
          linksRewritten += result.count;
        }
      }
    }),
  );

  return { filesUpdated, linksRewritten };
}

/** Pure helper exposed for unit tests: rewrite both wikilink and
 *  markdown-form links in a single text body. */
export function rewriteWikilinksInText(
  text: string,
  oldPath: VaultPath,
  newPath: VaultPath,
): { text: string; count: number } {
  if (oldPath === newPath) return { text, count: 0 };
  const oldStem = stem(oldPath);
  const newStem = stem(newPath);
  const oldNoExt = oldPath.replace(/\.md$/i, "");
  const newNoExt = newPath.replace(/\.md$/i, "");
  let count = 0;

  // 1) Wikilinks: [[Stem]], [[Stem|alias]], [[Stem#H]], ![[Stem]], etc.
  let out = text.replace(/(!?)\[\[([^\]\n]+)\]\]/g, (whole, bang: string, inner: string) => {
    const parts = parseInner(inner);
    const matchesStem = parts.beforeHash === oldStem;
    const matchesFull =
      parts.beforeHash === oldPath || parts.beforeHash === oldNoExt;
    if (!matchesStem && !matchesFull) return whole;
    const replacement = matchesFull ? newNoExt : newStem;
    count += 1;
    return `${bang}[[${replacement}${parts.hashSuffix}${parts.after}]]`;
  });

  // 2) Markdown-form links: [text](path) where path matches the renamed file.
  //    Skip protocol/absolute/anchor-only hrefs.
  out = out.replace(
    /(\[[^\]\n]+\])\(([^)\n]+)\)/g,
    (whole, label: string, hrefRaw: string) => {
      const href = hrefRaw.trim();
      if (!href) return whole;
      // Skip absolute/scheme/anchor-only.
      if (
        /^[a-z][a-z0-9+.-]*:/i.test(href) ||
        href.startsWith("//") ||
        href.startsWith("#")
      ) {
        return whole;
      }
      // Decode the path part (strip fragment first).
      const hashIdx = href.indexOf("#");
      const pathPart = hashIdx === -1 ? href : href.slice(0, hashIdx);
      const fragment = hashIdx === -1 ? "" : href.slice(hashIdx);
      let decoded: string;
      try {
        decoded = decodeURIComponent(pathPart);
      } catch {
        decoded = pathPart;
      }
      const decodedNoExt = decoded.replace(/\.md$/i, "");
      const matchesFull = decoded === oldPath || decodedNoExt === oldNoExt;
      const matchesStem = decoded === oldStem;
      if (!matchesFull && !matchesStem) return whole;
      const targetPath = matchesFull ? newPath : `${newStem}.md`;
      count += 1;
      return `${label}(${encodeURI(targetPath)}${fragment})`;
    },
  );

  return { text: out, count };
}