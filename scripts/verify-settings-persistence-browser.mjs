import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteSettingsPersistenceReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteSettingsPersistenceError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.getByRole("dialog", { name: "Settings" }).waitFor();
}

async function diskSettings(page) {
  return await page.evaluate(() => window.__graniteSettingsPersistenceReadDiskSettings());
}

async function currentSettings(page) {
  return await page.evaluate(() => window.__graniteSettingsPersistenceState());
}

async function activeVaultName(page) {
  return await page.evaluate(() => window.__graniteSettingsPersistenceActiveVaultName());
}

async function defaultKeys(page) {
  return await page.evaluate(() => window.__graniteSettingsPersistenceDefaultKeys);
}

async function waitForDiskFontSize(page, value) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await diskSettings(page);
    if (last.fontSize === value) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for disk fontSize ${value}; last=${JSON.stringify(last)}`);
}

async function setFontSizeThroughSettings(page, value) {
  await page.getByRole("button", { name: "Appearance" }).click();
  const slider = page.locator("input[type='range']").first();
  await slider.waitFor();
  await slider.fill(String(value));
  await waitForDiskFontSize(page, value);
}

function assertHasEveryDefaultKey(settings, keys, label) {
  const missing = keys.filter((key) => !(key in settings));
  if (missing.length > 0) {
    throw new Error(`${label} missing default keys: ${missing.join(", ")}`);
  }
}

async function openVault(page, name) {
  await page.evaluate((vaultName) => window.__graniteSettingsPersistenceOpenVault(vaultName), name);
  await page.waitForFunction(
    (vaultName) =>
      window.__graniteSettingsPersistenceActiveVaultName() === vaultName &&
      window.__graniteSettingsPersistenceState().fontSize !== undefined,
    name,
  );
}

const vault = `settings-persistence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const otherVault = `${vault}-other`;

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/settings-persistence-browser-fixture.html",
    viewport: { width: 1180, height: 820 },
    query: { vault },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    const keys = await defaultKeys(page);
    const freshDisk = await diskSettings(page);
    assertHasEveryDefaultKey(freshDisk, keys, "fresh .granite/settings.json");
    if (freshDisk.fontSize !== 16) {
      throw new Error(`Expected fresh vault default fontSize 16, got ${freshDisk.fontSize}`);
    }

    await setFontSizeThroughSettings(page, 19);
    const savedFirst = await diskSettings(page);
    assertHasEveryDefaultKey(savedFirst, keys, "updated first vault settings");
    if (savedFirst.fontSize !== 19) {
      throw new Error(`First vault did not save fontSize 19 before reload, got ${savedFirst.fontSize}`);
    }

    await page.evaluate(() => window.__graniteSettingsPersistenceSetLegacy({ fontSize: 24 }));
    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    const activeAfterReload = await activeVaultName(page);
    const afterReloadState = await currentSettings(page);
    const afterReloadDisk = await diskSettings(page);
    if (afterReloadState.fontSize !== 19 || afterReloadDisk.fontSize !== 19) {
      throw new Error(
        `Reload did not hydrate fontSize from disk over legacy localStorage: active=${activeAfterReload}, state=${afterReloadState.fontSize}, disk=${afterReloadDisk.fontSize}, beforeReload=${JSON.stringify(savedFirst)}`,
      );
    }

    await openVault(page, otherVault);
    await setFontSizeThroughSettings(page, 22);
    const savedSecond = await diskSettings(page);
    if (savedSecond.fontSize !== 22) {
      throw new Error(`Second vault did not save fontSize 22, got ${savedSecond.fontSize}`);
    }

    await openVault(page, vault);
    const firstAgain = await currentSettings(page);
    const firstDiskAgain = await diskSettings(page);
    if (firstAgain.fontSize !== 19 || firstDiskAgain.fontSize !== 19) {
      throw new Error(
        `Switching back to first vault did not hydrate its own settings: state=${firstAgain.fontSize}, disk=${firstDiskAgain.fontSize}`,
      );
    }

    await openVault(page, otherVault);
    const secondAgain = await currentSettings(page);
    const secondDiskAgain = await diskSettings(page);
    if (secondAgain.fontSize !== 22 || secondDiskAgain.fontSize !== 22) {
      throw new Error(
        `Switching back to second vault did not hydrate its own settings: state=${secondAgain.fontSize}, disk=${secondDiskAgain.fontSize}`,
      );
    }

    console.log("Settings persistence browser verification passed.");
    console.log(`Default key count: ${keys.length}`);
    console.log(`First vault fontSize after reload: ${afterReloadState.fontSize}`);
    console.log(`Second vault fontSize: ${secondAgain.fontSize}`);
  } catch (error) {
    const noisy = consoleMessages.filter(
      (m) => !m.includes("Download the React DevTools"),
    );
    if (noisy.length > 0) console.error(noisy.join("\n"));
    throw error;
  }
    },
  }),
);
