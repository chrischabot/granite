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

async function chooseFilesSection(page) {
  await page.getByRole("button", { name: "Files & links" }).click();
  await page.getByText("Deleted files", { exact: true }).waitFor({ state: "visible" });
}

async function setDeleteMode(page, mode) {
  await chooseFilesSection(page);
  const deletedFilesSelect = page
    .locator(".setting-item")
    .filter({ hasText: "Deleted files" })
    .locator("select");
  await deletedFilesSelect.selectOption(mode);
  const confirmSwitch = page
    .locator(".setting-item")
    .filter({ hasText: "Confirm file deletion" })
    .getByRole("switch");
  if ((await confirmSwitch.getAttribute("aria-checked")) !== "true") {
    await confirmSwitch.click();
  }
}

async function deleteFileFromExplorer(page, filename) {
  const row = page.locator(".nav-files-container").getByRole("button", {
    name: new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  });
  await row.waitFor({ state: "visible" });
  await row.focus();
  await page.keyboard.press("Control+Backspace");
}

async function verifyDeleteCase(page, { mode, file, confirmIncludes, noticeIncludes }) {
  const dialogs = [];
  const handler = async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  };
  page.on("dialog", handler);
  try {
    await setDeleteMode(page, mode);
    await deleteFileFromExplorer(page, file);
    await page.waitForFunction(
      (text) =>
        [...document.querySelectorAll(".notice")].some((el) => el.textContent?.includes(text)),
      noticeIncludes,
    );
  } finally {
    page.off("dialog", handler);
  }
  const message = dialogs.at(-1) ?? "";
  if (!message.includes(confirmIncludes)) {
    throw new Error(
      `Expected ${mode} confirmation to include "${confirmIncludes}", got "${message}"`,
    );
  }
  return { mode, confirmation: message, notice: noticeIncludes };
}

async function opfsEntryExists({ rootName, path }) {
  const root = await navigator.storage.getDirectory();
  const vault = await root.getDirectoryHandle(rootName);
  const parts = path.split("/").filter(Boolean);
  let current = vault;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const isLast = index === parts.length - 1;
    try {
      if (isLast) {
        try {
          current = await current.getFileHandle(part);
        } catch (error) {
          if (!(error instanceof DOMException) || error.name !== "TypeMismatchError") throw error;
          current = await current.getDirectoryHandle(part);
        }
      } else {
        current = await current.getDirectoryHandle(part);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") return false;
      throw error;
    }
  }
  return true;
}

async function verifyNativeTrashBridgeCase(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  try {
    await page.goto(`${baseUrl}/scripts/trash-settings-browser-fixture.html?nativeTrash=1`, {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() => window.__graniteTrashSettingsReady === true, null, {
      timeout: 15_000,
    });
    const fixtureError = await page.evaluate(() => window.__graniteTrashSettingsError ?? null);
    if (fixtureError) throw new Error(`Native trash fixture failed: ${fixtureError}`);
    await page.waitForSelector(".nav-files-container");

    const check = await verifyDeleteCase(page, {
      mode: "system",
      file: "Delete-system",
      confirmIncludes: "system trash",
      noticeIncludes: "Moved to system trash.",
    });
    const calls = await page.evaluate(() => window.__graniteNativeTrashCalls ?? []);
    const rootName = calls[0]?.rootName;
    if (JSON.stringify(calls) !== JSON.stringify([{ rootName, path: "Delete-system.md" }])) {
      throw new Error(
        `Expected one native system-trash bridge call for Delete-system.md, got ${JSON.stringify(calls)}`,
      );
    }
    const state = await page.evaluate(opfsEntryExists, { rootName, path: "Delete-system.md" });
    const trashDirCreated = await page.evaluate(opfsEntryExists, { rootName, path: ".trash" });
    if (state)
      throw new Error(
        "Expected native system-trash bridge to remove Delete-system.md from the vault",
      );
    if (trashDirCreated)
      throw new Error("System trash mode must not create a vault .trash directory");
    return {
      ...check,
      bridgeCall: calls[0],
      vaultCopyExists: state,
      trashDirCreated,
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(`${baseUrl}/scripts/trash-settings-browser-fixture.html`, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(`${baseUrl}/scripts/trash-settings-browser-fixture.html`, {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() => window.__graniteTrashSettingsReady === true, null, {
      timeout: 15_000,
    });
    const fixtureError = await page.evaluate(() => window.__graniteTrashSettingsError ?? null);
    if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
    await page.waitForSelector(".nav-files-container");

    const checks = [];
    checks.push(
      await verifyDeleteCase(page, {
        mode: "vault",
        file: "Delete-vault",
        confirmIncludes: "vault trash",
        noticeIncludes: "Moved to vault trash.",
      }),
    );
    checks.push(
      await verifyDeleteCase(page, {
        mode: "permanent",
        file: "Delete-permanent",
        confirmIncludes: "permanent deletion",
        noticeIncludes: "Deleted.",
      }),
    );
    checks.push(
      await verifyDeleteCase(page, {
        mode: "system",
        file: "Delete-system",
        confirmIncludes: "system trash",
        noticeIncludes: "System trash is not available",
      }),
    );
    checks.push(await verifyNativeTrashBridgeCase(browser, baseUrl));

    console.log("Trash settings browser verification passed.");
    for (const check of checks) {
      console.log(
        `${check.mode}: confirmation="${check.confirmation}", notice contains="${check.notice}"`,
      );
    }
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
