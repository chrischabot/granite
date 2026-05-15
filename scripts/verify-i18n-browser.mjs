import { withBrowser, withDevServer, runMain } from "./_lib/dev-server.mjs";

async function assertVisibleText(page, text, label) {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: "visible", timeout: 3000 });
  return label;
}

async function assertDocumentText(page, text, label) {
  await page.waitForFunction((needle) => document.body.innerText.includes(needle), text, {
    timeout: 3000,
  });
  return label;
}

async function assertButton(page, name, label) {
  await page.getByRole("button", { name }).first().waitFor({ state: "visible", timeout: 3000 });
  return label;
}

async function t(page, key, params = {}) {
  return await page.evaluate(
    async ({ i18nKey, i18nParams }) => {
      const i18n = await import("/src/core/i18n/index.ts");
      return i18n.t(i18nKey, i18nParams);
    },
    { i18nKey: key, i18nParams: params },
  );
}

async function assertBodyIncludes(page, text, label) {
  try {
    await page.waitForFunction((needle) => document.body.innerText.includes(needle), text, {
      timeout: 5000,
    });
  } catch (error) {
    const sample = await page.evaluate(() => document.body.innerText.slice(0, 3000));
    throw new Error(
      `${label} missing body text "${text}": ${
        error instanceof Error ? error.message : String(error)
      }\nBody sample:\n${sample}`,
    );
  }
  return label;
}

async function assertLabelExists(page, text, label) {
  try {
    await page.waitForFunction(
      (needle) =>
        [...document.querySelectorAll("[aria-label], [placeholder], [title]")]
          .flatMap((node) => [
            node.getAttribute("aria-label"),
            node.getAttribute("placeholder"),
            node.getAttribute("title"),
          ])
          .some((value) => value === needle),
      text,
      { timeout: 5000 },
    );
  } catch (error) {
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-label], [placeholder], [title]")]
        .flatMap((node) => [
          node.getAttribute("aria-label"),
          node.getAttribute("placeholder"),
          node.getAttribute("title"),
        ])
        .filter(Boolean)
        .slice(0, 120),
    );
    throw new Error(
      `${label} missing label/placeholder/title "${text}": ${
        error instanceof Error ? error.message : String(error)
      }\nLabels:\n${labels.join(" | ")}`,
    );
  }
  return label;
}

async function verifyPopulatedRuntimeI18n(page, baseUrl) {
  const vault = `i18n-populated-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto(`${baseUrl}/scripts/rtl-browser-fixture.html?vault=${vault}`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => window.__graniteRtlBrowserReady === true, null, {
    timeout: 15_000,
  });
  const error = await page.evaluate(() => window.__graniteRtlBrowserError ?? null);
  if (error) throw new Error(`Populated i18n fixture failed: ${error}`);
  await page.waitForFunction(() => document.documentElement.dir === "rtl");

  await page.evaluate(() => window.__graniteRtlBrowserShowNotice());
  await page.getByRole("alert").waitFor({ state: "visible", timeout: 3000 });

  const bodyChecks = [
    ["search.matchCase", {}, "Search match-case label"],
    ["search.sort", {}, "Search sort label"],
    ["tags.showNested", {}, "Tags nested toggle"],
    ["backlinks.line", { line: "3" }, "Backlinks line label"],
    ["backlinks.unlinked.title", {}, "Backlinks unlinked section"],
    ["localGraph.neighbor", { count: "1" }, "Local graph neighbor count"],
    ["properties.addAction", {}, "Properties add action"],
    ["propertyType.date", {}, "All properties type label"],
    ["graph.controls.title", {}, "Graph controls title"],
    ["bases.filterLabel", {}, "Bases filter label"],
    ["vaultPicker.title", {}, "Vault Picker title"],
    ["settings.group.options", {}, "Settings options group"],
    ["status.localOnly", {}, "Status bar local-only label"],
  ];

  const checks = [];
  for (const [key, params, label] of bodyChecks) {
    checks.push(await assertBodyIncludes(page, await t(page, key, params), label));
  }

  const labelChecks = [
    ["search.placeholder", {}, "Search placeholder"],
    ["outline.filterPlaceholder", {}, "Outline placeholder"],
    ["recents.remove", {}, "Recents remove action"],
    [
      "footnotes.referenceTitle",
      { count: "1", referenceLabel: await t(page, "footnotes.reference") },
      "Footnotes reference title",
    ],
    [
      "allProperties.usageTitle",
      { count: "1", noteLabel: await t(page, "properties.note") },
      "All properties usage tooltip",
    ],
    ["fileExplorer.action.newNote", {}, "File Explorer new-note aria label"],
    ["fileExplorer.action.newFolder", {}, "File Explorer new-folder aria label"],
    ["fileExplorer.action.sortOrder", {}, "File Explorer sort aria label"],
    ["quickSwitcher.placeholder", {}, "Quick Switcher placeholder"],
    ["commandPalette.placeholder", {}, "Command Palette placeholder"],
    ["templatePicker.placeholder", {}, "Template Picker placeholder"],
    ["settings.title", {}, "Settings dialog label"],
    ["modal.close", {}, "Modal close label"],
    ["canvas.action.addText", {}, "Canvas add-text aria label"],
    ["canvas.action.disableSnap", {}, "Canvas snap aria label"],
    ["graph.controls.hide", {}, "Graph controls aria label"],
    ["notice.dismiss", {}, "Notice dismiss aria label"],
  ];
  for (const [key, params, label] of labelChecks) {
    checks.push(await assertLabelExists(page, await t(page, key, params), label));
  }

  const runtime = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    bodyClasses: [...document.body.classList].filter(
      (name) => name === "is-rtl" || name === "mod-rtl",
    ),
    alertText: document.querySelector("[role='alert']")?.textContent?.trim() ?? "",
    textSample: document.body.innerText.slice(0, 1000),
  }));
  if (runtime.dir !== "rtl") throw new Error(`Populated fixture dir changed: ${runtime.dir}`);
  if (!runtime.bodyClasses.includes("is-rtl") || !runtime.bodyClasses.includes("mod-rtl")) {
    throw new Error(`Populated fixture RTL body classes missing: ${JSON.stringify(runtime)}`);
  }
  return checks;
}

runMain(() =>
  withDevServer(async ({ baseUrl }) =>
    withBrowser(
      async ({ page }) => {
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator(".app-container").waitFor({ state: "visible", timeout: 5000 });
    await assertVisibleText(page, "Welcome to Granite", "English welcome");
    await assertButton(page, "Open settings", "English settings ribbon label");

    await page.evaluate(async () => {
      const i18n = await import("/src/core/i18n/index.ts");
      i18n.setLocale("he");
    });
    await page.waitForFunction(() => document.documentElement.dir === "rtl");
    await page.waitForFunction(() => document.body.classList.contains("is-rtl"));

    const checks = [];
    checks.push(await assertVisibleText(page, "ברוכים הבאים לגרניט", "Hebrew welcome"));
    checks.push(await assertButton(page, "פתיחת הגדרות", "Hebrew settings ribbon label"));
    checks.push(
      await assertButton(page, "פתיחת מחליף הכספות", "Hebrew vault switcher welcome action"),
    );

    await page.getByRole("button", { name: "פתיחת הגדרות" }).first().click();
    await page.getByRole("dialog", { name: "הגדרות" }).waitFor({ state: "visible", timeout: 3000 });
    checks.push(await assertVisibleText(page, "אפשרויות", "Hebrew settings options heading"));
    checks.push(await assertVisibleText(page, "מראה", "Hebrew settings appearance tab"));
    checks.push(
      await assertDocumentText(
        page,
        "התראה אם ההפעלה נמשכת יותר מהצפוי",
        "Hebrew settings control label",
      ),
    );
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "פתיחת פלטת הפקודות" }).first().click();
    await page.locator(".prompt").waitFor({ state: "visible", timeout: 3000 });
    const promptPlaceholder = await page.locator(".prompt-input").getAttribute("placeholder");
    if (promptPlaceholder !== "הקלדת פקודה...") {
      throw new Error(`Command palette placeholder did not localize: ${promptPlaceholder}`);
    }
    checks.push("Hebrew command palette placeholder");
    await page.keyboard.press("Escape");

    const result = await page.evaluate(() => ({
      locale: localStorage.getItem("granite.locale.v1"),
      dir: document.documentElement.dir,
      bodyClasses: [...document.body.classList].filter(
        (name) => name === "is-rtl" || name === "mod-rtl",
      ),
      settingsLabel: document
        .querySelector('[aria-label="פתיחת הגדרות"]')
        ?.getAttribute("aria-label"),
      text: document.body.innerText.slice(0, 5000),
    }));
    if (result.locale !== "he")
      throw new Error(`Locale did not persist to localStorage: ${result.locale}`);
    if (result.dir !== "rtl") throw new Error(`Document direction was not rtl: ${result.dir}`);
    if (!result.bodyClasses.includes("is-rtl") || !result.bodyClasses.includes("mod-rtl")) {
      throw new Error(`RTL body classes missing: ${JSON.stringify(result.bodyClasses)}`);
    }
    if (result.settingsLabel !== "פתיחת הגדרות") {
      throw new Error(`Localized aria label missing after switch: ${JSON.stringify(result)}`);
    }

    console.log("i18n browser verification passed.");
    console.log(`Checks: ${checks.join("; ")}`);
    console.log(
      `Runtime: locale=${result.locale}, dir=${result.dir}, classes=${result.bodyClasses.join(",")}`,
    );

    const populatedChecks = await verifyPopulatedRuntimeI18n(page, baseUrl);
    console.log(`Populated checks: ${populatedChecks.join("; ")}`);
  } catch (error) {
    throw error;
  }
      },
      { viewport: { width: 1280, height: 840 } },
    ),
  ),
);
