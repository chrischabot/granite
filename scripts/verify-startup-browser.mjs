import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/startup-browser-fixture.html",
    resultKey: "__graniteStartupResult",
    successLabel: "10k startup browser verification",
    successDetail: (result) =>
      `Files: ${result.fileCount}; reads: ${result.readCalls}; stats: ${result.statCalls}; entries: ${result.switcherEntries}; elapsed: ${result.elapsedMs.toFixed(2)} ms\nNavigation elapsed now: ${Math.round(result.navigation.nowMs)} ms`,
  }),
);
