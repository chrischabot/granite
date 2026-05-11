import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

export function registerWebViewerPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "web-viewer:open",
    category: "Web viewer",
    name: "Open web viewer…",
    callback: () => {
      const url = prompt("Open URL in a web viewer:", "https://");
      if (!url) return;
      try {
        // Validate the URL.
        const parsed = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);
        workspaceStore.openWebviewer(parsed.toString(), { newTab: true });
      } catch {
        noticeManager.show("That's not a valid URL.", { kind: "error" });
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}