import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { stem } from "@core/fs/path";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";

function activeMarkdownPath(): string | null {
  const s = workspaceStore.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state.type === "markdown" ? leaf.state.path : null;
}

async function writeToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    noticeManager.show(t("plugin.copyLink.notice.copied", { text }), {
      kind: "success",
      timeoutMs: 3000,
    });
  } catch (err) {
    noticeManager.show(err instanceof Error ? err.message : t("plugin.copyLink.error.clipboard"), {
      kind: "error",
    });
  }
}

export function registerCopyLinkPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "links:copy-wikilink",
    category: t("plugin.copyLink.category"),
    name: t("plugin.copyLink.wikilink"),
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      await writeToClipboard(`[[${stem(path)}]]`);
    },
  });

  register({
    id: "links:copy-markdown-link",
    category: t("plugin.copyLink.category"),
    name: t("plugin.copyLink.markdown"),
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
    category: t("plugin.copyLink.category"),
    name: t("plugin.copyLink.path"),
    checkCallback: () => activeMarkdownPath() !== null,
    callback: async () => {
      const path = activeMarkdownPath();
      if (!path) return;
      await writeToClipboard(path);
    },
  });

  return disposer;
}
