type LocaleId = "en" | (string & {});

type LocaleMap = Record<string, string>;

const STORAGE_KEY = "granite.locale.v1";

const builtinLocales: Record<LocaleId, LocaleMap> = {
  en: {
    "app.welcome.title": "Welcome to Granite",
    "app.welcome.body":
      "A local-first, Markdown-native, linked-thinking knowledge base. Your notes are stored as plain `.md` files; nothing leaves your computer.",
    "app.welcome.pickFolder": "Pick a folder…",
    "app.welcome.opfsVault": "In-browser vault",
    "app.welcome.haveVault": "Already have a vault?",
    "app.welcome.openSwitcher": "Open the vault switcher",
    "app.empty.noFile": "No file open",
    "settings.appearance": "Appearance",
    "settings.editor": "Editor",
    "settings.files": "Files & links",
    "settings.hotkeys": "Hotkeys",
    "settings.plugins": "Plugins",
    "settings.dailyNotes": "Daily notes",
    "settings.templates": "Templates",
    "search.placeholder": "Search… (tag: path: file: line: -exclude)",
    "search.empty.short": "Keep typing… (need at least 2 characters)",
    "search.empty.intro":
      "Type to search across all notes in the vault. Operators: tag: · path: · file: · line: · -term",
  },
};

const locales: Record<string, LocaleMap> = { ...builtinLocales };
let currentLocale: LocaleId = "en";
const subscribers = new Set<() => void>();

function emit(): void {
  for (const cb of subscribers) cb();
}

function loadStoredLocale(): LocaleId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return raw as LocaleId;
  } catch {
    /* ignore */
  }
  return "en";
}

currentLocale = loadStoredLocale();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Look up a translation, applying optional `{name}` parameter substitution. */
export function t(key: string, params?: Record<string, string | number>): string {
  const map = locales[currentLocale] ?? locales["en"]!;
  const fallback = locales["en"]!;
  let template = map[key] ?? fallback[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${escapeRegex(name)}\\}`, "g"), String(value));
    }
  }
  return template;
}

/** Add or replace a locale's strings. */
export function registerLocale(id: LocaleId, strings: LocaleMap): void {
  locales[id] = { ...(locales[id] ?? {}), ...strings };
  if (id === currentLocale) emit();
}

export function setLocale(id: LocaleId): void {
  currentLocale = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  emit();
}

export function getLocale(): LocaleId {
  return currentLocale;
}

export function listLocales(): LocaleId[] {
  return Object.keys(locales) as LocaleId[];
}

export function subscribeI18n(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}