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
    // Surface console errors immediately so plugin load failures don't hide
    // (the buffered consoleMessages array is only flushed on a thrown error).
    page.on("console", (message) => {
      if (message.type() === "error") {
        process.stderr.write(`[browser-console-error] ${message.text()}\n`);
      }
    });

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

    // -----------------------------------------------------------------------
    // PART 2 — realistic Obsidian-shape plugin verification.
    //
    // Drop three hand-written plugins onto the vault that exercise the *class
    // extends Plugin* style (the `require("obsidian")` path). Assert each
    // plugin's observable artifacts appear on enable, then run an enable/
    // disable storm (50 cycles per plugin) and verify NO leaked commands,
    // ribbon icons, status bar items, settings tabs, or interval ticks remain.
    // -----------------------------------------------------------------------
    const realFixtures = await page.evaluate(() => window.__graniteCommunityPluginRealFixtures);
    for (const fixture of realFixtures) {
      await page.evaluate((f) => window.__graniteCommunityPluginInstallRealFixture(f), fixture);
    }
    // Force a refresh by toggling each plugin enabled — `setPluginEnabled`
    // reads the manifest from disk via `refreshAll`-style behavior. We have
    // to wait for the manifests to be discovered first; the loader watches
    // the FS and re-runs `refreshAll` ~250ms after a write.
    await page.waitForFunction(
      (ids) => {
        const snap = window.__graniteCommunityPluginSnapshot();
        return ids.every((id) => snap.plugins.some((p) => p.id === id));
      },
      realFixtures.map((f) => f.id),
      { timeout: 5_000 },
    );

    // Capture baselines so we can confirm a perfectly clean teardown across
    // the storm: anything counted-up by a plugin on load must drop right back
    // to the baseline on unload.
    const baseline = await snapshot(page);
    const baseCommandIds = new Set(baseline.commands);
    const baseStatusCount = baseline.statusItems.length;
    const baseSettingsCount = baseline.settingsTabs.length;
    const baseRibbonCount = baseline.ribbonIcons.length;

    async function assertCleanTeardown(label) {
      const snap = await snapshot(page);
      const leakedCommands = snap.commands.filter((id) => !baseCommandIds.has(id));
      if (leakedCommands.length > 0) {
        throw new Error(`${label}: leaked commands ${JSON.stringify(leakedCommands)}`);
      }
      if (snap.statusItems.length !== baseStatusCount) {
        throw new Error(
          `${label}: status item count drifted from ${baseStatusCount} to ${snap.statusItems.length}: ${JSON.stringify(snap.statusItems)}`,
        );
      }
      if (snap.settingsTabs.length !== baseSettingsCount) {
        throw new Error(
          `${label}: settings tab count drifted from ${baseSettingsCount} to ${snap.settingsTabs.length}: ${JSON.stringify(snap.settingsTabs)}`,
        );
      }
      if (snap.ribbonIcons.length !== baseRibbonCount) {
        throw new Error(
          `${label}: ribbon icon count drifted from ${baseRibbonCount} to ${snap.ribbonIcons.length}: ${JSON.stringify(snap.ribbonIcons)}`,
        );
      }
    }

    // Explicit per-fixture artifact maps. For each fixture we enumerate the
    // EXACT set of registrations it makes. The before/after-enable assertions
    // run only on the artifacts a fixture actually creates — we never short-
    // circuit by treating absence as success.
    const FIXTURE_ARTIFACTS = {
      "advanced-tables-shim": {
        commandIds: ["advanced-tables-shim:format-table"],
        ribbonTitles: ["Format table"],
        statusTexts: ["Tables: idle"],
        settingsTabPluginIds: [],
      },
      "obsidian-git-shim": {
        commandIds: ["obsidian-git-shim:commit-all", "obsidian-git-shim:get-last-commit"],
        ribbonTitles: [],
        statusTexts: [],
        settingsTabPluginIds: ["obsidian-git-shim"],
      },
      "calendar-shim": {
        commandIds: [],
        ribbonTitles: ["Open calendar"],
        statusTexts: [],
        settingsTabPluginIds: [],
      },
      "misbehaving-shim": {
        // Registered via the legacy api.* surface (no namespacing on the
        // command side, no command at all on this one). The status and
        // settings tab are tracked by the host registries keyed on pluginId.
        commandIds: [],
        ribbonTitles: [],
        statusTexts: ["misbehaving status"],
        settingsTabPluginIds: ["misbehaving-shim"],
      },
    };

    function assertArtifactsPresent(snap, fixtureId, label) {
      const expect = FIXTURE_ARTIFACTS[fixtureId];
      for (const id of expect.commandIds) {
        if (!snap.commands.includes(id)) {
          throw new Error(
            `${label}: fixture ${fixtureId} expected command "${id}" in ${JSON.stringify(snap.commands)}`,
          );
        }
      }
      for (const title of expect.ribbonTitles) {
        if (!snap.ribbonIcons.some((icon) => icon.title === title)) {
          throw new Error(
            `${label}: fixture ${fixtureId} expected ribbon icon "${title}" in ${JSON.stringify(snap.ribbonIcons)}`,
          );
        }
      }
      for (const text of expect.statusTexts) {
        if (!snap.statusItems.some((item) => item.text === text)) {
          throw new Error(
            `${label}: fixture ${fixtureId} expected status text "${text}" in ${JSON.stringify(snap.statusItems)}`,
          );
        }
      }
      for (const pluginId of expect.settingsTabPluginIds) {
        if (!snap.settingsTabs.some((tab) => tab.pluginId === pluginId)) {
          throw new Error(
            `${label}: fixture ${fixtureId} expected settings tab from "${pluginId}" in ${JSON.stringify(snap.settingsTabs)}`,
          );
        }
      }
    }

    function assertArtifactsAbsent(snap, fixtureId, label) {
      const expect = FIXTURE_ARTIFACTS[fixtureId];
      for (const id of expect.commandIds) {
        if (snap.commands.includes(id)) {
          throw new Error(`${label}: fixture ${fixtureId} still has command "${id}"`);
        }
      }
      for (const title of expect.ribbonTitles) {
        if (snap.ribbonIcons.some((icon) => icon.title === title)) {
          throw new Error(`${label}: fixture ${fixtureId} still has ribbon icon "${title}"`);
        }
      }
      for (const text of expect.statusTexts) {
        if (snap.statusItems.some((item) => item.text === text)) {
          throw new Error(`${label}: fixture ${fixtureId} still has status text "${text}"`);
        }
      }
      for (const pluginId of expect.settingsTabPluginIds) {
        if (snap.settingsTabs.some((tab) => tab.pluginId === pluginId)) {
          throw new Error(`${label}: fixture ${fixtureId} still has settings tab "${pluginId}"`);
        }
      }
    }

    // Before-enable baseline: every fixture-owned artifact must be absent.
    const preEnableSnap = await snapshot(page);
    for (const fixture of realFixtures) {
      assertArtifactsAbsent(preEnableSnap, fixture.id, "before-initial-enable");
    }

    // Enable each fixture, then verify ITS exact artifact set appeared.
    for (const fixture of realFixtures) {
      await page.evaluate((id) => window.__graniteCommunityPluginSetEnabled(id, true), fixture.id);
      assertArtifactsPresent(await snapshot(page), fixture.id, `after-enable ${fixture.id}`);
    }

    // -----------------------------------------------------------------------
    // FULL `loadData` / `saveData` round-trip across an enable/disable cycle.
    // 1) Invoke obsidian-git-shim:commit-all — saveData writes data.json.
    // 2) Read data.json from disk to capture the written `lastCommit` value.
    // 3) Disable then re-enable obsidian-git-shim — onload calls loadData.
    // 4) Invoke obsidian-git-shim:get-last-commit; the plugin stashes the
    //    value it loaded into window.__graniteGitFixture.commandReadLastCommit.
    // 5) Assert that the read-back value matches what was originally saved.
    // -----------------------------------------------------------------------
    await page.evaluate(async () => {
      const registry = window.__graniteCommunityPluginCommandRegistry;
      const cmd = registry.get("obsidian-git-shim:commit-all");
      if (!cmd) throw new Error("commit-all command missing during saveData phase");
      await cmd.callback();
    });
    await page.waitForFunction(
      async () => {
        try {
          const text = await window.__graniteCommunityPluginReadVaultText(
            ".granite/plugins/obsidian-git-shim/data.json",
          );
          return typeof JSON.parse(text).lastCommit === "string";
        } catch {
          return false;
        }
      },
      null,
      { timeout: 5_000 },
    );
    const savedData = JSON.parse(
      await page.evaluate(() =>
        window.__graniteCommunityPluginReadVaultText(
          ".granite/plugins/obsidian-git-shim/data.json",
        ),
      ),
    );
    if (typeof savedData.lastCommit !== "string") {
      throw new Error(`saveData wrote invalid data: ${JSON.stringify(savedData)}`);
    }
    // Disable + re-enable to force a fresh onload (and therefore a fresh
    // loadData call).
    await page.evaluate(() =>
      window.__graniteCommunityPluginSetEnabled("obsidian-git-shim", false),
    );
    await page.evaluate(() =>
      window.__graniteCommunityPluginSetEnabled("obsidian-git-shim", true),
    );
    // The fixture stashes the value loadData returned on the window. Wait
    // until that field reflects what we just saved.
    await page.waitForFunction(
      (expected) => window.__graniteGitFixture?.loadedLastCommit === expected,
      savedData.lastCommit,
      { timeout: 5_000 },
    );
    // Also confirm the in-memory `settings.lastCommit` round-trips through a
    // command callback (rules out a stale window stash from a previous load).
    await page.evaluate(async () => {
      const registry = window.__graniteCommunityPluginCommandRegistry;
      const cmd = registry.get("obsidian-git-shim:get-last-commit");
      if (!cmd) throw new Error("get-last-commit command missing after re-enable");
      await cmd.callback();
    });
    const commandRead = await page.evaluate(
      () => window.__graniteGitFixture?.commandReadLastCommit ?? null,
    );
    if (commandRead !== savedData.lastCommit) {
      throw new Error(
        `loadData/saveData round-trip mismatch: saved=${JSON.stringify(savedData.lastCommit)} commandRead=${JSON.stringify(commandRead)}`,
      );
    }

    // Now disable everything and assert a perfectly clean baseline.
    for (const fixture of realFixtures) {
      await page.evaluate((id) => window.__graniteCommunityPluginSetEnabled(id, false), fixture.id);
    }
    const postDisableSnap = await snapshot(page);
    for (const fixture of realFixtures) {
      assertArtifactsAbsent(postDisableSnap, fixture.id, "after-initial-disable");
    }
    await assertCleanTeardown("after-initial-disable");

    // -----------------------------------------------------------------------
    // SEVERE TEST: 50-cycle enable/disable storm across all three fixtures.
    // After every cycle, every artifact the plugins introduce MUST be gone.
    // This is the regression net for missed disposers in the obsidian-shim.
    // -----------------------------------------------------------------------
    const CYCLES = 50;
    const realIds = realFixtures.map((f) => f.id);
    for (let i = 0; i < CYCLES; i += 1) {
      // Enable in a different order each iteration to shake out interaction
      // bugs between plugins (e.g. shared ribbon container ordering).
      const order = i % 2 === 0 ? realFixtures : [...realFixtures].reverse();
      for (const fixture of order) {
        await page.evaluate(
          (id) => window.__graniteCommunityPluginSetEnabled(id, true),
          fixture.id,
        );
      }
      // Wait until the snapshot agrees that everyone we just enabled is
      // actually enabled — the loader's filesystem-watcher debounce can
      // otherwise re-run refreshAll() in the middle of the storm and produce
      // false negatives.
      try {
        await page.waitForFunction(
          (ids) => {
            const snap = window.__graniteCommunityPluginSnapshot();
            return ids.every(
              (id) => snap.plugins.find((p) => p.id === id)?.enabled === true,
            );
          },
          realIds,
          { timeout: 5_000 },
        );
      } catch (err) {
        const snap = await snapshot(page);
        throw new Error(
          `storm-cycle-${i} timeout waiting for all-enabled. order=${JSON.stringify(order.map((f) => f.id))} plugins=${JSON.stringify(snap.plugins)} notices=${JSON.stringify(snap.notices)}`,
        );
      }
      // Mid-cycle sanity: each fixture's EXACT artifact set must be present.
      // No short-circuiting on absence — every fixture is checked against
      // its own enumerated artifact list.
      const snapMid = await snapshot(page);
      for (const fixture of realFixtures) {
        assertArtifactsPresent(snapMid, fixture.id, `storm-cycle-${i}-mid`);
      }
      for (const fixture of order) {
        await page.evaluate(
          (id) => window.__graniteCommunityPluginSetEnabled(id, false),
          fixture.id,
        );
      }
      try {
        await page.waitForFunction(
          (ids) => {
            const snap = window.__graniteCommunityPluginSnapshot();
            return ids.every(
              (id) => snap.plugins.find((p) => p.id === id)?.enabled === false,
            );
          },
          realIds,
          { timeout: 5_000 },
        );
      } catch (err) {
        const snap = await snapshot(page);
        throw new Error(
          `storm-cycle-${i} timeout waiting for all-disabled. order=${JSON.stringify(order.map((f) => f.id))} plugins=${JSON.stringify(snap.plugins)} notices=${JSON.stringify(snap.notices)}`,
        );
      }
      const snapPost = await snapshot(page);
      for (const fixture of realFixtures) {
        assertArtifactsAbsent(snapPost, fixture.id, `storm-cycle-${i}-post`);
      }
      await assertCleanTeardown(`storm-cycle-${i}`);
    }

    // Calendar-shim's interval must also be torn down. If it was still
    // ticking we'd see `__graniteCalendarFixture.ticks` increment after the
    // storm finishes. Snapshot now, wait, snapshot again — counts must match.
    const ticksBefore = await page.evaluate(
      () => window.__graniteCalendarFixture?.ticks ?? 0,
    );
    await delay(200);
    const ticksAfter = await page.evaluate(
      () => window.__graniteCalendarFixture?.ticks ?? 0,
    );
    if (ticksAfter !== ticksBefore) {
      throw new Error(
        `Calendar interval leaked: ticks went ${ticksBefore} -> ${ticksAfter} after storm`,
      );
    }

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
