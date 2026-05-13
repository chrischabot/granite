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
  return await page.evaluate(() => window.__graniteMultiWindowVaultSnapshot());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteMultiWindowVaultReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const current = await page.evaluate(() => window.__graniteMultiWindowVaultSnapshot?.() ?? null);
    throw new Error(
      `Timed out waiting for multi-window vault fixture readiness; state=${JSON.stringify(current)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteMultiWindowVaultError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Multi-window vault fixture ready").waitFor();
}

function vaultByName(snap, name) {
  const vault = snap.vaults.find((candidate) => candidate.name === name);
  if (!vault) throw new Error(`Missing vault ${name}: ${JSON.stringify(snap)}`);
  return vault;
}

function assertActiveVault(snap, name, label) {
  if (snap.activeVaultName !== name) {
    throw new Error(
      `${label} active vault mismatch: expected ${name}, got ${JSON.stringify(snap)}`,
    );
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const base = `multi-window-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/multi-window-vault-browser-fixture.html?base=${base}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await context.newPage();
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);
    const initial = await snapshot(page);
    const vaultOne = vaultByName(initial, `${base}-one`);
    const vaultTwo = vaultByName(initial, `${base}-two`);
    assertActiveVault(initial, `${base}-one`, "original window before open");

    await page.getByRole("button", { name: `Open ${base}-two in new window` }).click();
    const afterOpenClick = await snapshot(page);
    assertActiveVault(afterOpenClick, `${base}-one`, "original window after new-window click");
    const opened = afterOpenClick.openedWindows.at(-1);
    if (!opened?.url)
      throw new Error(`Vault picker did not call window.open: ${JSON.stringify(afterOpenClick)}`);
    const openedUrl = new URL(opened.url);
    if (openedUrl.searchParams.get("vaultWindow") !== "1") {
      throw new Error(`New vault URL missing vaultWindow=1: ${opened.url}`);
    }
    if (openedUrl.searchParams.get("vaultId") !== vaultTwo.id) {
      throw new Error(`New vault URL used wrong vault id: ${opened.url}`);
    }
    if (openedUrl.searchParams.has("popout") || openedUrl.searchParams.has("leaf")) {
      throw new Error(`New vault URL inherited popout state: ${opened.url}`);
    }

    const vaultWindowPage = await context.newPage();
    await vaultWindowPage.goto(opened.url, { waitUntil: "networkidle" });
    await waitForFixture(vaultWindowPage);
    assertActiveVault(await snapshot(vaultWindowPage), `${base}-two`, "standalone vault window");

    await page.keyboard.press("Escape");
    await page.locator(".modal-container").waitFor({ state: "detached" });
    await page.locator(".workspace-tab-header", { hasText: "One" }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Open in new window" }).click();
    const popoutOpened = (await snapshot(page)).openedWindows.at(-1);
    if (!popoutOpened?.url) throw new Error("Tab pop-out menu item did not call window.open");
    const popoutUrl = popoutOpened.url;
    const popoutPage = await context.newPage();
    await popoutPage.goto(popoutUrl, { waitUntil: "networkidle" });
    await waitForFixture(popoutPage);
    const popoutSnap = await snapshot(popoutPage);
    assertActiveVault(popoutSnap, `${base}-one`, "leaf popout window");
    if (
      !popoutSnap.leaves.some(
        (leaf) => leaf.state.type === "markdown" && leaf.state.path === "One.md",
      )
    ) {
      throw new Error(
        `Leaf popout did not restore requested markdown leaf: ${JSON.stringify(popoutSnap)}`,
      );
    }
    if (popoutSnap.activeVaultId !== vaultOne.id) {
      throw new Error(`Leaf popout used wrong vault id: ${JSON.stringify(popoutSnap)}`);
    }

    console.log("Multi-window vault browser verification passed.");
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
