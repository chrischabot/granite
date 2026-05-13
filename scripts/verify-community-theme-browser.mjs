import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/scripts/community-theme-browser-fixture.html`, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 840 } });
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(`${baseUrl}/scripts/community-theme-browser-fixture.html`, {
      waitUntil: "networkidle",
    });
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
