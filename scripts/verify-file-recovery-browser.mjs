import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

const NEWER = "# Note\n\nrestored line\nkeep line\nextra recovered line\n";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteFileRecoveryBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteFileRecoveryBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".file-recovery-modal").waitFor();
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/file-recovery-browser-fixture.html",
    viewport: { width: 1100, height: 720 },
    query: { vault: `file-recovery-browser-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    await page.locator(".modal-title").filter({ hasText: "File recovery" }).waitFor({
      state: "attached",
    });
    await page.locator(".file-recovery-list[aria-label='Recovery snapshots']").waitFor();
    await page.locator("#file-recovery-filter").waitFor();
    const placeholder = await page.locator("#file-recovery-filter").getAttribute("placeholder");
    if (placeholder !== "Note.md") {
      throw new Error(`File Recovery filter did not show current filename placeholder: ${placeholder}`);
    }

    const snapshots = page.locator(".file-recovery-list-item-header");
    if ((await snapshots.count()) !== 2) {
      throw new Error(`Expected two recovery snapshots, found ${await snapshots.count()}`);
    }
    const activeText = await page.locator(".file-recovery-list-item-header.is-active").textContent();
    if (!activeText?.includes(`${NEWER.length} bytes`)) {
      throw new Error(`Newest snapshot was not selected first: ${activeText}`);
    }

    const preview = page.locator(".file-recovery-text");
    const diffValue = await preview.inputValue();
    for (const expected of ["- current line", "+ restored line", "+ extra recovered line"]) {
      if (!diffValue.includes(expected)) throw new Error(`Diff preview missing ${expected}: ${diffValue}`);
    }

    await page.locator(".file-recovery-toggle input[type='checkbox']").click();
    const rawValue = await preview.inputValue();
    if (rawValue !== NEWER) {
      throw new Error(`Raw snapshot preview did not match selected snapshot:\n${rawValue}`);
    }

    await page.getByRole("button", { name: "Copy" }).click();
    const copiedText = await page.evaluate(() => window.__graniteFileRecoveryBrowserCopiedText());
    if (copiedText !== NEWER) {
      throw new Error(`Copy did not write selected snapshot to clipboard stub:\n${copiedText}`);
    }
    await page.locator(".notice").filter({ hasText: "Snapshot copied." }).waitFor();

    await page.getByRole("button", { name: "Restore" }).click();
    await page.locator(".file-recovery-modal").waitFor({ state: "detached" });
    const restored = await page.evaluate(() => window.__graniteFileRecoveryBrowserReadNote());
    if (restored !== NEWER) {
      throw new Error(`Restore did not write selected snapshot to disk:\n${restored}`);
    }

    await page.evaluate(() => window.__graniteFileRecoveryBrowserReopen());
    await page.locator(".file-recovery-modal").waitFor();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Clear" }).click();
    await page.locator(".file-recovery-list-empty").filter({ hasText: "No snapshots found." }).waitFor();
    const snapshotCount = await page.evaluate(() => window.__graniteFileRecoveryBrowserSnapshotCount());
    if (snapshotCount !== 0) {
      throw new Error(`Clear left snapshots behind: ${snapshotCount}`);
    }
    await page.locator(".notice").filter({ hasText: "Recovery snapshots cleared." }).waitFor();

    console.log("File recovery browser verification passed.");
    console.log(`Restored bytes: ${restored.length}`);
    console.log(`Snapshot count after clear: ${snapshotCount}`);
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
