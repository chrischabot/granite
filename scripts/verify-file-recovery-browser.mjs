import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const cwd = process.cwd();
const CURRENT = "# Note\n\ncurrent line\nkeep line\n";
const NEWER = "# Note\n\nrestored line\nkeep line\nextra recovered line\n";

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
  await page.waitForFunction(() => window.__graniteFileRecoveryBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteFileRecoveryBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".file-recovery-modal").waitFor();
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `file-recovery-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/file-recovery-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.locator(".modal-title").filter({ hasText: "File recovery" }).waitFor({
      state: "attached",
    });
    await page.locator(".file-recovery-list[aria-label='Recovery snapshots']").waitFor();
    await page.locator("#file-recovery-filter").waitFor();
    const placeholder = await page.locator("#file-recovery-filter").getAttribute("placeholder");
    if (placeholder !== "Note.md") {
      throw new Error(`File Recovery filter did not show current filename placeholder: ${placeholder}`);
    }

    const snapshots = page.locator(".file-recovery-list-item-header");
    if ((await snapshots.count()) !== 2) {
      throw new Error(`Expected two recovery snapshots, found ${await snapshots.count()}`);
    }
    const activeText = await page.locator(".file-recovery-list-item-header.is-active").textContent();
    if (!activeText?.includes(`${NEWER.length} bytes`)) {
      throw new Error(`Newest snapshot was not selected first: ${activeText}`);
    }

    const preview = page.locator(".file-recovery-text");
    const diffValue = await preview.inputValue();
    for (const expected of ["- current line", "+ restored line", "+ extra recovered line"]) {
      if (!diffValue.includes(expected)) throw new Error(`Diff preview missing ${expected}: ${diffValue}`);
    }

    await page.locator(".file-recovery-toggle input[type='checkbox']").click();
    const rawValue = await preview.inputValue();
    if (rawValue !== NEWER) {
      throw new Error(`Raw snapshot preview did not match selected snapshot:\n${rawValue}`);
    }

    await page.getByRole("button", { name: "Copy" }).click();
    const copiedText = await page.evaluate(() => window.__graniteFileRecoveryBrowserCopiedText());
    if (copiedText !== NEWER) {
      throw new Error(`Copy did not write selected snapshot to clipboard stub:\n${copiedText}`);
    }
    await page.locator(".notice").filter({ hasText: "Snapshot copied." }).waitFor();

    await page.getByRole("button", { name: "Restore" }).click();
    await page.locator(".file-recovery-modal").waitFor({ state: "detached" });
    const restored = await page.evaluate(() => window.__graniteFileRecoveryBrowserReadNote());
    if (restored !== NEWER) {
      throw new Error(`Restore did not write selected snapshot to disk:\n${restored}`);
    }

    await page.evaluate(() => window.__graniteFileRecoveryBrowserReopen());
    await page.locator(".file-recovery-modal").waitFor();
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Clear" }).click();
    await page.locator(".file-recovery-list-empty").filter({ hasText: "No snapshots found." }).waitFor();
    const snapshotCount = await page.evaluate(() => window.__graniteFileRecoveryBrowserSnapshotCount());
    if (snapshotCount !== 0) {
      throw new Error(`Clear left snapshots behind: ${snapshotCount}`);
    }
    await page.locator(".notice").filter({ hasText: "Recovery snapshots cleared." }).waitFor();

    console.log("File recovery browser verification passed.");
    console.log(`Restored bytes: ${restored.length}`);
    console.log(`Snapshot count after clear: ${snapshotCount}`);
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
