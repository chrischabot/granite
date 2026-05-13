import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const cwd = process.cwd();

const backgroundControls = [
  { category: "titlebar", label: "Navigate back" },
  { category: "ribbon", label: "Open quick switcher" },
  { category: "ribbon", label: "Open command palette" },
  { category: "ribbon", label: "Open graph view" },
  { category: "ribbon", label: "Create new canvas" },
  { category: "ribbon", label: "Manage vaults" },
  { category: "file explorer", label: "New note" },
  { category: "file explorer", label: "New folder" },
  { category: "file explorer", label: "Sort order" },
  { category: "workspace tab", label: "Close tab" },
  { category: "canvas", label: "Add text node" },
  { category: "canvas", label: "Disable snap to grid" },
  { category: "canvas", label: "Zoom in" },
  { category: "canvas", label: "Zoom out" },
  { category: "canvas", label: "Fit to content" },
];
const modalControls = [
  { category: "vault picker", labelPattern: /^Open icon-a11y-.+-secondary in new window$/ },
  { category: "vault picker", labelPattern: /^Remove icon-a11y-.+-secondary$/ },
];

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
  await page.waitForFunction(() => window.__graniteIconA11yReady === true, null, {
    timeout: 15_000,
  });
  const error = await page.evaluate(() => window.__graniteIconA11yError ?? null);
  if (error) throw new Error(`Fixture failed: ${error}`);
}

async function resolveControl(page, control) {
  if (control.label) {
    const locator = page.locator(`[aria-label="${control.label}"]:not([disabled])`).first();
    if ((await locator.count()) === 0) {
      throw new Error(`Missing enabled ${control.category} control: ${control.label}`);
    }
    return { locator, label: control.label };
  }
  const candidates = await page
    .locator("[aria-label]:not([disabled])")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
  const label = candidates.find((candidate) => control.labelPattern.test(candidate));
  if (!label) {
    throw new Error(
      `Missing enabled ${control.category} control matching ${control.labelPattern}; labels=${candidates.join(" | ")}`,
    );
  }
  return { locator: page.locator(`[aria-label="${label}"]:not([disabled])`).first(), label };
}

async function assertTooltip(page, locator, expected, category) {
  await locator.hover();
  const tooltip = page.getByRole("tooltip", { name: expected });
  await tooltip.waitFor({ timeout: 2_000 });
  const text = (await tooltip.textContent())?.trim();
  if (text !== expected) {
    throw new Error(`${category} tooltip mismatch: expected "${expected}", got "${text}"`);
  }
  await page.mouse.move(4, 4);
  await tooltip.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => {});
}

async function assertFocusRing(page, label, category) {
  let style = null;
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press("Tab");
    const activeLabel = await page.evaluate(() =>
      document.activeElement instanceof HTMLElement
        ? document.activeElement.getAttribute("aria-label")
        : null,
    );
    if (activeLabel !== label) continue;
    style = await page.evaluate(() => {
      const node = document.activeElement;
      if (!(node instanceof HTMLElement)) return null;
      const computed = getComputedStyle(node);
      return {
        active: true,
        focusVisible: node.matches(":focus-visible"),
        boxShadow: computed.boxShadow,
        outlineColor: computed.outlineColor,
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
      };
    });
    break;
  }
  if (!style) {
    throw new Error(`${category} control "${label}" was not reachable by keyboard tab traversal`);
  }
  const hasRing =
    (style.boxShadow && style.boxShadow !== "none") ||
    (style.outlineStyle !== "none" && style.outlineWidth !== "0px");
  if (!style.focusVisible || !hasRing) {
    throw new Error(
      `${category} control "${label}" has no visible focus ring: ${JSON.stringify(style)}`,
    );
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `icon-a11y-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    await waitForFixture(page);
    await page.locator(".workspace-tab-header-inner-close-button").first().waitFor();
    await page.locator(".canvas-toolbar .clickable-icon").first().waitFor();

    for (const control of backgroundControls) {
      const { locator, label } = await resolveControl(page, control);
      const ariaLabel = await locator.getAttribute("aria-label");
      if (ariaLabel !== label) {
        throw new Error(
          `${control.category} control changed accessible name: ${ariaLabel} !== ${label}`,
        );
      }
      await assertTooltip(page, locator, label, control.category);
      await assertFocusRing(page, label, control.category);
    }

    await page.getByRole("button", { name: "Open fixture vault picker" }).click();
    await page.getByRole("dialog", { name: "Manage vaults" }).waitFor();
    for (const control of modalControls) {
      const { locator, label } = await resolveControl(page, control);
      const ariaLabel = await locator.getAttribute("aria-label");
      if (ariaLabel !== label) {
        throw new Error(
          `${control.category} control changed accessible name: ${ariaLabel} !== ${label}`,
        );
      }
      await assertTooltip(page, locator, label, control.category);
      await assertFocusRing(page, label, control.category);
    }

    console.log("Icon accessibility browser verification passed.");
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
