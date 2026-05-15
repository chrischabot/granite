import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

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

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/external-dnd-browser-fixture.html",
    viewport: { width: 1280, height: 820 },
    query: { vault: `external-dnd-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    body: async ({ page, consoleMessages }) => {
  try {
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
    const noisy = consoleMessages.filter(
      (m) => !m.includes("Download the React DevTools"),
    );
    if (noisy.length > 0) console.error(noisy.join("\n"));
    throw error;
  }
    },
  }),
);
