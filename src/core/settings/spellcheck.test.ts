import { describe, expect, it } from "vitest";
import {
  applySpellcheckAttributes,
  primarySpellcheckLanguage,
  spellcheckLanguageTags,
} from "./spellcheck";

describe("spellcheck language settings", () => {
  it("normalizes comma and newline separated language tags", () => {
    expect(spellcheckLanguageTags("en-US, he\nfr-CA, nope!, de")).toEqual([
      "en-US",
      "he",
      "fr-CA",
      "de",
    ]);
  });

  it("uses the first valid language tag for the editor lang attribute", () => {
    expect(primarySpellcheckLanguage("nope!, en-GB, he")).toBe("en-GB");
  });

  it("applies spellcheck and language attributes to the editor DOM", () => {
    const el = document.createElement("div");

    applySpellcheckAttributes(el, { spellcheck: true, spellcheckLanguages: "en-US, he" });

    expect(el.spellcheck).toBe(true);
    expect(el.lang).toBe("en-US");

    applySpellcheckAttributes(el, { spellcheck: false, spellcheckLanguages: "he" });

    expect(el.spellcheck).toBe(false);
    expect(el.hasAttribute("lang")).toBe(false);
  });
});
