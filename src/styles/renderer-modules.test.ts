import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const STYLE_DIR = `${process.cwd()}/src/styles`;

const MODULES = [
  {
    file: "buttons.css",
    spec: "specs/renderer/buttons.md",
    selectors: ["button.mod-loading::after", ".clickable-icon.is-active", ".text-icon-button"],
  },
  {
    file: "inputs.css",
    spec: "specs/renderer/inputs.md",
    selectors: [
      "textarea",
      ".multi-select-container",
      'input[type="search"]::-webkit-search-cancel-button',
    ],
  },
  {
    file: "checkbox.css",
    spec: "specs/renderer/checkbox.md",
    selectors: [
      'input[type="checkbox"]:checked::after',
      'input[type="checkbox"][data-indeterminate="true"]:not(:checked)::after',
      'input[type="radio"]:checked::after',
    ],
  },
] as const;

describe("renderer CSS module coverage", () => {
  it("imports dedicated renderer modules from the stylesheet root", () => {
    const index = readFileSync(`${STYLE_DIR}/index.css`, "utf8");

    for (const module of MODULES) {
      expect(index).toContain(`@import "./${module.file}"`);
    }
  });

  it("keeps each extracted module linked to its renderer spec", () => {
    for (const module of MODULES) {
      const css = readFileSync(`${STYLE_DIR}/${module.file}`, "utf8");
      expect(css.startsWith(`/* SPEC: ${module.spec} */`)).toBe(true);
      for (const selector of module.selectors) {
        expect(css).toContain(selector);
      }
    }
  });

  it("does not leave extracted button/input rules in shell or overlay styles", () => {
    const shell = readFileSync(`${STYLE_DIR}/shell.css`, "utf8");
    const overlays = readFileSync(`${STYLE_DIR}/overlays.css`, "utf8");

    expect(shell).not.toContain("square SVG-only button");
    expect(overlays).not.toContain("Inputs — base shared rule");
    expect(overlays).not.toContain("Buttons (default, mod-cta");
  });
});
