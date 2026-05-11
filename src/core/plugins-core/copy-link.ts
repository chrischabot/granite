import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { stem } from "@core/fs/path";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

function activeMarkdownPath(): string | null {
  const s = workspaceStore.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state.type === "markdown" ? leaf.state.path : null;
}

async function writeToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    noticeManager.show(`Copied: ${text}`, { kind: "success", timeoutMs: 3000 });
  } catch (err) {
    noticeManager.show(
      err instanceof Error ? err.message : "Clipboard write failed",
      { kind: "error" },
    );
  }
}

export function registerCopyLinkPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "links:copy-wikilink",
    category: "Links",
    name: "Copy wikilink to active note",
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      await writeToClipboard(`[[${stem(path)}]]`);
    },
  });

  register({
    id: "links:copy-markdown-link",
    category: "Links",
    name: "Copy markdown link to active note",
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      const display = stem(path);
      await writeToClipboard(`[${display}](${encodeURI(path)})`);
    },
  });

  register({
    id: "links:copy-vault-path",
    category: "Links",
    name: "Copy vault path of active note",
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      await writeToClipboard(path);
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}