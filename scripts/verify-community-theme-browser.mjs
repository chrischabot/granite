import { createHash } from "node:crypto";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

function assertSnapshot(label, snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`${label} produced an empty computed style for ${key}`);
    }
  }
  if (snapshot.bodyBackground === "rgba(0, 0, 0, 0)") {
    throw new Error(`${label} body background is transparent`);
  }
  if (snapshot.markdownText === snapshot.bodyBackground) {
    throw new Error(`${label} text and background collapsed to the same color`);
  }
}

async function capture(page, label, path, mode) {
  const snapshot = await page.evaluate(
    ({ themePath, themeMode }) =>
      window.__graniteCommunityThemeFixture.applyTheme(themePath, themeMode),
    { themePath: path, themeMode: mode },
  );
  assertSnapshot(label, snapshot);
  const png = await page.locator("#visual-root").screenshot();
  if (png.length < 10_000) throw new Error(`${label} screenshot was too small to be credible`);
  return { label, snapshot, hash: hash(png), bytes: png.length };
}

async function verifyExternalReload(page, themePath) {
  const updatedCss = `
.theme-light {
  --background-primary: #102030;
  --background-secondary: #1a3040;
  --text-normal: #f6fbff;
  --interactive-accent: #88c0d0;
  --graph-node: #88c0d0;
}
.theme-dark {
  --background-primary: #102030;
  --background-secondary: #1a3040;
  --text-normal: #f6fbff;
  --interactive-accent: #88c0d0;
  --graph-node: #88c0d0;
}
`;
  const before = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--background-primary").trim(),
  );
  const after = await page.evaluate(
    ({ path, css }) => window.__graniteCommunityThemeFixture.editTheme(path, css),
    { path: themePath, css: updatedCss },
  );
  if (after.backgroundPrimary !== "#102030") {
    throw new Error(
      `Edited community theme did not reload expected token: ${JSON.stringify(after)}`,
    );
  }
  if (before === after.backgroundPrimary) {
    throw new Error(
      `Edited community theme token did not change: before=${before}, after=${after.backgroundPrimary}`,
    );
  }
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/community-theme-browser-fixture.html",
    viewport: { width: 1280, height: 840 },
    body: async ({ page, consoleMessages }) => {
    const initial = await page.evaluate(() => window.__graniteCommunityThemeFixture.run());
    if (!initial?.ok) {
      throw new Error(
        `Community theme browser setup failed:\n${JSON.stringify(initial, null, 2)}\n${consoleMessages.join("\n")}`,
      );
    }
    if (initial.themes.length !== 2) {
      throw new Error(`Expected 2 discovered themes, saw ${initial.themes.length}`);
    }

    const themeA = await page.evaluate(() => window.__graniteCommunityThemeFixture.themeA);
    const themeB = await page.evaluate(() => window.__graniteCommunityThemeFixture.themeB);
    const captures = [
      await capture(page, "Nordic Minimal light", themeA, "light"),
      await capture(page, "Nordic Minimal dark", themeA, "dark"),
      await capture(page, "Highland Contrast light", themeB, "light"),
      await capture(page, "Highland Contrast dark", themeB, "dark"),
    ];
    const hashes = new Set(captures.map((capture) => capture.hash));
    if (hashes.size !== captures.length) {
      throw new Error(
        `Theme screenshots did not produce distinct visual hashes: ${JSON.stringify(captures)}`,
      );
    }
    const activeThemes = new Set(captures.map((capture) => capture.snapshot.activeTheme));
    if (!activeThemes.has(themeA) || !activeThemes.has(themeB)) {
      throw new Error(
        `Theme loader did not switch across both themes: ${JSON.stringify(captures)}`,
      );
    }
    await verifyExternalReload(page, themeB);

    console.log("Community theme browser visual verification passed.");
    for (const captureResult of captures) {
      console.log(
        `${captureResult.label}: ${captureResult.hash}, ${captureResult.bytes} bytes, ${captureResult.snapshot.backgroundPrimary}, ${captureResult.snapshot.textNormal}`,
      );
    }
    },
  }),
);
