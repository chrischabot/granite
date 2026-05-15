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

async function snapshot(page) {
  return await page.evaluate(() => window.__graniteMultiWindowVaultSnapshot());
}

async function waitForFixture(page) {
  try {
    await page.waitForFunction(() => window.__graniteMultiWindowVaultReady === true, null, {
      timeout: 15_000,
    });
  } catch (error) {
    const current = await page.evaluate(() => window.__graniteMultiWindowVaultSnapshot?.() ?? null);
    throw new Error(
      `Timed out waiting for multi-window vault fixture readiness; state=${JSON.stringify(current)}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fixtureError = await page.evaluate(() => window.__graniteMultiWindowVaultError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator("text=Multi-window vault fixture ready").waitFor();
}

function vaultByName(snap, name) {
  const vault = snap.vaults.find((candidate) => candidate.name === name);
  if (!vault) throw new Error(`Missing vault ${name}: ${JSON.stringify(snap)}`);
  return vault;
}

function assertActiveVault(snap, name, label) {
  if (snap.activeVaultName !== name) {
    throw new Error(
      `${label} active vault mismatch: expected ${name}, got ${JSON.stringify(snap)}`,
    );
  }
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const base = `multi-window-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/multi-window-vault-browser-fixture.html?base=${base}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    const page = await context.newPage();
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);
    const initial = await snapshot(page);
    const vaultOne = vaultByName(initial, `${base}-one`);
    const vaultTwo = vaultByName(initial, `${base}-two`);
    assertActiveVault(initial, `${base}-one`, "original window before open");

    await page.getByRole("button", { name: `Open ${base}-two in new window` }).click();
    const afterOpenClick = await snapshot(page);
    assertActiveVault(afterOpenClick, `${base}-one`, "original window after new-window click");
    const opened = afterOpenClick.openedWindows.at(-1);
    if (!opened?.url)
      throw new Error(`Vault picker did not call window.open: ${JSON.stringify(afterOpenClick)}`);
    const openedUrl = new URL(opened.url);
    if (openedUrl.searchParams.get("vaultWindow") !== "1") {
      throw new Error(`New vault URL missing vaultWindow=1: ${opened.url}`);
    }
    if (openedUrl.searchParams.get("vaultId") !== vaultTwo.id) {
      throw new Error(`New vault URL used wrong vault id: ${opened.url}`);
    }
    if (openedUrl.searchParams.has("popout") || openedUrl.searchParams.has("leaf")) {
      throw new Error(`New vault URL inherited popout state: ${opened.url}`);
    }

    const vaultWindowPage = await context.newPage();
    await vaultWindowPage.goto(opened.url, { waitUntil: "networkidle" });
    await waitForFixture(vaultWindowPage);
    assertActiveVault(await snapshot(vaultWindowPage), `${base}-two`, "standalone vault window");

    await page.keyboard.press("Escape");
    await page.locator(".modal-container").waitFor({ state: "detached" });
    await page.locator(".workspace-tab-header", { hasText: "One" }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Open in new window" }).click();
    const popoutOpened = (await snapshot(page)).openedWindows.at(-1);
    if (!popoutOpened?.url) throw new Error("Tab pop-out menu item did not call window.open");
    const popoutUrl = popoutOpened.url;
    const popoutPage = await context.newPage();
    await popoutPage.goto(popoutUrl, { waitUntil: "networkidle" });
    await waitForFixture(popoutPage);
    const popoutSnap = await snapshot(popoutPage);
    assertActiveVault(popoutSnap, `${base}-one`, "leaf popout window");
    if (
      !popoutSnap.leaves.some(
        (leaf) => leaf.state.type === "markdown" && leaf.state.path === "One.md",
      )
    ) {
      throw new Error(
        `Leaf popout did not restore requested markdown leaf: ${JSON.stringify(popoutSnap)}`,
      );
    }
    if (popoutSnap.activeVaultId !== vaultOne.id) {
      throw new Error(`Leaf popout used wrong vault id: ${JSON.stringify(popoutSnap)}`);
    }

    // ─── Severe two-page cross-window propagation flow ────────────────────
    //
    // Open TWO real pages bound to the same OPFS vault in the same browser
    // context (so they share IndexedDB / OPFS). Assert that:
    //  - workspace edits in page1 propagate to page2 via BroadcastChannel +
    //    disk within 1000 ms,
    //  - metadata invalidation messages cross the BC bus in order,
    //  - both pages observe each other's writes when they interleave.
    //
    // The earlier flow above already asserts URL generation via the
    // window.open mock + parseVaultWindowRequest unit coverage; this block
    // is the real two-window test.
    {
      const baseTwoWindow = `mw-cross-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const xwUrlOne = `${baseUrl}/scripts/multi-window-vault-browser-fixture.html?base=${baseTwoWindow}`;
      const pageOne = await context.newPage();
      pageOne.on("console", (m) => consoleMessages.push(`xwOne ${m.type()}: ${m.text()}`));
      pageOne.on("pageerror", (e) => consoleMessages.push(`xwOne pageerror: ${e.message}`));
      await pageOne.goto(xwUrlOne, { waitUntil: "networkidle" });
      await waitForFixture(pageOne);
      const snapOne = await snapshot(pageOne);
      const xwVaultOne = vaultByName(snapOne, `${baseTwoWindow}-one`);
      assertActiveVault(snapOne, `${baseTwoWindow}-one`, "cross-window page one");

      // Page 2 reopens the same vault via vaultWindow=<id>: same origin →
      // shared OPFS + shared BroadcastChannel namespace.
      const xwUrlTwo = `${baseUrl}/scripts/multi-window-vault-browser-fixture.html?base=${baseTwoWindow}&vaultWindow=1&vaultId=${xwVaultOne.id}`;
      const pageTwo = await context.newPage();
      pageTwo.on("console", (m) => consoleMessages.push(`xwTwo ${m.type()}: ${m.text()}`));
      pageTwo.on("pageerror", (e) => consoleMessages.push(`xwTwo pageerror: ${e.message}`));
      await pageTwo.goto(xwUrlTwo, { waitUntil: "networkidle" });
      await waitForFixture(pageTwo);
      assertActiveVault(
        await snapshot(pageTwo),
        `${baseTwoWindow}-one`,
        "cross-window page two",
      );

      // Both pages attach an extra sync probe so the verifier can observe
      // inbound BC traffic without depending on UI state.
      await pageTwo.evaluate(
        (vaultId) => window.__graniteVerifier.attachSync(vaultId),
        xwVaultOne.id,
      );
      await pageOne.evaluate(
        (vaultId) => window.__graniteVerifier.attachSync(vaultId),
        xwVaultOne.id,
      );

      // Page 1 writes a fresh note to disk and broadcasts metadata invalidation.
      const probePath = "CrossWindow.md";
      const probeContent = `# CrossWindow\n\nstamp=${Date.now()}`;
      await pageOne.evaluate(
        async ([path, text]) => {
          await window.__graniteVerifier.writeNote(path, text);
          window.__graniteVerifier.broadcastMetadataInvalidated([path]);
        },
        [probePath, probeContent],
      );

      // Page 2 should see the BC message AND read the new disk content
      // within 1 000 ms (the brief — disk-shared + BC-relayed).
      await pageTwo.waitForFunction(
        (path) =>
          window.__graniteVerifier.receivedMessages.some(
            (m) => m.type === "metadataInvalidated" && m.paths?.includes(path),
          ),
        probePath,
        { timeout: 1_000 },
      );
      const observedContent = await pageTwo.evaluate(
        (path) => window.__graniteVerifier.readNote(path),
        probePath,
      );
      if (observedContent !== probeContent) {
        throw new Error(
          `Page 2 did not read the cross-window note correctly. Expected:\n${probeContent}\nGot:\n${observedContent}`,
        );
      }

      // Page 1 broadcasts a workspaceUpdated snapshot; page 2 receives it.
      await pageOne.evaluate(() => {
        window.__graniteVerifier.broadcastWorkspaceUpdated({
          shape: "columns",
          columns: [
            [
              {
                leaves: [{ type: "markdown", path: "CrossWindow.md", mode: "source" }],
                activeIndex: 0,
              },
            ],
          ],
          activeGroupIndex: 0,
          probe: "from-page-1",
        });
      });
      await pageTwo.waitForFunction(
        () =>
          window.__graniteVerifier.receivedMessages.some(
            (m) =>
              m.type === "workspaceUpdated" && m.snapshot && m.snapshot.probe === "from-page-1",
          ),
        null,
        { timeout: 1_000 },
      );

      // Reverse direction: page 2 broadcasts; page 1 must see it.
      await pageTwo.evaluate(() => {
        window.__graniteVerifier.broadcastMetadataInvalidated(["FromTwo.md"]);
      });
      await pageOne.waitForFunction(
        () =>
          window.__graniteVerifier.receivedMessages.some(
            (m) => m.type === "metadataInvalidated" && m.paths?.includes("FromTwo.md"),
          ),
        null,
        { timeout: 1_000 },
      );

      // Interleaved 50/50 bursts (no ordering or drop bugs allowed).
      await pageOne.evaluate(() => {
        for (let i = 0; i < 50; i += 1) {
          window.__graniteVerifier.broadcastMetadataInvalidated([`A-${i}.md`]);
        }
      });
      await pageTwo.evaluate(() => {
        for (let i = 0; i < 50; i += 1) {
          window.__graniteVerifier.broadcastMetadataInvalidated([`B-${i}.md`]);
        }
      });
      await pageTwo.waitForFunction(
        () => {
          const seen = window.__graniteVerifier.receivedMessages.filter(
            (m) => m.type === "metadataInvalidated" && m.paths?.[0]?.startsWith("A-"),
          );
          return seen.length === 50;
        },
        null,
        { timeout: 2_000 },
      );
      await pageOne.waitForFunction(
        () => {
          const seen = window.__graniteVerifier.receivedMessages.filter(
            (m) => m.type === "metadataInvalidated" && m.paths?.[0]?.startsWith("B-"),
          );
          return seen.length === 50;
        },
        null,
        { timeout: 2_000 },
      );

      await pageOne.close();
      await pageTwo.close();
    }

    console.log("Multi-window vault browser verification passed.");
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
