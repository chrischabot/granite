import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";

export const STARTUP_EXPECTED_MS = 3_000;

export interface StartupTimingReport {
  readonly nowMs: number;
  readonly navigationStartMs: number;
  readonly domContentLoadedMs: number | null;
  readonly loadEventMs: number | null;
  readonly firstPaintMs: number | null;
  readonly firstContentfulPaintMs: number | null;
}

function firstPaint(name: string): number | null {
  const entries = performance.getEntriesByName?.(name) ?? [];
  const first = entries[0];
  return typeof first?.startTime === "number" ? first.startTime : null;
}

export function collectStartupTiming(): StartupTimingReport {
  const nav = performance.getEntriesByType?.("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const nowMs = performance.now();
  return {
    nowMs,
    navigationStartMs: nav?.startTime ?? 0,
    domContentLoadedMs:
      typeof nav?.domContentLoadedEventEnd === "number" && nav.domContentLoadedEventEnd > 0
        ? nav.domContentLoadedEventEnd
        : null,
    loadEventMs:
      typeof nav?.loadEventEnd === "number" && nav.loadEventEnd > 0 ? nav.loadEventEnd : null,
    firstPaintMs: firstPaint("first-paint"),
    firstContentfulPaintMs: firstPaint("first-contentful-paint"),
  };
}

function formatMs(value: number | null): string {
  return value === null
    ? t("startupTiming.unavailable")
    : `${Math.round(value).toLocaleString()} ms`;
}

export function formatStartupTiming(report: StartupTimingReport): string {
  return [
    t("startupTiming.title"),
    `${t("startupTiming.now")}: ${formatMs(report.nowMs)}`,
    `${t("startupTiming.navigationStart")}: ${formatMs(report.navigationStartMs)}`,
    `${t("startupTiming.domContentLoaded")}: ${formatMs(report.domContentLoadedMs)}`,
    `${t("startupTiming.loadEvent")}: ${formatMs(report.loadEventMs)}`,
    `${t("startupTiming.firstPaint")}: ${formatMs(report.firstPaintMs)}`,
    `${t("startupTiming.firstContentfulPaint")}: ${formatMs(report.firstContentfulPaintMs)}`,
  ].join("\n");
}

export function showStartupTimingReport(): string {
  const message = formatStartupTiming(collectStartupTiming());
  noticeManager.show(message, { kind: "info", timeoutMs: 0 });
  return message;
}

export function maybeShowSlowStartupNotice({
  enabled,
  thresholdMs = STARTUP_EXPECTED_MS,
  report = collectStartupTiming(),
}: {
  readonly enabled: boolean;
  readonly thresholdMs?: number;
  readonly report?: StartupTimingReport;
}): string | null {
  if (!enabled || report.nowMs <= thresholdMs) return null;
  const message = [
    t("startupTiming.slowNotice", {
      elapsed: `${Math.round(report.nowMs).toLocaleString()} ms`,
      expected: `${thresholdMs.toLocaleString()} ms`,
    }),
    "",
    formatStartupTiming(report),
  ].join("\n");
  noticeManager.show(message, { kind: "warning", timeoutMs: 0 });
  return message;
}
