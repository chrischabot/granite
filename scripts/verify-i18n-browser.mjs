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

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port);
  let browser;

  try {
    await waitForServer(baseUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 840 } });
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

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
    checks.push(await assertButton(page, "פתיחת מחליף הכספות", "Hebrew vault switcher welcome action"));

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
      bodyClasses: [...document.body.classList].filter((name) => name === "is-rtl" || name === "mod-rtl"),
      settingsLabel: document
        .querySelector('[aria-label="פתיחת הגדרות"]')
        ?.getAttribute("aria-label"),
      text: document.body.innerText.slice(0, 5000),
    }));
    if (result.locale !== "he") throw new Error(`Locale did not persist to localStorage: ${result.locale}`);
    if (result.dir !== "rtl") throw new Error(`Document direction was not rtl: ${result.dir}`);
    if (!result.bodyClasses.includes("is-rtl") || !result.bodyClasses.includes("mod-rtl")) {
      throw new Error(`RTL body classes missing: ${JSON.stringify(result.bodyClasses)}`);
    }
    if (result.settingsLabel !== "פתיחת הגדרות") {
      throw new Error(`Localized aria label missing after switch: ${JSON.stringify(result)}`);
    }

    console.log("i18n browser verification passed.");
    console.log(`Checks: ${checks.join("; ")}`);
    console.log(`Runtime: locale=${result.locale}, dir=${result.dir}, classes=${result.bodyClasses.join(",")}`);
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
