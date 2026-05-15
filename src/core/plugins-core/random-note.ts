import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

export function registerRandomNotePlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "random-note:open",
    category: t("plugin.randomNote.category"),
    name: t("plugin.randomNote.open"),
    callback: async () => {
      try {
        const files = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.listAll({ extensions: ["md"] });
          }),
        );
        if (files.length === 0) {
          noticeManager.show(t("plugin.randomNote.empty"), { kind: "warning" });
          return;
        }
        const idx = Math.floor(Math.random() * files.length);
        const pick = files[idx];
        if (pick) workspaceStore.openFile(pick.path);
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("plugin.randomNote.error.open"), {
          kind: "error",
        });
      }
    },
  });

  return disposer;
}
