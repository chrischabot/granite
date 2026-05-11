import { Effect } from "effect";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

const TOUR_PATH = "Welcome to Granite.md";

const TOUR_BODY = `---
tags: [granite, welcome]
---

# Welcome to Granite

A short tour. Edit / delete this note any time — it lives in your vault as plain Markdown.

## Linking

- Wikilinks resolve to other notes: \`[[Some Note]]\` · \`[[Note|alias]]\` · \`[[Note#Heading]]\` · \`[[Note#^block-id]]\`.
- Type \`[[\` in the editor to open the autocomplete; type \`[[##\` for cross-vault heading search.
- Hover any wikilink (in the editor or reading view) to preview the target.

## Editing

- Press **Mod+P** for the command palette, **Mod+O** for the quick switcher.
- Type **/** at the start of a line in the editor for the slash-command palette.
- Press **Mod+\\\\** to split the active tab right; **Mod+Shift+\\\\** to split down.
- Drop or paste images / audio / video / PDFs into the editor — Granite saves them under \`attachments/\` and inserts an embed.

## Reading view

The view-header eye / pencil icon toggles between source mode and reading view. Reading view supports:

- KaTeX math: \`$x^2 + y^2 = z^2$\`, plus block math.
- Mermaid diagrams (\`\`\`\`mermaid\`\`\`\` fences).
- Live query blocks (\`\`\`\`query\`\`\`\` fences) — try \`tag:granite\`.
- Note section embeds: \`![[Welcome to Granite#Linking]]\`.
- Footnotes, callouts (\`> [!note]\`), tasks, highlights (\`==text==\`).

## Plugins

\`Settings → Plugins\` lists every plugin discovered in \`.granite/plugins/\`. Plugins are
disabled by default — Restricted Mode protects you. See the [examples](https://github.com/) for
sample plugin sources.

## Bookmarks

Pick **Bookmarks** in the left sidebar; the \`+\` menu lets you bookmark the current note,
heading, block id, or a saved search.

## Files

- \`Mod+Delete\` on selected file-explorer rows deletes them.
- Drag a file onto a folder to move it; outgoing wikilinks rewrite themselves.

That's the tour — happy linking!
`;

export function registerTourPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "tour:open",
    category: "Help",
    name: "Open Granite tour",
    callback: async () => {
      try {
        const created = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const existing = yield* fs.stat(TOUR_PATH);
            if (existing) return false;
            yield* fs.writeText(TOUR_PATH, TOUR_BODY);
            return true;
          }),
        );
        workspaceStore.openFile(TOUR_PATH);
        if (created) {
          noticeManager.show("Created Welcome to Granite.md.", { kind: "success" });
        }
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not open tour",
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}