import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteSidebarCentralReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteSidebarCentralError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.waitForSelector(".workspace");
}

async function activeTabs(page, sideSelector) {
  return await page.evaluate((selector) => {
    return [...document.querySelectorAll(`${selector} .workspace-sidebar-content`)].map(
      (el) => el.getAttribute("data-active-tab") ?? "",
    );
  }, sideSelector);
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/sidebar-central-browser-fixture.html",
    viewport: { width: 1360, height: 860 },
    query: { vault: `sidebar-groups-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForFixture(page);

        await page.getByRole("button", { name: "Split Files sidebar group" }).click();
        await page.getByRole("button", { name: "Split Files sidebar group" }).first().click();
        const leftGroups = page.locator(".mod-left-split .workspace-sidebar-group");
        await leftGroups.nth(2).waitFor();

        await leftGroups.nth(0).getByRole("button", { name: "Search" }).click();
        await leftGroups.nth(1).getByRole("button", { name: "Bookmarks" }).click();
        await leftGroups.nth(2).getByRole("button", { name: "Tags" }).click();
        const leftActive = await activeTabs(page, ".mod-left-split");
        if (leftActive.join(",") !== "search,bookmarks,tags") {
          throw new Error(`Left sidebar groups were not independent: ${leftActive.join(",")}`);
        }
        await leftGroups.nth(0).locator(".search-pane input[type='search']").waitFor();
        await leftGroups
          .nth(1)
          .locator(".bookmarks-pane, .workspace-sidedock-empty-state")
          .waitFor();
        await leftGroups.nth(2).locator(".tag-container, .workspace-sidedock-empty-state").waitFor();

        await page.getByRole("button", { name: "Split Outline sidebar group" }).click();
        const rightGroups = page.locator(".mod-right-split .workspace-sidebar-group");
        await rightGroups.nth(1).waitFor();
        await rightGroups.nth(1).getByRole("button", { name: "Recent files" }).click();
        await page.getByRole("button", { name: "Close Outline sidebar group" }).click();
        await rightGroups.nth(1).waitFor({ state: "detached" });
        const rightActive = await activeTabs(page, ".mod-right-split");
        if (rightActive.join(",") !== "recents") {
          throw new Error(
            `Right sidebar close did not preserve remaining active tab: ${rightActive.join(",")}`,
          );
        }

        for (const label of [
          "Split Search sidebar group",
          "Close Search sidebar group",
          "Split Bookmarks sidebar group",
          "Close Bookmarks sidebar group",
          "Split Tags sidebar group",
          "Close Tags sidebar group",
          "Split Recent files sidebar group",
        ]) {
          if ((await page.getByRole("button", { name: label }).count()) === 0) {
            throw new Error(`Missing accessible sidebar group control: ${label}`);
          }
        }

        console.log("Sidebar groups browser verification passed.");
        console.log(`Left groups: ${leftActive.join(", ")}`);
        console.log(`Right groups after close: ${rightActive.join(", ")}`);
      } catch (error) {
        if (consoleMessages.length > 0) console.error(consoleMessages.join("\n"));
        throw error;
      }
    },
  }),
);
