import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { extension, normalize, stem } from "@core/fs/path";
import type { VaultFile } from "@core/fs/types";
import { t } from "@core/i18n";
import { formatMomentDate } from "@core/i18n/date-format";
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

function expandTokens(template: string, ctx: { title: string }): string {
  const settings = getTemplatesSettings();
  const now = new Date();
  return template
    .replace(/\{\{title\}\}/g, ctx.title)
    .replace(/\{\{date(?::([^}]+))?\}\}/g, (_, fmt: string | undefined) =>
      formatMomentDate(now, fmt ?? settings.dateFormat),
    )
    .replace(/\{\{time(?::([^}]+))?\}\}/g, (_, fmt: string | undefined) =>
      formatMomentDate(now, fmt ?? settings.timeFormat),
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
  const { register, disposer } = createCommandRegistrar();

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
      const txt = formatMomentDate(new Date(), settings.dateFormat);
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
      const txt = formatMomentDate(new Date(), settings.timeFormat);
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

  return disposer;
}
