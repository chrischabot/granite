import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

async function assertRendered(page, selector) {
  const result = await page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        fontSize: style.fontSize,
      };
    });
  if (
    result.width <= 0 ||
    result.height <= 0 ||
    result.display === "none" ||
    result.visibility === "hidden" ||
    result.opacity === "0" ||
    result.fontSize === "0px"
  ) {
    throw new Error(`${selector} is not visibly rendered: ${JSON.stringify(result)}`);
  }
  return { selector, ...result };
}

async function captureTheme(page, theme) {
  await page.evaluate((nextTheme) => {
    document.body.classList.toggle("theme-light", nextTheme === "light");
    document.body.classList.toggle("theme-dark", nextTheme === "dark");
  }, theme);
  await page.waitForTimeout(100);
  const screenshot = await page.locator("#renderer-visual-root").screenshot();
  if (screenshot.length < 10_000) {
    throw new Error(`${theme} renderer screenshot too small to be credible: ${screenshot.length}`);
  }
  return {
    theme,
    hash: hash(screenshot),
    background: await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor),
  };
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixtureUrl = `${baseUrl}/scripts/renderer-visual-browser-fixture.html`;
  const { child, output } = startVite(port);
  let browser;

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await page.locator("#renderer-visual-root").waitFor({ state: "visible" });

    const selectors = [
      ".markdown-rendered h1",
      ".cm-host .cm-header-1",
      ".inline-title h1",
      ".is-text-garbled",
      "button.mod-cta",
      "button.mod-warning",
      "button.mod-destructive",
      "button.mod-loading",
      ".clickable-icon.is-active",
      ".is-loading",
      ".loader-spinner",
      ".loader-cube",
      ".progress-bar-container",
      "input[type='search']",
      "textarea",
      "input[type='checkbox']:checked",
      "input[type='radio']:checked",
      "input[type='range']",
      ".multi-select-pill",
      ".flair.mod-pop",
      ".tree-item-self.is-active",
      ".tree-item-self.is-selected",
      ".drag-ghost.mod-leaf",
      ".prompt",
      ".suggestion-container",
      ".modal.mod-settings",
      ".notice.notice-success",
      ".notice.notice-warning",
      ".notice.notice-error",
      ".card.is-selected",
      ".empty-state-container",
      ".titlebar.mod-macos",
      ".release-notes-view .changelog-item.mod-success",
      ".file-recovery-modal",
      ".sync-history-list-item-avatar",
      ".community-modal-details",
      ".community-item-screenshot.mod-unavailable",
      ".graph-view",
      ".graph-controls",
      ".pdf-container",
      ".bases-view",
      ".bases-table-row",
      ".bases-cards-item",
      ".bases-map-pin",
    ];
    const rendered = [];
    for (const selector of selectors) {
      rendered.push(await assertRendered(page, selector));
    }

    const light = await captureTheme(page, "light");
    const dark = await captureTheme(page, "dark");
    if (light.hash === dark.hash || light.background === dark.background) {
      throw new Error(
        `Light/dark renderer captures did not differ: ${JSON.stringify({ light, dark })}`,
      );
    }

    console.log("Renderer visual browser verification passed.");
    console.log(`Rendered selectors: ${rendered.length}`);
    console.log(`Theme captures: ${JSON.stringify({ light, dark })}`);
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
