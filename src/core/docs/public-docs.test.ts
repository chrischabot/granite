import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(`${root}/${path}`, "utf8");
}

function pluginApiBlock(): string {
  const types = read("src/core/plugins/types.ts");
  const match = /export interface PluginApi \{([\s\S]*?)\n\}/.exec(types);
  if (!match) throw new Error("PluginApi interface not found");
  const block = match[1];
  if (!block) throw new Error("PluginApi interface body not found");
  return block;
}

describe("public docs site", () => {
  it("links the required public documentation sections from the docs index", () => {
    const readme = read("docs/README.md");
    expect(readme).toContain("getting-started/");
    expect(readme).toContain("user-guide/");
    expect(readme).toContain("developer/");
    expect(readme).toContain("reference/");
    expect(readme).toContain("sdk/");
    expect(readme).toContain("reference/plugin-api.md");
    expect(readme).toContain("reference/vault-format.md");
    expect(readme).toContain("developer/contributing.md");
  });

  it("wires docs drift and browser reachability checks into package scripts", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["docs:check"]).toBe("vitest run src/core/docs/public-docs.test.ts");
    expect(pkg.scripts?.["docs:verify-browser"]).toBe("node scripts/verify-docs-browser.mjs");
  });

  it("documents the vault storage formats and compatibility folders", () => {
    const doc = read("docs/reference/vault-format.md");
    for (const required of [
      ".granite/",
      ".obsidian/",
      ".md",
      ".canvas",
      ".base",
      "JSON Canvas",
      "Plugin Data",
      "Atomic",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("documents every top-level PluginApi member", () => {
    const block = pluginApiBlock();
    const doc = read("docs/reference/plugin-api.md");
    const memberMatches = [
      ...block.matchAll(/readonly\s+([A-Za-z0-9_]+)/g),
      ...block.matchAll(/^\s*([A-Za-z0-9_]+)\(/gm),
    ];
    const members = memberMatches.flatMap((match) => (match[1] ? [match[1]] : []));

    expect(members.length).toBeGreaterThan(0);
    for (const member of members) {
      expect(doc, `docs/reference/plugin-api.md must document PluginApi.${member}`).toContain(
        member,
      );
    }
  });
});
