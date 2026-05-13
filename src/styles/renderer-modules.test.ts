import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const STYLE_DIR = `${process.cwd()}/src/styles`;

const MODULES = [
  {
    file: "animations.css",
    spec: "specs/renderer/animations.md",
    selectors: [
      "@keyframes node-inserted",
      "@keyframes blink",
      "@keyframes sk-cubeGridScaleDelay",
      "@keyframes multi-select-highlight",
      "@keyframes increase",
      "@keyframes decrease",
      "@keyframes pop-down",
      "@keyframes pop-right",
      "@keyframes rotation",
      "@keyframes hmd-file-uploading-ani",
      "@keyframes progress-bar",
      "@keyframes spin",
      "@keyframes slideIn",
    ],
  },
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
  {
    file: "slider.css",
    spec: "specs/renderer/slider.md",
    selectors: [
      'input[type="range"]',
      'input[type="range"]::-webkit-slider-thumb',
      'body:not(.is-mobile) input[type="range"]:focus-visible::-webkit-slider-thumb',
    ],
  },
  {
    file: "flair-and-pill.css",
    spec: "specs/renderer/flair-and-pill.md",
    selectors: [".flair.mod-pop", ".suggestion-flair", ".tree-item-flair", ".multi-select-pill"],
  },
  {
    file: "notice.css",
    spec: "specs/renderer/notice.md",
    selectors: [
      ".notice-container",
      ".notice progress",
      ".notice-button-container",
      ".notice-cta",
      ".notice-error",
    ],
  },
  {
    file: "tree-item.css",
    spec: "specs/renderer/tree-item.md",
    selectors: [
      ".tree-item-self::before",
      ".tree-item-self.is-being-renamed",
      ".tree-item-self .tree-item-icon",
      ".tree-item-inner-subtext",
      ".tree-item-children",
      ".drop-indicator:not(.is-active)",
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
    expect(overlays).not.toContain("Notice container (toasts)");

    const views = readFileSync(`${STYLE_DIR}/views.css`, "utf8");
    expect(views).not.toContain("Tree item rows");
    expect(views).not.toContain(".tree-item-self {");
  });
});
