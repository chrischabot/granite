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

async function snapshot(page) {
  return await page.evaluate(() => window.__graniteWorkspaceRestartSnapshot());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteWorkspaceRestartReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteWorkspaceRestartSnapshot?.() ?? null);
    throw new Error(
      `Timed out waiting for workspace restart fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteWorkspaceRestartError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".workspace").waitFor();
}

function markdownPaths(snap) {
  return snap.leaves
    .map((leaf) => leaf.state)
    .filter((state) => state.type === "markdown")
    .map((state) => state.path)
    .sort();
}

function assertSingleRestored(snap, label) {
  const paths = markdownPaths(snap);
  if (!paths.includes("Restart A.md")) {
    throw new Error(`${label} did not restore Restart A.md: ${JSON.stringify(snap)}`);
  }
  if (!snap.titles.some((title) => title.includes("Restart A"))) {
    throw new Error(`${label} did not render Restart A tab: ${JSON.stringify(snap)}`);
  }
}

function assertLayoutRestored(snap, label) {
  const paths = markdownPaths(snap);
  for (const path of ["Restart A.md", "Restart B.md", "Restart C.md"]) {
    if (!paths.includes(path)) throw new Error(`${label} missing ${path}: ${JSON.stringify(snap)}`);
  }
  if (snap.columns.length !== 2 || snap.columns[0]?.length !== 2) {
    throw new Error(`${label} did not restore split columns/groups: ${JSON.stringify(snap)}`);
  }
  if (!snap.groups.some((group) => group.stacked)) {
    throw new Error(`${label} did not restore a stacked tab group: ${JSON.stringify(snap)}`);
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `workspace-restart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/workspace-restart-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.evaluate(() => window.__graniteWorkspaceRestartOpenSingle());
    assertSingleRestored(await snapshot(page), "before fast restart");
    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    assertSingleRestored(await snapshot(page), "after fast restart");

    await page.evaluate(() => window.__graniteWorkspaceRestartSetupLayout());
    assertLayoutRestored(await snapshot(page), "before layout restart");
    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    assertLayoutRestored(await snapshot(page), "after layout restart");

    console.log("Workspace restart browser verification passed.");
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
