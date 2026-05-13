import { setLocale } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectStartupTiming,
  formatStartupTiming,
  maybeShowSlowStartupNotice,
  showStartupTimingReport,
} from "./startup";

afterEach(() => {
  vi.restoreAllMocks();
  setLocale("en");
  for (const notice of [...noticeManager.list()]) noticeManager.dismiss(notice.id);
});

describe("startup timing profiler", () => {
  it("collects navigation and paint timings from browser performance entries", () => {
    vi.spyOn(performance, "now").mockReturnValue(321);
    vi.spyOn(performance, "getEntriesByType").mockImplementation((type) =>
      type === "navigation"
        ? ([
            {
              startTime: 0,
              domContentLoadedEventEnd: 123,
              loadEventEnd: 234,
            },
          ] as unknown as PerformanceEntryList)
        : [],
    );
    vi.spyOn(performance, "getEntriesByName").mockImplementation((name) =>
      name === "first-contentful-paint"
        ? ([{ startTime: 111 }] as unknown as PerformanceEntryList)
        : name === "first-paint"
          ? ([{ startTime: 100 }] as unknown as PerformanceEntryList)
          : [],
    );

    expect(collectStartupTiming()).toEqual({
      nowMs: 321,
      navigationStartMs: 0,
      domContentLoadedMs: 123,
      loadEventMs: 234,
      firstPaintMs: 100,
      firstContentfulPaintMs: 111,
    });
  });

  it("formats unavailable timings explicitly", () => {
    const report = formatStartupTiming({
      nowMs: 321,
      navigationStartMs: 0,
      domContentLoadedMs: null,
      loadEventMs: null,
      firstPaintMs: null,
      firstContentfulPaintMs: null,
    });

    expect(report).toContain("Startup timing");
    expect(report).toContain("Elapsed now: 321 ms");
    expect(report).toContain("DOMContentLoaded: unavailable");
  });

  it("shows a sticky report notice", () => {
    vi.spyOn(performance, "now").mockReturnValue(42);

    const message = showStartupTimingReport();

    expect(message).toContain("Startup timing");
    const notice = noticeManager.list()[0];
    expect(notice?.message).toBe(message);
    expect(notice?.timeoutMs).toBe(0);
  });

  it("warns only when enabled startup timing exceeds the expected threshold", () => {
    const baseReport = {
      navigationStartMs: 0,
      domContentLoadedMs: null,
      loadEventMs: null,
      firstPaintMs: null,
      firstContentfulPaintMs: null,
    };

    const fast = maybeShowSlowStartupNotice({
      enabled: true,
      thresholdMs: 3_000,
      report: { ...baseReport, nowMs: 2_999 },
    });
    expect(fast).toBeNull();
    expect(noticeManager.list()).toEqual([]);

    const disabled = maybeShowSlowStartupNotice({
      enabled: false,
      thresholdMs: 3_000,
      report: { ...baseReport, nowMs: 4_000 },
    });
    expect(disabled).toBeNull();
    expect(noticeManager.list()).toEqual([]);

    const slow = maybeShowSlowStartupNotice({
      enabled: true,
      thresholdMs: 3_000,
      report: { ...baseReport, nowMs: 4_001 },
    });

    expect(slow).toContain("Startup took 4,001 ms");
    const notice = noticeManager.list()[0];
    expect(notice?.kind).toBe("warning");
    expect(notice?.timeoutMs).toBe(0);
  });
});
