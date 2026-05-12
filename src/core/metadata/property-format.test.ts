import { describe, expect, it } from "vitest";
import { formatPropertyValue } from "./property-format";

describe("formatPropertyValue", () => {
  it("renders ISO date strings with the requested locale", () => {
    expect(formatPropertyValue("2024-01-05", "en-US")).toBe("Jan 5, 2024");
    expect(formatPropertyValue("2024-01-05", "en-GB")).toBe("5 Jan 2024");
  });

  it("renders YAML date objects as date-only values without UTC date drift", () => {
    expect(formatPropertyValue(new Date(Date.UTC(2024, 0, 5)), "en-US")).toBe("Jan 5, 2024");
  });

  it("renders ISO datetime strings with localized date and time", () => {
    expect(formatPropertyValue("2024-01-05T10:30:00Z", "en-US")).toMatch(
      /^Jan 5, 2024, 10:30\s?AM$/,
    );
  });

  it("formats list items recursively", () => {
    expect(formatPropertyValue(["2024-01-05", "plain"], "en-GB")).toBe("5 Jan 2024, plain");
  });

  it("keeps non-date strings unchanged", () => {
    expect(formatPropertyValue("[[2024-01-05]]", "en-US")).toBe("[[2024-01-05]]");
  });
});
