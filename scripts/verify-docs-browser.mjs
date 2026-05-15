import { runBrowserFixture, runMain } from "./_lib/dev-server.mjs";

runMain(() =>
  runBrowserFixture({
    fixture: "docs/index.html",
    viewport: { width: 1100, height: 760 },
    body: async ({ page, baseUrl }) => {
      await page.getByRole("heading", { name: "Vault format and extension API" }).waitFor();

      const background = await page
        .locator("body")
        .evaluate((body) => getComputedStyle(body).backgroundColor);
      if (background === "rgba(0, 0, 0, 0)" || background === "transparent") {
        throw new Error("Docs stylesheet did not apply a readable page background");
      }

      const links = await page
        .getByRole("navigation", { name: "Documentation sections" })
        .locator("a")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            href: node.getAttribute("href") ?? "",
            text: node.textContent?.trim() ?? "",
          })),
        );
      const expected = new Map([
        ["./vault-format.md", ["Granite Vault Format", "Atomic write", "JSON Canvas"]],
        ["./plugin-api.md", ["Plugin API", "PluginApi", "loadData"]],
        [
          "./contributor-guide.md",
          ["Contributor Guide", "Plugin API Discipline", "severe-testing.md"],
        ],
      ]);

      if (links.length !== expected.size) {
        throw new Error(`Unexpected docs link count: ${JSON.stringify(links)}`);
      }

      for (const [href, requiredText] of expected) {
        const link = links.find((candidate) => candidate.href === href);
        if (!link) throw new Error(`Missing docs link: ${href}; saw ${JSON.stringify(links)}`);
        const response = await page.goto(new URL(href, `${baseUrl}/docs/index.html`).toString(), {
          waitUntil: "networkidle",
        });
        if (!response?.ok()) {
          throw new Error(`Docs page ${href} failed to load: ${response?.status()}`);
        }
        const bodyText = await page.locator("body").innerText();
        for (const text of requiredText) {
          if (!bodyText.includes(text)) {
            throw new Error(
              `Docs page ${href} is missing readable text "${text}":\n${bodyText.slice(0, 1000)}`,
            );
          }
        }
        if (bodyText.length < 400) {
          throw new Error(
            `Docs page ${href} is too short to be useful/readable (${bodyText.length} chars)`,
          );
        }
      }

      console.log("Docs browser verification passed.");
    },
  }),
);
