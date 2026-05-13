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
  await page.waitForFunction(() => window.__graniteRtlBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteRtlBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("[aria-label='RTL reading'] .markdown-rendered").waitFor();
  await page.locator("[aria-label='Canvas'] .canvas-view").waitFor();
}

async function computed(page, selector) {
  return await page.locator(selector).evaluate((el) => {
    const styles = getComputedStyle(el);
    return {
      direction: styles.direction,
      unicodeBidi: styles.unicodeBidi,
    };
  });
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `rtl-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/rtl-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    const rootDir = await page.evaluate(() => document.documentElement.dir);
    const bodyClasses = await page.evaluate(() => [...document.body.classList]);
    if (rootDir !== "rtl" || !bodyClasses.includes("mod-rtl") || !bodyClasses.includes("is-rtl")) {
      throw new Error(
        `Locale switch did not apply RTL chrome state: dir=${rootDir}, body=${bodyClasses.join(" ")}`,
      );
    }

    await page.evaluate(() => window.__graniteRtlBrowserOpenMenu());
    await page.locator(".menu").waitFor();

    const chrome = {
      modal: await computed(page, ".modal.mod-settings"),
      menu: await computed(page, ".menu"),
      status: await computed(page, ".status-bar"),
      tab: await computed(page, ".workspace-tab-header-container"),
      canvas: await computed(page, "[aria-label='Canvas'] .canvas-view"),
    };
    for (const [name, value] of Object.entries(chrome)) {
      const expected = name === "canvas" ? "ltr" : "rtl";
      if (value.direction !== expected) {
        throw new Error(`Expected ${name} direction ${expected}, got ${JSON.stringify(value)}`);
      }
    }

    try {
      await page.locator("input[type='date']").waitFor({ state: "attached" });
      await page.locator("input[type='datetime-local']").waitFor({ state: "attached" });
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        workspace: window.__graniteRtlBrowserWorkspace?.(),
        metadata: window.__graniteRtlBrowserMetadata?.(),
        propertiesText: document.querySelector("[aria-label='Properties']")?.textContent,
        propertiesHtml: document.querySelector("[aria-label='Properties']")?.innerHTML,
      }));
      throw new Error(
        `Properties date inputs were not attached: ${error instanceof Error ? error.message : String(error)}\n${JSON.stringify(diagnostics, null, 2)}`,
      );
    }
    const dateLangs = await page.evaluate(() => ({
      date: document.querySelector("input[type='date']")?.getAttribute("lang"),
      datetime: document.querySelector("input[type='datetime-local']")?.getAttribute("lang"),
    }));
    if (dateLangs.date !== "he" || dateLangs.datetime !== "he") {
      throw new Error(
        `Properties date inputs did not receive Hebrew lang: ${JSON.stringify(dateLangs)}`,
      );
    }

    const noteDirection = {
      rtlReading: await computed(page, "[aria-label='RTL reading'] .markdown-rendered"),
      ltrReading: await computed(page, "[aria-label='LTR reading'] .markdown-rendered"),
      rtlSource: await computed(page, "[aria-label='RTL source'] .markdown-source-view"),
      ltrSource: await computed(page, "[aria-label='LTR source'] .markdown-source-view"),
      rtlSourceContent: await computed(page, "[aria-label='RTL source'] .cm-content"),
    };
    if (
      noteDirection.rtlReading.direction !== "rtl" ||
      noteDirection.rtlReading.unicodeBidi !== "plaintext" ||
      noteDirection.ltrReading.direction !== "ltr" ||
      noteDirection.ltrReading.unicodeBidi !== "plaintext" ||
      noteDirection.rtlSource.direction !== "rtl" ||
      noteDirection.rtlSourceContent.unicodeBidi !== "plaintext" ||
      noteDirection.ltrSource.direction !== "ltr"
    ) {
      throw new Error(
        `Unexpected note direction/plaintext behavior: ${JSON.stringify(noteDirection)}`,
      );
    }
    const classState = await page.evaluate(() => ({
      rtlReading: document.querySelector("[aria-label='RTL reading'] .markdown-rendered")
        ?.className,
      ltrReading: document.querySelector("[aria-label='LTR reading'] .markdown-rendered")
        ?.className,
      rtlSource: document.querySelector("[aria-label='RTL source'] .markdown-source-view")
        ?.className,
      ltrSource: document.querySelector("[aria-label='LTR source'] .markdown-source-view")
        ?.className,
    }));
    if (
      !String(classState.rtlReading).includes("rtl") ||
      String(classState.ltrReading).includes("rtl") ||
      !String(classState.ltrReading).includes("ltr") ||
      !String(classState.rtlSource).includes("rtl") ||
      String(classState.ltrSource).includes("rtl") ||
      !String(classState.ltrSource).includes("ltr")
    ) {
      throw new Error(`Per-note dir classes did not stay scoped: ${JSON.stringify(classState)}`);
    }

    console.log("RTL browser verification passed.");
    console.log(`Chrome directions: ${JSON.stringify(chrome)}`);
    console.log(`Date input langs: ${JSON.stringify(dateLangs)}`);
    console.log(`Note classes: ${JSON.stringify(classState)}`);
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
