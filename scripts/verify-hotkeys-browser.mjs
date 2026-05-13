import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const cwd = process.cwd();
const isMac = process.platform === "darwin";

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

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixtureUrl = `${baseUrl}/scripts/hotkeys-browser-fixture.html`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
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
