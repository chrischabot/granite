import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/live-preview-browser-fixture.html",
    resultKey: "__graniteLivePreviewResult",
    successLabel: "Live Preview browser verification",
    viewport: { width: 1000, height: 640 },
    successDetail: (result) =>
      `Inactive Live Preview text: ${result.liveInactive}\nActive Live Preview text: ${result.liveActive}\nSource text: ${result.sourceText}`,
  }),
);
