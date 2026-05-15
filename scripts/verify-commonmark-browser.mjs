import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteCommonMarkBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteCommonMarkBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".markdown-rendered").waitFor();
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/commonmark-browser-fixture.html",
    viewport: { width: 1000, height: 760 },
    query: { vault: `commonmark-browser-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForFixture(page);
        const commonmark = await page.evaluate(() => window.__graniteCommonMarkBrowserResult);
        const failures = commonmark.filter((item) => item.actual !== item.expected);
        if (failures.length > 0) {
          throw new Error(
            `CommonMark browser examples failed: ${JSON.stringify(failures.slice(0, 3))}`,
          );
        }
        await page.locator("a.internal-link", { hasText: "Linked Note" }).waitFor();
        await page.locator(".tag", { hasText: "#project/tag" }).waitFor();
        await page.locator(".callout[data-callout='warning']").waitFor();
        await page.locator("table").waitFor();
        await page
          .locator(".task-list-item[data-task='?'] .task-list-item-checkbox[data-checked='?']")
          .waitFor();
        console.log("CommonMark browser verification passed.");
        console.log(
          `Examples: ${commonmark.map((item) => `${item.example}:${item.section}`).join(", ")}`,
        );
      } catch (error) {
        const noisy = consoleMessages.filter(
          (message) => !message.includes("Download the React DevTools"),
        );
        if (noisy.length > 0) console.error(noisy.join("\n"));
        throw error;
      }
    },
  }),
);
