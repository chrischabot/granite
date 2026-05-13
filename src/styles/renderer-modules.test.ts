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
    file: "multi-select.css",
    spec: "specs/renderer/multi-select.md",
    selectors: [
      ".multi-select-container",
      ".multi-select-pill:focus::after",
      ".multi-select-pill-content",
      ".multi-select-pill-remove-button",
      ".multi-select-input:empty::before",
      ".multi-select-duplicate",
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
    selectors: [".flair.mod-pop", ".suggestion-flair", ".tree-item-flair"],
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
    ],
  },
  {
    file: "scrollbars.css",
    spec: "specs/renderer/scrollbars.md",
    selectors: [
      ".is-android",
      "body.is-screenshotting *::-webkit-scrollbar",
      "body.styled-scrollbars ::-webkit-scrollbar-thumb",
      "body.styled-scrollbars ::-webkit-scrollbar-corner",
      "@supports not selector(::-webkit-scrollbar)",
      "@media print",
    ],
  },
  {
    file: "modal.css",
    spec: "specs/renderer/modal.md",
    selectors: [
      ".modal-container.is-being-dragged .modal-bg",
      ".modal.mod-scrollable-content .modal-button-container",
      ".modal.mod-scrollable .modal-content",
      ".modal-sidebar",
      "body.styled-scrollbars .modal-close-button",
      ".modal-confirmation-state",
      ".modal-setting-nav-bar",
      ".modal.mod-image-lightbox .modal-content",
      ".modal.mod-file-browser .modal-content",
      ".mod-file-rename .rename-textarea",
    ],
  },
  {
    file: "drag.css",
    spec: "specs/renderer/drag-and-drop.md",
    selectors: [
      "body.is-grabbing",
      "body.is-grabbing webview:not(.is-controlled)",
      ".drag-ghost.mod-leaf",
      ".drag-reorder-ghost",
      ".drag-ghost-hidden::before",
      ".drop-indicator:not(.is-active)",
      ".workspace-drop-overlay::before",
      ".workspace-fake-target-overlay > *",
    ],
  },
  {
    file: "splash.css",
    spec: "specs/renderer/splash.md",
    selectors: [
      ".starter-screen-inner",
      ".splash-brand-logo-text",
      ".splash-brand-version",
      ".help-options-container",
      ".help-options-container .setting-item-description",
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
    expect(overlays).not.toContain(" * Modal");
    expect(overlays).not.toContain(".modal-container {");

    const views = readFileSync(`${STYLE_DIR}/views.css`, "utf8");
    expect(views).not.toContain("Tree item rows");
    expect(views).not.toContain(".tree-item-self {");

    const flair = readFileSync(`${STYLE_DIR}/flair-and-pill.css`, "utf8");
    expect(flair).not.toContain(".multi-select-pill {");

    expect(views).not.toContain("Generic message (used by error chrome)");

    const base = readFileSync(`${STYLE_DIR}/base.css`, "utf8");
    expect(base).not.toContain("body.is-grabbing");

    expect(shell).not.toContain("Drag overlays (drop preview + fake target)");
    expect(shell).not.toContain(".workspace-drop-overlay");
  });
});
