import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteBasesMapBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteBasesMapBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("[aria-label='Populated map'] .bases-map-container").waitFor();
  await page.locator("[aria-label='Empty map'] .bases-map-container").waitFor();
}

async function workspaceSnapshot(page) {
  return await page.evaluate(() => window.__graniteBasesMapBrowserWorkspace?.());
}

async function dispatchPinClick(page, title, options = {}) {
  await page.locator(`.bases-map-pin[title='${title}']`).evaluate((pin, init) => {
    pin.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: Boolean(init.ctrlKey),
        metaKey: Boolean(init.metaKey),
      }),
    );
  }, options);
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/bases-map-browser-fixture.html",
    viewport: { width: 1280, height: 760 },
    query: { vault: `bases-map-browser-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    const populated = page.locator("[aria-label='Populated map']");
    const empty = page.locator("[aria-label='Empty map']");
    await populated.locator(".bases-map-pin").first().waitFor();

    const pinTitles = await populated.locator(".bases-map-pin").evaluateAll((pins) =>
      pins.map((pin) => pin.getAttribute("title")),
    );
    const sortedTitles = [...pinTitles].sort();
    const expectedTitles = ["London (51.5, -0.1)", "Paris (48.8566, 2.3522)", "Tokyo (35.6762, 139.6503)"];
    if (JSON.stringify(sortedTitles) !== JSON.stringify(expectedTitles)) {
      throw new Error(`Unexpected map pins: ${JSON.stringify(pinTitles)}`);
    }
    if (pinTitles.some((title) => title?.includes("Invalid"))) {
      throw new Error(`Out-of-range coordinate row rendered as a pin: ${JSON.stringify(pinTitles)}`);
    }

    const londonStyle = await populated.locator(".bases-map-pin[title='London (51.5, -0.1)']").evaluate((pin) => ({
      left: pin.style.left,
      top: pin.style.top,
    }));
    if (londonStyle.left !== "49.9722%" || londonStyle.top !== "21.3889%") {
      throw new Error(`London pin projection drifted: ${JSON.stringify(londonStyle)}`);
    }

    const groupHeadings = await populated.locator(".bases-map-group h3").evaluateAll((els) =>
      els.map((el) => el.textContent?.trim()),
    );
    const sortedHeadings = [...groupHeadings].sort();
    if (JSON.stringify(sortedHeadings) !== JSON.stringify(["Asia · 1", "Europe · 2", "Invalid · 0"])) {
      throw new Error(`Unexpected map group headings/counts: ${JSON.stringify(groupHeadings)}`);
    }
    const groupPinCounts = await populated.locator(".bases-map-group").evaluateAll((groups) =>
      Object.fromEntries(
        groups.map((group) => [
          group.querySelector("h3")?.textContent?.trim() ?? "",
          group.querySelectorAll(".bases-map-pin").length,
        ]),
      ),
    );
    const expectedGroupPinCounts = { "Asia · 1": 1, "Europe · 2": 2, "Invalid · 0": 0 };
    if (
      Object.entries(expectedGroupPinCounts).some(
        ([heading, count]) => groupPinCounts[heading] !== count,
      )
    ) {
      throw new Error(`Grouped map planes did not match pin counts: ${JSON.stringify(groupPinCounts)}`);
    }

    const emptyText = await empty.locator(".bases-empty").textContent();
    if (!emptyText || !emptyText.toLowerCase().includes("latitude")) {
      throw new Error(`Empty map did not explain missing coordinates: ${JSON.stringify(emptyText)}`);
    }

    await dispatchPinClick(page, "London (51.5, -0.1)");
    const afterNormalClick = await workspaceSnapshot(page);
    if (afterNormalClick?.activeLeaf?.state?.path !== "Places/London.md" || afterNormalClick.leafCount !== 1) {
      throw new Error(`Normal map pin click did not open London in the current tab: ${JSON.stringify(afterNormalClick)}`);
    }

    await dispatchPinClick(page, "Tokyo (35.6762, 139.6503)", { ctrlKey: true });
    const afterCtrlClick = await workspaceSnapshot(page);
    const openPaths = afterCtrlClick?.leaves?.map((leaf) => leaf.state?.path).sort() ?? [];
    if (
      afterCtrlClick?.activeLeaf?.state?.path !== "Places/Tokyo.md" ||
      afterCtrlClick.leafCount !== 2 ||
      JSON.stringify(openPaths) !== JSON.stringify(["Places/London.md", "Places/Tokyo.md"])
    ) {
      throw new Error(`Ctrl-click map pin did not open Tokyo in a new tab: ${JSON.stringify(afterCtrlClick)}`);
    }

    console.log("Bases map browser verification passed.");
    console.log(`Pins: ${JSON.stringify(sortedTitles)}`);
    console.log(`Groups: ${JSON.stringify(groupHeadings)}`);
    console.log(`Workspace paths after Ctrl-click: ${JSON.stringify(openPaths)}`);
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
