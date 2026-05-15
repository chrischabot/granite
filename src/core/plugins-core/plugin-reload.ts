import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { listPlugins, setPluginEnabled } from "@core/plugins/loader";

export function registerPluginReloadPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "plugins:reload-all",
    category: t("plugin.reload.category"),
    name: t("plugin.reload.all"),
    callback: async () => {
      const enabled = listPlugins().filter((p) => p.enabled);
      if (enabled.length === 0) {
        noticeManager.show(t("plugin.reload.empty"), { kind: "info" });
        return;
      }
      for (const p of enabled) {
        await setPluginEnabled(p.manifest.id, false);
        await setPluginEnabled(p.manifest.id, true);
      }
      noticeManager.show(
        t("plugin.reload.notice.reloaded", {
          count: String(enabled.length),
          pluginLabel: t(enabled.length === 1 ? "plugin.reload.plugin" : "plugin.reload.plugins"),
        }),
        { kind: "success" },
      );
    },
  });

  return disposer;
}
