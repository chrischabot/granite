import { afterEach, describe, expect, it } from "vitest";
import { formatMomentDate } from "./date-format";
import { getLocale, setLocale } from "./index";

describe("formatMomentDate", () => {
  const previousLocale = getLocale();

  afterEach(() => {
    setLocale(previousLocale);
  });

  it("formats numeric Moment-style date and time tokens", () => {
    const date = new Date(2026, 4, 3, 9, 7, 5);

    expect(formatMomentDate(date, "YYYY YY MM M DD D HH mm ss", "en")).toBe(
      "2026 26 05 5 03 3 09 07 05",
    );
  });

  it("uses the active locale for month and weekday names", () => {
    setLocale("he");
    const date = new Date(2026, 4, 3, 9, 7, 5);

    expect(formatMomentDate(date, "dddd, D MMMM")).toBe("יום ראשון, 3 מאי");
  });
});
