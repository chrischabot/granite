import { withBrowser, withDevServer, runMain } from "./_lib/dev-server.mjs";

async function activeSummary(page) {
  return await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return "none";
    return [
      el.tagName.toLowerCase(),
      el.getAttribute("aria-label") ?? "",
      el.getAttribute("placeholder") ?? "",
      el.textContent?.trim().slice(0, 60) ?? "",
      el.className,
    ]
      .filter(Boolean)
      .join(" | ");
  });
}

async function assertFocusInside(page, selector, label) {
  const inside = await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    return !!root && !!document.activeElement && root.contains(document.activeElement);
  }, selector);
  if (!inside) throw new Error(`Focus escaped ${label}; active=${await activeSummary(page)}`);
}

async function openDialogWithKeyboard(page, controlLabel, dialogName, label, tabCount = 8) {
  const control = page.locator(`[aria-label="${controlLabel}"]`).first();
  const count = await control.count();
  if (count === 0) throw new Error(`Missing keyboard-reachable control: ${controlLabel}`);
  await control.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: dialogName });
  await dialog.waitFor({ state: "visible" });
  await assertFocusInside(page, "dialog[open]", `${label} on open`);
  for (let i = 0; i < tabCount; i++) {
    await page.keyboard.press("Tab");
    await assertFocusInside(page, "dialog[open]", `${label} tab trap`);
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
}

runMain(() =>
  withDevServer(async ({ baseUrl }) =>
    withBrowser(
      async ({ page, consoleMessages }) => {
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".app-container");

    for (const label of [
      "Navigate back",
      "Navigate forward",
      "New tab",
      "Open quick switcher",
      "Open command palette",
      "Manage vaults",
      "Open help",
      "Open settings",
    ]) {
      const count = await page.locator(`[aria-label="${label}"]`).count();
      if (count === 0) throw new Error(`Missing keyboard-reachable control: ${label}`);
    }

    const tabTrace = [];
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press("Tab");
      tabTrace.push(await activeSummary(page));
    }
    const distinctFocusTargets = new Set(tabTrace.filter((item) => !item.startsWith("body")));
    if (distinctFocusTargets.size < 6) {
      throw new Error(`Tab traversal reached too few targets:\n${tabTrace.join("\n")}`);
    }

    await openDialogWithKeyboard(
      page,
      "Manage vaults",
      "Manage vaults",
      "Vault picker dialog",
      10,
    );
    await openDialogWithKeyboard(
      page,
      "Open help",
      "Granite cheat-sheet",
      "Help dialog",
      10,
    );
    await openDialogWithKeyboard(
      page,
      "Open settings",
      "Settings",
      "Settings dialog",
      12,
    );

    const paletteButton = page.locator('[aria-label="Open command palette"]').first();
    await paletteButton.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector(".prompt");
    await assertFocusInside(page, ".prompt", "Command palette on open");
    const input = page.locator(".prompt-input");
    const before = await input.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    const after = await input.getAttribute("aria-activedescendant");
    if (before === after) {
      throw new Error(`Command palette ArrowDown did not move active descendant (${before})`);
    }
    await page.keyboard.press("Escape");
    await page.waitForSelector(".prompt", { state: "hidden" });

    console.log("Keyboard browser audit passed.");
    console.log(`Distinct tab targets: ${distinctFocusTargets.size}`);
    console.log(tabTrace.map((item, i) => `${i + 1}. ${item}`).join("\n"));
  } catch (error) {
    if (consoleMessages.length > 0) {
      console.error(consoleMessages.join("\n"));
    }
    throw error;
  }
      },
      { viewport: { width: 1280, height: 820 } },
    ),
  ),
);
