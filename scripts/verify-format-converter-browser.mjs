import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/format-converter-browser-fixture.html",
    resultKey: "__graniteFormatConverterResult",
    successLabel: "Format converter browser verification",
    successDetail: (result) =>
      `${result.notice}\nReads: ${result.reads.join(", ")}\nWrites: ${result.writes.join(", ")}`,
  }),
);
