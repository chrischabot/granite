import { describe, expect, it } from "vitest";
import { type FormulaValue, evaluateFormula, parseFormula, tryEvaluateFormula } from "./formula";

function ev(source: string, bindings: Record<string, FormulaValue> = {}): FormulaValue {
  return evaluateFormula(parseFormula(source), bindings);
}

describe("literals", () => {
  it("evaluates numbers, strings, booleans, null", () => {
    expect(ev("42")).toBe(42);
    expect(ev("3.14")).toBeCloseTo(3.14);
    expect(ev('"hello"')).toBe("hello");
    expect(ev("'world'")).toBe("world");
    expect(ev("true")).toBe(true);
    expect(ev("false")).toBe(false);
    expect(ev("null")).toBeNull();
  });
});

describe("arithmetic", () => {
  it("respects standard precedence", () => {
    expect(ev("2 + 3 * 4")).toBe(14);
    expect(ev("(2 + 3) * 4")).toBe(20);
    expect(ev("10 - 4 - 2")).toBe(4);
    expect(ev("12 / 4 / 2")).toBe(1.5);
  });

  it("string concatenation uses +", () => {
    expect(ev('"a" + "b"')).toBe("ab");
    expect(ev('"score: " + 42')).toBe("score: 42");
  });

  it("guards division by zero", () => {
    expect(ev("1 / 0")).toBeNull();
  });
});

describe("comparison and boolean", () => {
  it("compares numbers and strings", () => {
    expect(ev("1 < 2")).toBe(true);
    expect(ev("3 == 3")).toBe(true);
    expect(ev('"a" < "b"')).toBe(true);
    expect(ev('"z" >= "y"')).toBe(true);
  });

  it("short-circuits && and ||", () => {
    expect(ev("true && 5")).toBe(5);
    expect(ev("false && unused")).toBe(false);
    expect(ev("null || 7")).toBe(7);
    expect(ev('"hi" || crash')).toBe("hi");
  });

  it("unary not", () => {
    expect(ev("!true")).toBe(false);
    expect(ev("!null")).toBe(true);
    expect(ev("!0")).toBe(true);
  });
});

describe("variable lookup", () => {
  it("returns null for missing identifiers", () => {
    expect(ev("missing")).toBeNull();
  });

  it("reads simple bindings", () => {
    expect(ev("score", { score: 10 })).toBe(10);
  });

  it("walks field access", () => {
    expect(ev("file.name", { file: { name: "Notes" } })).toBe("Notes");
    expect(ev("file.missing", { file: { name: "Notes" } })).toBeNull();
  });

  it("walks index access", () => {
    expect(ev("tags[0]", { tags: ["a", "b"] })).toBe("a");
    expect(ev('frontmatter["status"]', { frontmatter: { status: "done" } })).toBe("done");
  });
});

describe("builtins", () => {
  it("length() on arrays and strings", () => {
    expect(ev('length("abc")')).toBe(3);
    expect(ev("length(xs)", { xs: ["a", "b"] })).toBe(2);
    expect(ev("length(null)")).toBe(0);
  });

  it("lower / upper / trim", () => {
    expect(ev('lower("ABC")')).toBe("abc");
    expect(ev('upper("xyz")')).toBe("XYZ");
    expect(ev('trim("  hi  ")')).toBe("hi");
  });

  it("contains / startsWith / endsWith", () => {
    expect(ev('contains("hello world", "world")')).toBe(true);
    expect(ev('contains(tags, "work")', { tags: ["work", "play"] })).toBe(true);
    expect(ev('startsWith("foobar", "foo")')).toBe(true);
    expect(ev('endsWith("foobar", "bar")')).toBe(true);
  });

  it("if() ternary", () => {
    expect(ev('if(score > 50, "pass", "fail")', { score: 90 })).toBe("pass");
    expect(ev('if(score > 50, "pass", "fail")', { score: 10 })).toBe("fail");
  });

  it("coalesce returns first non-empty value", () => {
    expect(ev('coalesce(null, "", "first", "second")')).toBe("first");
    expect(ev("coalesce(null, null)")).toBeNull();
  });

  it("min / max / abs", () => {
    expect(ev("min(3, 1, 2)")).toBe(1);
    expect(ev("max(3, 1, 2)")).toBe(3);
    expect(ev("abs(-7)")).toBe(7);
  });

  it("concat() folds via asString", () => {
    expect(ev('concat("a", 1, true)')).toBe("a1true");
  });
});

describe("tryEvaluateFormula", () => {
  it("returns null when parsing fails", () => {
    expect(tryEvaluateFormula("1 +", {})).toBeNull();
  });

  it("returns null when evaluation can't coerce types", () => {
    expect(tryEvaluateFormula('"not a number" - 1', {})).toBeNull();
  });
});

describe("this context", () => {
  it("resolves `this.file.name` when bindings include `this`", () => {
    const bindings = {
      this: { file: { name: "Embedding Note" } },
    };
    expect(ev("this.file.name", bindings)).toBe("Embedding Note");
  });

  it("returns null when `this` is absent", () => {
    expect(ev("this.file.name", {})).toBeNull();
  });

  it("supports `if(this.fm.public, 'shown', 'hidden')`", () => {
    expect(
      ev("if(this.fm.public, 'shown', 'hidden')", {
        this: { file: { name: "X" }, fm: { public: true } },
      }),
    ).toBe("shown");
    expect(
      ev("if(this.fm.public, 'shown', 'hidden')", {
        this: { file: { name: "X" }, fm: { public: false } },
      }),
    ).toBe("hidden");
  });
});
