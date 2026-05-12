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
  });
});
