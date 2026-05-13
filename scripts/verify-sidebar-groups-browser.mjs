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
  await page.waitForFunction(() => window.__graniteSidebarCentralReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteSidebarCentralError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.waitForSelector(".workspace");
}

async function activeTabs(page, sideSelector) {
  return await page.evaluate((selector) => {
    return [...document.querySelectorAll(`${selector} .workspace-sidebar-content`)].map(
      (el) => el.getAttribute("data-active-tab") ?? "",
    );
  }, sideSelector);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `sidebar-groups-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/sidebar-central-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.getByRole("button", { name: "Split Files sidebar group" }).click();
    await page.getByRole("button", { name: "Split Files sidebar group" }).first().click();
    const leftGroups = page.locator(".mod-left-split .workspace-sidebar-group");
    await leftGroups.nth(2).waitFor();

    await leftGroups.nth(0).getByRole("button", { name: "Search" }).click();
    await leftGroups.nth(1).getByRole("button", { name: "Bookmarks" }).click();
    await leftGroups.nth(2).getByRole("button", { name: "Tags" }).click();
    const leftActive = await activeTabs(page, ".mod-left-split");
    if (leftActive.join(",") !== "search,bookmarks,tags") {
      throw new Error(`Left sidebar groups were not independent: ${leftActive.join(",")}`);
    }
    await leftGroups.nth(0).locator(".search-pane input[type='search']").waitFor();
    await leftGroups.nth(1).locator(".bookmarks-pane, .workspace-sidedock-empty-state").waitFor();
    await leftGroups.nth(2).locator(".tag-container, .workspace-sidedock-empty-state").waitFor();

    await page.getByRole("button", { name: "Split Outline sidebar group" }).click();
    const rightGroups = page.locator(".mod-right-split .workspace-sidebar-group");
    await rightGroups.nth(1).waitFor();
    await rightGroups.nth(1).getByRole("button", { name: "Recent files" }).click();
    await page.getByRole("button", { name: "Close Outline sidebar group" }).click();
    await rightGroups.nth(1).waitFor({ state: "detached" });
    const rightActive = await activeTabs(page, ".mod-right-split");
    if (rightActive.join(",") !== "recents") {
      throw new Error(`Right sidebar close did not preserve remaining active tab: ${rightActive.join(",")}`);
    }

    for (const label of [
      "Split Search sidebar group",
      "Close Search sidebar group",
      "Split Bookmarks sidebar group",
      "Close Bookmarks sidebar group",
      "Split Tags sidebar group",
      "Close Tags sidebar group",
      "Split Recent files sidebar group",
    ]) {
      if ((await page.getByRole("button", { name: label }).count()) === 0) {
        throw new Error(`Missing accessible sidebar group control: ${label}`);
      }
    }

    console.log("Sidebar groups browser verification passed.");
    console.log(`Left groups: ${leftActive.join(", ")}`);
    console.log(`Right groups after close: ${rightActive.join(", ")}`);
  } catch (error) {
    if (consoleMessages.length > 0) console.error(consoleMessages.join("\n"));
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
