import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function multiCursorState(page) {
  return await page.evaluate(() => window.__graniteMultiCursorState());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteMultiCursorReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteMultiCursorState?.() ?? null);
    throw new Error(
      `Timed out waiting for multi-cursor fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteMultiCursorError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Multi-cursor fixture ready").waitFor();
  await page.locator(".cm-editor").waitFor();
}

async function waitForDiskText(page, expected) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await multiCursorState(page);
    if (last.diskText === expected) return last;
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for disk text ${JSON.stringify(expected)}; last=${JSON.stringify(last)}`,
  );
}

async function linePoint(page, lineIndex, column) {
  return await page.evaluate(
    ({ lineIndex: index, column: col }) => {
      const line = document.querySelectorAll(".cm-line")[index];
      if (!(line instanceof HTMLElement)) {
        throw new Error(`Missing editor line ${index}`);
      }
      const rect = line.getBoundingClientRect();
      const style = getComputedStyle(document.querySelector(".cm-content"));
      const fontSize = Number.parseFloat(style.fontSize || "16");
      const width = fontSize * 0.62;
      return {
        x: rect.left + 2 + width * col,
        y: rect.top + rect.height / 2,
      };
    },
    { lineIndex, column },
  );
}

async function clickLine(page, lineIndex, column, options = {}) {
  const point = await linePoint(page, lineIndex, column);
  if (options.alt) await page.keyboard.down("Alt");
  if (options.shift) await page.keyboard.down("Shift");
  await page.mouse.click(point.x, point.y);
  if (options.shift) await page.keyboard.up("Shift");
  if (options.alt) await page.keyboard.up("Alt");
}

async function rectangularDrag(page, startLine, startColumn, endLine, endColumn) {
  const start = await linePoint(page, startLine, startColumn);
  const end = await linePoint(page, endLine, endColumn);
  await page.keyboard.down("Alt");
  await page.keyboard.down("Shift");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
}

async function resetNote(page, text) {
  await page.evaluate((nextText) => window.__graniteMultiCursorReset(nextText), text);
  await page.locator(".cm-editor").waitFor();
  await delay(100);
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/multi-cursor-browser-fixture.html",
    viewport: { width: 1000, height: 720 },
    query: { vault: `multi-cursor-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    await clickLine(page, 0, 0);
    await clickLine(page, 1, 0, { alt: true });
    await page.keyboard.type("X");
    await waitForDiskText(page, "Xone\nXtwo\nthree\n");

    await resetNote(page, "aaaa\nbbbb\ncccc\n");
    await rectangularDrag(page, 0, 1, 2, 3);
    await page.keyboard.type("Z");
    await waitForDiskText(page, "aZa\nbZb\ncZc\n");

    console.log("Multi-cursor browser verification passed.");
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
