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

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port);
  let browser;

  try {
    await waitForServer(`${baseUrl}/docs/index.html`, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });

    await page.goto(`${baseUrl}/docs/index.html`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Vault format and extension API" }).waitFor();

    const background = await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor);
    if (background === "rgba(0, 0, 0, 0)" || background === "transparent") {
      throw new Error("Docs stylesheet did not apply a readable page background");
    }

    const links = await page
      .getByRole("navigation", { name: "Documentation sections" })
      .locator("a")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          href: node.getAttribute("href") ?? "",
          text: node.textContent?.trim() ?? "",
        })),
      );
    const expected = new Map([
      ["./vault-format.md", ["Granite Vault Format", "Atomic write", "JSON Canvas"]],
      ["./plugin-api.md", ["Plugin API", "PluginApi", "loadData"]],
      [
        "./contributor-guide.md",
        ["Contributor Guide", "Plugin API Discipline", "severe-testing.md"],
      ],
    ]);

    if (links.length !== expected.size) {
      throw new Error(`Unexpected docs link count: ${JSON.stringify(links)}`);
    }

    for (const [href, requiredText] of expected) {
      const link = links.find((candidate) => candidate.href === href);
      if (!link) throw new Error(`Missing docs link: ${href}; saw ${JSON.stringify(links)}`);
      const response = await page.goto(new URL(href, `${baseUrl}/docs/index.html`).toString(), {
        waitUntil: "networkidle",
      });
      if (!response?.ok()) {
        throw new Error(`Docs page ${href} failed to load: ${response?.status()}`);
      }
      const bodyText = await page.locator("body").innerText();
      for (const text of requiredText) {
        if (!bodyText.includes(text)) {
          throw new Error(
            `Docs page ${href} is missing readable text "${text}":\n${bodyText.slice(0, 1000)}`,
          );
        }
      }
      if (bodyText.length < 400) {
        throw new Error(
          `Docs page ${href} is too short to be useful/readable (${bodyText.length} chars)`,
        );
      }
    }

    console.log("Docs browser verification passed.");
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
