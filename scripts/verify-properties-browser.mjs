import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/properties-browser-fixture.html",
    contextOptions: { locale: "en-GB", timezoneId: "Europe/London" },
    body: async ({ page, consoleMessages }) => {
      const result = await page.evaluate(() => window.__granitePropertiesBrowserResult);
      if (!result?.ok) {
        throw new Error(
          `Properties browser verification failed:\n${JSON.stringify(result, null, 2)}\n${consoleMessages.join("\n")}`,
        );
      }
      console.log("Properties browser verification passed.");
      console.log(`Reading strip: ${result.stripText.replace(/\s+/g, " ").trim()}`);
    },
  }),
);
