import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { t } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";

function activeMarkdownPath(): string | null {
  const s = workspaceStore.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state.type === "markdown" ? leaf.state.path : null;
}

function randomChoice<T>(arr: ReadonlyArray<T>): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function registerRandomWalkPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "random-walk:next",
    category: t("plugin.randomWalk.category"),
    name: t("plugin.randomWalk.next"),
    callback: () => {
      const current = activeMarkdownPath();
      const allEntries = metadataCache.getAllSwitcherEntries().filter((e) => e.alias === null);
      // Try outgoing-link target first when we have an active note.
      if (current) {
        const meta = metadataCache.getMetadata(current);
        const candidates =
          meta?.links.map((l) => (l.target.endsWith(".md") ? l.target : `${l.target}.md`)) ?? [];
        // Filter to those that actually exist in the vault.
        const known = new Set(allEntries.map((e) => e.path));
        const validCandidates = candidates.filter((c) => known.has(c) && c !== current);
        const pick = randomChoice(validCandidates);
        if (pick) {
          workspaceStore.openFile(pick);
          return;
        }
        noticeManager.show(t("plugin.randomWalk.noOutgoing"), {
          kind: "info",
          timeoutMs: 3000,
        });
      }
      // Fallback: random vault file (excluding the current).
      const candidates = allEntries.map((e) => e.path).filter((p) => p !== current);
      const pick = randomChoice(candidates);
      if (pick) workspaceStore.openFile(pick);
      else noticeManager.show(t("plugin.randomWalk.empty"), { kind: "warning" });
    },
  });

  return disposer;
}
