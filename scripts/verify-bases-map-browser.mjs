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
  await page.waitForFunction(() => window.__graniteBasesMapBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteBasesMapBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("[aria-label='Populated map'] .bases-map-container").waitFor();
  await page.locator("[aria-label='Empty map'] .bases-map-container").waitFor();
}

async function workspaceSnapshot(page) {
  return await page.evaluate(() => window.__graniteBasesMapBrowserWorkspace?.());
}

async function dispatchPinClick(page, title, options = {}) {
  await page.locator(`.bases-map-pin[title='${title}']`).evaluate((pin, init) => {
    pin.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: Boolean(init.ctrlKey),
        metaKey: Boolean(init.metaKey),
      }),
    );
  }, options);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `bases-map-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/bases-map-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    const populated = page.locator("[aria-label='Populated map']");
    const empty = page.locator("[aria-label='Empty map']");
    await populated.locator(".bases-map-pin").first().waitFor();

    const pinTitles = await populated.locator(".bases-map-pin").evaluateAll((pins) =>
      pins.map((pin) => pin.getAttribute("title")),
    );
    const sortedTitles = [...pinTitles].sort();
    const expectedTitles = ["London (51.5, -0.1)", "Paris (48.8566, 2.3522)", "Tokyo (35.6762, 139.6503)"];
    if (JSON.stringify(sortedTitles) !== JSON.stringify(expectedTitles)) {
      throw new Error(`Unexpected map pins: ${JSON.stringify(pinTitles)}`);
    }
    if (pinTitles.some((title) => title?.includes("Invalid"))) {
      throw new Error(`Out-of-range coordinate row rendered as a pin: ${JSON.stringify(pinTitles)}`);
    }

    const londonStyle = await populated.locator(".bases-map-pin[title='London (51.5, -0.1)']").evaluate((pin) => ({
      left: pin.style.left,
      top: pin.style.top,
    }));
    if (londonStyle.left !== "49.9722%" || londonStyle.top !== "21.3889%") {
      throw new Error(`London pin projection drifted: ${JSON.stringify(londonStyle)}`);
    }

    const groupHeadings = await populated.locator(".bases-map-group h3").evaluateAll((els) =>
      els.map((el) => el.textContent?.trim()),
    );
    const sortedHeadings = [...groupHeadings].sort();
    if (JSON.stringify(sortedHeadings) !== JSON.stringify(["Asia · 1", "Europe · 2", "Invalid · 0"])) {
      throw new Error(`Unexpected map group headings/counts: ${JSON.stringify(groupHeadings)}`);
    }
    const groupPinCounts = await populated.locator(".bases-map-group").evaluateAll((groups) =>
      Object.fromEntries(
        groups.map((group) => [
          group.querySelector("h3")?.textContent?.trim() ?? "",
          group.querySelectorAll(".bases-map-pin").length,
        ]),
      ),
    );
    const expectedGroupPinCounts = { "Asia · 1": 1, "Europe · 2": 2, "Invalid · 0": 0 };
    if (
      Object.entries(expectedGroupPinCounts).some(
        ([heading, count]) => groupPinCounts[heading] !== count,
      )
    ) {
      throw new Error(`Grouped map planes did not match pin counts: ${JSON.stringify(groupPinCounts)}`);
    }

    const emptyText = await empty.locator(".bases-empty").textContent();
    if (!emptyText || !emptyText.toLowerCase().includes("latitude")) {
      throw new Error(`Empty map did not explain missing coordinates: ${JSON.stringify(emptyText)}`);
    }

    await dispatchPinClick(page, "London (51.5, -0.1)");
    const afterNormalClick = await workspaceSnapshot(page);
    if (afterNormalClick?.activeLeaf?.state?.path !== "Places/London.md" || afterNormalClick.leafCount !== 1) {
      throw new Error(`Normal map pin click did not open London in the current tab: ${JSON.stringify(afterNormalClick)}`);
    }

    await dispatchPinClick(page, "Tokyo (35.6762, 139.6503)", { ctrlKey: true });
    const afterCtrlClick = await workspaceSnapshot(page);
    const openPaths = afterCtrlClick?.leaves?.map((leaf) => leaf.state?.path).sort() ?? [];
    if (
      afterCtrlClick?.activeLeaf?.state?.path !== "Places/Tokyo.md" ||
      afterCtrlClick.leafCount !== 2 ||
      JSON.stringify(openPaths) !== JSON.stringify(["Places/London.md", "Places/Tokyo.md"])
    ) {
      throw new Error(`Ctrl-click map pin did not open Tokyo in a new tab: ${JSON.stringify(afterCtrlClick)}`);
    }

    console.log("Bases map browser verification passed.");
    console.log(`Pins: ${JSON.stringify(sortedTitles)}`);
    console.log(`Groups: ${JSON.stringify(groupHeadings)}`);
    console.log(`Workspace paths after Ctrl-click: ${JSON.stringify(openPaths)}`);
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
