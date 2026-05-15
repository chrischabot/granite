import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

export function registerTourPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "tour:open",
    category: t("plugin.tour.category"),
    name: t("plugin.tour.open"),
    callback: async () => {
      const tourPath = t("plugin.tour.path");
      try {
        const created = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const existing = yield* fs.stat(tourPath);
            if (existing) return false;
            yield* fs.writeText(tourPath, t("plugin.tour.body"));
            return true;
          }),
        );
        workspaceStore.openFile(tourPath);
        if (created) {
          noticeManager.show(t("plugin.tour.notice.created", { path: tourPath }), {
            kind: "success",
          });
        }
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("plugin.tour.error.open"), {
          kind: "error",
        });
      }
    },
  });

  return disposer;
}
