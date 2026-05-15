import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function vimState(page) {
  return await page.evaluate(() => window.__graniteVimModeState());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteVimModeReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteVimModeState?.() ?? null);
    throw new Error(
      `Timed out waiting for Vim fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteVimModeError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Vim fixture ready").waitFor();
  await page.locator(".cm-editor").waitFor();
}

async function waitForDiskText(page, expected) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await vimState(page);
    if (last.diskText === expected) return last;
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for disk text ${JSON.stringify(expected)}; last=${JSON.stringify(last)}`,
  );
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/vim-mode-browser-fixture.html",
    viewport: { width: 1100, height: 760 },
    query: { vault: `vim-mode-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    await page.getByRole("button", { name: "Editor" }).click();
    await page
      .locator(".setting-item")
      .filter({ hasText: "Key bindings" })
      .locator("select")
      .selectOption("vim");
    await page.waitForFunction(() =>
      window.__graniteVimModeState().then((s) => s.editorKeymap === "vim"),
    );
    await page.evaluate(() => window.__graniteVimModeCloseSettings());
    await page.getByRole("dialog", { name: "Settings" }).waitFor({ state: "detached" });

    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("g");
    await page.keyboard.press("g");
    await page.keyboard.press("0");
    await page.keyboard.press("i");
    await page.keyboard.type("vim ");
    await delay(100);
    await page.keyboard.press("Escape");
    await delay(100);

    const inserted = "vim alpha\nbeta\n";
    await waitForDiskText(page, inserted);

    await page.keyboard.press("h");
    await page.keyboard.press("j");
    await page.keyboard.press("k");
    await page.keyboard.press("l");
    await delay(750);
    const afterNavigation = await vimState(page);
    if (afterNavigation.diskText !== inserted) {
      throw new Error(
        `Vim normal-mode navigation mutated text: ${JSON.stringify(afterNavigation.diskText)}`,
      );
    }
    if (afterNavigation.editorText.includes("hjkl")) {
      throw new Error(
        `Vim normal-mode navigation was inserted into editor: ${afterNavigation.editorText}`,
      );
    }

    console.log("Vim mode browser verification passed.");
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
