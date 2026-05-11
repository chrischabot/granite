# 19 — Component styling reference

Per-component CSS variables. Defaults reference foundational tokens from `18_design_tokens.md`. Implementations should expose every variable here so themes have full control.

## 19.1 Window frame

| Variable | Description |
|----------|-------------|
| `--titlebar-background` | Title bar background when window is unfocused. |
| `--titlebar-background-focused` | Title bar background when focused. |
| `--titlebar-border-width` | Border width below title bar. |
| `--titlebar-border-color` | Border color. |
| `--titlebar-text-color` | Title bar text color (unfocused). |
| `--titlebar-text-color-focused` | Title bar text color (focused). |
| `--titlebar-text-weight` | Title bar font weight. |
| `--header-height` | Reference height for frame elements. |

## 19.2 Workspace

| Variable | Description |
|----------|-------------|
| `--workspace-background-translucent` | Background when translucent window mode is on. |

## 19.3 Ribbon

| Variable | Description |
|----------|-------------|
| `--ribbon-background` | Background. |
| `--ribbon-background-collapsed` | Background when left sidebar is collapsed. |
| `--ribbon-width` | Total ribbon width (≈ 44 px). |
| `--ribbon-padding` | Inner padding. |

## 19.4 Sidebar

| Variable | Description |
|----------|-------------|
| `--sidebar-markdown-font-size` | Font size for Markdown rendered inside sidebar tabs. |
| `--sidebar-tab-text-display` | `display` value for tab labels. Set to `none` for icon-only (default). |

## 19.5 Status bar

| Variable | Description |
|----------|-------------|
| `--status-bar-background` | Background. |
| `--status-bar-border-color` | Border. |
| `--status-bar-border-width` | Border width. |
| `--status-bar-font-size` | Font size. |
| `--status-bar-text-color` | Text color. |
| `--status-bar-position` | `position` (default `relative`). |
| `--status-bar-radius` | Corner radius (when floating). |
| `--status-bar-scroll-padding` | Inner scroll padding. |

## 19.6 Vault profile

| Variable | Description |
|----------|-------------|
| `--vault-profile-display` | `display` (none/flex/etc.). |
| `--vault-profile-actions-display` | Display of trailing action buttons. |
| `--vault-profile-font-size` | Font size of vault name. |
| `--vault-profile-font-weight` | Font weight. |
| `--vault-profile-color` | Text color. |
| `--vault-profile-color-hover` | Text color on hover. |

## 19.7 Tabs

### Single tabs

| Variable | Description |
|----------|-------------|
| `--tab-background-active` | Active tab background. |
| `--tab-text-color` | Tab text. |
| `--tab-text-color-active` | Active tab text in unfocused window. |
| `--tab-text-color-focused` | Tab text in focused window. |
| `--tab-text-color-focused-active` | Active tab in focused window. |
| `--tab-text-color-focused-highlighted` | Highlighted (search-target) tab. |
| `--tab-text-color-focused-active-current` | Current tab text. |
| `--tab-font-size` | Tab font size (≈ 13 px). |
| `--tab-font-weight` | Tab font weight. |
| `--tab-container-background` | Tab strip background. |
| `--tab-divider-color` | Divider color between tabs. |
| `--tab-outline-color` | Active-tab outline. |
| `--tab-outline-width` | Outline width. |
| `--tab-curve` | Curvature radius for tab edges. |
| `--tab-radius` | Outer radius. |
| `--tab-radius-active` | Outer radius when active. |
| `--tab-width` | Default width when tabs are sized to fit. |
| `--tab-max-width` | Maximum tab width. |

### Stacked tab groups

| Variable | Description |
|----------|-------------|
| `--tab-stacked-pane-width` | Width of the visible pane. |
| `--tab-stacked-header-width` | Width of each stacked tab's header strip. |
| `--tab-stacked-font-size` | Stacked tab text size. |
| `--tab-stacked-font-weight` | Stacked tab text weight. |
| `--tab-stacked-text-align` | `text-align`. |
| `--tab-stacked-text-transform` | e.g. `uppercase`. |
| `--tab-stacked-text-writing-mode` | e.g. `vertical-rl`. |
| `--tab-stacked-shadow` | Drop shadow between stacked panes. |

## 19.8 Navigation list (file explorer rows, settings sidebar, etc.)

| Variable | Description |
|----------|-------------|
| `--nav-item-size` | Row font size. |
| `--nav-item-color` | Default text. |
| `--nav-item-color-hover` | Text on hover. |
| `--nav-item-color-active` | Text when row's file is the active editor. |
| `--nav-item-color-selected` | Text when row is selected. |
| `--nav-item-color-highlighted` | Text when row is highlighted (e.g. search). |
| `--nav-item-background-hover` | Row hover background. |
| `--nav-item-background-active` | Row active background. |
| `--nav-item-background-selected` | Row selected background. |
| `--nav-item-padding` | Row padding. |
| `--nav-item-parent-padding` | Padding for parent (folder) rows. |
| `--nav-item-children-padding-start` | Inset for nested rows. |
| `--nav-item-children-margin-start` | Indentation between levels. |
| `--nav-item-weight` | Default font weight. |
| `--nav-item-weight-hover` | Weight on hover. |
| `--nav-item-weight-active` | Weight when active. |
| `--nav-item-white-space` | Wrap behavior. |
| `--nav-indentation-guide-width` | Vertical guide line width. |
| `--nav-indentation-guide-color` | Vertical guide line color. |
| `--nav-collapse-icon-color` | Chevron color (expanded). |
| `--nav-collapse-icon-color-collapsed` | Chevron color (collapsed). |

### Navigation headings (for collapsible sections like Linked / Unlinked mentions)

| Variable | Description |
|----------|-------------|
| `--nav-heading-color` | Heading text. |
| `--nav-heading-color-hover` | Heading text on hover. |
| `--nav-heading-color-collapsed` | Heading when section is collapsed. |
| `--nav-heading-color-colapsed-hover` | (sic — preserve spelling for compatibility) |
| `--nav-heading-weight` | Heading weight. |
| `--nav-heading-weight-hover` | Heading weight on hover. |

> Note: `--nav-heading-color-colapsed-hover` has the historical typo `colapsed`. Preserve it verbatim for theme compatibility.

## 19.9 Divider (between sidebars and panes)

| Variable | Description |
|----------|-------------|
| `--divider-color` | Default. |
| `--divider-color-hover` | On hover. |
| `--divider-width` | Width at rest. |
| `--divider-width-hover` | Width on hover. |
| `--divider-vertical-height` | Height of vertical dividers (in stacked groups). |

## 19.10 Scrollbar

(Used on Windows and Linux; macOS uses native scrollbars.)

| Variable | Description |
|----------|-------------|
| `--scrollbar-bg` | Track background. |
| `--scrollbar-thumb-bg` | Thumb. |
| `--scrollbar-active-thumb-bg` | Thumb when actively dragging. |

## 19.11 Modal

| Variable | Description | Suggested default |
|----------|-------------|--------------------|
| `--modal-background` | Background. | `--background-primary` |
| `--modal-width` | Default width. | `90vw` |
| `--modal-height` | Default height. | `auto` |
| `--modal-max-width` | Cap. | `1100px` |
| `--modal-max-height` | Cap. | `80vh` |
| `--modal-max-width-narrow` | Narrow cap. | `600px` |
| `--modal-border-width` | Border. | `--border-width` |
| `--modal-border-color` | Border. | `--background-modifier-border` |
| `--modal-radius` | Corners. | `--radius-l` |
| `--modal-community-sidebar-width` | Sidebar in plugin browser. | `280px` |

## 19.12 Prompt (Quick switcher / Command palette)

| Variable | Description |
|----------|-------------|
| `--prompt-input-height` | Height of the search input. |
| `--prompt-width` | Default width. |
| `--prompt-max-width` | Max width. |
| `--prompt-max-height` | Result list cap. |
| `--prompt-border-width` | Border. |
| `--prompt-border-color` | Border. |

## 19.13 Dialog (smaller modal for confirmations)

| Variable | Description |
|----------|-------------|
| `--dialog-width` | Default width. |
| `--dialog-max-width` | Max width. |
| `--dialog-max-height` | Max height. |

## 19.14 Popover (hover preview, link preview)

| Variable | Description |
|----------|-------------|
| `--popover-width` | Default. |
| `--popover-height` | Default. |
| `--popover-max-height` | Cap. |
| `--popover-font-size` | Font. |
| `--popover-pdf-width` | PDF preview width. |
| `--popover-pdf-height` | PDF preview height. |

## 19.15 Button

Buttons inherit foreground from interactive variables. The dedicated variable:

| Variable | Description |
|----------|-------------|
| `--button-radius` | Corner radius (default `--radius-s`). |

Standard button sizes:

- Default: height ≈ 30 px, horizontal padding `--size-4-3`, font `--font-ui-small`.
- Large CTA in modals: height ≈ 36 px, padding `--size-4-4`.
- Compact icon button: square at `--icon-size`, padding `--size-2-1`.

## 19.16 Text input

| Variable | Description |
|----------|-------------|
| `--input-height` | Height. |
| `--input-radius` | Corner radius. |
| `--input-font-weight` | Font weight. |
| `--input-border-width` | Border width. |

## 19.17 Toggle

| Variable | Description |
|----------|-------------|
| `--toggle-border-width` | Track border. |
| `--toggle-width` | Track width. |
| `--toggle-radius` | Track radius (typically pill). |
| `--toggle-thumb-color` | Thumb fill. |
| `--toggle-thumb-radius` | Thumb radius. |
| `--toggle-thumb-height` | Thumb height. |
| `--toggle-thumb-width` | Thumb width. |
| `--toggle-s-border-width` | Small variant. |
| `--toggle-s-width` | Small width. |
| `--toggle-s-thumb-height` | Small thumb height. |
| `--toggle-s-thumb-width` | Small thumb width. |

## 19.18 Checkbox

| Variable | Description |
|----------|-------------|
| `--checkbox-radius` | Box radius. |
| `--checkbox-size` | Width and height. |
| `--checkbox-marker-color` | Check glyph color. |
| `--checkbox-color` | Background when checked. |
| `--checkbox-color-hover` | Background when checked + hover. |
| `--checkbox-border-color` | Border when unchecked. |
| `--checkbox-border-color-hover` | Border when unchecked + hover. |
| `--checklist-done-decoration` | Text decoration on completed task. |
| `--checklist-done-color` | Text color on completed task. |
| `--checkbox-margin-inline-start` | Leading margin. |

## 19.19 Slider

| Variable | Description |
|----------|-------------|
| `--slider-thumb-border-width` | Thumb border. |
| `--slider-thumb-border-color` | Thumb border color. |
| `--slider-thumb-height` | Thumb height. |
| `--slider-thumb-width` | Thumb width. |
| `--slider-thumb-y` | Vertical thumb offset. |
| `--slider-thumb-radius` | Thumb radius. |
| `--slider-track-background` | Track color. |
| `--slider-track-height` | Track height. |

## 19.20 Dropdown / select

| Variable | Description |
|----------|-------------|
| `--dropdown-background` | Background. |
| `--dropdown-background-blend-mode` | Blend mode (for chevron asset). |
| `--dropdown-background-hover` | Hover background. |
| `--dropdown-background-position` | Chevron asset position. |
| `--dropdown-background-size` | Chevron size. |
| `--dropdown-padding` | Inner padding. |

## 19.21 Editor: file (open file area)

| Variable | Description |
|----------|-------------|
| `--file-line-width` | Body width when readable line length is on. |
| `--file-folding-offset` | Width of fold indicator gutter. |
| `--file-margins` | Outer margins around file content. |
| `--file-header-font-size` | Optional file header bar font. |
| `--file-header-font-weight` | File header weight. |
| `--file-header-border` | `border-bottom` of the file header. |
| `--file-header-justify` | `justify-content` for file header. |

## 19.22 Editor: headings (H1–H6)

For each level *N* in `1..6`:

| Variable | Description |
|----------|-------------|
| `--hN-color` | Text color. |
| `--hN-font` | Font family override. |
| `--hN-line-height` | Line height. |
| `--hN-size` | Font size. |
| `--hN-style` | Font style (italic/normal). |
| `--hN-variant` | `font-variant`. |
| `--hN-weight` | Weight. |
| `--heading-formatting` | Color of the leading `#` syntax in Live Preview. |
| `--heading-spacing` | Spacing above headings. |

Default sizes: H1 `2em`, H2 `1.5em`, H3 `1.25em`, H4 `1.1em`, H5 `1em`, H6 `0.875em`. Default weight: `--font-bold` for H1–H3, `--font-semibold` for H4–H6.

## 19.23 Editor: inline title

| Variable | Description |
|----------|-------------|
| `--inline-title-color` | Color. |
| `--inline-title-font` | Font family. |
| `--inline-title-line-height` | Line height. |
| `--inline-title-size` | Font size. |
| `--inline-title-style` | Font style. |
| `--inline-title-variant` | Variant. |
| `--inline-title-weight` | Weight. |

## 19.24 Editor: link

| Variable | Description |
|----------|-------------|
| `--link-color` | Resolved internal link. |
| `--link-color-hover` | Hover. |
| `--link-decoration` | e.g. `underline`. |
| `--link-decoration-hover` | Hover decoration. |
| `--link-decoration-thickness` | Underline thickness. |
| `--link-weight` | Font weight. |
| `--link-unresolved-color` | Unresolved (broken) link color. |
| `--link-unresolved-opacity` | Opacity. |
| `--link-unresolved-filter` | CSS filter (often `hue-rotate`). |
| `--link-unresolved-decoration-style` | Often `dashed`. |
| `--link-unresolved-decoration-color` | Decoration color. |
| `--link-external-color` | External link. |
| `--link-external-color-hover` | Hover. |
| `--link-external-decoration` | Decoration. |
| `--link-external-decoration-hover` | Decoration on hover. |

## 19.25 Editor: list

| Variable | Description |
|----------|-------------|
| `--list-indent` | Indent per nesting level. |
| `--list-indent-editing` | Indent in Live Preview. |
| `--list-indent-source` | Indent in Source mode. |
| `--list-spacing` | Vertical gap between items. |
| `--list-marker-color` | Bullet/number color. |
| `--list-marker-color-hover` | Hover. |
| `--list-marker-color-collapsed` | When section is folded. |
| `--list-bullet-border` | Custom bullet border. |
| `--list-bullet-end-padding` | Padding after bullet. |
| `--list-bullet-radius` | Bullet radius. |
| `--list-bullet-size` | Bullet size. |
| `--list-bullet-transform` | Transform applied to bullet. |
| `--list-numbered-style` | `list-style-type` for numbered lists. |

## 19.26 Editor: blockquote

| Variable | Description |
|----------|-------------|
| `--blockquote-background-color` | Background tint. |
| `--blockquote-border-thickness` | Left bar thickness. |
| `--blockquote-border-color` | Left bar color. |
| `--blockquote-font-style` | Font style. |
| `--blockquote-color` | Text color. |

## 19.27 Editor: callout

(Detailed in `08_callouts.md`.) Callout variables:

`--callout-border-width`, `--callout-border-opacity`, `--callout-padding`, `--callout-radius`, `--callout-blend-mode`, `--callout-title-color`, `--callout-title-padding`, `--callout-title-size`, `--callout-title-weight`, `--callout-content-padding`, `--callout-content-background`.

Plus per-type RGB triples: `--callout-bug`, `--callout-default`, `--callout-error`, `--callout-example`, `--callout-fail`, `--callout-important`, `--callout-info`, `--callout-question`, `--callout-success`, `--callout-summary`, `--callout-tip`, `--callout-todo`, `--callout-warning`, `--callout-quote`.

## 19.28 Editor: code

| Variable | Description |
|----------|-------------|
| `--code-background` | Inline + block background. |
| `--code-white-space` | `white-space` of code. |
| `--code-size` | Font size. |
| `--code-normal` | Default token color. |
| `--code-comment` | Comment token. |
| `--code-function` | Function token. |
| `--code-important` | Important / regex. |
| `--code-keyword` | Keyword. |
| `--code-operator` | Operator. |
| `--code-property` | Property. |
| `--code-punctuation` | Punctuation. |
| `--code-string` | String. |
| `--code-tag` | Tag / symbol / constant. |
| `--code-value` | Numeric value. |

The reading-view highlighter (Prism) and the editing-view highlighter (CodeMirror's own) may render the same token with slightly different scopes — small visual differences are tolerated.

## 19.29 Editor: table

`--table-background`, `--table-border-width`, `--table-border-color`, `--table-cell-vertical-alignment`, `--table-white-space`, `--table-header-background`, `--table-header-background-hover`, `--table-header-border-width`, `--table-header-border-color`, `--table-header-font`, `--table-header-size`, `--table-header-weight`, `--table-header-color`, `--table-line-height`, `--table-text-size`, `--table-text-color`, `--table-column-max-width`, `--table-column-alt-background`, `--table-column-first-border-width`, `--table-column-last-border-width`, `--table-row-background-hover`, `--table-row-alt-background`, `--table-row-alt-background-hover`, `--table-row-last-border-width`, `--table-selection`, `--table-selection-blend-mode`, `--table-selection-border-color`, `--table-selection-border-width`, `--table-selection-border-radius`, `--table-drag-handle-background`, `--table-drag-handle-background-active`, `--table-drag-handle-color`, `--table-drag-handle-color-active`, `--table-add-button-background`, `--table-add-button-border-width`, `--table-add-button-border-color`.

## 19.30 Editor: tag (the rendered tag pill)

`--tag-size`, `--tag-color`, `--tag-color-hover`, `--tag-decoration`, `--tag-decoration-hover`, `--tag-background`, `--tag-background-hover`, `--tag-border-color`, `--tag-border-color-hover`, `--tag-border-width`, `--tag-padding-x`, `--tag-padding-y`, `--tag-radius`, `--tag-weight`.

## 19.31 Editor: properties (frontmatter editor)

(Detailed in `10_properties_and_tags.md`.) Variables include:

`--metadata-background`, `--metadata-display-editing`, `--metadata-display-reading`, `--metadata-max-width`, `--metadata-padding`, `--metadata-border-color`, `--metadata-border-radius`, `--metadata-border-width`, `--metadata-gap`, `--metadata-divider-color`, `--metadata-divider-color-hover`, `--metadata-divider-color-focus`, `--metadata-divider-width`, `--metadata-property-padding`, `--metadata-property-radius`, `--metadata-property-radius-hover`, `--metadata-property-radius-focus`, `--metadata-property-background`, `--metadata-property-background-hover`, `--metadata-property-background-active`, `--metadata-label-background-hover`, `--metadata-label-background-active`, `--metadata-label-font-size`, `--metadata-label-font-weight`, `--metadata-sidebar-label-font-size`, `--metadata-label-text-color`, `--metadata-label-text-color-hover`, `--metadata-label-width`, `--metadata-input-height`, `--metadata-input-text-color`, `--metadata-input-font-size`, `--metadata-sidebar-input-font-size`, `--metadata-input-background`, `--metadata-input-background-hover`, `--metadata-input-background-active`.

## 19.32 Editor: embed

`--embed-max-height`, `--embed-canvas-max-height`, `--embed-background`, `--embed-border-end`, `--embed-border-start`, `--embed-border-top`, `--embed-border-bottom`, `--embed-padding`, `--embed-font-style`, `--embed-block-shadow-hover` (for embedded-block hover state in Live Preview).

## 19.33 Editor: footnote

`--footnote-size` only.

## 19.34 Editor: horizontal rule

`--hr-color`, `--hr-thickness`.

## 19.35 Plugin: Canvas

`--canvas-background`, `--canvas-card-label-color`, `--canvas-dot-pattern`, `--canvas-color-1`, `--canvas-color-2`, `--canvas-color-3`, `--canvas-color-4`, `--canvas-color-5`, `--canvas-color-6`.

## 19.36 Plugin: Graph

`--graph-controls-width`, `--graph-text`, `--graph-line`, `--graph-node`, `--graph-node-unresolved`, `--graph-node-focused`, `--graph-node-tag`, `--graph-node-attachment`.

## 19.37 Plugin: Search

`--search-clear-button-color`, `--search-clear-button-size`, `--search-icon-color`, `--search-icon-size`, `--search-result-background`.

## 19.38 Plugin: File explorer

Shares `--vault-profile-*` variables (see §19.6).