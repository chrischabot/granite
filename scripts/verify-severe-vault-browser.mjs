/**
 * Severe-vault browser verifier.
 *
 * Generates a 10,000-note vault deterministically (per scripts/fixtures/severe-vault/generate.mjs),
 * writes it into OPFS via Chromium, indexes it through the real Effect FileSystem +
 * metadataCache, then runs a tag search and a 50-note rename storm. Asserts
 * the budgets from /Users/chabotc/Desktop/severe-testing.md §24.19.
 *
 * Uses the shared `runBrowserFixture` helper directly (not `runResultFixture`)
 * so we can await the fixture's Promise-typed result global with a generous
 * timeout — OPFS writes for 10k files take ~30s in headless Chromium, longer
 * than Playwright's default page.evaluate window.
 */

import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

const FIXTURE_TIMEOUT_MS = 180_000;

runMain(() =>
  runBrowserFixture({
    fixture: "scripts/severe-vault-browser-fixture.html",
    // `domcontentloaded` because `networkidle` never settles while the script
    // is doing heavy OPFS I/O.
    waitUntil: "domcontentloaded",
    body: async ({ page, consoleMessages }) => {
      page.setDefaultTimeout(FIXTURE_TIMEOUT_MS);
      const result = await page.evaluate(
        async ([key, deadline]) => {
          const start = Date.now();
          while (Date.now() - start < deadline) {
            const value = window[key];
            if (value !== undefined) return await value;
            await new Promise((r) => setTimeout(r, 50));
          }
          throw new Error(`window.${key} never resolved within ${deadline}ms`);
        },
        ["__graniteSevereVaultResult", FIXTURE_TIMEOUT_MS],
      );
      if (!result || result.ok !== true) {
        throw new Error(
          `Severe vault browser verification failed:\n${JSON.stringify(
            result,
            null,
            2,
          )}\n--- console ---\n${consoleMessages.join("\n")}`,
        );
      }
      console.log("Severe vault browser verification passed.");
      console.log(
        `Manifest: ${result.manifest.files} notes, ${result.manifest.edges} edges, ` +
          `${result.manifest.tagEmissions} tag emissions, ${result.manifest.assetCount} assets, ` +
          `${result.manifest.totalBytes} bytes total (${result.manifest.tagDistinct} distinct tags).`,
      );
      console.log(`OPFS write: ${result.writeMs.toFixed(0)}ms`);
      console.log(
        `indexVault: ${result.index.elapsedMs.toFixed(0)}ms; ` +
          `files=${result.index.fileCount}, tags=${result.index.tagCount}.`,
      );
      console.log(
        `Tag aggregation oracle: getAllTags matches manifest.tagDistribution ` +
          `(${result.index.tagOracleDistinct} distinct, ${result.index.tagOracleTotal} total emissions).`,
      );
      console.log(
        `Search (tag="${result.search.query}"): ${result.search.matches} matches in ` +
          `${result.search.elapsedMs.toFixed(2)}ms.`,
      );
      console.log(
        `Rename storm: ${result.rename.renamed} renames in ${result.rename.elapsedMs.toFixed(0)}ms.`,
      );
      for (const ex of Object.keys(result.excludedAfter)) {
        const before = result.excludedBefore[ex];
        const after = result.excludedAfter[ex];
        console.log(
          `Excluded "${ex}": before files=${before.files} bytes=${before.bytes}; ` +
            `after files=${after.files} bytes=${after.bytes}.`,
        );
      }
      return result;
    },
  }),
);
