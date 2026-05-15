import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const DEFAULT_VITE_BOOT_MS = 15_000;
const POLL_INTERVAL_MS = 100;
const OUTPUT_CAP_BYTES = 20_000;

async function getOpenPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a local port");
  }
  return address.port;
}

function startVite(port, { cwd = process.cwd() } = {}) {
  const output = { text: "", exitCode: null };
  const child = spawn(
    "bunx",
    ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );
  const append = (chunk) => {
    output.text += chunk.toString();
    if (output.text.length > OUTPUT_CAP_BYTES) {
      output.text = output.text.slice(-OUTPUT_CAP_BYTES);
    }
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code) => {
    output.exitCode = code;
  });
  return { child, output };
}

async function waitForServer(url, output, { timeoutMs = DEFAULT_VITE_BOOT_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still booting.
    }
    if (output.exitCode !== null) {
      throw new Error(`Vite exited before becoming ready:\n${output.text}`);
    }
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for Vite at ${url}\n${output.text}`);
}

async function stopVite(child) {
  if (!child) return;
  child.kill("SIGTERM");
  await delay(100);
  if (child.exitCode === null) child.kill("SIGKILL");
}

/**
 * Public API:
 *   - withDevServer(body, opts)   — spawn Vite, give body the baseUrl, tear down.
 *   - withBrowser(body, opts)     — launch Chromium, give body a page, close.
 *   - runBrowserFixture(opts)     — convenience: dev-server + browser + auto-navigate.
 *   - runResultFixture(opts)      — convenience: + assert window[resultKey].ok.
 *   - runMain(fn)                 — top-level catch + process.exit wrapper.
 *
 * Internal primitives (getOpenPort/startVite/waitForServer) are not exported;
 * external callers should reach for the higher-level helpers above. If you
 * find yourself wanting them directly, that's usually a sign the higher-level
 * API is missing an option — extend it instead of inlining the primitives.
 */

/**
 * Spawn Vite, wait for it to be ready, run `body` with the baseUrl, then
 * always shut Vite down. Returns whatever `body` returns.
 */
export async function withDevServer(body, { readinessPath = "/", cwd } = {}) {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const { child, output } = startVite(port, { cwd });
  try {
    await waitForServer(`${baseUrl}${readinessPath}`, output);
    return await body({ baseUrl, output });
  } finally {
    await stopVite(child);
  }
}

/**
 * Launch Chromium, hand the caller a fresh page, and always close the
 * browser. Page console / errors are accumulated into `consoleMessages`
 * which the body receives for diagnostic context.
 */
export async function withBrowser(body, { headless = true, viewport, contextOptions } = {}) {
  const browser = await chromium.launch({ headless });
  try {
    const context = await browser.newContext({
      ...(viewport ? { viewport } : {}),
      ...contextOptions,
    });
    const page = await context.newPage();
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));
    return await body({ browser, context, page, consoleMessages });
  } finally {
    await browser.close();
  }
}

/**
 * Standard "spawn Vite + open one Chromium page + run a body against the
 * served fixture URL" verifier shape. Covers ~38 of the existing verifiers
 * that share the same boilerplate.
 *
 * Pass `fixture` as a path relative to repo root (e.g.
 * `"scripts/keyboard-browser-fixture.html"`). The body receives an already-
 * navigated page along with `baseUrl` and `consoleMessages`.
 */
export async function runBrowserFixture({
  fixture,
  viewport,
  headless = true,
  waitUntil = "networkidle",
  body,
  readinessPath,
  contextOptions,
  query,
}) {
  if (!fixture) throw new Error("runBrowserFixture: `fixture` is required");
  if (typeof body !== "function") throw new Error("runBrowserFixture: `body` must be a function");
  const fixturePath = fixture.replace(/^\/+/, "");
  return withDevServer(
    async ({ baseUrl, output }) => {
      const qs = query
        ? "?" +
          Object.entries(query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
      const url = `${baseUrl}/${fixturePath}${qs}`;
      const browserOpts = { headless };
      if (viewport) browserOpts.viewport = viewport;
      if (contextOptions) browserOpts.contextOptions = contextOptions;
      return withBrowser(
        async ({ page, consoleMessages, browser, context }) => {
          await page.goto(url, { waitUntil });
          return body({ page, consoleMessages, baseUrl, url, output, browser, context });
        },
        browserOpts,
      );
    },
    readinessPath ? { readinessPath } : { readinessPath: `/${fixturePath}` },
  );
}

/**
 * Convenience: many verifiers stash a result on `window.__graniteXResult`
 * and assert `.ok === true`. This wraps that flow.
 *
 * @param {object} opts
 * @param {string} opts.fixture - fixture HTML path relative to repo root
 * @param {string} opts.resultKey - the `window.__graniteX...` global to read
 * @param {string} opts.successLabel - log line on success
 * @param {(result: any) => string} [opts.successDetail] - extra log
 * @param {object} [opts.viewport]
 * @param {string} [opts.waitUntil] - playwright waitUntil
 */
export async function runResultFixture({
  fixture,
  resultKey,
  successLabel,
  successDetail,
  viewport,
  waitUntil,
}) {
  return runBrowserFixture({
    fixture,
    viewport,
    waitUntil,
    body: async ({ page, consoleMessages }) => {
      const result = await page.evaluate((key) => window[key], resultKey);
      if (!result?.ok) {
        throw new Error(
          `${successLabel} failed:\n${JSON.stringify(result, null, 2)}\n${consoleMessages.join("\n")}`,
        );
      }
      console.log(`${successLabel} passed.`);
      if (successDetail) {
        const extra = successDetail(result);
        if (extra) console.log(extra);
      }
      return result;
    },
  });
}

/**
 * Wrap a `main()` entry-point so failures exit non-zero with a clean message.
 */
export function runMain(main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
