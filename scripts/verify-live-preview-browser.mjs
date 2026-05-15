import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/live-preview-browser-fixture.html",
    resultKey: "__graniteLivePreviewResult",
    successLabel: "Live Preview browser verification",
    viewport: { width: 1000, height: 640 },
    successDetail: (result) => {
      const lines = [
        `Inactive Live Preview text: ${result.liveInactive}`,
        `Active Live Preview text: ${result.liveActive}`,
        `Source text: ${result.sourceText}`,
      ];
      if (typeof result.perfElapsed === "number") {
        lines.push(`5000-line decoration: ${result.perfElapsed.toFixed(2)}ms`);
      }
      return lines.join("\n");
    },
  }),
);
