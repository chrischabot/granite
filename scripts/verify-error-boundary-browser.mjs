import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteErrorBoundaryReady === true, null, {
    timeout: 15_000,
  });
  await page.locator("text=Workspace survived").waitFor();
}

async function verifyAlert(page, { source, message, componentStack = false }) {
  const alert = page.locator("[role='alert']");
  await alert.waitFor();
  const text = await alert.textContent();
  if (!text?.includes(`Granite hit an error (${source})`) || !text.includes(message)) {
    throw new Error(`Error boundary alert mismatch for ${source}/${message}: ${text}`);
  }
  await page.getByRole("button", { name: "Reload Granite" }).waitFor();
  await page.getByRole("button", { name: "Dismiss" }).waitFor();
  if (componentStack) {
    await page.locator("summary").filter({ hasText: "Component stack" }).click();
    const stackText = await page.locator("details pre").textContent();
    if (!stackText?.includes("BrokenRender")) {
      throw new Error(`React component stack did not include BrokenRender: ${stackText}`);
    }
  }
}

async function dismiss(page) {
  await page.evaluate(() => window.__graniteErrorBoundaryRecoverRender?.());
  await page.getByRole("button", { name: "Dismiss" }).click();
  await page.locator("[role='alert']").waitFor({ state: "detached" });
  await page.locator("text=Workspace survived").waitFor();
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/error-boundary-browser-fixture.html",
    viewport: { width: 900, height: 640 },
    body: async ({ page, consoleMessages }) => {
      try {
        await waitForFixture(page);
        await page.evaluate(() => window.__graniteErrorBoundaryCrashRender());
        await verifyAlert(page, {
          source: "react",
          message: "Render exploded",
          componentStack: true,
        });
        await dismiss(page);
        await page.evaluate(() => window.__graniteErrorBoundaryRejectPromise());
        await verifyAlert(page, { source: "promise", message: "Async promise exploded" });
        await dismiss(page);
        await page.evaluate(() => window.__graniteErrorBoundaryFailEffect());
        await verifyAlert(page, { source: "effect", message: "Effect exploded" });
        console.log("Error boundary browser verification passed.");
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
