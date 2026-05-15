import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

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

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/a11y-announcements-browser-fixture.html",
    viewport: { width: 900, height: 600 },
    body: async ({ page, consoleMessages }) => {
  try {
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
    const noisy = consoleMessages.filter(
      (m) => !m.includes("Download the React DevTools"),
    );
    if (noisy.length > 0) console.error(noisy.join("\n"));
    throw error;
  }
    },
  }),
);
