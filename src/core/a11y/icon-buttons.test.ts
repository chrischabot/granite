import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const uiRoot = join(root, "src/ui");
const basesCss = readFileSync(join(root, "src/styles/view-bases.css"), "utf8");
const buttonsCss = readFileSync(join(root, "src/styles/buttons.css"), "utf8");
const graphCss = readFileSync(join(root, "src/styles/view-graph.css"), "utf8");
const shellCss = readFileSync(join(root, "src/styles/shell.css"), "utf8");
const treeItemCss = readFileSync(join(root, "src/styles/tree-item.css"), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

function literalProp(source: string, prop: string): string | null {
  const match = new RegExp(`${prop}="([^"]+)"`).exec(source);
  return match?.[1] ?? null;
}

describe("icon-only accessibility audit", () => {
  const files = [...sourceFiles(uiRoot), join(root, "src/App.tsx")].filter(existsSync);

  it("requires every clickable icon button to have an accessible label", () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/clickable-icon/g)) {
        const context = clickableContext(source, match.index);
        const hasLabel =
          /aria-label\s*=/.test(context) ||
          /ariaLabel\s*=/.test(context) ||
          /setAttribute\(\s*["']aria-label["']/.test(context);
        if (!hasLabel) violations.push(`${relative(root, file)}:${lineFor(source, match.index)}`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps literal clickable-icon tooltips aligned with aria-labels", () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/clickable-icon/g)) {
        const context = clickableContext(source, match.index);
        const aria = literalProp(context, "aria-label");
        const tooltip = literalProp(context, "data-tooltip") ?? literalProp(context, "title");
        if (aria && tooltip && aria !== tooltip) {
          violations.push(
            `${relative(root, file)}:${lineFor(source, match.index)} aria-label="${aria}" tooltip="${tooltip}"`,
          );
        }
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("requires ClickableIcon call sites to provide ariaLabel", () => {
    const violations: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<ClickableIcon\b/g)) {
        const context = source.slice(match.index, Math.min(source.length, match.index + 1_000));
        if (!/ariaLabel\s*=/.test(context)) {
          violations.push(`${relative(root, file)}:${lineFor(source, match.index)}`);
        }
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps clickable icon controls visibly keyboard-focusable", () => {
    expect(buttonsCss).toMatch(/\.clickable-icon:focus-visible\s*\{/);
    expect(buttonsCss).toMatch(
      /\.clickable-icon:focus-visible\s*\{[^}]*--background-modifier-border-focus/s,
    );
  });

  it("keeps custom clickable rows visibly keyboard-focusable", () => {
    expect(treeItemCss).toMatch(/\.tree-item-self\.is-clickable:focus-visible/);
    expect(treeItemCss).toMatch(/\.tree-item-self\.mod-collapsible:focus-visible/);
    expect(treeItemCss).toMatch(
      /\.tree-item-self\.is-clickable:focus-visible,[^{]+\.tree-item-self\.mod-collapsible:focus-visible\s*\{[^}]*--background-modifier-border-focus/s,
    );
  });

  it("keeps clickable status bar items visibly keyboard-focusable", () => {
    expect(shellCss).toMatch(/\.status-bar-item\.mod-clickable:focus-visible\s*\{/);
    expect(shellCss).toMatch(
      /\.status-bar-item\.mod-clickable:focus-visible\s*\{[^}]*--background-modifier-border-focus/s,
    );
  });

  it("keeps graph nodes visibly keyboard-focusable", () => {
    expect(graphCss).toMatch(/\.graph-node-interactive:focus-visible circle\s*\{/);
    expect(graphCss).toMatch(
      /\.graph-node-interactive:focus-visible circle\s*\{[^}]*--background-modifier-border-focus/s,
    );
  });

  it("keeps Bases rows visibly keyboard-focusable", () => {
    expect(basesCss).toMatch(/\.bases-table-row:focus-visible\s*\{/);
    expect(basesCss).toMatch(
      /\.bases-table-row:focus-visible\s*\{[^}]*--background-modifier-border-focus/s,
    );
  });
});

function lineFor(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function clickableContext(source: string, index: number): string {
  const before = source.slice(0, index);
  const buttonStart = before.lastIndexOf("<button");
  const buttonEnd = source.indexOf("</button>", index);
  if (buttonStart >= 0 && buttonEnd >= index) {
    return source.slice(buttonStart, buttonEnd + "</button>".length);
  }

  const createStart = before.lastIndexOf('document.createElement("button")');
  if (createStart >= 0) {
    return source.slice(createStart, Math.min(source.length, index + 1_200));
  }

  return source.slice(Math.max(0, index - 400), Math.min(source.length, index + 800));
}
