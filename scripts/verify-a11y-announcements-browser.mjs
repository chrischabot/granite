import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const cwd = process.cwd();

async function getOpenPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  if (!address || typeof address === "string") throw new Error("Could not allocate a local port");
  return address.port;
}

async function waitForServer(url, processOutput) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still booting.
    }
    if (processOutput.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready:\n${processOutput.text}`);
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for Vite at ${url}\n${processOutput.text}`);
}

function startVite(port) {
  const output = { text: "", exitCode: null };
  const child = spawn(
    "bunx",
    ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const append = (chunk) => {
    output.text += chunk.toString();
    if (output.text.length > 20_000) output.text = output.text.slice(-20_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code) => {
    output.exitCode = code;
  });
  return { child, output };
}

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteA11yAnnouncementsReady === true, null, {
    timeout: 15_000,
  });
  await page.locator("output[aria-live='polite'][aria-atomic='true']").waitFor();
}

async function liveRegionText(page) {
  return await page.locator("output[aria-live='polite']").textContent();
}

async function waitForLiveRegion(page, expected) {
  await page.waitForFunction(
    (message) => document.querySelector("output[aria-live='polite']")?.textContent === message,
    expected,
  );
  return await liveRegionText(page);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixtureUrl = `${baseUrl}/scripts/a11y-announcements-browser-fixture.html`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.evaluate(() => window.__graniteA11yAnnouncementsOpenTabs());
    const tabAnnouncement = await waitForLiveRegion(page, "Active tab: Projects");
    const tabAnnouncementId = await page.evaluate(
      () => window.__graniteA11yAnnouncementsSnapshot().announcement.id,
    );
    await page.waitForTimeout(50);
    const stableTabSnapshot = await page.evaluate(() => window.__graniteA11yAnnouncementsSnapshot());
    if (stableTabSnapshot.announcement.id !== tabAnnouncementId) {
      throw new Error(`Active tab announcement repeated without another tab change: ${JSON.stringify(stableTabSnapshot)}`);
    }

    await page.evaluate(() => window.__graniteA11yAnnouncementsOpenModal("Settings"));
    const modalAnnouncement = await waitForLiveRegion(page, "Opened dialog: Settings");
    const dialogLabel = await page.locator("dialog").getAttribute("aria-label");
    const focusedAfterModal = await page.evaluate(() => ({
      testId: document.activeElement?.getAttribute("data-testid"),
      ariaLabel: document.activeElement?.getAttribute("aria-label"),
      tagName: document.activeElement?.tagName,
    }));
    if (
      dialogLabel !== "Settings" ||
      (focusedAfterModal.testId !== "modal-first" && focusedAfterModal.ariaLabel !== "Close")
    ) {
      throw new Error(`Modal did not expose/focus an accessible label: label=${dialogLabel}, focus=${focusedAfterModal}`);
    }

    await page.evaluate(() => window.__graniteA11yAnnouncementsCloseModal());
    await page.locator("[data-testid='before-notice']").focus();
    const focusBeforeNotice = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    const expectedNoticeMessages = [
      ["success", "Success: Saved note"],
      ["info", "Info: Sync idle"],
      ["warning", "Warning: Low storage"],
      ["error", "Error: Sync failed"],
    ];
    for (const [kind, expected] of expectedNoticeMessages) {
      await page.evaluate(
        ([noticeKind, message]) =>
          window.__graniteA11yAnnouncementsShowNotice(
            noticeKind,
            message.replace(/^(Success|Info|Warning|Error): /, ""),
          ),
        [kind, expected],
      );
      await waitForLiveRegion(page, expected);
      const alertText = await page.locator(".notice[role='alert']").last().textContent();
      if (!alertText?.includes(expected.replace(/^(Success|Info|Warning|Error): /, ""))) {
        throw new Error(`Notice alert did not render message ${expected}: ${alertText}`);
      }
      const focusAfterNotice = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
      if (focusAfterNotice !== focusBeforeNotice) {
        throw new Error(`Notice stole focus: before=${focusBeforeNotice}, after=${focusAfterNotice}`);
      }
    }

    const finalSnapshot = await page.evaluate(() => window.__graniteA11yAnnouncementsSnapshot());
    console.log("A11y announcements browser verification passed.");
    console.log(`Tab announcement: ${tabAnnouncement}`);
    console.log(`Modal announcement: ${modalAnnouncement}`);
    console.log(`Final announcement: ${finalSnapshot.announcement.message}`);
  } catch (error) {
    const noisyConsole = consoleMessages.filter(
      (message) => !message.includes("Download the React DevTools"),
    );
    if (noisyConsole.length > 0) console.error(noisyConsole.join("\n"));
    throw error;
  } finally {
    if (browser) await browser.close();
    child.kill("SIGTERM");
    await delay(100);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
