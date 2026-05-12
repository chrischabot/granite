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
});
