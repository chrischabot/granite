import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/save-roundtrip-browser-fixture.html",
    resultKey: "__graniteSaveRoundTripResult",
    successLabel: "Save round-trip browser verification",
    successDetail: (result) =>
      `Path: ${result.path}; bytes: ${result.payloadBytes}; elapsed: ${result.elapsedMs.toFixed(2)} ms`,
  }),
);
