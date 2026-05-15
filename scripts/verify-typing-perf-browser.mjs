import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

// §24.19 acceptance criteria:
//   "No frame drop > 50 ms while typing in a 100k-character note."
//
// Strategy: mount the real MarkdownView (CodeMirror + live-preview
// decorations) into an OPFS vault holding a deterministic 100k-character
// note, then drive 200 keystrokes through playwright's keyboard API while
// an in-page requestAnimationFrame loop records every frame delta. The
// gate fires on max frame time > 50 ms, p95 > 33 ms, or any frame over
// the §24.19 ceiling — whichever surfaces first.
//
// Gate values are kept in sync with `src/core/perf/typing-budget.ts`.
const MAX_FRAME_MS = 50;
const P95_FRAME_MS = 33;
const TYPED_KEYS = 200;
const MAX_RETRIES = 3;
const READY_TIMEOUT_MS = 30_000;

function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

function summarise(frames) {
  const sorted = frames.slice().sort((a, b) => a - b);
  return {
    frames: sorted.length,
    p50Ms: round(quantile(sorted, 0.5)),
    p95Ms: round(quantile(sorted, 0.95)),
    p99Ms: round(quantile(sorted, 0.99)),
    maxMs: round(sorted[sorted.length - 1] ?? 0),
    framesOver50ms: frames.filter((f) => f > MAX_FRAME_MS).length,
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

async function waitForReady(page) {
  try {
    await page.waitForFunction(() => window.__graniteTypingPerfReady === true, null, {
      timeout: READY_TIMEOUT_MS,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteTypingPerfState?.() ?? null);
    throw new Error(
      `Typing-perf fixture not ready within ${READY_TIMEOUT_MS} ms; state=${JSON.stringify(state)}; ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteTypingPerfError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".cm-editor").waitFor();
  // The corpus is large; wait until CodeMirror has populated the DOM with
  // most of the text. The viewport is virtualised, so a strict equality check
  // would loop forever — settle for "at least one screenful of content".
  await page.waitForFunction(
    () => (document.querySelector(".cm-content")?.textContent?.length ?? 0) > 500,
    null,
    { timeout: READY_TIMEOUT_MS },
  );
}

async function focusAtEnd(page) {
  // Click into the editor first so it owns focus, then jump to the end via
  // the production keymap (Cmd/Ctrl+End → mod-End in CodeMirror's defaultKeymap).
  await page.locator(".cm-content").click();
  // Use a portable End-of-doc shortcut: Cmd/Ctrl+End. Headless Chromium runs
  // on Linux/macOS CI; both honour Control+End for documentEnd in CM's
  // default keymap.
  await page.keyboard.press("Control+End");
  // Also fall back to Meta+ArrowDown to cover macOS layouts.
  await page.keyboard.press("Meta+ArrowDown");
}

async function runOnce(page, attempt) {
  await focusAtEnd(page);
  // A short settle so any cursor-position decoration recompute has flushed
  // before sampling starts.
  await delay(150);

  await page.evaluate(() => window.__graniteTypingPerfStartSampler());

  // Type ASCII letters one at a time so each press exercises the full
  // production keymap + CodeMirror dispatch path (not a synthetic
  // state.update). Mix in spaces so the live-preview decorator has to
  // re-tokenise line boundaries.
  const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < TYPED_KEYS; i++) {
    const ch = i % 12 === 11 ? "Space" : ALPHABET[i % ALPHABET.length];
    await page.keyboard.press(ch);
  }

  // Let the rAF loop capture the trailing frames after the last keystroke.
  await delay(250);

  const frames = await page.evaluate(() => window.__graniteTypingPerfStopSampler());
  const summary = summarise(frames);
  // A run with zero captured frames means the main thread was so pinned that
  // rAF never fired (or the sampler was stopped before it could record).
  // Treat that as a hard fail — it usually points at exactly the kind of
  // regression §24.19 is meant to catch.
  const ok =
    summary.frames >= TYPED_KEYS / 4 &&
    summary.maxMs <= MAX_FRAME_MS &&
    summary.p95Ms <= P95_FRAME_MS &&
    summary.framesOver50ms === 0;
  return { ok, attempt, ...summary };
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/typing-perf-browser-fixture.html",
    viewport: { width: 1100, height: 800 },
    query: { vault: `typing-perf-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForReady(page);

        const attempts = [];
        let last = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          const result = await runOnce(page, attempt);
          attempts.push(result);
          last = result;
          if (result.ok) break;
          // Brief cool-down before retry so unrelated CI noise (GC, neighbour
          // tenants) has a chance to drain.
          await delay(500);
        }

        const finalResult = {
          ok: last?.ok === true,
          attempt: last?.attempt ?? 0,
          retries: attempts.length - 1,
          frames: last?.frames ?? 0,
          p50Ms: last?.p50Ms ?? 0,
          p95Ms: last?.p95Ms ?? 0,
          p99Ms: last?.p99Ms ?? 0,
          maxMs: last?.maxMs ?? 0,
          framesOver50ms: last?.framesOver50ms ?? 0,
          attempts,
        };

        if (!finalResult.ok) {
          const noisy = consoleMessages.filter(
            (m) => !m.includes("Download the React DevTools"),
          );
          throw new Error(
            `Typing-perf browser verification failed (max ${MAX_RETRIES} attempts):\n${JSON.stringify(finalResult, null, 2)}\n${noisy.join("\n")}`,
          );
        }

        console.log("Typing-perf browser verification passed.");
        console.log(
          `frames=${finalResult.frames} p50=${finalResult.p50Ms}ms p95=${finalResult.p95Ms}ms p99=${finalResult.p99Ms}ms max=${finalResult.maxMs}ms over50=${finalResult.framesOver50ms} retries=${finalResult.retries}`,
        );
        return finalResult;
      } catch (error) {
        const noisy = consoleMessages.filter(
          (m) => !m.includes("Download the React DevTools"),
        );
        if (noisy.length > 0) console.error(noisy.join("\n"));
        throw error;
      }
    },
  }),
);
