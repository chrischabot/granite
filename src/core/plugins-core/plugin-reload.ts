import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { listPlugins, setPluginEnabled } from "@core/plugins/loader";
import { noticeManager } from "@core/notices/notice";

export function registerPluginReloadPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "plugins:reload-all",
    category: "Plugins",
    name: "Reload all enabled plugins",
    callback: async () => {
      const enabled = listPlugins().filter((p) => p.enabled);
      if (enabled.length === 0) {
        noticeManager.show("No plugins are currently enabled.", { kind: "info" });
        return;
      }
      for (const p of enabled) {
        await setPluginEnabled(p.manifest.id, false);
        await setPluginEnabled(p.manifest.id, true);
      }
      noticeManager.show(
        `Reloaded ${enabled.length} plugin${enabled.length === 1 ? "" : "s"}.`,
        { kind: "success" },
      );
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}