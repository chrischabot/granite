import { runResultFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runResultFixture({
    fixture: "scripts/native-formats-browser-fixture.html",
    resultKey: "__graniteNativeFormatsResult",
    successLabel: "Native formats browser verification",
    viewport: { width: 1280, height: 820 },
    successDetail: (result) =>
      result.checks
        .map(
          (check) =>
            `${check.path}: leaf=${check.leafType}${check.kind ? `/${check.kind}` : ""}, selector=${check.selector}, title=${check.title}`,
        )
        .join("\n"),
  }),
);
