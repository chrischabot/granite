import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

const GRID = 10;

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteCanvasSnapReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteCanvasSnapError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".canvas-view").waitFor();
  await page.locator("[data-canvas-node='seed-text']").waitFor();
}

async function readCanvas(page) {
  return await page.evaluate(() => window.__graniteCanvasSnapRead());
}

async function waitForSavedCanvas(page, predicate, description) {
  const deadline = Date.now() + 5_000;
  let lastCanvas = null;
  while (Date.now() < deadline) {
    lastCanvas = await readCanvas(page);
    if (predicate(lastCanvas)) return;
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

function isGridAligned(value) {
  return Number.isFinite(value) && value % GRID === 0;
}

function isWholePixel(value) {
  return Number.isInteger(value);
}

async function setSnap(page, enabled) {
  const snap = page.locator(".canvas-toolbar button[aria-pressed]").first();
  await snap.waitFor();
  const pressed = (await snap.getAttribute("aria-pressed")) === "true";
  if (pressed !== enabled) await snap.click();
}

async function dragLocator(page, locator, dx, dy) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Cannot drag a locator without a bounding box");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();
}

async function resizeNode(page, id, dx, dy) {
  await page.locator(`[data-canvas-node='${id}']`).click();
  const handle = page.locator(`[data-canvas-resize='${id}']`);
  await handle.waitFor({ state: "attached" });
  const box = await handle.boundingBox();
  if (!box) throw new Error(`Cannot resize ${id} without a resize handle`);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();
}

async function dropVaultFile(page, path, offsetX, offsetY) {
  await page.evaluate(
    ({ path, offsetX, offsetY }) => {
      const canvas = document.querySelector(".canvas-view");
      if (!canvas) throw new Error("Canvas view missing");
      const rect = canvas.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("application/granite-vault-path", path);
      const eventInit = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + offsetX,
        clientY: rect.top + offsetY,
        dataTransfer,
      };
      canvas.dispatchEvent(new DragEvent("dragover", eventInit));
      canvas.dispatchEvent(new DragEvent("drop", eventInit));
    },
    { path, offsetX, offsetY },
  );
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/canvas-snap-browser-fixture.html",
    viewport: { width: 1100, height: 760 },
    query: { vault: `canvas-snap-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
    await waitForFixture(page);

    const seed = page.locator("[data-canvas-node='seed-text']");
    await setSnap(page, false);
    await dragLocator(page, seed, 23, 17);
    await resizeNode(page, "seed-text", 37, 29);
    await waitForSavedCanvas(
      page,
      (canvas) => {
        const n = canvas.nodes.find((node) => node.id === "seed-text");
        return n && n.x % 10 !== 0 && n.y % 10 !== 0 && n.width % 10 !== 0 && n.height % 10 !== 0;
      },
      "snap-off drag and resize preserve sub-grid whole-pixel geometry",
    );
    const beforeSnapOffReload = byId(await readCanvas(page), "seed-text");

    await page.reload({ waitUntil: "networkidle" });
    await waitForFixture(page);
    const afterSnapOffReload = byId(await readCanvas(page), "seed-text");
    for (const key of ["x", "y", "width", "height"]) {
      if (!isWholePixel(afterSnapOffReload[key]) || isGridAligned(afterSnapOffReload[key])) {
        throw new Error(
          `Snap-off ${key} did not persist as sub-grid whole-pixel geometry: ${JSON.stringify(
            { beforeSnapOffReload, afterSnapOffReload },
          )}`,
        );
      }
    }

    await setSnap(page, true);
    await dropVaultFile(page, "Dropped.md", 880, 620);
    await waitForSavedCanvas(
      page,
      (canvas) =>
        canvas.nodes.some(
          (node) =>
            node.type === "file" &&
            node.file === "Dropped.md" &&
            node.x % 10 === 0 &&
            node.y % 10 === 0 &&
            node.width % 10 === 0 &&
            node.height % 10 === 0,
        ),
      "snap-on dropped file lands on grid",
    );

    const reloadedSeed = page.locator("[data-canvas-node='seed-text']");
    await dragLocator(page, reloadedSeed, 24, 16);
    await resizeNode(page, "seed-text", 34, 26);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await waitForSavedCanvas(
      page,
      (canvas) => {
        const n = canvas.nodes.find((node) => node.id === "seed-text");
        return n && n.x % 10 === 0 && n.y % 10 === 0 && n.width % 10 === 0 && n.height % 10 === 0;
      },
      "snap-on drag, resize, and keyboard movement stay on grid",
    );

    const finalCanvas = await readCanvas(page);
    const finalSeed = byId(finalCanvas, "seed-text");
    const dropped = finalCanvas.nodes.find((node) => node.type === "file" && node.file === "Dropped.md");
    if (!dropped) throw new Error(`Dropped file node missing: ${JSON.stringify(finalCanvas)}`);
    for (const node of [finalSeed, dropped]) {
      for (const key of ["x", "y", "width", "height"]) {
        if (!isGridAligned(node[key])) {
          throw new Error(`Snap-on ${key} is off-grid: ${JSON.stringify(node)}`);
        }
      }
    }

    console.log("Canvas snap browser verification passed.");
    console.log(`Snap-off persisted seed: ${JSON.stringify(afterSnapOffReload)}`);
    console.log(`Snap-on final seed: ${JSON.stringify(finalSeed)}`);
    console.log(`Dropped file node: ${JSON.stringify(dropped)}`);
  } catch (error) {
    if (consoleMessages.length > 0) console.error(consoleMessages.join("\n"));
    throw error;
  }
    },
  }),
);
