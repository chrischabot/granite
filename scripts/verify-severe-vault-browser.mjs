/**
 * Severe-vault browser verifier.
 *
 * Generates a 10,000-note vault deterministically (per scripts/fixtures/severe-vault/generate.mjs),
 * writes it into OPFS via Chromium, indexes it through the real Effect FileSystem +
 * metadataCache, then runs a tag search and a 50-note rename storm. Asserts
 * the budgets from /Users/chabotc/Desktop/severe-testing.md §24.19.
 */

import { runResultFixture } from "./_lib/dev-server.mjs";

async function main() {
  const result = await runResultFixture({
    fixture: "scripts/severe-vault-browser-fixture.html",
    resultKey: "__graniteSevereVaultResult",
    // Vault generation + OPFS writes for 10k notes take ~30s in Chromium,
    // so we widen the page-load and result-wait timeout.
    timeoutMs: 180_000,
  });

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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
