import { describe, expect, it } from "vitest";
import {
  type BaseConfig,
  DEFAULT_BASE,
  columnLabel,
  parseBaseConfig,
  serializeBaseConfig,
} from "./schema";

describe("parseBaseConfig", () => {
  it("returns defaults on empty input", () => {
    expect(parseBaseConfig("")).toEqual(DEFAULT_BASE);
  });

  it("returns defaults on malformed YAML", () => {
    expect(parseBaseConfig(":\n:: bad")).toEqual(DEFAULT_BASE);
  });

  it("parses every known legacy field", () => {
    const src = `
name: My Base
filter: tag:project
columns:
  - file.name
  - tags
sort: file.modified
sortOrder: desc
`;
    const c = parseBaseConfig(src);
    expect(c.name).toBe("My Base");
    expect(c.filter).toBe("tag:project");
    expect(c.columns).toEqual(["file.name", "tags"]);
    expect(c.sort).toBe("file.modified");
    expect(c.sortOrder).toBe("desc");
    expect(c.view).toBe("table");
    expect(c.summaries).toEqual([]);
    expect(c.formulas).toEqual({});
    expect(c.groupBy).toBeUndefined();
  });

  it("fills missing fields with defaults", () => {
    const c = parseBaseConfig("name: X");
    expect(c.name).toBe("X");
    expect(c.filter).toBe(DEFAULT_BASE.filter);
    expect(c.columns).toEqual(DEFAULT_BASE.columns);
    expect(c.sort).toBe(DEFAULT_BASE.sort);
    expect(c.sortOrder).toBe(DEFAULT_BASE.sortOrder);
    expect(c.view).toBe(DEFAULT_BASE.view);
  });

  it("ignores invalid types", () => {
    const src = `
name: 42
columns: not-an-array
sortOrder: sideways
`;
    const c = parseBaseConfig(src);
    expect(c.name).toBe(DEFAULT_BASE.name); // non-string falls back
    expect(c.columns).toEqual(DEFAULT_BASE.columns);
    expect(c.sortOrder).toBe("asc"); // unknown ordering → asc
  });

  it("parses the extended fields", () => {
    const src = `
name: Tasks
filter: ""
columns: ["file.name", "status"]
sort: file.name
sortOrder: asc
view: cards
groupBy: status
summaries:
  - { column: file.name, op: count, label: "Total" }
  - { column: file.size, op: sum }
formulas:
  size_kb: "file.size / 1024"
`;
    const c = parseBaseConfig(src);
    expect(c.view).toBe("cards");
    expect(c.groupBy).toBe("status");
    expect(c.summaries).toHaveLength(2);
    expect(c.summaries[0]).toEqual({ column: "file.name", op: "count", label: "Total" });
    expect(c.summaries[1]).toEqual({ column: "file.size", op: "sum" });
    expect(c.formulas).toEqual({ size_kb: "file.size / 1024" });
  });

  it("drops invalid summary entries", () => {
    const src = `
summaries:
  - { column: a, op: not-an-op }
  - { column: b, op: sum }
  - "string entry"
`;
    const c = parseBaseConfig(src);
    expect(c.summaries).toEqual([{ column: "b", op: "sum" }]);
  });

  it("defaults view to table when value is unknown", () => {
    const c = parseBaseConfig("view: spaceship");
    expect(c.view).toBe("table");
  });
});

describe("serializeBaseConfig", () => {
  it("round-trips through parse", () => {
    const cfg: BaseConfig = {
      name: "Test",
      filter: "tag:foo",
      columns: ["file.name", "tags"],
      sort: "file.name",
      sortOrder: "desc",
      view: "table",
      summaries: [],
      formulas: {},
    };
    const yamlText = serializeBaseConfig(cfg);
    expect(parseBaseConfig(yamlText)).toEqual(cfg);
  });

  it("round-trips groupBy / summaries / formulas", () => {
    const cfg: BaseConfig = {
      name: "Tasks",
      filter: "tag:work",
      columns: ["file.name", "status"],
      sort: "file.name",
      sortOrder: "asc",
      view: "list",
      groupBy: "status",
      summaries: [{ column: "file.name", op: "count" }],
      formulas: { excerpt: "lower(file.name)" },
    };
    const yamlText = serializeBaseConfig(cfg);
    expect(parseBaseConfig(yamlText)).toEqual(cfg);
  });

  it("omits optional fields when empty", () => {
    const text = serializeBaseConfig({ ...DEFAULT_BASE, view: "table" });
    expect(text).not.toContain("groupBy");
    expect(text).not.toContain("summaries");
    expect(text).not.toContain("formulas");
  });
});

describe("columnLabel", () => {
  it("translates built-in keys", () => {
    expect(columnLabel("file.name")).toBe("Name");
    expect(columnLabel("file.modified")).toBe("Modified");
    expect(columnLabel("tags")).toBe("Tags");
  });
  it("returns the raw key for unknown keys", () => {
    expect(columnLabel("custom-property")).toBe("custom-property");
  });

  it("returns an empty string for an empty key", () => {
    expect(columnLabel("")).toBe("");
  });
});
