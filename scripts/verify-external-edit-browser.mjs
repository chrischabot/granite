import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

const EXTERNAL_ONE = "# External\n\nExternally edited content\n";
const LOCAL_DIRTY = "\nLocal unsaved text";
const EXTERNAL_TWO = "# External\n\nSecond external edit\n";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteExternalEditReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteExternalEditError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".cm-content").waitFor();
  await page.waitForFunction(() => window.__graniteExternalEditDoc?.().includes("Initial content"));
}

async function waitForDocIncludes(page, expectedText, timeout = 800) {
  await page.waitForFunction((text) => window.__graniteExternalEditDoc?.().includes(text), expectedText, {
    timeout,
  });
  return await page.evaluate(() => window.__graniteExternalEditDoc());
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/external-edit-browser-fixture.html",
    viewport: { width: 1000, height: 700 },
    query: { vault: `external-edit-browser-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    const start = performance.now();
    await page.evaluate((text) => window.__graniteExternalEditWrite(text), EXTERNAL_ONE);
    await waitForDocIncludes(page, "Externally edited content", 700);
    const externalElapsed = performance.now() - start;
    if (externalElapsed > 500) {
      throw new Error(`External edit took ${externalElapsed.toFixed(1)}ms, over 500ms budget`);
    }

    await page.evaluate((text) => window.__graniteExternalEditInsert(text), LOCAL_DIRTY);
    await waitForDocIncludes(page, "Local unsaved text", 500);
    const dirtyDoc = await page.evaluate(() => window.__graniteExternalEditDoc());
    await page.evaluate((text) => window.__graniteExternalEditWrite(text), EXTERNAL_TWO);
    await page.waitForTimeout(300);
    const afterDirtyExternal = await page.evaluate(() => window.__graniteExternalEditDoc());
    if (
      !afterDirtyExternal.includes("Local unsaved text") ||
      afterDirtyExternal.includes("Second external edit")
    ) {
      throw new Error(`External edit overwrote unsaved local text:\n${afterDirtyExternal}`);
    }
    const diskAfterDirtyProtection = await page.evaluate(() => window.__graniteExternalEditRead());
    if (diskAfterDirtyProtection !== EXTERNAL_TWO) {
      throw new Error(`External write did not reach disk before dirty protection check:\n${diskAfterDirtyProtection}`);
    }

    await page.waitForFunction(() => window.__graniteExternalEditStatus?.() === "Saved", null, {
      timeout: 1_500,
    });
    const savedDisk = await page.evaluate(() => window.__graniteExternalEditRead());
    if (!savedDisk.includes("Local unsaved text") || savedDisk.includes("Second external edit")) {
      throw new Error(`Granite autosave did not preserve local dirty buffer:\n${savedDisk}`);
    }
    await page.waitForTimeout(350);
    const statusAfterOwnWatcher = await page.evaluate(() => window.__graniteExternalEditStatus());
    const docAfterOwnWatcher = await page.evaluate(() => window.__graniteExternalEditDoc());
    if (statusAfterOwnWatcher !== "Saved" || !docAfterOwnWatcher.includes("Local unsaved text")) {
      throw new Error(
        `Granite save watcher loop re-dirtied or changed editor: status=${statusAfterOwnWatcher}, doc=${docAfterOwnWatcher}`,
      );
    }

    console.log("External edit browser verification passed.");
    console.log(`External update elapsed: ${externalElapsed.toFixed(1)}ms`);
    console.log(`Final status: ${statusAfterOwnWatcher}`);
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
