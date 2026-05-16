import { inputPrompt } from "@/ui/overlay/inputPrompt";
import { scaffoldBaseFile } from "@/ui/views/BasesView";
import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";

export function registerBasesScaffoldPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "bases:create",
    category: t("plugin.bases.category"),
    name: t("plugin.bases.create"),
    callback: async () => {
      const name = await inputPrompt({
        title: t("plugin.bases.prompt.name"),
        defaultValue: t("plugin.bases.defaultName"),
        requireValue: true,
      });
      if (!name) return;
      const filename = name.endsWith(".base") ? name : `${name}.base`;
      try {
        await scaffoldBaseFile(filename);
        workspaceStore.openBase({ path: filename });
        noticeManager.show(t("plugin.bases.notice.created", { filename }), { kind: "success" });
      } catch (err) {
        noticeManager.show(err instanceof Error ? err.message : t("plugin.bases.error.create"), {
          kind: "error",
        });
      }
    },
  });

  return disposer;
}
