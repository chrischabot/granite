import { Effect } from "effect";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";

function countWords(text: string): number {
  let body = text;
  if (body.startsWith("---\n")) {
    const end = body.indexOf("\n---", 4);
    if (end !== -1) body = body.slice(end + 4);
  }
  body = body.replace(/```[\s\S]*?```/g, "");
  try {
    const matches = body.match(/[\p{L}\p{N}]+/gu);
    return matches ? matches.length : 0;
  } catch {
    return (body.match(/[A-Za-z0-9]+/g) ?? []).length;
  }
}

export function registerVaultStatsPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "vault-stats:show",
    category: "Vault",
    name: "Show vault statistics",
    callback: async () => {
      try {
        const files = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.listAll({ extensions: ["md"] });
          }),
        );
        let totalWords = 0;
        let totalLinks = 0;
        let totalHeadings = 0;
        let totalBlocks = 0;
        let totalFootnotes = 0;
        const tagSet = new Set<string>();
        const propertyKeys = new Set<string>();
        for (const f of files) {
          let text = "";
          try {
            text = await run(
              Effect.gen(function* () {
                const fs = yield* FileSystem;
                return yield* fs.readText(f.path);
              }),
            );
          } catch {
            continue;
          }
          totalWords += countWords(text);
          const meta = metadataCache.getMetadata(f.path);
          if (meta) {
            totalLinks += meta.links.length;
            totalHeadings += meta.headings.length;
            totalBlocks += meta.blocks.length;
            totalFootnotes += meta.footnotes.length;
            for (const t of meta.tags) tagSet.add(t.name);
            for (const k of Object.keys(meta.frontmatter)) propertyKeys.add(k);
          }
        }
        const lines = [
          `Files: ${files.length.toLocaleString()}`,
          `Words: ${totalWords.toLocaleString()}`,
          `Headings: ${totalHeadings.toLocaleString()}`,
          `Internal links: ${totalLinks.toLocaleString()}`,
          `Block IDs: ${totalBlocks.toLocaleString()}`,
          `Footnotes: ${totalFootnotes.toLocaleString()}`,
          `Distinct tags: ${tagSet.size.toLocaleString()}`,
          `Distinct properties: ${propertyKeys.size.toLocaleString()}`,
        ];
        noticeManager.show(`Vault statistics:\n${lines.join("\n")}`, {
          kind: "info",
          timeoutMs: 0,
        });
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not compute vault statistics",
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}