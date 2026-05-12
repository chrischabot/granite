export type AppErrorSource = "react" | "window" | "promise" | "effect" | "manual";

export interface AppErrorReport {
  readonly id: number;
  readonly error: Error;
  readonly source: AppErrorSource;
  readonly componentStack?: string;
  readonly original: unknown;
}

let nextId = 1;
let lastReport: AppErrorReport | null = null;
const subscribers = new Set<(report: AppErrorReport) => void>();

export function normalizeError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  if (value && typeof value === "object") {
    const obj = value as { message?: unknown; _tag?: unknown; toString?: () => string };
    if (typeof obj.message === "string" && obj.message.trim()) return new Error(obj.message);
    if (typeof obj._tag === "string") return new Error(obj._tag);
    if (typeof obj.toString === "function") {
      const text = obj.toString();
      if (text && text !== "[object Object]") return new Error(text);
    }
  }
  return new Error("Unknown error");
}

export function reportCapturedError(
  value: unknown,
  options: {
    readonly source?: AppErrorSource;
    readonly componentStack?: string;
  } = {},
): AppErrorReport {
  const report: AppErrorReport = {
    id: nextId++,
    error: normalizeError(value),
    source: options.source ?? "manual",
    ...(options.componentStack ? { componentStack: options.componentStack } : {}),
    original: value,
  };
  lastReport = report;
  for (const subscriber of subscribers) subscriber(report);
  return report;
}

export function subscribeErrorReports(subscriber: (report: AppErrorReport) => void): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function getLastErrorReport(): AppErrorReport | null {
  return lastReport;
}

export function resetErrorReportsForTesting(): void {
  nextId = 1;
  lastReport = null;
  subscribers.clear();
}
