import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type CssVars = Map<string, string>;

interface ThemeCase {
  readonly name: string;
  readonly selectors: ReadonlyArray<string>;
}

const BODY_TEXT_CASES: ThemeCase[] = [
  { name: "light theme", selectors: [".theme-light", "body"] },
  { name: "dark theme", selectors: [".theme-dark", "body", "body.theme-dark"] },
  {
    name: "light high-contrast theme",
    selectors: [".theme-light", "body", "body.theme-high-contrast"],
  },
  {
    name: "dark high-contrast theme",
    selectors: [".theme-dark", "body", "body.theme-dark", "body.theme-high-contrast.theme-dark"],
  },
];

const tokensCss = readFileSync(`${process.cwd()}/src/styles/tokens.css`, "utf8");
const highContrastCss = readFileSync(`${process.cwd()}/src/styles/high-contrast.css`, "utf8");

function parseBlocks(css: string): ReadonlyArray<{ selectors: string[]; declarations: CssVars }> {
  const blocks: Array<{ selectors: string[]; declarations: CssVars }> = [];
  const withoutComments = css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of withoutComments.matchAll(blockPattern)) {
    const selectorText = match[1]?.trim();
    const declarationText = match[2] ?? "";
    if (!selectorText || selectorText.startsWith("@")) continue;

    const declarations: CssVars = new Map();
    for (const declaration of declarationText.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const name = declaration[1];
      const value = declaration[2]?.trim();
      if (name && value) declarations.set(name, value);
    }

    if (declarations.size > 0) {
      blocks.push({
        selectors: selectorText.split(",").map((selector) => selector.trim()),
        declarations,
      });
    }
  }

  return blocks;
}

function varsForSelectors(selectors: ReadonlyArray<string>): CssVars {
  const wanted = new Set(selectors);
  const vars: CssVars = new Map();
  for (const block of [...parseBlocks(tokensCss), ...parseBlocks(highContrastCss)]) {
    if (!block.selectors.some((selector) => wanted.has(selector))) continue;
    for (const [name, value] of block.declarations) vars.set(name, value);
  }
  return vars;
}

function resolveVar(name: string, vars: CssVars, seen = new Set<string>()): string {
  if (seen.has(name))
    throw new Error(`Circular CSS variable reference: ${[...seen, name].join(" -> ")}`);
  const value = vars.get(name);
  if (!value) throw new Error(`Missing CSS variable ${name}`);
  return resolveValue(value, vars, new Set([...seen, name]));
}

function resolveValue(value: string, vars: CssVars, seen: Set<string>): string {
  const varRef = value.match(/^var\((--[\w-]+)\)$/);
  const name = varRef?.[1];
  return name ? resolveVar(name, vars, seen) : value;
}

function parseRgb(color: string): readonly [number, number, number] {
  const trimmed = color.trim().toLowerCase();
  if (trimmed === "white") return [255, 255, 255];
  if (trimmed === "black") return [0, 0, 0];

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) throw new Error(`Unsupported contrast color: ${color}`);
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(parseRgb(foreground));
  const bg = relativeLuminance(parseRgb(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme body text contrast", () => {
  it("loads the real token stylesheets", () => {
    expect(tokensCss).toContain("--text-normal");
    expect(highContrastCss).toContain("theme-high-contrast");
  });

  it.each(BODY_TEXT_CASES)("$name keeps body text at WCAG AA contrast", ({ selectors }) => {
    const vars = varsForSelectors(selectors);
    const text = resolveVar("--text-normal", vars);
    const background = resolveVar("--background-primary", vars);

    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
  });
});
