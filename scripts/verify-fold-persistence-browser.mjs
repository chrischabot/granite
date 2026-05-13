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
  try {
    await page.waitForFunction(() => window.__graniteFoldPersistenceReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteFoldPersistenceState?.() ?? null);
    throw new Error(
      `Timed out waiting for fold fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteFoldPersistenceError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Fold fixture ready").waitFor();
  await page.locator(".cm-editor").waitFor();
}

async function foldState(page) {
  return await page.evaluate(() => window.__graniteFoldPersistenceState());
}

async function waitForFoldCount(page, count) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await foldState(page);
    if (last.folds.length === count) return last;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${count} fold ranges; last=${JSON.stringify(last)}`);
}

async function clickFirstFoldGutter(page) {
  const clicked = await page.evaluate(() => {
    const markers = [...document.querySelectorAll(".cm-foldGutter .cm-gutterElement")];
    const marker = markers.find((element) => /[⌄›]/.test(element.textContent ?? ""));
    if (!(marker instanceof HTMLElement)) return false;
    marker.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    marker.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    marker.click();
    return true;
  });
  if (!clicked) throw new Error("Could not find a CodeMirror fold gutter marker");
}

function assertFoldedText(state, label) {
  if (state.editorText.includes("folded body line one")) {
    throw new Error(`${label} still shows folded body text: ${state.editorText}`);
  }
  if (!state.editorText.includes("Keep visible")) {
    throw new Error(`${label} lost the following heading: ${state.editorText}`);
  }
}

function assertExpandedText(state, label) {
  if (!state.editorText.includes("folded body line one")) {
    throw new Error(`${label} did not show unfolded body text: ${state.editorText}`);
  }
  if (!state.editorText.includes("Keep visible")) {
    throw new Error(`${label} lost the following heading: ${state.editorText}`);
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `fold-persistence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/fold-persistence-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    assertExpandedText(await foldState(page), "initial editor");
    await clickFirstFoldGutter(page);
    const foldedBeforeReload = await waitForFoldCount(page, 1);
    assertFoldedText(foldedBeforeReload, "folded editor");
    await page.evaluate(() => window.__graniteFoldPersistenceFlush());

    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    const foldedAfterReload = await waitForFoldCount(page, 1);
    assertFoldedText(foldedAfterReload, "restored editor");

    await page.locator(".cm-foldPlaceholder").first().click();
    const unfolded = await waitForFoldCount(page, 0);
    assertExpandedText(unfolded, "unfolded editor");
    await page.evaluate(() => window.__graniteFoldPersistenceFlush());

    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    const unfoldedAfterReload = await waitForFoldCount(page, 0);
    assertExpandedText(unfoldedAfterReload, "unfolded restored editor");

    console.log("Fold persistence browser verification passed.");
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
