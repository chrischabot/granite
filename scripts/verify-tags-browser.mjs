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
  await page.waitForFunction(() => window.__graniteTagsBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteTagsBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".tag-container").waitFor();
}

function tagButton(page, name) {
  return page
    .locator(".tag-pane-tag-button")
    .filter({ has: page.locator(".tag-pane-tag-text").getByText(name, { exact: true }) })
    .first();
}

async function searchValue(page) {
  return await page.locator(".search-pane input[type='search']").inputValue();
}

async function waitForSearchValue(page, expected) {
  await page.waitForFunction(
    (value) => document.querySelector(".search-pane input[type='search']")?.value === value,
    expected,
  );
  return searchValue(page);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `tags-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/tags-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1120, height: 720 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);
    await page.evaluate(() => window.__graniteTagsBrowserSetNested(true));
    await tagButton(page, "work").waitFor();
    await tagButton(page, "client").waitFor();

    const nestedToggle = page.locator(".tag-pane-options input[type='checkbox']");
    if (!(await nestedToggle.isChecked())) {
      throw new Error("Expected Show nested tags to start enabled");
    }
    await nestedToggle.click();
    await tagButton(page, "work/client").waitFor();
    if ((await tagButton(page, "client").count()) !== 0) {
      throw new Error("Nested child tag remained visible after disabling nested tags");
    }

    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    if (await page.locator(".tag-pane-options input[type='checkbox']").isChecked()) {
      throw new Error("Show nested tags did not persist as disabled after reload");
    }
    await tagButton(page, "work/client").click();
    const flatQuery = await waitForSearchValue(page, "tag:work/client");

    await page.locator(".tag-pane-options input[type='checkbox']").click();
    await tagButton(page, "client").waitFor();
    await tagButton(page, "client").click();
    const nestedQuery = await waitForSearchValue(page, "tag:work/client");

    console.log("Tags browser verification passed.");
    console.log(`Flat query: ${flatQuery}`);
    console.log(`Nested query: ${nestedQuery}`);
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
