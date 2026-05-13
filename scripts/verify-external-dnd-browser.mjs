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

async function state(page) {
  return await page.evaluate(() => window.__graniteExternalDndState());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteExternalDndReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const current = await page.evaluate(() => window.__graniteExternalDndState?.() ?? null);
    throw new Error(
      `Timed out waiting for external DnD fixture readiness; state=${JSON.stringify(current)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteExternalDndError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".cm-editor").waitFor();
  await page.locator(".nav-files-container").waitFor();
}

async function waitFor(page, predicate, description) {
  const deadline = Date.now() + 5_000;
  let last = null;
  while (Date.now() < deadline) {
    last = await state(page);
    if (predicate(last)) return last;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(last)}`);
}

function hasFile(snapshot, path) {
  return snapshot.files.some((entry) => entry.type === "file" && entry.path === path);
}

function attachmentPath(snapshot) {
  return snapshot.files.find(
    (entry) =>
      entry.type === "file" &&
      entry.path.startsWith("attachments/paste-") &&
      entry.path.endsWith(".png"),
  )?.path;
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `external-dnd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/external-dnd-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    const importedDropPrevented = await page.evaluate(() =>
      window.__graniteExternalDndDropEditorImport(),
    );
    if (!importedDropPrevented)
      throw new Error("Editor media drop did not prevent default navigation");
    const afterImport = await waitFor(
      page,
      (snapshot) =>
        attachmentPath(snapshot) !== undefined &&
        snapshot.noteText.includes(`![[${attachmentPath(snapshot)}]]`),
      "editor imported attachment embed",
    );
    const importedPath = attachmentPath(afterImport);
    if (!importedPath)
      throw new Error(`Imported attachment path missing: ${JSON.stringify(afterImport)}`);
    const importedBytes = await page.evaluate(
      (path) => window.__graniteExternalDndReadBytes(path),
      importedPath,
    );
    if (JSON.stringify(importedBytes) !== JSON.stringify([1, 2, 3, 4])) {
      throw new Error(`Imported attachment bytes changed: ${JSON.stringify(importedBytes)}`);
    }

    const linkDropPrevented = await page.evaluate(() =>
      window.__graniteExternalDndDropEditorFileLink(),
    );
    if (!linkDropPrevented)
      throw new Error("Editor file URL drop did not prevent default navigation");
    await waitFor(
      page,
      (snapshot) =>
        snapshot.noteText.includes("[Host File.pdf](file:///Users/me/Host%20File.pdf)") &&
        !hasFile(snapshot, "attachments/Host File.pdf"),
      "editor host file URL link",
    );

    const missingPathPrevented = await page.evaluate(() =>
      window.__graniteExternalDndDropEditorMissingPath(),
    );
    if (!missingPathPrevented) {
      throw new Error("Missing-path file URL drop did not prevent default navigation");
    }
    await waitFor(
      page,
      (snapshot) =>
        snapshot.notices.some((notice) => notice.message.includes("paths are not available")),
      "missing-path warning notice",
    );

    const folderDropPrevented = await page.evaluate(() => window.__graniteExternalDndDropFolder());
    if (!folderDropPrevented)
      throw new Error("File Explorer folder drop did not prevent default navigation");
    await waitFor(
      page,
      (snapshot) => hasFile(snapshot, "Inbox/clip-1.png") && hasFile(snapshot, "Inbox/notes_.txt"),
      "file explorer folder imports with collision and sanitization",
    );

    const rootDropPrevented = await page.evaluate(() => window.__graniteExternalDndDropRoot());
    if (!rootDropPrevented)
      throw new Error("File Explorer root drop did not prevent default navigation");
    await waitFor(
      page,
      (snapshot) => hasFile(snapshot, "root file.txt"),
      "file explorer root import",
    );

    console.log("External drag-and-drop browser verification passed.");
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
