export type SummaryOp = "count" | "sum" | "avg" | "min" | "max" | "median";

export interface SummarySpec {
  readonly column: string;
  readonly op: SummaryOp;
  /** Optional alias for display purposes. Defaults to `${op}(${column})`. */
  readonly label?: string;
}

function toNumbers(values: ReadonlyArray<unknown>): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      out.push(v);
      continue;
    }
    if (typeof v === "boolean") {
      out.push(v ? 1 : 0);
      continue;
    }
    const n = Number.parseFloat(String(v));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export interface SummaryResult {
  readonly spec: SummarySpec;
  readonly value: number | null;
  readonly label: string;
}

/** Compute a single summary against a column extracted from each row. */
export function computeSummary(spec: SummarySpec, values: ReadonlyArray<unknown>): SummaryResult {
  const label = spec.label ?? `${spec.op}(${spec.column})`;
  if (spec.op === "count") {
    return {
      spec,
      label,
      value: values.filter((v) => v !== null && v !== undefined && v !== "").length,
    };
  }
  const nums = toNumbers(values);
  if (nums.length === 0) return { spec, label, value: null };
  switch (spec.op) {
    case "sum":
      return { spec, label, value: nums.reduce((a, b) => a + b, 0) };
    case "avg":
      return { spec, label, value: nums.reduce((a, b) => a + b, 0) / nums.length };
    case "min":
      return { spec, label, value: Math.min(...nums) };
    case "max":
      return { spec, label, value: Math.max(...nums) };
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const right = sorted[mid];
      if (right === undefined) return { spec, label, value: null };
      if (sorted.length % 2 === 1) return { spec, label, value: right };
      const left = sorted[mid - 1];
      if (left === undefined) return { spec, label, value: null };
      const v = (left + right) / 2;
      return { spec, label, value: v };
    }
  }
}

/** Compute all the summaries against a row set, given a value-extractor function. */
export function computeSummaries<Row>(
  specs: ReadonlyArray<SummarySpec>,
  rows: ReadonlyArray<Row>,
  pick: (row: Row, column: string) => unknown,
): ReadonlyArray<SummaryResult> {
  return specs.map((s) =>
    computeSummary(
      s,
      rows.map((r) => pick(r, s.column)),
    ),
  );
}

/** Group rows by the value of a particular column. Returns a Map preserving
 *  insertion order — the caller decides how to display the groups. */
export function groupRowsBy<Row>(
  rows: ReadonlyArray<Row>,
  column: string,
  pick: (row: Row, column: string) => unknown,
): Map<string, Row[]> {
  const out = new Map<string, Row[]>();
  for (const row of rows) {
    const raw = pick(row, column);
    const key =
      raw === null || raw === undefined
        ? "(none)"
        : Array.isArray(raw)
          ? raw.length === 0
            ? "(none)"
            : raw.map((x) => String(x)).join(", ")
          : String(raw);
    const bucket = out.get(key);
    if (bucket) bucket.push(row);
    else out.set(key, [row]);
  }
  return out;
}
