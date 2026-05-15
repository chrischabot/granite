import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteTagsBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteTagsBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".tag-container").waitFor();
}

function tagButton(page, name) {
  return page
    .locator(".tag-pane-tag-button")
    .filter({ has: page.locator(".tag-pane-tag-text").getByText(name, { exact: true }) })
    .first();
}

async function waitForSearchValue(page, expected) {
  await page.waitForFunction(
    (value) => document.querySelector(".search-pane input[type='search']")?.value === value,
    expected,
  );
  return await page.locator(".search-pane input[type='search']").inputValue();
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/tags-browser-fixture.html",
    viewport: { width: 1120, height: 720 },
    query: { vault: `tags-browser-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForFixture(page);
        await page.evaluate(() => window.__graniteTagsBrowserSetNested(true));
        await tagButton(page, "work").waitFor();
        await tagButton(page, "client").waitFor();

        const nestedToggle = page.locator(".tag-pane-options input[type='checkbox']");
        if (!(await nestedToggle.isChecked())) {
          throw new Error("Expected Show nested tags to start enabled");
        }
        await nestedToggle.click();
        await tagButton(page, "work/client").waitFor();
        if ((await tagButton(page, "client").count()) !== 0) {
          throw new Error("Nested child tag remained visible after disabling nested tags");
        }

        await page.reload({ waitUntil: "networkidle" });
        await waitForFixture(page);
        if (await page.locator(".tag-pane-options input[type='checkbox']").isChecked()) {
          throw new Error("Show nested tags did not persist as disabled after reload");
        }
        await tagButton(page, "work/client").click();
        const flatQuery = await waitForSearchValue(page, "tag:work/client");

        await page.locator(".tag-pane-options input[type='checkbox']").click();
        await tagButton(page, "client").waitFor();
        await tagButton(page, "client").click();
        const nestedQuery = await waitForSearchValue(page, "tag:work/client");

        console.log("Tags browser verification passed.");
        console.log(`Flat query: ${flatQuery}`);
        console.log(`Nested query: ${nestedQuery}`);
      } catch (error) {
        if (consoleMessages.length > 0) console.error(consoleMessages.join("\n"));
        throw error;
      }
    },
  }),
);
