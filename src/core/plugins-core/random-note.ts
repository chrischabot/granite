import { Effect } from "effect";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

export function registerRandomNotePlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "random-note:open",
    category: "Random note",
    name: "Open random note",
    callback: async () => {
      try {
        const files = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.listAll({ extensions: ["md"] });
          }),
        );
        if (files.length === 0) {
          noticeManager.show("Vault has no notes yet.", { kind: "warning" });
          return;
        }
        const idx = Math.floor(Math.random() * files.length);
        const pick = files[idx]!;
        workspaceStore.openFile(pick.path);
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not open random note",
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}