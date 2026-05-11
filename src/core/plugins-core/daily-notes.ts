import { Effect } from "effect";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { join, normalize } from "@core/fs/path";
import { workspaceStore } from "@core/workspace/store";

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

const PAD2 = (n: number) => n.toString().padStart(2, "0");

/** Tiny Moment-format implementation supporting YYYY MM DD HH mm SS dddd ddd. */
function formatDate(d: Date, fmt: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fullDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const fullMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return fmt.replace(
    /YYYY|YY|MMMM|MMM|MM|DD|dddd|ddd|HH|mm|ss|D|M/g,
    (token) => {
      switch (token) {
        case "YYYY": return d.getFullYear().toString();
        case "YY": return d.getFullYear().toString().slice(-2);
        case "MMMM": return fullMonths[d.getMonth()] ?? "";
        case "MMM": return months[d.getMonth()] ?? "";
        case "MM": return PAD2(d.getMonth() + 1);
        case "M": return (d.getMonth() + 1).toString();
        case "DD": return PAD2(d.getDate());
        case "D": return d.getDate().toString();
        case "dddd": return fullDays[d.getDay()] ?? "";
        case "ddd": return days[d.getDay()] ?? "";
        case "HH": return PAD2(d.getHours());
        case "mm": return PAD2(d.getMinutes());
        case "ss": return PAD2(d.getSeconds());
        default: return token;
      }
    },
  );
}

async function openDailyNote(offsetDays: number): Promise<void> {
  const { format, folder } = loadSettings();
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const filename = `${formatDate(date, format)}.md`;
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
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "daily-notes:open-today",
    category: "Daily notes",
    name: "Open today's daily note",
    callback: () => openDailyNote(0),
  });

  register({
    id: "daily-notes:open-yesterday",
    category: "Daily notes",
    name: "Open yesterday's daily note",
    callback: () => openDailyNote(-1),
  });

  register({
    id: "daily-notes:open-tomorrow",
    category: "Daily notes",
    name: "Open tomorrow's daily note",
    callback: () => openDailyNote(1),
  });

  return () => {
    for (const fn of registrations) fn();
  };
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