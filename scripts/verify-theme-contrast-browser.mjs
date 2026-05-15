import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

function parseRgb(color) {
  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Unsupported computed color: ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(parseRgb(foreground));
  const bg = relativeLuminance(parseRgb(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/theme-contrast-browser-fixture.html",
    viewport: { width: 800, height: 480 },
    body: async ({ page, consoleMessages }) => {
      try {
        await page.waitForFunction(() => window.__graniteThemeContrastReady === true);
        const cases = [
          { name: "light", theme: "light", highContrast: false },
          { name: "dark", theme: "dark", highContrast: false },
          { name: "light high contrast", theme: "light", highContrast: true },
          { name: "dark high contrast", theme: "dark", highContrast: true },
        ];
        const results = [];
        for (const testCase of cases) {
          await page.evaluate(
            ({ theme, highContrast }) => window.__graniteThemeContrastSet(theme, highContrast),
            testCase,
          );
          const computed = await page.evaluate(() => window.__graniteThemeContrastComputed());
          const ratio = contrastRatio(computed.color, computed.backgroundColor);
          results.push({ ...testCase, ratio, computed });
          if (ratio < 4.5) {
            throw new Error(
              `${testCase.name} body contrast ${ratio.toFixed(2)} is below 4.5:1: ${JSON.stringify(computed)}`,
            );
          }
          if (!computed.textNormal || !computed.backgroundPrimary) {
            throw new Error(
              `${testCase.name} did not compute body token variables: ${JSON.stringify(computed)}`,
            );
          }
        }
        console.log("Theme contrast browser verification passed.");
        for (const result of results) {
          console.log(
            `${result.name}: ${result.ratio.toFixed(2)} (${result.computed.color} on ${result.computed.backgroundColor})`,
          );
        }
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
