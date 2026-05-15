import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteFoldPersistenceReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteFoldPersistenceState?.() ?? null);
    throw new Error(
      `Timed out waiting for fold fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteFoldPersistenceError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Fold fixture ready").waitFor();
  await page.locator(".cm-editor").waitFor();
}

async function foldState(page) {
  return await page.evaluate(() => window.__graniteFoldPersistenceState());
}

async function waitForFoldCount(page, count) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await foldState(page);
    if (last.folds.length === count) return last;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${count} fold ranges; last=${JSON.stringify(last)}`);
}

async function clickFirstFoldGutter(page) {
  const clicked = await page.evaluate(() => {
    const markers = [...document.querySelectorAll(".cm-foldGutter .cm-gutterElement")];
    const marker = markers.find((element) => /[⌄›]/.test(element.textContent ?? ""));
    if (!(marker instanceof HTMLElement)) return false;
    marker.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    marker.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    marker.click();
    return true;
  });
  if (!clicked) throw new Error("Could not find a CodeMirror fold gutter marker");
}

function assertFoldedText(state, label) {
  if (state.editorText.includes("folded body line one")) {
    throw new Error(`${label} still shows folded body text: ${state.editorText}`);
  }
  if (!state.editorText.includes("Keep visible")) {
    throw new Error(`${label} lost the following heading: ${state.editorText}`);
  }
}

function assertExpandedText(state, label) {
  if (!state.editorText.includes("folded body line one")) {
    throw new Error(`${label} did not show unfolded body text: ${state.editorText}`);
  }
  if (!state.editorText.includes("Keep visible")) {
    throw new Error(`${label} lost the following heading: ${state.editorText}`);
  }
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/fold-persistence-browser-fixture.html",
    viewport: { width: 960, height: 720 },
    query: { vault: `fold-persistence-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    assertExpandedText(await foldState(page), "initial editor");
    await clickFirstFoldGutter(page);
    const foldedBeforeReload = await waitForFoldCount(page, 1);
    assertFoldedText(foldedBeforeReload, "folded editor");
    await page.evaluate(() => window.__graniteFoldPersistenceFlush());

    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    const foldedAfterReload = await waitForFoldCount(page, 1);
    assertFoldedText(foldedAfterReload, "restored editor");

    await page.locator(".cm-foldPlaceholder").first().click();
    const unfolded = await waitForFoldCount(page, 0);
    assertExpandedText(unfolded, "unfolded editor");
    await page.evaluate(() => window.__graniteFoldPersistenceFlush());

    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    const unfoldedAfterReload = await waitForFoldCount(page, 0);
    assertExpandedText(unfoldedAfterReload, "unfolded restored editor");

    console.log("Fold persistence browser verification passed.");
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
