import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { join, normalize } from "@core/fs/path";
import { t } from "@core/i18n";
import { formatMomentDate } from "@core/i18n/date-format";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

const SETTINGS_KEY = "granite.daily-notes.v1";

interface DailyNotesSettings {
  format: string; // strftime-ish: YYYY MM DD HH mm
  folder: string;
}

const DEFAULT: DailyNotesSettings = {
  format: "YYYY-MM-DD",
  folder: "",
};

function loadSettings(): DailyNotesSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<DailyNotesSettings>) };
  } catch {
    return DEFAULT;
  }
}

async function openDailyNote(offsetDays: number): Promise<void> {
  const { format, folder } = loadSettings();
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const filename = `${formatMomentDate(date, format)}.md`;
  const fullPath = folder ? join(normalize(folder), filename) : filename;

  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      if (folder) yield* fs.mkdir(normalize(folder));
      const stat = yield* fs.stat(fullPath);
      if (!stat) {
        // Create empty (templates plugin can extend later).
        yield* fs.writeText(fullPath, "");
      }
    }),
  );

  workspaceStore.openFile(fullPath);
}

export function registerDailyNotesPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "daily-notes:open-today",
    category: t("plugin.dailyNotes.category"),
    name: t("plugin.dailyNotes.openToday"),
    callback: () => openDailyNote(0),
  });

  register({
    id: "daily-notes:open-yesterday",
    category: t("plugin.dailyNotes.category"),
    name: t("plugin.dailyNotes.openYesterday"),
    callback: () => openDailyNote(-1),
  });

  register({
    id: "daily-notes:open-tomorrow",
    category: t("plugin.dailyNotes.category"),
    name: t("plugin.dailyNotes.openTomorrow"),
    callback: () => openDailyNote(1),
  });

  return disposer;
}

export function getDailyNotesSettings(): DailyNotesSettings {
  return loadSettings();
}

export function setDailyNotesSettings(s: DailyNotesSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}
