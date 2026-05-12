import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SEARCH_VIEW_FORBIDDEN_PATTERNS = [
  /placeholder="Search… \(tag: path: file: line: -exclude\)"/,
  />\s*Match case\s*</,
  />\s*Sort\s*</,
  />\s*Relevance\s*</,
  />\s*Modified \(newest\)\s*</,
  />\s*Modified \(oldest\)\s*</,
  />\s*Keep typing… \(need at least 2 characters\)\s*</,
  /"Searching…"/,
  /"No results\."/,
];

const TAGS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*No tags found\.\s*</,
  />\s*Show nested tags\s*</,
  /label: `Filter search by #/,
  /label: `Rename #/,
  /aria-label=\{`\$\{isCollapsed \? "Expand" : "Collapse"\}/,
];

const OUTGOING_LINKS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its outgoing links\.\s*</,
  />\s*No outgoing links in this note\.\s*</,
  />\s*L\{l\.line \+ 1\}\s*</,
];

const BACKLINKS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its backlinks\.\s*</,
  />\s*No backlinks found\.\s*</,
  />\s*Line \{ln \+ 1\}\s*</,
  />\s*Unlinked mentions\s*</,
  />\s*Scanning vault…\s*</,
  />\s*No unlinked mentions found\.\s*</,
  /title=\{`Line \$\{match\.line \+ 1\} — matched/,
  />\s*L\{match\.line \+ 1\}\s*</,
];

const RECENTS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*No recent files yet\. Open a note to start the list\.\s*</,
  /aria-label="Remove from recents"/,
];

const FOOTNOTES_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its footnotes\.\s*</,
  />\s*No footnotes in this note\.\s*</,
  /"No definition for this footnote reference"/,
  /reference\$\{fn\.references\.length === 1 \? "" : "s"\}/,
  />\s*missing\s*</,
];

const OUTLINE_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its outline\.\s*</,
  />\s*No headings in this note\.\s*</,
  /placeholder="Filter headings…"/,
  />\s*No headings match filter\.\s*</,
];

const SIDEBAR_REGISTRY_FORBIDDEN_PATTERNS = [
  /label: "Files"/,
  /label: "Search"/,
  /label: "Bookmarks"/,
  /label: "Tags"/,
  /label: "Backlinks"/,
  /label: "Outgoing links"/,
  /label: "Outline"/,
  /label: "Recent files"/,
  /label: "Local graph"/,
  /label: "File properties"/,
  /label: "All properties \(vault\)"/,
  /label: "Footnotes"/,
];

const SIDEBAR_SHELL_FORBIDDEN_PATTERNS = [
  /ariaLabel=\{t\.label\}/,
  /Open \$\{activeTab\?\.label \?\? group\.active\} in central area/,
  /Split \$\{activeTab\?\.label \?\? group\.active\} sidebar group/,
  /Close \$\{activeTab\?\.label \?\? group\.active\} sidebar group/,
];

const LOCAL_GRAPH_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its local graph\.\s*</,
  /"No links yet"/,
  /`\$\{count\} neighbor\$\{count === 1 \? "" : "s"\}`/,
];

const SIDEBAR_LEAF_VIEW_FORBIDDEN_PATTERNS = [/>\s*Sidebar view is no longer available\.\s*</];

const PROPERTIES_VIEW_FORBIDDEN_PATTERNS = [
  /"Could not update property"/,
  /"Could not remove property"/,
  /prompt\("New property name:"\)/,
  />\s*Open a note to see its properties\.\s*</,
  />\s*No properties on this note\. Click\s*</,
  />\s*Add property\s*</,
  /placeholder="comma, separated, values"/,
  /aria-label=\{`Remove property \$\{propKey\}`\}/,
];

const ALL_PROPERTIES_VIEW_FORBIDDEN_PATTERNS = [
  />\s*No properties found across vault\.\s*</,
  /`Override set to "\$\{override\}"\. Reset to clear\.`/,
  /`Inferred type: \$\{effective\}`/,
  /`\(inferred: \$\{p\.inferredType\}\)`/,
  /`\$\{p\.count\} note\$\{p\.count === 1 \? "" : "s"\} use this property`/,
];

const RIBBON_FORBIDDEN_PATTERNS = [
  /label: "Open quick switcher"/,
  /label: "Open command palette"/,
  /label: "Open graph view"/,
  /label: "Create new canvas"/,
  /label: "Create new base"/,
  /label: "Open today's daily note"/,
  /label: "Manage workspace layouts"/,
  /label: "Insert template"/,
  /label: "Create new unique note"/,
  /label: "Open random note"/,
  /label: "Start\/stop recording"/,
  /label: "Manage vaults"/,
  /label: "Open help"/,
  /label: "Open settings"/,
];

const STATUS_BAR_FORBIDDEN_PATTERNS = [
  />\s*Local-only\s*</,
  /\? "word" : "words"/,
  /aria-label="Toggle editing \/ reading mode"/,
  /title="Click to toggle editing \/ reading mode"/,
  /\? "Read" : "Edit"/,
];

const VAULT_PROFILE_FORBIDDEN_PATTERNS = [
  /aria-label="Switch vault"/,
  /\?\? "No vault"/,
  /ariaLabel="Open settings"/,
];

const FILE_EXPLORER_FORBIDDEN_PATTERNS = [
  /prompt\("New note name:", "Untitled\.md"\)/,
  /prompt\("New folder name:", "Untitled"\)/,
  /"Invalid filename\."/,
  /`A file named "\$\{fullPath\}" already exists`/,
  /`A file named "\$\{newPath\}" already exists`/,
  /Delete "\$\{stem\(path\)\}" using/,
  /Delete \$\{paths\.length\} selected file/,
  /"Moved to vault trash\."/,
  /"Moved to system trash\."/,
  /"Deleted\."/,
  /Deleted with \$\{failures\} failure\(s\)\./,
  /Moved and updated \$\{linksRewritten\}/,
  /Imported \$\{imported\} file/,
  /label: "Reveal contents"/,
  /label: "Delete folder"/,
  /label: "Open in current tab"/,
  /label: "Open in new tab"/,
  /label: "Rename"/,
  /label: "Delete"/,
  /item\("name-asc", "Name \(A → Z\)"\)/,
  /item\("name-desc", "Name \(Z → A\)"\)/,
  /item\("mtime-desc", "Modified \(newest first\)"\)/,
  /item\("mtime-asc", "Modified \(oldest first\)"\)/,
  /item\("ctime-desc", "Created \(newest first\)"\)/,
  /item\("ctime-asc", "Created \(oldest first\)"\)/,
  /ariaLabel="New note"/,
  /ariaLabel="New folder"/,
  /ariaLabel="Sort order"/,
  />\s*No vault open\. Open a folder to begin\.\s*</,
  />\s*Loading…\s*</,
  />\s*Empty vault\. Create a note to start\.\s*</,
  />\s*All files in this vault are excluded by your filters\.\s*</,
];

describe("UI string externalization audit", () => {
  it("keeps audited UI surfaces routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/SearchView.tsx`, "utf8");
    const violations = SEARCH_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "search.placeholder",
      "search.matchCase",
      "search.sort",
      "search.status.results",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Tags view labels and menu text routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/TagsView.tsx`, "utf8");
    const violations = TAGS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "tags.empty",
      "tags.showNested",
      "tags.expand",
      "tags.menu.filter",
      "tags.menu.rename",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Outgoing Links view labels routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/OutgoingLinksView.tsx`,
      "utf8",
    );
    const violations = OUTGOING_LINKS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "outgoing.empty.noActive",
      "outgoing.empty.noLinks",
      "outgoing.lineShort",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Backlinks view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/BacklinksView.tsx`, "utf8");
    const violations = BACKLINKS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "backlinks.empty.noActive",
      "backlinks.empty.noLinks",
      "backlinks.unlinked.title",
      "backlinks.unlinked.scanning",
      "backlinks.unlinked.none",
      "backlinks.line",
      "backlinks.lineShort",
      "backlinks.matchTitle",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Recents view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/RecentsView.tsx`, "utf8");
    const violations = RECENTS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of ["recents.empty", "recents.remove"]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Footnotes view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/FootnotesView.tsx`, "utf8");
    const violations = FOOTNOTES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "footnotes.empty.noActive",
      "footnotes.empty.noFootnotes",
      "footnotes.noDefinitionTitle",
      "footnotes.referenceTitle",
      "footnotes.missing",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Outline view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/OutlineView.tsx`, "utf8");
    const violations = OUTLINE_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "outline.empty.noActive",
      "outline.empty.noHeadings",
      "outline.filterPlaceholder",
      "outline.empty.noFilterMatch",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps sidebar tab registry labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/registry.tsx`, "utf8");
    const violations = SIDEBAR_REGISTRY_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "sidebar.tab.files",
      "sidebar.tab.search",
      "sidebar.tab.bookmarks",
      "sidebar.tab.tags",
      "sidebar.tab.backlinks",
      "sidebar.tab.outgoing",
      "sidebar.tab.outline",
      "sidebar.tab.recents",
      "sidebar.tab.localGraph",
      "sidebar.tab.fileProperties",
      "sidebar.tab.allProperties",
      "sidebar.tab.footnotes",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps sidebar shell action labels routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/ui/shell/LeftSidebar.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/shell/RightSidebar.tsx`, "utf8"),
    ];
    const violations = sources.flatMap((source) =>
      SIDEBAR_SHELL_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source)),
    );
    for (const source of sources) {
      for (const requiredKey of [
        "sidebar.openInCenter",
        "sidebar.splitGroup",
        "sidebar.closeGroup",
      ]) {
        expect(source).toContain(requiredKey);
      }
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Local Graph view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/LocalGraphView.tsx`, "utf8");
    const violations = LOCAL_GRAPH_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "localGraph.empty.noActive",
      "localGraph.empty.noLinks",
      "localGraph.neighbor",
      "localGraph.neighbors",
      "localGraph.openNote",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps unavailable sidebar leaf fallback routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/SidebarLeafView.tsx`,
      "utf8",
    );
    const violations = SIDEBAR_LEAF_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    expect(source).toContain("sidebar.unavailable");

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Properties view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/PropertiesView.tsx`, "utf8");
    const violations = PROPERTIES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "properties.error.update",
      "properties.error.remove",
      "properties.addPrompt",
      "properties.empty.noActive",
      "properties.empty.noProperties",
      "properties.addLabel",
      "properties.addAction",
      "properties.listPlaceholder",
      "properties.remove",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps All Properties view labels routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/AllPropertiesView.tsx`,
      "utf8",
    );
    const violations = ALL_PROPERTIES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "allProperties.empty",
      "allProperties.overrideTitle",
      "allProperties.inferredTitle",
      "allProperties.inferredOption",
      "allProperties.usageTitle",
      "properties.note",
      "properties.notes",
      "propertyType.",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Ribbon labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/shell/Ribbon.tsx`, "utf8");
    const violations = RIBBON_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "ribbon.quickSwitcher",
      "ribbon.commandPalette",
      "ribbon.graph",
      "ribbon.canvas",
      "ribbon.base",
      "ribbon.daily",
      "ribbon.workspaces",
      "ribbon.template",
      "ribbon.unique",
      "ribbon.random",
      "ribbon.record",
      "ribbon.vaults",
      "ribbon.help",
      "ribbon.settings",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Status Bar labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/shell/StatusBar.tsx`, "utf8");
    const violations = STATUS_BAR_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "status.localOnly",
      "status.word",
      "status.words",
      "status.toggleMode",
      "status.toggleModeTitle",
      "status.mode.read",
      "status.mode.edit",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Vault Profile labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/shell/VaultProfile.tsx`, "utf8");
    const violations = VAULT_PROFILE_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of ["vaultProfile.switch", "vaultProfile.noVault", "ribbon.settings"]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps File Explorer labels routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/file-explorer/FileExplorerView.tsx`,
      "utf8",
    );
    const violations = FILE_EXPLORER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "fileExplorer.prompt.newNote",
      "fileExplorer.prompt.newFolder",
      "fileExplorer.error.invalidFilename",
      "fileExplorer.error.exists",
      "fileExplorer.confirm.deleteOne",
      "fileExplorer.confirm.deleteMany",
      "fileExplorer.notice.movedVault",
      "fileExplorer.notice.movedSystem",
      "fileExplorer.notice.deleted",
      "fileExplorer.notice.bulkSuccess",
      "fileExplorer.notice.deletedWithFailures",
      "fileExplorer.notice.movedAndUpdated",
      "fileExplorer.notice.imported",
      "fileExplorer.menu.revealContents",
      "fileExplorer.menu.deleteFolder",
      "fileExplorer.menu.openCurrent",
      "fileExplorer.menu.openNew",
      "fileExplorer.menu.rename",
      "fileExplorer.menu.delete",
      "fileExplorer.sort.nameAsc",
      "fileExplorer.sort.createdOldest",
      "fileExplorer.action.newNote",
      "fileExplorer.action.newFolder",
      "fileExplorer.action.sortOrder",
      "fileExplorer.empty.noVault",
      "fileExplorer.empty.loading",
      "fileExplorer.empty.emptyVault",
      "fileExplorer.empty.allExcluded",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
