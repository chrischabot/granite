import { resetErrorReportsForTesting, subscribeErrorReports } from "@core/errors/reporter";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { disposeRuntime, runFork } from "./runtime";

describe("Effect runtime error reporting", () => {
  beforeEach(async () => {
    await disposeRuntime();
    resetErrorReportsForTesting();
  });

  afterEach(async () => {
    await disposeRuntime();
    resetErrorReportsForTesting();
  });

  it("reports fire-and-forget Effect error-channel failures", async () => {
    const reportPromise = new Promise<string>((resolve) => {
      subscribeErrorReports((report) => resolve(report.source));
    });

    runFork(Effect.fail(new Error("background effect failed")));

    await expect(reportPromise).resolves.toBe("effect");
  });
});
