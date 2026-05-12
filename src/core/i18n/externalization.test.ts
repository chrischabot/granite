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
});
