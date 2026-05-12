import { describe, expect, it } from "vitest";
import { localeDirection, noteDirectionFromFrontmatter } from "./direction";

describe("text direction", () => {
  it("detects RTL demo locale ids", () => {
    expect(localeDirection("he")).toBe("rtl");
    expect(localeDirection("he-IL")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
  });

  it("reads per-note dir frontmatter", () => {
    expect(noteDirectionFromFrontmatter({ dir: "rtl" })).toBe("rtl");
    expect(noteDirectionFromFrontmatter({ dir: "LTR" })).toBe("ltr");
    expect(noteDirectionFromFrontmatter({ dir: "auto" })).toBeNull();
    expect(noteDirectionFromFrontmatter({ dir: true })).toBeNull();
  });
});
