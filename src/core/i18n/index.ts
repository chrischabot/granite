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
  "outgoing.empty.noActive": "Open a note to see its outgoing links.",
  "outgoing.empty.noLinks": "No outgoing links in this note.",
  "outgoing.lineShort": "L{line}",
  "backlinks.empty.noActive": "Open a note to see its backlinks.",
  "backlinks.empty.noLinks": "No backlinks found.",
  "backlinks.unlinked.title": "Unlinked mentions",
  "backlinks.unlinked.scanning": "Scanning vault…",
  "backlinks.unlinked.none": "No unlinked mentions found.",
  "backlinks.line": "Line {line}",
  "backlinks.lineShort": "L{line}",
  "backlinks.matchTitle": 'Line {line} — matched "{needle}"',
  "recents.empty": "No recent files yet. Open a note to start the list.",
  "recents.remove": "Remove from recents",
  "footnotes.empty.noActive": "Open a note to see its footnotes.",
  "footnotes.empty.noFootnotes": "No footnotes in this note.",
  "footnotes.noDefinitionTitle": "No definition for this footnote reference",
  "footnotes.reference": "reference",
  "footnotes.references": "references",
  "footnotes.referenceTitle": "{count} {referenceLabel}",
  "footnotes.missing": "missing",
  "outline.empty.noActive": "Open a note to see its outline.",
  "outline.empty.noHeadings": "No headings in this note.",
  "outline.filterPlaceholder": "Filter headings…",
  "outline.empty.noFilterMatch": "No headings match filter.",
  "sidebar.tab.files": "Files",
  "sidebar.tab.search": "Search",
  "sidebar.tab.bookmarks": "Bookmarks",
  "sidebar.tab.tags": "Tags",
  "sidebar.tab.backlinks": "Backlinks",
  "sidebar.tab.outgoing": "Outgoing links",
  "sidebar.tab.outline": "Outline",
  "sidebar.tab.recents": "Recent files",
  "sidebar.tab.localGraph": "Local graph",
  "sidebar.tab.fileProperties": "File properties",
  "sidebar.tab.allProperties": "All properties (vault)",
  "sidebar.tab.footnotes": "Footnotes",
  "sidebar.openInCenter": "Open {label} in central area",
  "sidebar.splitGroup": "Split {label} sidebar group",
  "sidebar.closeGroup": "Close {label} sidebar group",
  "sidebar.unavailable": "Sidebar view is no longer available.",
  "localGraph.empty.noActive": "Open a note to see its local graph.",
  "localGraph.empty.noLinks": "No links yet",
  "localGraph.neighbor": "{count} neighbor",
  "localGraph.neighbors": "{count} neighbors",
  "localGraph.openNote": "Open {path}",
  "properties.error.update": "Could not update property",
  "properties.error.remove": "Could not remove property",
  "properties.addPrompt": "New property name:",
  "properties.empty.noActive": "Open a note to see its properties.",
  "properties.empty.noProperties": "No properties on this note. Click {addLabel} to create one.",
  "properties.addLabel": "+ Add",
  "properties.addAction": "Add property",
  "properties.listPlaceholder": "comma, separated, values",
  "properties.remove": "Remove property {name}",
  "allProperties.empty": "No properties found across vault.",
  "allProperties.overrideTitle": 'Override set to "{type}". Reset to clear.',
  "allProperties.inferredTitle": "Inferred type: {type}",
  "allProperties.inferredOption": "(inferred: {type})",
  "allProperties.usageTitle": "{count} {noteLabel} use this property",
  "properties.note": "note",
  "properties.notes": "notes",
  "propertyType.text": "Text",
  "propertyType.number": "Number",
  "propertyType.checkbox": "Checkbox",
  "propertyType.list": "List",
  "propertyType.date": "Date",
  "propertyType.datetime": "Date & time",
  "propertyType.json": "JSON",
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
    "outgoing.empty.noActive": "פתחו הערה כדי לראות את הקישורים היוצאים שלה.",
    "outgoing.empty.noLinks": "אין קישורים יוצאים בהערה הזו.",
    "outgoing.lineShort": "ש{line}",
    "backlinks.empty.noActive": "פתחו הערה כדי לראות את הקישורים החוזרים שלה.",
    "backlinks.empty.noLinks": "לא נמצאו קישורים חוזרים.",
    "backlinks.unlinked.title": "אזכורים לא מקושרים",
    "backlinks.unlinked.scanning": "סורק את הכספת…",
    "backlinks.unlinked.none": "לא נמצאו אזכורים לא מקושרים.",
    "backlinks.line": "שורה {line}",
    "backlinks.lineShort": "ש{line}",
    "backlinks.matchTitle": 'שורה {line} — התאמה ל-"{needle}"',
    "recents.empty": "אין עדיין קבצים אחרונים. פתחו הערה כדי להתחיל את הרשימה.",
    "recents.remove": "הסרה מהאחרונים",
    "footnotes.empty.noActive": "פתחו הערה כדי לראות את הערות השוליים שלה.",
    "footnotes.empty.noFootnotes": "אין הערות שוליים בהערה הזו.",
    "footnotes.noDefinitionTitle": "אין הגדרה להפניית הערת השוליים הזו",
    "footnotes.reference": "הפניה",
    "footnotes.references": "הפניות",
    "footnotes.referenceTitle": "{count} {referenceLabel}",
    "footnotes.missing": "חסר",
    "outline.empty.noActive": "פתחו הערה כדי לראות את המתאר שלה.",
    "outline.empty.noHeadings": "אין כותרות בהערה הזו.",
    "outline.filterPlaceholder": "סינון כותרות…",
    "outline.empty.noFilterMatch": "אין כותרות שתואמות לסינון.",
    "sidebar.tab.files": "קבצים",
    "sidebar.tab.search": "חיפוש",
    "sidebar.tab.bookmarks": "סימניות",
    "sidebar.tab.tags": "תגיות",
    "sidebar.tab.backlinks": "קישורים חוזרים",
    "sidebar.tab.outgoing": "קישורים יוצאים",
    "sidebar.tab.outline": "מתאר",
    "sidebar.tab.recents": "קבצים אחרונים",
    "sidebar.tab.localGraph": "גרף מקומי",
    "sidebar.tab.fileProperties": "מאפייני קובץ",
    "sidebar.tab.allProperties": "כל המאפיינים (כספת)",
    "sidebar.tab.footnotes": "הערות שוליים",
    "sidebar.openInCenter": "פתיחת {label} באזור המרכזי",
    "sidebar.splitGroup": "פיצול קבוצת סרגל הצד {label}",
    "sidebar.closeGroup": "סגירת קבוצת סרגל הצד {label}",
    "sidebar.unavailable": "תצוגת סרגל הצד כבר לא זמינה.",
    "localGraph.empty.noActive": "פתחו הערה כדי לראות את הגרף המקומי שלה.",
    "localGraph.empty.noLinks": "אין עדיין קישורים",
    "localGraph.neighbor": "שכן אחד",
    "localGraph.neighbors": "{count} שכנים",
    "localGraph.openNote": "פתיחת {path}",
    "properties.error.update": "לא ניתן לעדכן את המאפיין",
    "properties.error.remove": "לא ניתן להסיר את המאפיין",
    "properties.addPrompt": "שם מאפיין חדש:",
    "properties.empty.noActive": "פתחו הערה כדי לראות את המאפיינים שלה.",
    "properties.empty.noProperties": "אין מאפיינים בהערה הזו. לחצו על {addLabel} כדי ליצור אחד.",
    "properties.addLabel": "+ הוספה",
    "properties.addAction": "הוספת מאפיין",
    "properties.listPlaceholder": "ערכים, מופרדים, בפסיקים",
    "properties.remove": "הסרת המאפיין {name}",
    "allProperties.empty": "לא נמצאו מאפיינים בכספת.",
    "allProperties.overrideTitle": 'נקבעה עקיפה ל-"{type}". איפוס ינקה אותה.',
    "allProperties.inferredTitle": "סוג מוסק: {type}",
    "allProperties.inferredOption": "(מוסק: {type})",
    "allProperties.usageTitle": "{count} {noteLabel} משתמשות במאפיין הזה",
    "properties.note": "הערה",
    "properties.notes": "הערות",
    "propertyType.text": "טקסט",
    "propertyType.number": "מספר",
    "propertyType.checkbox": "תיבת סימון",
    "propertyType.list": "רשימה",
    "propertyType.date": "תאריך",
    "propertyType.datetime": "תאריך ושעה",
    "propertyType.json": "JSON",
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
