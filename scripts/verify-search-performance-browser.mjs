import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/search-performance-browser-fixture.html",
    resultKey: "__graniteSearchPerformanceResult",
    successLabel: "Search performance browser verification",
    successDetail: (result) => {
      const lines = [
        `Quick switcher entries: ${result.quickSwitcher.entries}; timings: ${result.quickSwitcher.timings.map((t) => `${t.query}=${t.elapsedMs.toFixed(2)}ms`).join(", ")}`,
        `§24.7 indexed full-text search: ${result.fullTextSearch.notes} notes, ${result.fullTextSearch.matches} matches, ${result.fullTextSearch.elapsedMs.toFixed(2)} ms (budget 200 ms)`,
        `Regex watchdog: ${result.regexWatchdog.notes} notes, ${result.regexWatchdog.matches} matches, ${result.regexWatchdog.elapsedMs.toFixed(2)} ms (watchdog 500 ms)`,
      ];
      return lines.join("\n");
    },
  }),
);
