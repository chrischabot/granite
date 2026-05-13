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

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/scripts/search-performance-browser-fixture.html`, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(`${baseUrl}/scripts/search-performance-browser-fixture.html`, {
      waitUntil: "networkidle",
    });
    const result = await page.evaluate(() => window.__graniteSearchPerformanceResult);
    if (!result?.ok) {
      throw new Error(
        `Search performance browser verification failed:\n${JSON.stringify(
          result,
          null,
          2,
        )}\n${consoleMessages.join("\n")}`,
      );
    }
    console.log("Search performance browser verification passed.");
    console.log(
      `Quick switcher entries: ${result.quickSwitcher.entries}; timings: ${result.quickSwitcher.timings
        .map((t) => `${t.query}=${t.elapsedMs.toFixed(2)}ms`)
        .join(", ")}`,
    );
    console.log(
      `Regex/property search: ${result.regexSearch.notes} notes, ${result.regexSearch.matches} matches, ${result.regexSearch.elapsedMs.toFixed(
        2,
      )} ms`,
    );
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
