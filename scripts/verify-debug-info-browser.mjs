import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteDebugInfoReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteDebugInfoError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Debug fixture ready").waitFor();
}

function assertSupportDump(text, secret, label) {
  const required = [
    "Granite debug info",
    "Version:",
    "Platform:",
    "User agent:",
    "Vault root:",
    "Files: 3",
    "Markdown files: 2",
    "Vault size:",
    "Workspace: 1 groups, 1 leaves",
    "Commands:",
    "Tags:",
    "Properties:",
    "Plugins:",
  ];
  for (const fragment of required) {
    if (!text.includes(fragment)) {
      throw new Error(`${label} missing ${JSON.stringify(fragment)}:\n${text}`);
    }
  }
  if (text.includes(secret)) throw new Error(`${label} leaked note body secret:\n${text}`);
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/debug-info-browser-fixture.html",
    viewport: { width: 1100, height: 760 },
    query: { vault: `debug-info-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForFixture(page);
        await page.getByRole("button", { name: "Open command palette" }).click();
        await page.locator(".prompt-input").fill("Show debug info");
        await page.getByRole("option", { name: /Show debug info/ }).click();

        const alert = page.getByRole("alert").filter({ hasText: "Granite debug info" });
        await alert.waitFor();
        const noticeText = (await alert.textContent()) ?? "";
        const clipboardText = await page.evaluate(() => window.__graniteDebugInfoClipboard());
        const secret = await page.evaluate(() => window.__graniteDebugInfoSecret);

        assertSupportDump(noticeText, secret, "visible sticky notice");
        assertSupportDump(clipboardText, secret, "clipboard support dump");
        if (noticeText !== clipboardText) {
          throw new Error(
            `Clipboard and visible notice diverged:\nNOTICE:\n${noticeText}\n\nCLIPBOARD:\n${clipboardText}`,
          );
        }
        await page.getByRole("button", { name: "Dismiss" }).waitFor();
        console.log("Debug info browser verification passed.");
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
