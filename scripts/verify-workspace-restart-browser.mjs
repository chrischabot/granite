import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function snapshot(page) {
  return await page.evaluate(() => window.__graniteWorkspaceRestartSnapshot());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteWorkspaceRestartReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteWorkspaceRestartSnapshot?.() ?? null);
    throw new Error(
      `Timed out waiting for workspace restart fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteWorkspaceRestartError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".workspace").waitFor();
}

function markdownPaths(snap) {
  return snap.leaves
    .map((leaf) => leaf.state)
    .filter((state) => state.type === "markdown")
    .map((state) => state.path)
    .sort();
}

function assertSingleRestored(snap, label) {
  const paths = markdownPaths(snap);
  if (!paths.includes("Restart A.md")) {
    throw new Error(`${label} did not restore Restart A.md: ${JSON.stringify(snap)}`);
  }
  if (!snap.titles.some((title) => title.includes("Restart A"))) {
    throw new Error(`${label} did not render Restart A tab: ${JSON.stringify(snap)}`);
  }
}

function assertLayoutRestored(snap, label) {
  const paths = markdownPaths(snap);
  for (const path of ["Restart A.md", "Restart B.md", "Restart C.md"]) {
    if (!paths.includes(path)) throw new Error(`${label} missing ${path}: ${JSON.stringify(snap)}`);
  }
  if (snap.columns.length !== 2 || snap.columns[0]?.length !== 2) {
    throw new Error(`${label} did not restore split columns/groups: ${JSON.stringify(snap)}`);
  }
  if (!snap.groups.some((group) => group.stacked)) {
    throw new Error(`${label} did not restore a stacked tab group: ${JSON.stringify(snap)}`);
  }
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/workspace-restart-browser-fixture.html",
    viewport: { width: 1280, height: 820 },
    query: { vault: `workspace-restart-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForFixture(page);
        await page.evaluate(() => window.__graniteWorkspaceRestartOpenSingle());
        assertSingleRestored(await snapshot(page), "before fast restart");
        await page.reload({ waitUntil: "networkidle" });
        await waitForFixture(page);
        assertSingleRestored(await snapshot(page), "after fast restart");

        await page.evaluate(() => window.__graniteWorkspaceRestartSetupLayout());
        assertLayoutRestored(await snapshot(page), "before layout restart");
        await page.reload({ waitUntil: "networkidle" });
        await waitForFixture(page);
        assertLayoutRestored(await snapshot(page), "after layout restart");

        console.log("Workspace restart browser verification passed.");
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
