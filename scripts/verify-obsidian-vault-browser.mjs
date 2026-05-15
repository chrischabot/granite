import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/obsidian-vault-browser-fixture.html",
    resultKey: "__graniteObsidianVaultResult",
    successLabel: "Obsidian vault browser verification",
    viewport: { width: 1280, height: 900 },
    successDetail: (result) =>
      `Notes: ${result.noteCount}; rendered: ${result.renderedNotes}; callouts: ${result.callouts}; wikilinks: ${result.wikilinks}; writes: ${result.writes}\nIndex: ${result.indexElapsedMs.toFixed(2)} ms; render: ${result.renderElapsedMs.toFixed(2)} ms`,
  }),
);
