import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

const isMac = process.platform === "darwin";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteHotkeysBrowserReady === true, null, {
    timeout: 15_000,
  });
  await page.getByRole("dialog", { name: "Settings" }).waitFor();
}

function row(page) {
  return page.locator("div", { hasText: "Verify multi hotkey" }).filter({ hasText: "Verifier" }).last();
}

async function bindingText(page) {
  return await row(page)
    .locator("span")
    .nth(2)
    .textContent()
    .then((text) => text?.trim() ?? "");
}

async function callCount(page) {
  return await page.evaluate(() => window.__graniteHotkeysBrowserCallCount());
}

async function resetCalls(page) {
  await page.evaluate(() => window.__graniteHotkeysBrowserResetCalls());
}

async function addBinding(page, key) {
  await row(page).getByRole("button", { name: "Add" }).click();
  await row(page).locator("span").filter({ hasText: "Press a key" }).waitFor();
  await page.keyboard.press(key);
}

async function pressAndWait(page, key, expectedCount, description) {
  await page.keyboard.press(key);
  await page
    .waitForFunction(
      (count) => window.__graniteHotkeysBrowserCallCount() === count,
      expectedCount,
      { timeout: 1000 },
    )
    .catch(async (error) => {
      throw new Error(
        `${description}: expected ${expectedCount}, got ${await callCount(page)}`,
        { cause: error },
      );
    });
}

async function pressAndStay(page, key, expectedCount, description) {
  await page.keyboard.press(key);
  await delay(150);
  const actual = await callCount(page);
  if (actual !== expectedCount) {
    throw new Error(`${description}: expected ${expectedCount}, got ${actual}`);
  }
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/hotkeys-browser-fixture.html",
    viewport: { width: 1180, height: 820 },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);
    await page.getByRole("button", { name: "Hotkeys" }).click();
    await row(page).waitFor();

    const initial = await bindingText(page);
    if (initial !== "F8") throw new Error(`Expected default binding F8, got "${initial}"`);

    await addBinding(page, "F9");
    await page.waitForFunction(() => document.body.textContent?.includes("F9"));
    if ((await bindingText(page)) !== "F9") {
      throw new Error(`Expected first custom binding to display F9, got "${await bindingText(page)}"`);
    }

    await resetCalls(page);
    await pressAndStay(page, "F8", 0, "default binding fired while custom override was active");
    await pressAndWait(page, "F9", 1, "first custom binding did not fire");

    await addBinding(page, "F10");
    await page.waitForFunction(() => document.body.textContent?.includes("F9, F10"));
    const withTwo = await bindingText(page);
    if (withTwo !== "F9, F10") throw new Error(`Expected two visible custom bindings, got "${withTwo}"`);

    await pressAndWait(page, "F10", 2, "second custom binding did not fire");

    await row(page).getByRole("button", { name: "Remove" }).click();
    await page.waitForFunction(() => document.body.textContent?.includes("F9"));
    const afterRemove = await bindingText(page);
    if (afterRemove !== "F9") {
      throw new Error(`Expected removing latest binding to leave F9 active, got "${afterRemove}"`);
    }
    await resetCalls(page);
    await pressAndWait(page, "F9", 1, "older custom binding did not remain active after removing latest");
    await pressAndStay(page, "F10", 1, "removed custom binding still fired");

    await row(page).getByRole("button", { name: "Reset" }).click();
    await page.waitForFunction(() => document.body.textContent?.includes("F8"));
    const afterReset = await bindingText(page);
    if (afterReset !== "F8") throw new Error(`Expected Reset to restore F8, got "${afterReset}"`);
    await resetCalls(page);
    await pressAndWait(page, "F8", 1, "default binding did not fire after reset");
    await pressAndStay(page, "F9", 1, "custom binding still fired after reset");

    await addBinding(page, "KeyQ");
    const qBinding = await bindingText(page);
    if (qBinding !== "Q") {
      throw new Error(`Expected physical KeyQ capture to display the US label Q, got "${qBinding}"`);
    }
    await resetCalls(page);
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "A", code: "KeyQ", bubbles: true }),
      );
    });
    await page.waitForFunction(() => window.__graniteHotkeysBrowserCallCount() === 1);
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Q", code: "KeyA", bubbles: true }),
      );
    });
    await delay(150);
    if ((await callCount(page)) !== 1) {
      throw new Error("Physical-key binding fired from the wrong physical letter slot");
    }

    await row(page).getByRole("button", { name: "Reset" }).click();
    await addBinding(page, "Backquote");
    const backquoteBinding = await bindingText(page);
    if (backquoteBinding !== "`") {
      throw new Error(
        `Expected physical Backquote capture to display the US label \`, got "${backquoteBinding}"`,
      );
    }
    await resetCalls(page);
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "²", code: "Backquote", bubbles: true }),
      );
    });
    await page.waitForFunction(() => window.__graniteHotkeysBrowserCallCount() === 1);

    await row(page).getByRole("button", { name: "Reset" }).click();
    await addBinding(page, "ArrowDown");
    const arrowBinding = await bindingText(page);
    if (arrowBinding !== "ArrowDown") {
      throw new Error(`Expected semantic key ArrowDown to stay semantic, got "${arrowBinding}"`);
    }

    console.log("Hotkeys browser verification passed.");
    console.log(`Initial binding: ${initial}`);
    console.log(`Two bindings: ${withTwo}`);
    console.log(`After remove: ${afterRemove}`);
    console.log(`After reset: ${afterReset}`);
    console.log(`Physical KeyQ display: ${qBinding}`);
    console.log(`Physical Backquote display: ${backquoteBinding}`);
    console.log(`Semantic ArrowDown display: ${arrowBinding}`);
    console.log(`Platform modifier display: ${isMac ? "macOS symbols" : "Ctrl/Alt text"}`);
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
