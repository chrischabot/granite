import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLastErrorReport,
  normalizeError,
  reportCapturedError,
  resetErrorReportsForTesting,
  subscribeErrorReports,
} from "./reporter";

describe("error reporter", () => {
  beforeEach(() => resetErrorReportsForTesting());

  it("normalizes unknown values into Error instances", () => {
    expect(normalizeError("boom").message).toBe("boom");
    expect(normalizeError({ _tag: "FsNotFound" }).message).toBe("FsNotFound");
    expect(normalizeError(null).message).toBe("Unknown error");
  });

  it("stores and publishes captured errors", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeErrorReports(listener);

    const report = reportCapturedError(new Error("Effect failed"), { source: "effect" });

    expect(getLastErrorReport()).toBe(report);
    expect(listener).toHaveBeenCalledWith(report);
    expect(report.error.message).toBe("Effect failed");
    expect(report.source).toBe("effect");

    unsubscribe();
    reportCapturedError("ignored");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
