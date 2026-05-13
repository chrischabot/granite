import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const cwd = process.cwd();
const INITIAL = "# External\n\nInitial content\n";
const EXTERNAL_ONE = "# External\n\nExternally edited content\n";
const LOCAL_DIRTY = "\nLocal unsaved text";
const EXTERNAL_TWO = "# External\n\nSecond external edit\n";

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
  await page.waitForFunction(() => window.__graniteExternalEditReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteExternalEditError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".cm-content").waitFor();
  await page.waitForFunction(() => window.__graniteExternalEditDoc?.().includes("Initial content"));
}

async function waitForDocIncludes(page, expectedText, timeout = 800) {
  await page.waitForFunction((text) => window.__graniteExternalEditDoc?.().includes(text), expectedText, {
    timeout,
  });
  return await page.evaluate(() => window.__graniteExternalEditDoc());
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `external-edit-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/external-edit-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    const start = performance.now();
    await page.evaluate((text) => window.__graniteExternalEditWrite(text), EXTERNAL_ONE);
    await waitForDocIncludes(page, "Externally edited content", 700);
    const externalElapsed = performance.now() - start;
    if (externalElapsed > 500) {
      throw new Error(`External edit took ${externalElapsed.toFixed(1)}ms, over 500ms budget`);
    }

    await page.evaluate((text) => window.__graniteExternalEditInsert(text), LOCAL_DIRTY);
    await waitForDocIncludes(page, "Local unsaved text", 500);
    const dirtyDoc = await page.evaluate(() => window.__graniteExternalEditDoc());
    await page.evaluate((text) => window.__graniteExternalEditWrite(text), EXTERNAL_TWO);
    await page.waitForTimeout(300);
    const afterDirtyExternal = await page.evaluate(() => window.__graniteExternalEditDoc());
    if (
      !afterDirtyExternal.includes("Local unsaved text") ||
      afterDirtyExternal.includes("Second external edit")
    ) {
      throw new Error(`External edit overwrote unsaved local text:\n${afterDirtyExternal}`);
    }
    const diskAfterDirtyProtection = await page.evaluate(() => window.__graniteExternalEditRead());
    if (diskAfterDirtyProtection !== EXTERNAL_TWO) {
      throw new Error(`External write did not reach disk before dirty protection check:\n${diskAfterDirtyProtection}`);
    }

    await page.waitForFunction(() => window.__graniteExternalEditStatus?.() === "Saved", null, {
      timeout: 1_500,
    });
    const savedDisk = await page.evaluate(() => window.__graniteExternalEditRead());
    if (!savedDisk.includes("Local unsaved text") || savedDisk.includes("Second external edit")) {
      throw new Error(`Granite autosave did not preserve local dirty buffer:\n${savedDisk}`);
    }
    await page.waitForTimeout(350);
    const statusAfterOwnWatcher = await page.evaluate(() => window.__graniteExternalEditStatus());
    const docAfterOwnWatcher = await page.evaluate(() => window.__graniteExternalEditDoc());
    if (statusAfterOwnWatcher !== "Saved" || !docAfterOwnWatcher.includes("Local unsaved text")) {
      throw new Error(
        `Granite save watcher loop re-dirtied or changed editor: status=${statusAfterOwnWatcher}, doc=${docAfterOwnWatcher}`,
      );
    }

    console.log("External edit browser verification passed.");
    console.log(`External update elapsed: ${externalElapsed.toFixed(1)}ms`);
    console.log(`Final status: ${statusAfterOwnWatcher}`);
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
