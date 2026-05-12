type LocaleId = "en" | (string & {});

type LocaleMap = Record<string, string>;

const STORAGE_KEY = "granite.locale.v1";

const EN_LOCALE: LocaleMap = {
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
  "search.empty.intro": "Type to search across all notes in the vault. Operators:",
  "search.matchCase": "Match case",
  "search.sort": "Sort",
  "search.sort.relevance": "Relevance",
  "search.sort.name": "Name",
  "search.sort.modifiedNewest": "Modified (newest)",
  "search.sort.modifiedOldest": "Modified (oldest)",
  "search.status.searching": "Searching…",
  "search.status.noResults": "No results.",
  "search.status.results": "{matches} {matchLabel} in {files} {fileLabel}",
  "search.status.match": "match",
  "search.status.matches": "matches",
  "search.status.file": "file",
  "search.status.files": "files",
  "tags.empty": "No tags found.",
  "tags.showNested": "Show nested tags",
  "tags.expand": "Expand #{tag}",
  "tags.collapse": "Collapse #{tag}",
  "tags.menu.filter": "Filter search by #{tag}",
  "tags.menu.rename": "Rename #{tag} across the vault…",
};

const builtinLocales: Record<LocaleId, LocaleMap> = {
  en: EN_LOCALE,
  he: {
    "app.welcome.title": "ברוכים הבאים לגרניט",
    "app.welcome.body":
      "בסיס ידע מקומי, מבוסס Markdown וקישורים. ההערות נשמרות כקובצי `.md` רגילים; שום דבר לא יוצא מהמחשב.",
    "app.welcome.pickFolder": "בחירת תיקייה…",
    "app.welcome.opfsVault": "כספת בדפדפן",
    "app.welcome.haveVault": "כבר יש לך כספת?",
    "app.welcome.openSwitcher": "פתיחת מחליף הכספות",
    "app.empty.noFile": "אין קובץ פתוח",
    "settings.appearance": "מראה",
    "settings.editor": "עורך",
    "settings.files": "קבצים וקישורים",
    "settings.hotkeys": "קיצורי מקשים",
    "settings.plugins": "תוספים",
    "settings.dailyNotes": "הערות יומיות",
    "settings.templates": "תבניות",
    "search.placeholder": "חיפוש… (tag: path: file: line: -exclude)",
    "search.empty.short": "להמשיך להקליד… (צריך לפחות 2 תווים)",
    "search.empty.intro": "הקלידו כדי לחפש בכל ההערות בכספת. אופרטורים:",
    "search.matchCase": "התאמת אותיות",
    "search.sort": "מיון",
    "search.sort.relevance": "רלוונטיות",
    "search.sort.name": "שם",
    "search.sort.modifiedNewest": "שונה לאחרונה",
    "search.sort.modifiedOldest": "שונה מזמן",
    "search.status.searching": "מחפש…",
    "search.status.noResults": "אין תוצאות.",
    "search.status.results": "{matches} {matchLabel} ב-{files} {fileLabel}",
    "search.status.match": "התאמה",
    "search.status.matches": "התאמות",
    "search.status.file": "קובץ",
    "search.status.files": "קבצים",
    "tags.empty": "לא נמצאו תגיות.",
    "tags.showNested": "הצגת תגיות מקוננות",
    "tags.expand": "הרחבת #{tag}",
    "tags.collapse": "כיווץ #{tag}",
    "tags.menu.filter": "סינון חיפוש לפי #{tag}",
    "tags.menu.rename": "שינוי שם #{tag} בכל הכספת…",
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
  const fallback = (Reflect.get(locales, "en") as LocaleMap | undefined) ?? EN_LOCALE;
  const map = locales[currentLocale] ?? fallback;
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
