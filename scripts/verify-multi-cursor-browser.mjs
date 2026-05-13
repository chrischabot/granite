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

async function multiCursorState(page) {
  return await page.evaluate(() => window.__graniteMultiCursorState());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteMultiCursorReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteMultiCursorState?.() ?? null);
    throw new Error(
      `Timed out waiting for multi-cursor fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteMultiCursorError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Multi-cursor fixture ready").waitFor();
  await page.locator(".cm-editor").waitFor();
}

async function waitForDiskText(page, expected) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await multiCursorState(page);
    if (last.diskText === expected) return last;
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for disk text ${JSON.stringify(expected)}; last=${JSON.stringify(last)}`,
  );
}

async function linePoint(page, lineIndex, column) {
  return await page.evaluate(
    ({ lineIndex: index, column: col }) => {
      const line = document.querySelectorAll(".cm-line")[index];
      if (!(line instanceof HTMLElement)) {
        throw new Error(`Missing editor line ${index}`);
      }
      const rect = line.getBoundingClientRect();
      const style = getComputedStyle(document.querySelector(".cm-content"));
      const fontSize = Number.parseFloat(style.fontSize || "16");
      const width = fontSize * 0.62;
      return {
        x: rect.left + 2 + width * col,
        y: rect.top + rect.height / 2,
      };
    },
    { lineIndex, column },
  );
}

async function clickLine(page, lineIndex, column, options = {}) {
  const point = await linePoint(page, lineIndex, column);
  if (options.alt) await page.keyboard.down("Alt");
  if (options.shift) await page.keyboard.down("Shift");
  await page.mouse.click(point.x, point.y);
  if (options.shift) await page.keyboard.up("Shift");
  if (options.alt) await page.keyboard.up("Alt");
}

async function rectangularDrag(page, startLine, startColumn, endLine, endColumn) {
  const start = await linePoint(page, startLine, startColumn);
  const end = await linePoint(page, endLine, endColumn);
  await page.keyboard.down("Alt");
  await page.keyboard.down("Shift");
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
}

async function resetNote(page, text) {
  await page.evaluate((nextText) => window.__graniteMultiCursorReset(nextText), text);
  await page.locator(".cm-editor").waitFor();
  await delay(100);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `multi-cursor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/multi-cursor-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await clickLine(page, 0, 0);
    await clickLine(page, 1, 0, { alt: true });
    await page.keyboard.type("X");
    await waitForDiskText(page, "Xone\nXtwo\nthree\n");

    await resetNote(page, "aaaa\nbbbb\ncccc\n");
    await rectangularDrag(page, 0, 1, 2, 3);
    await page.keyboard.type("Z");
    await waitForDiskText(page, "aZa\nbZb\ncZc\n");

    console.log("Multi-cursor browser verification passed.");
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
