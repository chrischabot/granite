/**
 * Typing-performance budget.
 *
 * Codifies the §24.19 acceptance-criteria contract:
 * "No frame drop > 50 ms while typing in a 100k-character note."
 *
 * The browser verifier (`scripts/verify-typing-perf-browser.mjs`) reads this
 * constant from a typing-perf fixture; the unit test (`typing-budget.test.ts`)
 * pins the number so a future refactor that loosens it fails the suite.
 *
 * The corresponding p95 sub-budget (33 ms ≈ a 30 fps floor) and the
 * 100k-character corpus size are deliberately co-located here so both knobs
 * are version-controlled in a single place.
 */

/** Hard upper bound, in milliseconds, for any single frame while typing. */
export const TYPING_MAX_FRAME_MS = 50;

/** p95 sub-budget for frame time while typing (≈ 30 fps floor). */
export const TYPING_P95_FRAME_MS = 33;

/** Document size at which the budget is asserted. */
export const TYPING_CORPUS_CHARS = 100_000;
