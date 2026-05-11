import { describe, it, expect } from "vitest";
import {
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

  it("parses every known field", () => {
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
  });

  it("fills missing fields with defaults", () => {
    const c = parseBaseConfig("name: X");
    expect(c.name).toBe("X");
    expect(c.filter).toBe(DEFAULT_BASE.filter);
    expect(c.columns).toEqual(DEFAULT_BASE.columns);
    expect(c.sort).toBe(DEFAULT_BASE.sort);
    expect(c.sortOrder).toBe(DEFAULT_BASE.sortOrder);
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
});

describe("serializeBaseConfig", () => {
  it("round-trips through parse", () => {
    const cfg = {
      name: "Test",
      filter: "tag:foo",
      columns: ["file.name", "tags"],
      sort: "file.name",
      sortOrder: "desc" as const,
    };
    const yamlText = serializeBaseConfig(cfg);
    expect(parseBaseConfig(yamlText)).toEqual(cfg);
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