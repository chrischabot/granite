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
  await page.waitForFunction(() => window.__graniteDebugInfoReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteDebugInfoError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Debug fixture ready").waitFor();
}

function assertSupportDump(text, secret, label) {
  const required = [
    "Granite debug info",
    "Version:",
    "Platform:",
    "User agent:",
    "Vault root:",
    "Files: 3",
    "Markdown files: 2",
    "Vault size:",
    "Workspace: 1 groups, 1 leaves",
    "Commands:",
    "Tags:",
    "Properties:",
    "Plugins:",
  ];
  for (const fragment of required) {
    if (!text.includes(fragment)) {
      throw new Error(`${label} missing ${JSON.stringify(fragment)}:\n${text}`);
    }
  }
  if (text.includes(secret)) throw new Error(`${label} leaked note body secret:\n${text}`);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `debug-info-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/debug-info-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.getByRole("button", { name: "Open command palette" }).click();
    await page.locator(".prompt-input").fill("Show debug info");
    await page.getByRole("option", { name: /Show debug info/ }).click();

    const alert = page.getByRole("alert").filter({ hasText: "Granite debug info" });
    await alert.waitFor();
    const noticeText = (await alert.textContent()) ?? "";
    const clipboardText = await page.evaluate(() => window.__graniteDebugInfoClipboard());
    const secret = await page.evaluate(() => window.__graniteDebugInfoSecret);

    assertSupportDump(noticeText, secret, "visible sticky notice");
    assertSupportDump(clipboardText, secret, "clipboard support dump");
    if (noticeText !== clipboardText) {
      throw new Error(
        `Clipboard and visible notice diverged:\nNOTICE:\n${noticeText}\n\nCLIPBOARD:\n${clipboardText}`,
      );
    }

    await page.getByRole("button", { name: "Dismiss" }).waitFor();

    console.log("Debug info browser verification passed.");
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
