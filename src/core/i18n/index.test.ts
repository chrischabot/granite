import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocale, registerLocale, setLocale, subscribeI18n, t } from "./index";

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
    expect(t("vaultPicker.title")).toBe("ניהול כספות");
    expect(t("help.section.workspace")).toBe("סביבת עבודה");
    expect(t("bookmarks.defaultGroup")).toBe("סימניות");
    expect(t("graph.controls.title")).toBe("פקדי גרף");
    expect(t("fileRecovery.title")).toBe("שחזור קבצים");
    expect(t("installPlugin.title")).toBe("התקנת תוסף קהילתי");
    expect(t("settings.searchPlaceholder")).toBe("חיפוש בהגדרות");
    expect(t("settings.appearance.baseScheme")).toBe("ערכת צבע בסיסית");
    expect(t("settings.hotkeys.pressKey")).toBe("לחצו על מקש…");
    expect(t("settings.plugins.installFromUrl")).toBe("התקנת תוסף מכתובת URL…");
    expect(t("titlebar.navigateBack")).toBe("ניווט אחורה");
    expect(t("workspace.tab.close")).toBe("סגירת לשונית");
    expect(t("workspace.menu.splitRight")).toBe("פיצול ימינה");
    expect(t("workspace.announce.activeTab", { title: "Projects" })).toBe("לשונית פעילה: Projects");
    expect(t("markdown.status.saving")).toBe("שומר…");
    expect(t("markdown.error.read")).toBe("לא ניתן לקרוא את הקובץ הזה.");
    expect(t("webViewer.urlPlaceholder")).toBe("הזנת כתובת URL...");
    expect(t("reading.embed.open")).toBe("פתיחה");
    expect(t("reading.query.noResults")).toBe("אין תוצאות.");
    expect(t("reading.properties.count", { count: "3" })).toBe("מאפיינים · 3");
    expect(t("canvas.action.addText")).toBe("הוספת צומת טקסט");
    expect(t("canvas.stats", { zoom: "125", count: "2", nodeLabel: t("canvas.nodes") })).toBe(
      "125% · 2 צמתים",
    );
    expect(t("bases.title")).toBe("בסיסים");
    expect(t("bases.empty.noMatchingFiles")).toBe("אין קבצים תואמים.");
    expect(t("bases.map.open", { name: "London" })).toBe("פתיחת London");
    expect(t("inlineTitle.renameTitle")).toBe("לחיצה כפולה לשינוי שם");
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
  });
});
