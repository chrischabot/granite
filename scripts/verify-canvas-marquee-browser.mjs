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
  await page.waitForFunction(() => window.__graniteCanvasMarqueeReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteCanvasMarqueeError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".canvas-view").waitFor();
  await page.locator("[data-canvas-node='a']").waitFor();
}

async function readCanvas(page) {
  return await page.evaluate(() => window.__graniteCanvasMarqueeRead());
}

async function resetCanvas(page) {
  await page.evaluate(() => window.__graniteCanvasMarqueeReset());
  await page.reload({ waitUntil: "networkidle" });
  await waitForFixture(page);
}

async function waitForSavedCanvas(page, predicate, description) {
  const deadline = Date.now() + 5_000;
  let lastCanvas = null;
  while (Date.now() < deadline) {
    lastCanvas = await readCanvas(page);
    if (predicate(lastCanvas)) return lastCanvas;
    await delay(100);
  }
  throw new Error(
    `Timed out waiting for saved canvas: ${description}; last=${JSON.stringify(lastCanvas)}`,
  );
}

function byId(canvas, id) {
  const node = canvas.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Missing canvas node ${id}: ${JSON.stringify(canvas)}`);
  return node;
}

async function nodeBox(page, id) {
  const box = await page.locator(`[data-canvas-node='${id}']`).boundingBox();
  if (!box) throw new Error(`Node ${id} has no bounding box`);
  return box;
}

async function marqueeSelect(page, firstId, lastId) {
  const first = await nodeBox(page, firstId);
  const last = await nodeBox(page, lastId);
  const startX = first.x - 30;
  const startY = first.y - 30;
  const endX = last.x + last.width + 30;
  const endY = last.y + last.height + 30;
  await page.keyboard.down("Shift");
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await page.locator("[data-canvas-resize='a']").waitFor({ state: "attached" });
  await page.locator("[data-canvas-resize='b']").waitFor({ state: "attached" });
}

async function dragNode(page, id, dx, dy, options = {}) {
  const box = await nodeBox(page, id);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  if (options.shift) await page.keyboard.down("Shift");
  if (options.alt) await page.keyboard.down("Alt");
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 6 });
  await page.mouse.up();
  if (options.alt) await page.keyboard.up("Alt");
  if (options.shift) await page.keyboard.up("Shift");
}

function sameGeometry(actual, expected) {
  return (
    actual.x === expected.x &&
    actual.y === expected.y &&
    actual.width === expected.width &&
    actual.height === expected.height
  );
}

async function main() {
  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const vault = `canvas-marquee-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fixtureUrl = `${baseUrl}/scripts/canvas-marquee-browser-fixture.html?vault=${vault}`;
  const { child, output } = startVite(port);
  let browser;
  const consoleMessages = [];

  try {
    await waitForServer(fixtureUrl, output);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
    page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => consoleMessages.push(`pageerror: ${error.message}`));

    await page.goto(fixtureUrl, { waitUntil: "networkidle" });
    await waitForFixture(page);

    await marqueeSelect(page, "a", "b");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+Backspace" : "Control+Backspace");
    const afterDelete = await waitForSavedCanvas(
      page,
      (canvas) =>
        !canvas.nodes.some((node) => node.id === "a" || node.id === "b") &&
        canvas.nodes.some((node) => node.id === "c") &&
        canvas.edges.length === 0,
      "marquee-selected nodes and their edge are deleted",
    );

    await resetCanvas(page);
    const beforeMove = await readCanvas(page);
    await marqueeSelect(page, "a", "b");
    await dragNode(page, "a", 40, 20);
    const afterMove = await waitForSavedCanvas(
      page,
      (canvas) => {
        const a = byId(canvas, "a");
        const b = byId(canvas, "b");
        const c = byId(canvas, "c");
        return (
          a.x === byId(beforeMove, "a").x + 40 &&
          a.y === byId(beforeMove, "a").y + 20 &&
          b.x === byId(beforeMove, "b").x + 40 &&
          b.y === byId(beforeMove, "b").y + 20 &&
          sameGeometry(c, byId(beforeMove, "c"))
        );
      },
      "dragging one marquee-selected node moves all selected nodes and leaves unselected nodes fixed",
    );

    await resetCanvas(page);
    const beforeAxis = await readCanvas(page);
    await marqueeSelect(page, "a", "b");
    await dragNode(page, "a", 60, 20, { shift: true });
    const afterAxis = await waitForSavedCanvas(
      page,
      (canvas) => {
        const a = byId(canvas, "a");
        const b = byId(canvas, "b");
        const c = byId(canvas, "c");
        return (
          a.x === byId(beforeAxis, "a").x + 60 &&
          a.y === byId(beforeAxis, "a").y &&
          b.x === byId(beforeAxis, "b").x + 60 &&
          b.y === byId(beforeAxis, "b").y &&
          sameGeometry(c, byId(beforeAxis, "c"))
        );
      },
      "shift-drag constrains selected movement to the dominant axis",
    );

    await resetCanvas(page);
    const beforeDuplicate = await readCanvas(page);
    await marqueeSelect(page, "a", "b");
    await dragNode(page, "a", 40, 20, { alt: true });
    const afterDuplicate = await waitForSavedCanvas(
      page,
      (canvas) => {
        const originalsStillPresent =
          sameGeometry(byId(canvas, "a"), byId(beforeDuplicate, "a")) &&
          sameGeometry(byId(canvas, "b"), byId(beforeDuplicate, "b")) &&
          sameGeometry(byId(canvas, "c"), byId(beforeDuplicate, "c")) &&
          canvas.edges.some((edge) => edge.id === "ab" && edge.fromNode === "a" && edge.toNode === "b");
        const newNodes = canvas.nodes.filter((node) => !["a", "b", "c"].includes(node.id));
        const duplicateEdge = canvas.edges.find(
          (edge) =>
            edge.id !== "ab" &&
            newNodes.some((node) => node.id === edge.fromNode) &&
            newNodes.some((node) => node.id === edge.toNode),
        );
        return originalsStillPresent && newNodes.length === 2 && Boolean(duplicateEdge);
      },
      "alt-drag duplicates selected connected nodes with a rewired internal edge",
    );
    const duplicateNodes = afterDuplicate.nodes.filter((node) => !["a", "b", "c"].includes(node.id));
    const duplicateEdge = afterDuplicate.edges.find(
      (edge) =>
        edge.id !== "ab" &&
        duplicateNodes.some((node) => node.id === edge.fromNode) &&
        duplicateNodes.some((node) => node.id === edge.toNode),
    );

    console.log("Canvas marquee browser verification passed.");
    console.log(`After delete: ${JSON.stringify(afterDelete)}`);
    console.log(`After move: ${JSON.stringify(afterMove)}`);
    console.log(`After axis lock: ${JSON.stringify(afterAxis)}`);
    console.log(`Duplicate nodes: ${JSON.stringify(duplicateNodes)}`);
    console.log(`Duplicate edge: ${JSON.stringify(duplicateEdge)}`);
  } catch (error) {
    if (consoleMessages.length > 0) console.error(consoleMessages.join("\n"));
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
