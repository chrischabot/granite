import { Effect } from "effect";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { renderMarkdown } from "@core/markdown/renderer";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

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

export function registerFormatConverterPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "format:wikilinks-to-markdown",
    category: "Format",
    name: "Convert wikilinks to markdown links (active note)",
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
          noticeManager.show("No wikilinks to convert.", { kind: "info" });
          return;
        }
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            yield* fs.writeText(path, next);
          }),
        );
        noticeManager.show(
          `Converted ${count} wikilink${count === 1 ? "" : "s"} to markdown links.`,
          { kind: "success" },
        );
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not convert wikilinks",
          { kind: "error" },
        );
      }
    },
  });

  register({
    id: "format:copy-as-html",
    category: "Format",
    name: "Copy current note as HTML",
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
        noticeManager.show("Rendered HTML copied to clipboard.", { kind: "success" });
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not copy HTML",
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}