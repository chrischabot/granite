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
      el.getAttribute("role") ?? "",
      el.getAttribute("placeholder") ?? "",
      el.textContent?.trim().slice(0, 80) ?? "",
      el.className,
    ]
      .filter(Boolean)
      .join(" | ");
  });
}

async function focusByName(page, label) {
  const locator = page.locator(`[aria-label="${label}"]:not([disabled])`).first();
  if ((await locator.count()) === 0) {
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-label]")]
        .map((el) => el.getAttribute("aria-label"))
        .filter(Boolean)
        .slice(0, 80),
    );
    throw new Error(`Missing enabled control: ${label}; labels=${labels.join(", ")}`);
  }
  await locator.focus();
  return locator;
}

async function waitForFocusedText(page, expected, label) {
  try {
    await page.waitForFunction(
      (text) => document.activeElement?.textContent?.trim().includes(text),
      expected,
      { timeout: 2_000 },
    );
  } catch (error) {
    throw new Error(
      `${label} did not focus ${expected}; active=${await activeSummary(page)}; cause=${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const focusedText = await page.evaluate(() => document.activeElement?.textContent?.trim());
  if (!focusedText?.includes(expected)) {
    throw new Error(`${label} did not focus ${expected}: ${focusedText}`);
  }
}

async function assertKeyboardFocusRing(page, label) {
  for (let i = 0; i < 160; i++) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate((expected) => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement)) return null;
      if (el.getAttribute("aria-label") !== expected) return null;
      const computed = getComputedStyle(el);
      return {
        focusVisible: el.matches(":focus-visible"),
        boxShadow: computed.boxShadow,
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
      };
    }, label);
    if (!state) continue;
    const hasRing =
      (state.boxShadow && state.boxShadow !== "none") ||
      (state.outlineStyle !== "none" && state.outlineWidth !== "0px");
    if (!state.focusVisible || !hasRing) {
      throw new Error(`Keyboard focus ring missing for ${label}: ${JSON.stringify(state)}`);
    }
    return;
  }
  throw new Error(`Could not reach ${label} by Tab traversal; active=${await activeSummary(page)}`);
}

async function tabUntilMarkdownEditor(page) {
  for (let i = 0; i < 180; i++) {
    await page.keyboard.press("Tab");
    const matched = await page.evaluate(
      () =>
        document.activeElement instanceof HTMLElement &&
        document.activeElement.classList.contains("cm-content"),
    );
    if (matched) return;
  }
  throw new Error(`Could not tab to Markdown editor; active=${await activeSummary(page)}`);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `keyboard-populated-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/icon-a11y-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 920 } });
    const page = await context.newPage();
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__graniteIconA11yReady === true, null, {
      timeout: 15_000,
    });

    const tabs = page.locator('[role="tab"]');
    await tabs.first().focus();
    await page.keyboard.press("End");
    await waitForFocusedText(page, "B", "Workspace tab End key");
    await page.keyboard.press("Home");
    await waitForFocusedText(page, "A", "Workspace tab Home key");

    const fileRow = page
      .locator('[aria-label="File explorer"]')
      .getByRole("button", { name: /^A$/ })
      .first();
    await fileRow.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".workspace-tab-header-inner-title")].some(
        (node) => node.textContent?.trim() === "A",
      ),
    );

    await tabUntilMarkdownEditor(page);
    await page.keyboard.type(" keyboard");
    const editorText = await page.locator(".cm-content").first().textContent();
    if (!editorText?.includes("keyboard")) {
      throw new Error(`Markdown editor did not accept keyboard input: ${editorText}`);
    }

    await focusByName(page, "Sort order");
    await page.keyboard.press("Enter");
    await page.getByRole("menu").waitFor();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(" ");
    await page.getByRole("menu").waitFor({ state: "hidden" });

    await focusByName(page, "Hide graph controls");
    await page.keyboard.press("Enter");
    await page.locator(".graph-controls").waitFor({ state: "hidden" });
    await focusByName(page, "Show graph controls");
    await page.keyboard.press("Enter");
    await page.locator(".graph-controls").waitFor();
    await focusByName(page, "Close controls");
    await page.keyboard.press("Enter");
    await page.locator(".graph-controls").waitFor({ state: "hidden" });

    await focusByName(page, "Disable snap to grid");
    await page.keyboard.press("Enter");
    await page.locator('[aria-label="Enable snap to grid"]').waitFor();
    await focusByName(page, "Enable snap to grid");
    await page.keyboard.press("Enter");
    await page.locator('[aria-label="Disable snap to grid"]').waitFor();

    await focusByName(page, "Show fixture notice");
    await page.keyboard.press("Enter");
    await page.getByRole("alert").waitFor();
    await focusByName(page, "Dismiss");
    await page.keyboard.press("Enter");
    await page.getByRole("alert").waitFor({ state: "hidden" });

    for (const label of [
      "New tab",
      "New note",
      "Sort order",
      "Show graph controls",
      "Disable snap to grid",
      "Show fixture notice",
    ]) {
      await assertKeyboardFocusRing(page, label);
    }

    console.log("Populated keyboard browser verification passed.");
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
