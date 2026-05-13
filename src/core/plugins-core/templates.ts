import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { extension, normalize, stem } from "@core/fs/path";
import type { VaultFile } from "@core/fs/types";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

const SETTINGS_KEY = "granite.templates.v1";

export interface TemplatesSettings {
  templateFolder: string;
  dateFormat: string;
  timeFormat: string;
}

const DEFAULT: TemplatesSettings = {
  templateFolder: "",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "HH:mm",
};

export function getTemplatesSettings(): TemplatesSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<TemplatesSettings>) };
  } catch {
    return DEFAULT;
  }
}

export function setTemplatesSettings(s: TemplatesSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

const PAD2 = (n: number) => n.toString().padStart(2, "0");

function formatDate(d: Date, fmt: string): string {
  return fmt.replace(/YYYY|YY|MMMM|MMM|MM|DD|HH|mm|ss|D|M/g, (token) => {
    switch (token) {
      case "YYYY":
        return d.getFullYear().toString();
      case "YY":
        return d.getFullYear().toString().slice(-2);
      case "MM":
        return PAD2(d.getMonth() + 1);
      case "M":
        return (d.getMonth() + 1).toString();
      case "DD":
        return PAD2(d.getDate());
      case "D":
        return d.getDate().toString();
      case "HH":
        return PAD2(d.getHours());
      case "mm":
        return PAD2(d.getMinutes());
      case "ss":
        return PAD2(d.getSeconds());
      case "MMMM":
        return (
          [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ][d.getMonth()] ?? ""
        );
      case "MMM":
        return (
          ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
            d.getMonth()
          ] ?? ""
        );
      default:
        return token;
    }
  });
}

function expandTokens(template: string, ctx: { title: string }): string {
  const settings = getTemplatesSettings();
  const now = new Date();
  return template
    .replace(/\{\{title\}\}/g, ctx.title)
    .replace(/\{\{date(?::([^}]+))?\}\}/g, (_, fmt: string | undefined) =>
      formatDate(now, fmt ?? settings.dateFormat),
    )
    .replace(/\{\{time(?::([^}]+))?\}\}/g, (_, fmt: string | undefined) =>
      formatDate(now, fmt ?? settings.timeFormat),
    );
}

export async function listTemplates(): Promise<VaultFile[]> {
  const settings = getTemplatesSettings();
  const folder = normalize(settings.templateFolder);
  if (!folder) return [];
  const all = await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return yield* fs.listAll({ extensions: ["md"] });
    }),
  );
  return all
    .filter((f) => f.path.startsWith(`${folder}/`) && extension(f.path) === "md")
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function insertTemplate(templatePath: string): Promise<void> {
  const text = await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return yield* fs.readText(templatePath);
    }),
  );
  const state = workspaceStore.getState();
  const groupId = state.activeGroupId;
  const group = groupId ? state.groups.get(groupId) : null;
  const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
  if (!leaf || leaf.state.type !== "markdown") {
    const newPath = `${stem(templatePath)} (from template).md`;
    await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        yield* fs.writeText(newPath, expandTokens(text, { title: stem(newPath) }));
      }),
    );
    workspaceStore.openFile(newPath);
    return;
  }

  const expanded = expandTokens(text, { title: stem(leaf.state.path) });
  window.dispatchEvent(
    new CustomEvent("granite:insert-text", {
      detail: { path: leaf.state.path, text: expanded },
    }),
  );
}

declare global {
  interface WindowEventMap {
    "granite:open-template-picker": CustomEvent<void>;
  }
}

export function registerTemplatesPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "templates:insert",
    category: t("plugin.templates.category"),
    name: t("plugin.templates.insert"),
    callback: async () => {
      const list = await listTemplates();
      if (list.length === 0) {
        noticeManager.show(t("plugin.templates.empty"), { kind: "warning" });
        return;
      }
      // Dispatch to <TemplatePicker> which will render the SuggestModal.
      window.dispatchEvent(new CustomEvent("granite:open-template-picker"));
    },
  });

  register({
    id: "templates:insert-current-date",
    category: t("plugin.templates.category"),
    name: t("plugin.templates.insertDate"),
    callback: () => {
      const settings = getTemplatesSettings();
      const txt = formatDate(new Date(), settings.dateFormat);
      const state = workspaceStore.getState();
      const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (leaf && leaf.state.type === "markdown") {
        window.dispatchEvent(
          new CustomEvent("granite:insert-text", {
            detail: { path: leaf.state.path, text: txt },
          }),
        );
      }
    },
  });

  register({
    id: "templates:insert-current-time",
    category: t("plugin.templates.category"),
    name: t("plugin.templates.insertTime"),
    callback: () => {
      const settings = getTemplatesSettings();
      const txt = formatDate(new Date(), settings.timeFormat);
      const state = workspaceStore.getState();
      const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (leaf && leaf.state.type === "markdown") {
        window.dispatchEvent(
          new CustomEvent("granite:insert-text", {
            detail: { path: leaf.state.path, text: txt },
          }),
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}
