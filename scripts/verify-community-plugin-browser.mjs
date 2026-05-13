import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const cwd = process.cwd();
const plugins = [
  {
    id: "advanced-tables",
    name: "Advanced Tables",
    author: "TGrosinger",
    description: "Format and navigate markdown tables.",
    repo: "tgrosinger/advanced-tables-obsidian",
    hasStyles: true,
  },
  {
    id: "obsidian-git",
    name: "Git",
    author: "Vinzent",
    description: "Back up vault changes with Git.",
    repo: "Vinzent03/obsidian-git",
    hasStyles: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    author: "Liam Cain",
    description: "Calendar view for daily notes.",
    repo: "liamcain/obsidian-calendar-plugin",
    hasStyles: false,
  },
];

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
  return await page.evaluate(() => window.__graniteCommunityPluginSnapshot());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteCommunityPluginReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const current = await page.evaluate(() => window.__graniteCommunityPluginSnapshot?.() ?? null);
    throw new Error(
      `Timed out waiting for community plugin fixture readiness; state=${JSON.stringify(current)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteCommunityPluginError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Community plugin fixture ready").waitFor();
}

async function waitForPlugin(page, id) {
  try {
    await page.waitForFunction(
      (pluginId) =>
        window
          .__graniteCommunityPluginSnapshot()
          .plugins.some((plugin) => plugin.id === pluginId && plugin.enabled === false),
      id,
      { timeout: 10_000 },
    );
  } catch (error) {
    throw new Error(
      `Timed out waiting for installed plugin ${id}; snapshot=${JSON.stringify(await snapshot(page))}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function readVaultText(page, path) {
  return await page.evaluate(
    (vaultPath) => window.__graniteCommunityPluginReadVaultText(vaultPath),
    path,
  );
}

function assertCredentialFreeFetches(snap) {
  const bad = snap.fetches.filter((fetchEntry) => fetchEntry.credentials !== "omit");
  if (bad.length > 0) {
    throw new Error(`Community plugin fetches were not credential-free: ${JSON.stringify(bad)}`);
  }
}

async function installPlugin(page, plugin) {
  await page.getByRole("button", { name: "Install plugin from URL…" }).click();
  const dialog = page.getByRole("dialog", { name: "Install community plugin" });
  await dialog.waitFor({ state: "visible" });
  const search = dialog.getByPlaceholder("Search community plugins");
  await search.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector("input[placeholder='Search community plugins']")?.disabled,
  );
  await search.fill(plugin.name);
  await dialog.getByRole("button", { name: new RegExp(plugin.name) }).click();
  await dialog.locator("code", { hasText: plugin.id }).first().waitFor();
  await dialog.getByText("v1.0.0").waitFor();
  await dialog.getByText(plugin.author).first().waitFor();
  await dialog.getByText(plugin.description).first().waitFor();
  await dialog.getByText(/KB of plugin code will be written to/).waitFor();
  await dialog.getByRole("button", { name: "Install" }).click();
  await dialog.waitFor({ state: "hidden" });
  await waitForPlugin(page, plugin.id);
}

function assertInstalledDisabled(snap, plugin) {
  const installed = snap.plugins.find((candidate) => candidate.id === plugin.id);
  if (!installed) throw new Error(`Missing installed plugin ${plugin.id}: ${JSON.stringify(snap)}`);
  if (installed.enabled)
    throw new Error(`Plugin enabled automatically: ${JSON.stringify(installed)}`);
  if (
    installed.manifestUrl !==
    `https://raw.githubusercontent.com/${plugin.repo}/master/manifest.json`
  ) {
    throw new Error(`Installed plugin missing persisted manifestUrl: ${JSON.stringify(installed)}`);
  }
}

async function assertVaultFiles(page, plugin) {
  const manifestText = await readVaultText(page, `.granite/plugins/${plugin.id}/manifest.json`);
  const manifest = JSON.parse(manifestText);
  if (manifest.id !== plugin.id || manifest.version !== "1.0.0" || !manifest.manifestUrl) {
    throw new Error(`Bad persisted manifest for ${plugin.id}: ${manifestText}`);
  }
  const mainText = await readVaultText(page, `.granite/plugins/${plugin.id}/main.js`);
  if (!mainText.includes(`fixture:${plugin.id}`)) {
    throw new Error(`Bad persisted main.js for ${plugin.id}: ${mainText.slice(0, 120)}`);
  }
  if (plugin.hasStyles) {
    const stylesText = await readVaultText(page, `.granite/plugins/${plugin.id}/styles.css`);
    if (!stylesText.includes(`--fixture-${plugin.id}`)) {
      throw new Error(`Bad persisted styles.css for ${plugin.id}: ${stylesText}`);
    }
  }
}

async function setPluginEnabled(page, plugin, enabled) {
  const item = page.locator(".setting-item", { hasText: `${plugin.name} · v1.0.0` });
  await item.getByRole("switch").click();
  await page.waitForFunction(
    ({ pluginId, expected }) => {
      const snap = window.__graniteCommunityPluginSnapshot();
      return snap.plugins.some((plugin) => plugin.id === pluginId && plugin.enabled === expected);
    },
    { pluginId: plugin.id, expected: enabled },
    { timeout: 10_000 },
  );
}

function assertPluginLoadedState(snap, plugin, loaded) {
  const commandId = `fixture:${plugin.id}`;
  const hasCommand = snap.commands.includes(commandId);
  const hasStatus = snap.statusItems.some((item) => item.pluginId === plugin.id);
  const hasSettings = snap.settingsTabs.some((tab) => tab.pluginId === plugin.id);
  if (hasCommand !== loaded || hasStatus !== loaded || hasSettings !== loaded) {
    throw new Error(
      `Plugin ${plugin.id} loaded=${loaded} mismatch: command=${hasCommand} status=${hasStatus} settings=${hasSettings} snapshot=${JSON.stringify(snap)}`,
    );
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `community-plugin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/community-plugin-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const page = await context.newPage();
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);
    await page.getByPlaceholder("Search settings").fill("plugins");
    await page.getByRole("button", { name: "Plugins" }).click();
    await page.getByRole("heading", { name: "Plugins" }).waitFor();

    for (const plugin of plugins) {
      await installPlugin(page, plugin);
      const installedSnap = await snapshot(page);
      assertCredentialFreeFetches(installedSnap);
      assertInstalledDisabled(installedSnap, plugin);
      await assertVaultFiles(page, plugin);
    }

    for (const plugin of plugins) {
      await setPluginEnabled(page, plugin, true);
      assertPluginLoadedState(await snapshot(page), plugin, true);
      await setPluginEnabled(page, plugin, false);
      assertPluginLoadedState(await snapshot(page), plugin, false);
    }

    await page.evaluate(() => {
      window.__graniteCommunityPluginSetUpdateVersion("advanced-tables", "1.1.0");
      window.__graniteCommunityPluginSetUpdateVersion("obsidian-git", "1.1.0");
      window.__graniteCommunityPluginSetUpdateVersion("calendar", "1.1.0");
    });
    const beforeUpdateFetches = (await snapshot(page)).fetches.length;
    await page.getByRole("button", { name: "Check for updates" }).click();
    await page.waitForFunction(
      (previousCount) => {
        const snap = window.__graniteCommunityPluginSnapshot();
        return (
          snap.fetches.length >= previousCount + 3 &&
          snap.notices.some((notice) => notice.message === "3 plugins have new versions available.")
        );
      },
      beforeUpdateFetches,
      { timeout: 10_000 },
    );
    assertCredentialFreeFetches(await snapshot(page));

    console.log("Community plugin browser verification passed.");
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
