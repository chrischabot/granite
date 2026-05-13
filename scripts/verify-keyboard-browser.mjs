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

async function activeSummary(page) {
  return await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return "none";
    return [
      el.tagName.toLowerCase(),
      el.getAttribute("aria-label") ?? "",
      el.getAttribute("placeholder") ?? "",
      el.textContent?.trim().slice(0, 60) ?? "",
      el.className,
    ]
      .filter(Boolean)
      .join(" | ");
  });
}

async function assertFocusInside(page, selector, label) {
  const inside = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    return !!root && !!document.activeElement && root.contains(document.activeElement);
  }, selector);
  if (!inside) throw new Error(`Focus escaped ${label}; active=${await activeSummary(page)}`);
}

async function openDialogWithKeyboard(page, controlLabel, dialogName, label, tabCount = 8) {
  const control = page.locator(`[aria-label="${controlLabel}"]`).first();
  const count = await control.count();
  if (count === 0) throw new Error(`Missing keyboard-reachable control: ${controlLabel}`);
  await control.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: dialogName });
  await dialog.waitFor({ state: "visible" });
  await assertFocusInside(page, "dialog[open]", `${label} on open`);
  for (let i = 0; i < tabCount; i++) {
    await page.keyboard.press("Tab");
    await assertFocusInside(page, "dialog[open]", `${label} tab trap`);
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(baseUrl, output);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await context.newPage();
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".app-container");

    for (const label of [
      "Navigate back",
      "Navigate forward",
      "New tab",
      "Open quick switcher",
      "Open command palette",
      "Manage vaults",
      "Open help",
      "Open settings",
    ]) {
      const count = await page.locator(`[aria-label="${label}"]`).count();
      if (count === 0) throw new Error(`Missing keyboard-reachable control: ${label}`);
    }

    const tabTrace = [];
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press("Tab");
      tabTrace.push(await activeSummary(page));
    }
    const distinctFocusTargets = new Set(tabTrace.filter((item) => !item.startsWith("body")));
    if (distinctFocusTargets.size < 6) {
      throw new Error(`Tab traversal reached too few targets:\n${tabTrace.join("\n")}`);
    }

    await openDialogWithKeyboard(
      page,
      "Manage vaults",
      "Manage vaults",
      "Vault picker dialog",
      10,
    );
    await openDialogWithKeyboard(
      page,
      "Open help",
      "Granite cheat-sheet",
      "Help dialog",
      10,
    );
    await openDialogWithKeyboard(
      page,
      "Open settings",
      "Settings",
      "Settings dialog",
      12,
    );

    const paletteButton = page.locator('[aria-label="Open command palette"]').first();
    await paletteButton.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector(".prompt");
    await assertFocusInside(page, ".prompt", "Command palette on open");
    const input = page.locator(".prompt-input");
    const before = await input.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    const after = await input.getAttribute("aria-activedescendant");
    if (before === after) {
      throw new Error(`Command palette ArrowDown did not move active descendant (${before})`);
    }
    await page.keyboard.press("Escape");
    await page.waitForSelector(".prompt", { state: "hidden" });

    console.log("Keyboard browser audit passed.");
    console.log(`Distinct tab targets: ${distinctFocusTargets.size}`);
    console.log(tabTrace.map((item, i) => `${i + 1}. ${item}`).join("\n"));
  } catch (error) {
    if (consoleMessages.length > 0) {
      console.error(consoleMessages.join("\n"));
    }
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
