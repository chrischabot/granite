import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { scaffoldBaseFile } from "@/ui/views/BasesView";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

export function registerBasesScaffoldPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "bases:create",
    category: "Bases",
    name: "Create new base…",
    callback: async () => {
      const name = prompt("New base name:", "Untitled.base");
      if (!name) return;
      const filename = name.endsWith(".base") ? name : `${name}.base`;
      try {
        await scaffoldBaseFile(filename);
        workspaceStore.openBase({ path: filename });
        noticeManager.show(`Created ${filename}`, { kind: "success" });
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Could not create base",
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}