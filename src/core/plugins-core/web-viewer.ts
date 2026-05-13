import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";

export function registerWebViewerPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "web-viewer:open",
    category: t("plugin.webViewer.category"),
    name: t("plugin.webViewer.open"),
    callback: () => {
      const url = prompt(t("plugin.webViewer.prompt.url"), "https://");
      if (!url) return;
      try {
        // Validate the URL.
        const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);
        workspaceStore.openWebviewer(parsed.toString(), { newTab: true });
      } catch {
        noticeManager.show(t("plugin.webViewer.error.invalidUrl"), { kind: "error" });
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}
