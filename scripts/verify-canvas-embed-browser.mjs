import { setTimeout as delay } from "node:timers/promises";
import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

async function waitForFixture(page) {
  await page.waitForFunction(() => window.__graniteCanvasEmbedReady === true, null, {
    timeout: 15_000,
  });
  const fixtureError = await page.evaluate(() => window.__graniteCanvasEmbedError ?? null);
  if (fixtureError) throw new Error(`Fixture failed: ${fixtureError}`);
  await page.locator(".markdown-reading-view").waitFor();
  await page.locator(".canvas-embed.is-interactive .canvas-view").waitFor();
  await page.locator("[data-canvas-node='embed-a']").waitFor();
}

async function readCanvas(page) {
  return await page.evaluate(() => window.__graniteCanvasEmbedReadCanvas());
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

async function dragNode(page, id, dx, dy) {
  const box = await page.locator(`[data-canvas-node='${id}']`).boundingBox();
  if (!box) throw new Error(`Node ${id} has no bounding box`);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 6 });
  await page.mouse.up();
}

async function panEmbeddedCanvas(page) {
  const box = await page.locator(".canvas-embed .canvas-view").boundingBox();
  if (!box) throw new Error("Embedded canvas has no bounding box");
  await page.mouse.move(box.x + box.width - 24, box.y + box.height - 24);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 74, box.y + box.height - 54, { steps: 4 });
  await page.mouse.up();
}

async function workspaceSnapshot(page) {
  return await page.evaluate(() => window.__graniteCanvasEmbedWorkspace());
}

async function clickEmbedOpen(page, options = {}) {
  const count = await page.locator(".canvas-embed .embed-kind button").count();
  if (count === 0) {
    const embedHtml = await page.locator(".canvas-embed").evaluate((el) => el.outerHTML).catch(() => null);
    throw new Error(`Embedded canvas Open button missing; embed=${embedHtml}`);
  }
  await page.locator(".canvas-embed .embed-kind button").click(options);
}

function canvasLeaves(snapshot) {
  return snapshot.leaves.filter((leaf) => leaf.state.type === "canvas" && leaf.state.path === "board.canvas");
}

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/canvas-embed-browser-fixture.html",
    viewport: { width: 1180, height: 820 },
    query: { vault: `canvas-embed-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`));
  try {
    await waitForFixture(page);

    await page.locator(".canvas-embed", { hasText: "board · 2 nodes · 1 edge" }).waitFor();
    await page.locator(".canvas-embed .canvas-toolbar").waitFor();
    await page.getByRole("button", { name: "Add text node" }).waitFor();
    await page.getByRole("button", { name: "Disable snap to grid" }).waitFor();
    await page.getByRole("button", { name: "Zoom in" }).waitFor();
    await page.locator(".canvas-embed svg line[marker-end]").waitFor({ state: "attached" });

    await panEmbeddedCanvas(page);
    const beforeDrag = byId(await readCanvas(page), "embed-a");
    await dragNode(page, "embed-a", 40, 20);
    const afterDrag = await waitForSavedCanvas(
      page,
      (canvas) => {
        const node = byId(canvas, "embed-a");
        return node.x === beforeDrag.x + 40 && node.y === beforeDrag.y + 20;
      },
      "embedded canvas drag saves geometry",
    );
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.locator(".markdown-reading-view", { hasText: "Before embed." }).waitFor();
    await page.locator(".canvas-embed.is-interactive .canvas-view").waitFor();

    await page.evaluate(() => window.__graniteCanvasEmbedResetWorkspace());
    await clickEmbedOpen(page);
    const currentOpen = await workspaceSnapshot(page);
    if (canvasLeaves(currentOpen).length !== 1 || currentOpen.leaves.length !== 1) {
      throw new Error(`Open button did not replace the empty leaf: ${JSON.stringify(currentOpen)}`);
    }

    await page.evaluate(() => window.__graniteCanvasEmbedResetWorkspace());
    await clickEmbedOpen(page, { modifiers: [process.platform === "darwin" ? "Meta" : "Control"] });
    const newTabOpen = await workspaceSnapshot(page);
    if (canvasLeaves(newTabOpen).length !== 1 || newTabOpen.leaves.length !== 2) {
      throw new Error(`Modified Open button did not create a new tab: ${JSON.stringify(newTabOpen)}`);
    }

    await page.evaluate(() => window.__graniteCanvasEmbedRemoveHostEmbed());
    await page.locator(".markdown-rendered", { hasText: "Embed removed." }).waitFor({
      timeout: 5_000,
    });
    if ((await page.locator(".canvas-embed").count()) !== 0) {
      throw new Error("Canvas embed remained after host markdown removed it");
    }
    if ((await page.locator(".canvas-toolbar").count()) !== 0) {
      throw new Error("Embedded canvas toolbar remained after host markdown removed the embed");
    }
    if (pageErrors.length > 0) {
      throw new Error(`Unexpected page errors: ${pageErrors.join("\n")}`);
    }

    console.log("Canvas embed browser verification passed.");
    console.log(`After embedded drag: ${JSON.stringify(afterDrag)}`);
    console.log(`Open current-tab snapshot: ${JSON.stringify(currentOpen)}`);
    console.log(`Open new-tab snapshot: ${JSON.stringify(newTabOpen)}`);
  } catch (error) {
    const noisy = consoleMessages.filter(
      (m) => !m.includes("Download the React DevTools"),
    );
    if (noisy.length > 0 || pageErrors.length > 0) {
      console.error([...noisy, ...pageErrors].join("\n"));
    }
    throw error;
  }
    },
  }),
);
