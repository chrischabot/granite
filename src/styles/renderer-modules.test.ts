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
    file: "os-modifiers.css",
    spec: "specs/renderer/os-modifiers.md",
    selectors: [
      ".mod-macos",
      ".mod-macos .titlebar-button-container.mod-left",
      ".mod-macos.is-hidden-frameless:not(.is-popout-window)",
      ".is-ios .lucide-more-vertical",
      ".mod-linux .titlebar-button.mod-close:hover",
      ".is-hidden-frameless.mod-windows .titlebar",
      ".workspace-tabs.mod-top-left-space",
      ".workspace-tabs.mod-top-right-space",
    ],
  },
  {
    file: "rtl.css",
    spec: "specs/renderer/rtl.md",
    selectors: [
      "body.mod-rtl",
      ".mod-rtl.is-mobile",
      ".mod-rtl .community-modal-readme",
      ".mod-rtl .workspace-sidedock-vault-profile",
      ".mod-rtl .sidebar-toggle-button.mod-right",
      ".mod-rtl .search-input-container::before",
      '[lang="he"] svg.svg-icon:is(.lucide-help-circle, .help)',
      ".bases-toolbar-result-count",
      ".workspace-tab-header-inner-title",
      "@supports selector(:has(*))",
      ".markdown-rendered.rtl",
      ".markdown-source-view.rtl .cm-content",
    ],
  },
  {
    file: "typography.css",
    spec: "specs/renderer/typography.md",
    selectors: [
      "body",
      ".markdown-preview-view",
      ".markdown-rendered h1",
      ".cm-host .cm-header-1",
      ".cm-host .cm-formatting-header",
      ".markdown-rendered p",
      ".markdown-rendered strong",
      ".cm-host .cm-strong.cm-em",
      ".markdown-rendered a.internal-link.is-unresolved",
      ".markdown-rendered a.external-link:hover",
      "kbd",
      ".inline-title h1",
      "body:not(.show-inline-title) .inline-title:not([data-level])",
      ".is-text-garbled *",
    ],
  },
  {
    file: "buttons.css",
    spec: "specs/renderer/buttons.md",
    selectors: [".clickable-icon.is-active", ".text-icon-button"],
  },
  {
    file: "loading.css",
    spec: "specs/renderer/loading-states.md",
    selectors: [
      ".is-loading::before",
      ".loader-spinner svg",
      ".loader-cube .sk-cube",
      ".loader-cube .sk-cube9",
      "button.mod-loading::after",
      ".is-flashing",
      ".clickable-icon.mobile-tap svg",
    ],
  },
  {
    file: "progress.css",
    spec: "specs/renderer/progress-bar.md",
    selectors: [
      ".progress-bar-container",
      ".progress-bar-context",
      ".progress-bar-button-container",
      ".progress-bar-indicator",
      ".progress-bar-line",
      ".progress-bar-subline.mod-increase",
      ".progress-bar-subline.mod-decrease",
      ".progress-bar .progress-bar-subline",
    ],
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
    file: "suggestion-and-prompt.css",
    spec: "specs/renderer/suggestion-and-prompt.md",
    selectors: [
      ".prompt-input-container .search-input-clear-button",
      "input.prompt-input:focus-visible",
      ".prompt-instruction-command",
      ".suggestion-container",
      ".cm-tooltip.cm-tooltip-autocomplete",
      ".is-mobile .suggestion-container",
      ".suggestion-bg",
      ".suggestion-empty-suggestion",
      ".suggestion-item.is-being-dragged",
      ".suggestion-item.mod-toggle .mod-checked",
      ".suggestion-item.mod-complex .suggestion-prefix::after",
      ".suggestion-item.mod-complex.suggestion-secret-key",
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
  {
    file: "empty-state.css",
    spec: "specs/renderer/empty-state.md",
    selectors: [
      ".empty-state-container",
      ".empty-state-title",
      ".empty-state-action-list",
      ".empty-state-action.mobile-tap",
      ".workspace-sidedock-empty-state",
      "body.is-phone .feedback-banner-container",
      ".feedback-banner-dismiss-button",
    ],
  },
  {
    file: "card.css",
    spec: "specs/renderer/card.md",
    selectors: [
      ".card-container.mod-horizontal",
      ".card.u-clickable:hover",
      ".card.is-selected",
      ".card-title",
      ".card-description",
      ".card-container.mod-horizontal .card ul",
    ],
  },
  {
    file: "view-release-notes.css",
    spec: "specs/renderer/view-release-notes.md",
    selectors: [
      ".release-notes-view",
      ".release-notes-view .markdown-preview-view",
      ".release-notes-view .is-readable-line-width",
      ".changelog-item::before",
      ".changelog-item.mod-success::before",
      ".changelog-item.mod-failed::before",
      ".changelog-item.mod-highlighted::before",
    ],
  },
  {
    file: "view-history-sync.css",
    spec: "specs/renderer/view-history-sync.md",
    selectors: [
      ".file-recovery-modal",
      ".file-recovery-list-container",
      ".file-recovery-list-item-header.is-active",
      '.file-recovery-text[data-ext="md"]',
      ".sync-history-list-container",
      ".sync-history-list-item-header.is-active .u-muted",
      ".sync-history-list-item-header .sync-history-list-item-avatar",
      ".sync-history-list-item-header .mod-avatar-color-8",
      ".sync-history-list-item .version-group-container .connecting-line",
      ".sync-history-content-container",
      ".sync-status-icon.mod-spin svg",
      ".sync-exclude-folder-remove",
    ],
  },
  {
    file: "settings-community.css",
    spec: [
      "specs/renderer/settings-community-plugins.md",
      "specs/renderer/settings-community-themes.md",
    ],
    selectors: [
      ".mod-community-modal .modal-sidebar .setting-item:not(.setting-item-heading)",
      ".community-modal-details",
      ".community-modal-search-results-wrapper.is-empty-results",
      ".community-modal-search-results-status-content",
      ".community-modal-search-results-cta.mobile-tap",
      ".community-modal-search-results",
      ".community-item .suggestion-highlight",
      ".community-item-badge.mod-update",
      ".community-item-screenshot.mod-unavailable",
      ".community-item-screenshot .placeholder-icon .svg-icon",
      ".community-modal-info-name",
      ".community-modal-info-downloads",
      ".community-modal-button-container",
      ".community-readme video",
      "body:not(.is-phone) .community-item.is-selected .flair",
    ],
  },
  {
    file: "view-graph.css",
    spec: ["specs/renderer/view-graph.md", "specs/renderer/design-tokens.md"],
    selectors: [
      ".graph-view.color-fill-focused",
      ".graph-view.color-fill-unresolved",
      ".graph-view.color-line-highlight",
      ".graph-controls.is-close > .graph-control-section",
      ".workspace-split:not(.mod-root) .graph-controls.is-close",
      ".graph-controls-button",
      ".graph-controls .setting-item.mod-slider .setting-item-control",
      ".graph-color-group",
      '.graph-color-group input[type="color"]',
      ".graph-color-button-container",
      ".graph-slider-value",
      ".graph-view-stats",
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
      const specs = Array.isArray(module.spec) ? module.spec : [module.spec];
      expect(css.startsWith(`/* SPEC: ${specs[0]} */`)).toBe(true);
      for (const spec of specs) {
        expect(css).toContain(`/* SPEC: ${spec} */`);
      }
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
    expect(overlays).not.toContain(".prompt {");
    expect(overlays).not.toContain(".suggestion-item {");
    expect(overlays).not.toContain(".suggestion-container {");

    const views = readFileSync(`${STYLE_DIR}/views.css`, "utf8");
    expect(views).not.toContain("Tree item rows");
    expect(views).not.toContain(".tree-item-self {");

    const flair = readFileSync(`${STYLE_DIR}/flair-and-pill.css`, "utf8");
    expect(flair).not.toContain(".multi-select-pill {");

    expect(views).not.toContain("Generic message (used by error chrome)");

    const base = readFileSync(`${STYLE_DIR}/base.css`, "utf8");
    expect(base).not.toContain("body.is-grabbing");
    expect(base).not.toContain(".is-loading {");
    expect(base).not.toContain(".is-flashing {");
    expect(base).not.toContain("text-rendering: optimizeLegibility");
    expect(base).not.toContain(".is-text-garbled *");

    const tokens = readFileSync(`${STYLE_DIR}/tokens.css`, "utf8");
    expect(tokens).not.toContain(".mod-macos {");
    expect(tokens).not.toContain("body.mod-rtl");

    const markdown = readFileSync(`${STYLE_DIR}/markdown.css`, "utf8");
    expect(markdown).not.toContain(".markdown-rendered.rtl");
    expect(markdown).not.toContain(".markdown-source-view.rtl");
    expect(markdown).not.toContain(".markdown-rendered h1 {");
    expect(markdown).not.toContain(".markdown-rendered strong");
    expect(markdown).not.toContain(".inline-title {");

    const cmLivePreview = readFileSync(`${STYLE_DIR}/cm-livepreview.css`, "utf8");
    expect(cmLivePreview).not.toContain(".cm-host .cm-header-1");
    expect(cmLivePreview).not.toContain(".cm-host .cm-strong");

    const buttons = readFileSync(`${STYLE_DIR}/buttons.css`, "utf8");
    expect(buttons).not.toContain("button.mod-loading");

    expect(shell).not.toContain("Drag overlays (drop preview + fake target)");
    expect(shell).not.toContain(".workspace-drop-overlay");
    expect(shell).not.toContain(".workspace-sidedock-empty-state");
  });
});
