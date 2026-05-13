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
  await page.waitForFunction(() => window.__graniteGfmBrowserReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteGfmBrowserError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".markdown-rendered").waitFor();
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `gfm-browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/gfm-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await page.locator("s", { hasText: "removed" }).waitFor();
    await page.locator("table").waitFor();
    const table = await page.evaluate(() => {
      const th = [...document.querySelectorAll("th")].map((cell) => ({
        text: cell.textContent?.trim(),
        align: cell.style.textAlign,
      }));
      const td = [...document.querySelectorAll("td")].map((cell) => ({
        text: cell.textContent?.trim(),
        align: cell.style.textAlign,
      }));
      return { th, td };
    });
    if (
      table.th[0]?.text !== "A" ||
      table.th[0]?.align !== "left" ||
      table.th[1]?.text !== "B" ||
      table.th[1]?.align !== "right" ||
      table.td[0]?.text !== "1" ||
      table.td[0]?.align !== "left" ||
      table.td[1]?.text !== "2" ||
      table.td[1]?.align !== "right"
    ) {
      throw new Error(`GFM table alignment mismatch: ${JSON.stringify(table)}`);
    }

    const links = await page.evaluate(() =>
      [...document.querySelectorAll(".markdown-rendered a")].map((a) => ({
        text: a.textContent,
        href: a.getAttribute("href"),
        nextText: a.nextSibling?.textContent ?? "",
      })),
    );
    const bareUrl = links.find((link) => link.text === "https://example.com/a_(b)");
    const bareEmail = links.find((link) => link.text === "test@example.com");
    const angleUrl = links.find((link) => link.text === "https://example.com?q=1");
    const angleEmail = links.find((link) => link.text === "user@example.com");
    if (bareUrl?.href !== "https://example.com/a_(b)" || !bareUrl.nextText.startsWith(".")) {
      throw new Error(`Bare URL autolink mismatch: ${JSON.stringify(links)}`);
    }
    if (bareEmail?.href !== "mailto:test@example.com" || !bareEmail.nextText.startsWith(".")) {
      throw new Error(`Bare email autolink mismatch: ${JSON.stringify(links)}`);
    }
    if (angleUrl?.href !== "https://example.com?q=1" || !angleUrl.nextText.startsWith(",")) {
      throw new Error(`Angle URL autolink mismatch: ${JSON.stringify(links)}`);
    }
    if (angleEmail?.href !== "mailto:user@example.com" || !angleEmail.nextText.startsWith(".")) {
      throw new Error(`Angle email autolink mismatch: ${JSON.stringify(links)}`);
    }

    const tasks = await page.evaluate(() =>
      [...document.querySelectorAll(".task-list-item")].map((item) => {
        const input = item.querySelector(".task-list-item-checkbox");
        return {
        task: item.getAttribute("data-task"),
        checked: input.hasAttribute("checked"),
        dataChecked: input.getAttribute("data-checked"),
        };
      }),
    );
    if (
      tasks.length !== 2 ||
      tasks[0]?.task !== "?" ||
      tasks[0]?.dataChecked !== "?" ||
      tasks[0]?.checked !== true ||
      tasks[1]?.task !== "-" ||
      tasks[1]?.dataChecked !== "-" ||
      tasks[1]?.checked !== true
    ) {
      throw new Error(`Custom task marker mismatch: ${JSON.stringify(tasks)}`);
    }
    const bodyText = await page.locator(".markdown-rendered").textContent();
    if (bodyText?.includes("[?] waiting") || bodyText?.includes("[-] cancelled")) {
      throw new Error("Custom task source markers leaked into Reading mode text");
    }

    console.log("GFM browser verification passed.");
    console.log(`Table: ${JSON.stringify(table)}`);
    console.log(`Links: ${JSON.stringify(links)}`);
    console.log(`Tasks: ${JSON.stringify(tasks)}`);
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
