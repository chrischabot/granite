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

async function vimState(page) {
  return await page.evaluate(() => window.__graniteVimModeState());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteVimModeReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const state = await page.evaluate(() => window.__graniteVimModeState?.() ?? null);
    throw new Error(
      `Timed out waiting for Vim fixture readiness; state=${JSON.stringify(state)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteVimModeError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Vim fixture ready").waitFor();
  await page.locator(".cm-editor").waitFor();
}

async function waitForDiskText(page, expected) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await vimState(page);
    if (last.diskText === expected) return last;
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for disk text ${JSON.stringify(expected)}; last=${JSON.stringify(last)}`,
  );
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `vim-mode-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/vim-mode-browser-fixture.html?vault=${vault}`;
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

    await page.getByRole("button", { name: "Editor" }).click();
    await page
      .locator(".setting-item")
      .filter({ hasText: "Key bindings" })
      .locator("select")
      .selectOption("vim");
    await page.waitForFunction(() =>
      window.__graniteVimModeState().then((s) => s.editorKeymap === "vim"),
    );
    await page.evaluate(() => window.__graniteVimModeCloseSettings());
    await page.getByRole("dialog", { name: "Settings" }).waitFor({ state: "detached" });

    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("g");
    await page.keyboard.press("g");
    await page.keyboard.press("0");
    await page.keyboard.press("i");
    await page.keyboard.type("vim ");
    await delay(100);
    await page.keyboard.press("Escape");
    await delay(100);

    const inserted = "vim alpha\nbeta\n";
    await waitForDiskText(page, inserted);

    await page.keyboard.press("h");
    await page.keyboard.press("j");
    await page.keyboard.press("k");
    await page.keyboard.press("l");
    await delay(750);
    const afterNavigation = await vimState(page);
    if (afterNavigation.diskText !== inserted) {
      throw new Error(
        `Vim normal-mode navigation mutated text: ${JSON.stringify(afterNavigation.diskText)}`,
      );
    }
    if (afterNavigation.editorText.includes("hjkl")) {
      throw new Error(
        `Vim normal-mode navigation was inserted into editor: ${afterNavigation.editorText}`,
      );
    }

    console.log("Vim mode browser verification passed.");
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
