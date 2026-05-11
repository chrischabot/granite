import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { metadataCache } from "@core/metadata/cache";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

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
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "random-walk:next",
    category: "Random walk",
    name: "Walk to a random linked note",
    callback: () => {
      const current = activeMarkdownPath();
      const allEntries = metadataCache.getAllSwitcherEntries().filter((e) => e.alias === null);
      // Try outgoing-link target first when we have an active note.
      if (current) {
        const meta = metadataCache.getMetadata(current);
        const candidates =
          meta?.links.map((l) =>
            l.target.endsWith(".md") ? l.target : `${l.target}.md`,
          ) ?? [];
        // Filter to those that actually exist in the vault.
        const known = new Set(allEntries.map((e) => e.path));
        const validCandidates = candidates.filter((c) => known.has(c) && c !== current);
        const pick = randomChoice(validCandidates);
        if (pick) {
          workspaceStore.openFile(pick);
          return;
        }
        noticeManager.show("No outgoing links — picking a random vault note instead.", {
          kind: "info",
          timeoutMs: 3000,
        });
      }
      // Fallback: random vault file (excluding the current).
      const candidates = allEntries
        .map((e) => e.path)
        .filter((p) => p !== current);
      const pick = randomChoice(candidates);
      if (pick) workspaceStore.openFile(pick);
      else noticeManager.show("Vault is empty.", { kind: "warning" });
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}