import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PSEUDO_LOCALE,
  getLocale,
  registerLocale,
  setLocale,
  subscribeI18n,
  t,
  transformPseudo,
  verifyLocaleSync,
} from "./index";

beforeEach(() => {
  // Reset to English between tests so registrations from earlier tests don't
  // bleed into later ones.
  setLocale("en");
});

describe("i18n", () => {
  it("looks up English by default", () => {
    expect(t("app.welcome.title")).toBe("Welcome to Granite");
  });

  it("returns the key when missing", () => {
    expect(t("nope.unknown.key")).toBe("nope.unknown.key");
  });

  it("substitutes {name} parameters", () => {
    registerLocale("en", { "test.greet": "Hello {name}" });
    expect(t("test.greet", { name: "World" })).toBe("Hello World");
  });

  it("escapes regex metacharacters in parameter names", () => {
    registerLocale("en", { "test.weird": "ok {a.b}" });
    expect(t("test.weird", { "a.b": "ok" })).toBe("ok ok");
  });

  it("falls back to English when the active locale lacks the key", () => {
    registerLocale("en", { "test.only-en": "english value" });
    registerLocale("fr", { "other.key": "valeur" });
    setLocale("fr");
    expect(t("test.only-en")).toBe("english value");
  });

  it("subscribers fire on setLocale", () => {
    const cb = vi.fn();
    const unsub = subscribeI18n(cb);
    setLocale("fr");
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it("getLocale + setLocale roundtrip", () => {
    setLocale("fr");
    expect(getLocale()).toBe("fr");
    setLocale("en");
    expect(getLocale()).toBe("en");
  });

  it("includes Hebrew as a built-in RTL demo locale", () => {
    setLocale("he");
    expect(t("settings.editor")).toBe("עורך");
    expect(t("app.empty.noFile")).toBe("אין קובץ פתוח");
    expect(t("search.sort.relevance")).toBe("רלוונטיות");
    expect(t("tags.showNested")).toBe("הצגת תגיות מקוננות");
    expect(t("backlinks.unlinked.title")).toBe("אזכורים לא מקושרים");
    expect(t("outline.filterPlaceholder")).toBe("סינון כותרות…");
    expect(t("sidebar.tab.localGraph")).toBe("גרף מקומי");
    expect(t("properties.addAction")).toBe("הוספת מאפיין");
    expect(t("status.localOnly")).toBe("מקומי בלבד");
    expect(t("fileExplorer.action.newNote")).toBe("הערה חדשה");
    expect(t("quickSwitcher.placeholder")).toBe("חיפוש או יצירת הערה...");
    expect(t("commandPalette.pin")).toBe("נעיצת פקודה");
    expect(t("templatePicker.placeholder")).toBe("בחירת תבנית…");
    expect(t("plugin.loader.error.noActiveVault")).toBe(
      "טוען התוספים לא יכול לבנות את API התוסף בלי כספת פעילה.",
    );
    expect(t("vaultPicker.title")).toBe("ניהול כספות");
    expect(t("vaultContext.reopenGrant", { name: "Work" })).toBe(
      'לפתוח מחדש את "Work"? לחצו כאן כדי לאשר גישה לתיקייה.',
    );
    expect(t("vaultContext.error.opfsUnavailable")).toBe("אחסון כספת בדפדפן אינו זמין בדפדפן הזה.");
    expect(t("help.section.workspace")).toBe("סביבת עבודה");
    expect(t("help.keys.tagAutocomplete")).toBe("# בתחילת שורה");
    expect(t("help.keys.dragTab")).toBe("גרירת לשונית");
    expect(t("bookmarks.defaultGroup")).toBe("סימניות");
    expect(t("graph.controls.title")).toBe("פקדי גרף");
    expect(t("graph.filterPlaceholder")).toBe("tag:project -draft");
    expect(t("graph.groups.queryPlaceholder")).toBe("tag:work");
    expect(t("fileRecovery.title")).toBe("שחזור קבצים");
    expect(t("installPlugin.title")).toBe("התקנת תוסף קהילתי");
    expect(t("installPlugin.manualUrlPlaceholder")).toBe(
      "https://raw.githubusercontent.com/.../manifest.json",
    );
    expect(t("settings.searchPlaceholder")).toBe("חיפוש בהגדרות");
    expect(t("settings.appearance.baseScheme")).toBe("ערכת צבע בסיסית");
    expect(t("settings.files.attachmentsPlaceholder")).toBe("attachments");
    expect(t("settings.files.excludedFilesPlaceholder")).toBe("archive\n*.tmp\nprivate/**");
    expect(t("settings.dailyNotes.dateFormatPlaceholder")).toBe("YYYY-MM-DD");
    expect(t("settings.templates.timeFormatPlaceholder")).toBe("HH:mm");
    expect(t("settings.hotkeys.pressKey")).toBe("לחצו על מקש…");
    expect(t("settings.plugins.installFromUrl")).toBe("התקנת תוסף מכתובת URL…");
    expect(t("titlebar.navigateBack")).toBe("ניווט אחורה");
    expect(t("workspace.tab.close")).toBe("סגירת לשונית");
    expect(t("workspace.menu.splitRight")).toBe("פיצול ימינה");
    expect(t("workspace.announce.activeTab", { title: "Projects" })).toBe("לשונית פעילה: Projects");
    expect(t("markdown.status.saving")).toBe("שומר…");
    expect(t("markdown.error.read")).toBe("לא ניתן לקרוא את הקובץ הזה.");
    expect(t("markdown.autocomplete.aliasFor", { stem: "Projects" })).toBe("כינוי עבור Projects");
    expect(t("webViewer.urlPlaceholder")).toBe("הזנת כתובת URL...");
    expect(t("reading.embed.open")).toBe("פתיחה");
    expect(t("reading.query.noResults")).toBe("אין תוצאות.");
    expect(t("reading.properties.count", { count: "3" })).toBe("מאפיינים · 3");
    expect(t("canvas.action.addText")).toBe("הוספת צומת טקסט");
    expect(t("canvas.stats", { zoom: "125", count: "2", nodeLabel: t("canvas.nodes") })).toBe(
      "125% · 2 צמתים",
    );
    expect(t("bases.title")).toBe("בסיסים");
    expect(t("bases.defaultName")).toBe("בסיס ללא שם");
    expect(t("bases.empty.noMatchingFiles")).toBe("אין קבצים תואמים.");
    expect(t("bases.error.exists", { path: "Tasks.base" })).toBe('כבר קיים קובץ בשם "Tasks.base"');
    expect(t("bases.map.open", { name: "London" })).toBe("פתיחת London");
    expect(t("inlineTitle.renameTitle")).toBe("לחיצה כפולה לשינוי שם");
    expect(t("inlineTitle.error.exists", { path: "Note.md" })).toBe('כבר קיים קובץ בשם "Note.md"');
    expect(t("errorBoundary.reload")).toBe("טעינת גרניט מחדש");
    expect(t("hoverPopover.fileNotFound")).toBe("הקובץ לא נמצא בכספת.");
    expect(t("notice.dismiss")).toBe("סגירה");
    expect(t("command.openCommandPalette")).toBe("פתיחת פלטת הפקודות");
    expect(t("command.focusTab", { number: "3" })).toBe("מיקוד לשונית 3");
    expect(t("plugin.bases.create")).toBe("יצירת בסיס חדש…");
    expect(t("plugin.webViewer.error.invalidUrl")).toBe("זו אינה כתובת URL תקינה.");
    expect(t("plugin.randomNote.empty")).toBe("אין עדיין הערות בכספת.");
    expect(t("plugin.randomWalk.empty")).toBe("הכספת ריקה.");
    expect(t("plugin.copyLink.wikilink")).toBe("העתקת קישור ויקי להערה הפעילה");
    expect(
      t("plugin.reload.notice.reloaded", { count: "2", pluginLabel: t("plugin.reload.plugins") }),
    ).toBe("נטענו מחדש 2 תוספים.");
    expect(t("plugin.tour.open")).toBe("פתיחת הסיור בגרניט");
    expect(t("plugin.tour.notice.created", { path: t("plugin.tour.path") })).toBe(
      "נוצר Welcome to Granite.md.",
    );
    expect(t("plugin.tour.body")).toContain("# ברוכים הבאים לגרניט");
    expect(t("plugin.update.allUpToDate")).toBe("כל התוספים מעודכנים.");
    expect(t("plugin.format.noWikilinks")).toBe("אין קישורי ויקי להמרה.");
    expect(
      t("plugin.format.migratedProperties", {
        keys: "2",
        propertyLabel: t("plugin.format.properties"),
        notes: "1",
        noteLabel: t("plugin.format.note"),
      }),
    ).toBe("הועברו 2 מאפיינים ישנים ב-1 הערה.");
    expect(t("plugin.noteComposer.noSelection")).toBe("לא נבחר טקסט.");
    expect(
      t("plugin.noteComposer.notice.merged", {
        name: "Archive",
        count: "2",
        linkLabel: t("plugin.noteComposer.links"),
      }),
    ).toBe('מוזג אל "Archive". שוכתבו 2 קישורים.');
    expect(t("plugin.uniqueNote.create")).toBe("יצירת הערה ייחודית חדשה");
    expect(t("plugin.dailyNotes.openTomorrow")).toBe("פתיחת ההערה היומית של מחר");
    expect(t("plugin.vaultStats.files", { count: "12" })).toBe("קבצים: 12");
    expect(t("plugin.audioRecorder.saved", { path: "attachments/a.webm" })).toBe(
      "ההקלטה נשמרה אל attachments/a.webm",
    );
    expect(
      t("plugin.findReplace.replaced", {
        occurrences: "3",
        occurrenceLabel: t("plugin.findReplace.occurrences"),
        files: "2",
        fileLabel: t("plugin.findReplace.files"),
        summary: "2× A.md; 1× B.md",
      }),
    ).toBe("הוחלפו 3 מופעים ב-2 קבצים (2× A.md; 1× B.md).");
    expect(
      t("plugin.tagRename.renamed", {
        oldTag: "old",
        newTag: "new",
        occurrences: "1",
        occurrenceLabel: t("plugin.tagRename.occurrence"),
        files: "1",
        fileLabel: t("plugin.tagRename.file"),
      }),
    ).toBe("שם התגית #old שונה ל-#new (1 מופע ב-1 קובץ).");
    expect(t("plugin.templates.empty")).toBe(
      "לא נמצאו תבניות. הגדירו תיקיית תבניות תחת הגדרות ← תבניות.",
    );
    expect(t("plugin.workspaces.loaded", { name: "Writing" })).toBe('הפריסה "Writing" נטענה');
    expect(t("plugin.fileRecovery.noSnapshots")).toBe("אין עדיין צילומים לקובץ הזה.");
    expect(t("plugin.loader.error.load", { name: "Demo", message: "boom" })).toBe(
      'טעינת התוסף "Demo" נכשלה: boom',
    );
    expect(t("plugin.communityRegistry.error.http", { status: "404" })).toBe(
      "HTTP 404 בעת טעינת רישום התוספים הקהילתיים",
    );
  });
});

describe("pseudo-locale", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("activates via setLocale(PSEUDO_LOCALE) and wraps values in []", () => {
    setLocale(PSEUDO_LOCALE);
    const out = t("workspace.leaf.settings");
    expect(out.startsWith("[")).toBe(true);
    expect(out.endsWith("]")).toBe(true);
    // "Settings" -> "Şéțțıngş" after substitutions
    expect(out).toBe("[Şéțțıngş]");
  });

  it("transforms ASCII letters with the deterministic substitution map", () => {
    expect(transformPseudo("k", "Save")).toBe("[Şávé]");
    expect(transformPseudo("k", "Open")).toBe("[Ópén]");
    expect(transformPseudo("k", "Edit")).toBe("[Édıț]");
  });

  it("preserves {placeholder} segments untouched", () => {
    const out = transformPseudo("k", "Hello {name}, you have {count} items");
    // The placeholders themselves must be intact and not transformed.
    expect(out).toContain("{name}");
    expect(out).toContain("{count}");
    // Surrounding words must be transformed.
    expect(out).not.toContain("Hello");
    expect(out).not.toContain("items");
    expect(out.startsWith("[")).toBe(true);
    expect(out.endsWith("]")).toBe(true);
  });

  it("preserves punctuation, digits, and whitespace", () => {
    const out = transformPseudo("k", "3 of 12 — done.");
    // Digits and punctuation pass through unchanged.
    expect(out).toContain("3");
    expect(out).toContain("12");
    expect(out).toContain("—");
    expect(out).toContain(".");
    expect(out).toContain(" ");
  });

  it("parameter substitution still works in pseudo-locale", () => {
    setLocale(PSEUDO_LOCALE);
    registerLocale("en", { "test.psg": "Hello {name}" });
    const out = t("test.psg", { name: "World" });
    // Placeholder substituted with raw param value (not pseudo-transformed).
    expect(out).toContain("World");
    expect(out).toBe("[Hélló World]");
  });

  it("does not pseudo-transform allowlisted brand values", () => {
    registerLocale("en", { "test.brand": "Granite" });
    setLocale(PSEUDO_LOCALE);
    // Allowlisted brand values are bracketed but not character-substituted.
    expect(t("test.brand")).toBe("[Granite]");
  });

  it("skips single-token ASCII code values (e.g. Ctrl+P, YYYY-MM-DD)", () => {
    registerLocale("en", {
      "test.shortcut": "Ctrl+P",
      "test.format": "YYYY-MM-DD",
    });
    setLocale(PSEUDO_LOCALE);
    expect(t("test.shortcut")).toBe("[Ctrl+P]");
    expect(t("test.format")).toBe("[YYYY-MM-DD]");
  });

  it("returns the key itself when the English source is missing", () => {
    setLocale(PSEUDO_LOCALE);
    expect(t("nope.unknown.psg.key")).toBe("nope.unknown.psg.key");
  });

  it("verifyLocaleSync reports zero missing/extras for built-in he", () => {
    const report = verifyLocaleSync();
    expect(report.enKeys).toBeGreaterThan(800);
    expect(Object.keys(report.missingPerLocale)).toContain("he");
    expect(Reflect.get(report.missingPerLocale, "he")).toEqual([]);
    expect(Reflect.get(report.extrasPerLocale, "he")).toEqual([]);
  });

  it("verifyLocaleSync detects missing and extra keys in a registered locale", () => {
    registerLocale("zz", { "app.welcome.title": "x", "totally.bogus.zz": "x" });
    const report = verifyLocaleSync();
    const missingZz = Reflect.get(report.missingPerLocale, "zz") as string[] | undefined;
    expect(missingZz?.length).toBeGreaterThan(10);
    const extrasZz = Reflect.get(report.extrasPerLocale, "zz") as string[] | undefined;
    expect(extrasZz).toContain("totally.bogus.zz");
  });

  it("excludes the pseudo-locale from coverage reports", () => {
    const report = verifyLocaleSync();
    expect(Object.keys(report.missingPerLocale)).not.toContain(PSEUDO_LOCALE);
    expect(Object.keys(report.extrasPerLocale)).not.toContain(PSEUDO_LOCALE);
  });
});
