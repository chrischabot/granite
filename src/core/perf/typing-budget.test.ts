import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TYPING_CORPUS_CHARS, TYPING_MAX_FRAME_MS, TYPING_P95_FRAME_MS } from "./typing-budget";

// Contract test for the §24.19 typing-perf budget. Reading the source file
// rather than only the imported binding catches a future refactor that swaps
// the literal `50` for an indirected (and potentially looser) expression.
const budgetSource = readFileSync(`${process.cwd()}/src/core/perf/typing-budget.ts`, "utf8");

describe("typing-perf budget constants", () => {
  it("pins the §24.19 frame-time budget at exactly 50 ms", () => {
    expect(TYPING_MAX_FRAME_MS).toBe(50);
    expect(budgetSource).toMatch(/export const TYPING_MAX_FRAME_MS = 50;/);
  });

  it("pins the typing p95 sub-budget at 33 ms (≈ 30 fps floor)", () => {
    expect(TYPING_P95_FRAME_MS).toBe(33);
    expect(budgetSource).toMatch(/export const TYPING_P95_FRAME_MS = 33;/);
  });

  it("pins the corpus size at 100k characters", () => {
    expect(TYPING_CORPUS_CHARS).toBe(100_000);
    expect(budgetSource).toMatch(/export const TYPING_CORPUS_CHARS = 100_000;/);
  });
});
