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
  await page.waitForFunction(() => window.__graniteErrorBoundaryReady === true, null, {
    timeout: 15_000,
  });
  await page.locator("text=Workspace survived").waitFor();
}

async function verifyAlert(page, { source, message, componentStack = false }) {
  const alert = page.locator("[role='alert']");
  await alert.waitFor();
  const text = await alert.textContent();
  if (!text?.includes(`Granite hit an error (${source})`) || !text.includes(message)) {
    throw new Error(`Error boundary alert mismatch for ${source}/${message}: ${text}`);
  }
  await page.getByRole("button", { name: "Reload Granite" }).waitFor();
  await page.getByRole("button", { name: "Dismiss" }).waitFor();
  if (componentStack) {
    await page.locator("summary").filter({ hasText: "Component stack" }).click();
    const stackText = await page.locator("details pre").textContent();
    if (!stackText?.includes("BrokenRender")) {
      throw new Error(`React component stack did not include BrokenRender: ${stackText}`);
    }
  }
}

async function dismiss(page) {
  await page.evaluate(() => window.__graniteErrorBoundaryRecoverRender?.());
  await page.getByRole("button", { name: "Dismiss" }).click();
  await page.locator("[role='alert']").waitFor({ state: "detached" });
  await page.locator("text=Workspace survived").waitFor();
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixtureUrl = `${baseUrl}/scripts/error-boundary-browser-fixture.html`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.evaluate(() => window.__graniteErrorBoundaryCrashRender());
    await verifyAlert(page, { source: "react", message: "Render exploded", componentStack: true });
    await dismiss(page);

    await page.evaluate(() => window.__graniteErrorBoundaryRejectPromise());
    await verifyAlert(page, { source: "promise", message: "Async promise exploded" });
    await dismiss(page);

    await page.evaluate(() => window.__graniteErrorBoundaryFailEffect());
    await verifyAlert(page, { source: "effect", message: "Effect exploded" });

    console.log("Error boundary browser verification passed.");
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
