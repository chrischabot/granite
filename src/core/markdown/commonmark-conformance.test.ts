import { describe, expect, it } from "vitest";
import specCases from "./fixtures/commonmark-0.31.2.json";
import { renderCommonMark } from "./renderer";

interface CommonMarkSpecCase {
  readonly markdown: string;
  readonly html: string;
  readonly example: number;
  readonly start_line: number;
  readonly end_line: number;
  readonly section: string;
}

const cases = specCases as ReadonlyArray<CommonMarkSpecCase>;
const MINIMUM_PASS_RATE = 0.99;

describe("CommonMark 0.31.2 conformance", () => {
  it("keeps the official spec fixture wired in", () => {
    expect(cases.length).toBeGreaterThan(600);
    expect(cases[0]?.example).toBe(1);
  });

  it("passes at least 99% of the official examples", () => {
    const failures = cases.filter(
      (specCase) => renderCommonMark(specCase.markdown) !== specCase.html,
    );
    const passRate = (cases.length - failures.length) / cases.length;
    const sample = failures
      .slice(0, 5)
      .map((failure) => `${failure.example} (${failure.section})`)
      .join(", ");

    expect(
      passRate,
      `CommonMark pass rate ${(passRate * 100).toFixed(2)}%; first failures: ${sample}`,
    ).toBeGreaterThanOrEqual(MINIMUM_PASS_RATE);
  });
});
