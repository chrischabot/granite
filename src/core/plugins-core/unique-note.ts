import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { join, normalize } from "@core/fs/path";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

const SETTINGS_KEY = "granite.unique-note.v1";

interface UniqueNoteSettings {
  format: string;
  folder: string;
}

const DEFAULT: UniqueNoteSettings = {
  format: "YYYYMMDDHHmm",
  folder: "",
};

export function getUniqueNoteSettings(): UniqueNoteSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<UniqueNoteSettings>) };
  } catch {
    return DEFAULT;
  }
}

export function setUniqueNoteSettings(s: UniqueNoteSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

const PAD2 = (n: number) => n.toString().padStart(2, "0");

function formatDate(d: Date, fmt: string): string {
  return fmt.replace(/YYYY|YY|MM|DD|HH|mm|ss/g, (token) => {
    switch (token) {
      case "YYYY":
        return d.getFullYear().toString();
      case "YY":
        return d.getFullYear().toString().slice(-2);
      case "MM":
        return PAD2(d.getMonth() + 1);
      case "DD":
        return PAD2(d.getDate());
      case "HH":
        return PAD2(d.getHours());
      case "mm":
        return PAD2(d.getMinutes());
      case "ss":
        return PAD2(d.getSeconds());
      default:
        return token;
    }
  });
}

export function registerUniqueNotePlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "unique-note:create",
    category: t("plugin.uniqueNote.category"),
    name: t("plugin.uniqueNote.create"),
    callback: async () => {
      const settings = getUniqueNoteSettings();
      const folder = normalize(settings.folder);
      let stamp = formatDate(new Date(), settings.format);
      let filename = `${stamp}.md`;
      let fullPath = folder ? join(folder, filename) : filename;

      try {
        // If by chance the file already exists (multiple within same minute),
        // append a 2-digit suffix.
        let attempt = 0;
        while (attempt < 60) {
          const exists = await run(
            Effect.gen(function* () {
              const fs = yield* FileSystem;
              return yield* fs.stat(fullPath);
            }),
          );
          if (!exists) break;
          attempt += 1;
          stamp = `${formatDate(new Date(), settings.format)}-${PAD2(attempt)}`;
          filename = `${stamp}.md`;
          fullPath = folder ? join(folder, filename) : filename;
        }
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            if (folder) yield* fs.mkdir(folder);
            yield* fs.writeText(fullPath, "");
          }),
        );
        workspaceStore.openFile(fullPath);
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : t("plugin.uniqueNote.error.create"),
          { kind: "error" },
        );
      }
    },
  });

  return () => {
    for (const fn of registrations) fn();
  };
}
