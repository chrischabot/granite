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

async function centralLeafTitles(page) {
  return await page.evaluate(() =>
    [...document.querySelectorAll(".workspace .workspace-tab-header-inner-title")]
      .map((el) => el.textContent?.trim() ?? "")
      .filter(Boolean),
  );
}

async function waitForCentralLeafTitles(page, expected) {
  await page.waitForFunction((names) => {
    const titles = [...document.querySelectorAll(".workspace .workspace-tab-header-inner-title")]
      .map((el) => el.textContent?.trim() ?? "")
      .filter(Boolean);
    return names.every((name) => titles.includes(name));
  }, expected);
  return centralLeafTitles(page);
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `sidebar-central-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

    await page.getByRole("button", { name: "Search" }).first().click();
    await page.getByRole("button", { name: "Open Search in central area" }).click();
    await page.locator(".workspace .view-header-title", { hasText: "Search" }).waitFor();
    await page.locator(".workspace .search-pane input[type='search']").waitFor();

    await page.getByRole("button", { name: "Recent files" }).first().click();
    await page.getByRole("button", { name: "Open Recent files in central area" }).click();
    await page.locator(".workspace .view-header-title", { hasText: "Recent files" }).waitFor();
    await page.locator(".workspace .recents-pane", { hasText: "Sidebar Note" }).waitFor();

    const beforeReload = await centralLeafTitles(page);
    if (!beforeReload.includes("Search") || !beforeReload.includes("Recent files")) {
      throw new Error(`Central sidebar leaves missing before reload: ${beforeReload.join(", ")}`);
    }
    const storeStatesBeforeReload = await page.evaluate(() => window.__graniteWorkspaceSnapshotForTests());
    if (
      !storeStatesBeforeReload.leaves.some(
        (leaf) => leaf.state.type === "sidebar" && leaf.state.id === "search",
      ) ||
      !storeStatesBeforeReload.leaves.some(
        (leaf) => leaf.state.type === "sidebar" && leaf.state.id === "recents",
      )
    ) {
      throw new Error(
        `Workspace store did not contain central sidebar leaves: ${JSON.stringify(storeStatesBeforeReload)}`,
      );
    }

    await page.getByRole("button", { name: "Tags" }).first().click();
    await page.locator(".mod-left-split .workspace-sidebar-content[data-active-tab='tags']").waitFor();
    const afterSidebarSwitch = await centralLeafTitles(page);
    if (!afterSidebarSwitch.includes("Search") || !afterSidebarSwitch.includes("Recent files")) {
      throw new Error(
        `Central sidebar leaves changed after switching original sidebar: ${afterSidebarSwitch.join(", ")}`,
      );
    }

    await delay(1_500);
    const beforeReloadStorage = await page.evaluate(() => {
      const entries = window.__graniteFlushWorkspacePersistenceAndRead();
      return {
        activeVaultId: window.__graniteActiveVaultId ?? null,
        workspace: window.__graniteWorkspaceSnapshotForTests(),
        storageWritable: (() => {
          try {
            localStorage.setItem("__granite_probe", "1");
            const ok = localStorage.getItem("__granite_probe") === "1";
            localStorage.removeItem("__granite_probe");
            return ok;
          } catch (error) {
            return error instanceof Error ? error.message : String(error);
          }
        })(),
        entries,
      };
    });
    if (beforeReloadStorage.entries.length === 0) {
      throw new Error(`Workspace snapshot was not persisted before reload: ${JSON.stringify(beforeReloadStorage)}`);
    }
    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    let afterReload;
    try {
      afterReload = await waitForCentralLeafTitles(page, ["Search", "Recent files"]);
    } catch (error) {
      const titles = await centralLeafTitles(page);
      const storage = await page.evaluate(() => {
        const entries = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key?.startsWith("granite.workspace.last.")) {
            entries.push([key, localStorage.getItem(key)]);
          }
        }
        return entries;
      });
      throw new Error(
        `Central sidebar leaves missing after reload: ${titles.join(", ")}; storage=${JSON.stringify(storage)}`,
        { cause: error },
      );
    }

    console.log("Sidebar central browser verification passed.");
    console.log(`Before reload central leaves: ${beforeReload.join(", ")}`);
    console.log(`After reload central leaves: ${afterReload.join(", ")}`);
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
