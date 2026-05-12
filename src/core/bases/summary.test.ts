import { describe, expect, it } from "vitest";
import { computeSummaries, computeSummary, groupRowsBy } from "./summary";

describe("computeSummary", () => {
  it("counts non-empty values", () => {
    const r = computeSummary({ column: "x", op: "count" }, [1, 2, null, "", 3]);
    expect(r.value).toBe(3);
    expect(r.label).toBe("count(x)");
  });

  it("sums numeric values, coercing strings", () => {
    expect(computeSummary({ column: "x", op: "sum" }, [1, "2", 3]).value).toBe(6);
  });

  it("returns null for empty number sets", () => {
    expect(computeSummary({ column: "x", op: "sum" }, []).value).toBeNull();
    expect(computeSummary({ column: "x", op: "min" }, ["", null]).value).toBeNull();
  });

  it("computes avg, min, max", () => {
    expect(computeSummary({ column: "x", op: "avg" }, [1, 2, 3]).value).toBe(2);
    expect(computeSummary({ column: "x", op: "min" }, [3, 1, 2]).value).toBe(1);
    expect(computeSummary({ column: "x", op: "max" }, [3, 1, 2]).value).toBe(3);
  });

  it("computes median for odd and even lengths", () => {
    expect(computeSummary({ column: "x", op: "median" }, [1, 2, 3]).value).toBe(2);
    expect(computeSummary({ column: "x", op: "median" }, [1, 2, 3, 4]).value).toBe(2.5);
  });

  it("honors an explicit label", () => {
    const r = computeSummary({ column: "x", op: "count", label: "rows" }, [1, 2, 3]);
    expect(r.label).toBe("rows");
  });
});

describe("computeSummaries", () => {
  it("applies each spec against an extracted column", () => {
    const rows = [
      { a: 1, b: 10 },
      { a: 2, b: 20 },
      { a: 3, b: null },
    ];
    const r = computeSummaries(
      [
        { column: "a", op: "sum" },
        { column: "b", op: "count" },
      ],
      rows,
      (row, col) => (row as Record<string, unknown>)[col],
    );
    expect(r).toHaveLength(2);
    expect(r[0]?.value).toBe(6);
    expect(r[1]?.value).toBe(2);
  });
});

describe("groupRowsBy", () => {
  it("groups by string keys", () => {
    const rows = [{ status: "done" }, { status: "todo" }, { status: "done" }];
    const g = groupRowsBy(rows, "status", (r, c) => (r as Record<string, unknown>)[c]);
    expect(g.get("done")).toHaveLength(2);
    expect(g.get("todo")).toHaveLength(1);
  });

  it("groups missing/null values into (none)", () => {
    const rows = [{ status: null }, { status: "x" }, { status: undefined }];
    const g = groupRowsBy(rows, "status", (r, c) => (r as Record<string, unknown>)[c]);
    expect(g.get("(none)")).toHaveLength(2);
  });

  it("joins array group keys with commas", () => {
    const rows = [{ tags: ["a", "b"] }, { tags: ["a"] }];
    const g = groupRowsBy(rows, "tags", (r, c) => (r as Record<string, unknown>)[c]);
    expect([...g.keys()]).toEqual(["a, b", "a"]);
  });
});
