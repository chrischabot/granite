/**
 * Bases formula evaluator.
 *
 * Grammar (recursive descent, lowest precedence first):
 *
 *   expr        := or_expr
 *   or_expr     := and_expr ("||" and_expr)*
 *   and_expr    := cmp_expr ("&&" cmp_expr)*
 *   cmp_expr    := add_expr (("==" | "!=" | "<" | "<=" | ">" | ">=") add_expr)*
 *   add_expr    := mul_expr (("+" | "-") mul_expr)*
 *   mul_expr    := unary (("*" | "/" | "%") unary)*
 *   unary       := ("-" | "!") unary | postfix
 *   postfix     := primary ("." IDENT | "[" expr "]")*
 *   primary     := NUMBER | STRING | BOOL | NULL | IDENT call? | "(" expr ")"
 *   call        := "(" (expr ("," expr)*)? ")"
 *
 * Strings can be single- or double-quoted. Numbers are JS doubles. Identifiers
 * are letters / digits / underscore (starting with letter or underscore).
 */

export type FormulaValue =
  | string
  | number
  | boolean
  | null
  | FormulaValue[]
  | { readonly [k: string]: FormulaValue };

export interface FormulaContext {
  readonly bindings: Record<string, FormulaValue>;
}

interface Token {
  readonly type:
    | "number"
    | "string"
    | "ident"
    | "op"
    | "lparen"
    | "rparen"
    | "lbracket"
    | "rbracket"
    | "comma"
    | "dot"
    | "bool"
    | "null";
  readonly value?: string | number | boolean;
  readonly pos: number;
}

export type Expr =
  | { tag: "Num"; value: number }
  | { tag: "Str"; value: string }
  | { tag: "Bool"; value: boolean }
  | { tag: "Null" }
  | { tag: "Var"; name: string }
  | { tag: "Field"; target: Expr; key: string }
  | { tag: "Index"; target: Expr; key: Expr }
  | { tag: "Unary"; op: "-" | "!"; arg: Expr }
  | { tag: "Binary"; op: string; left: Expr; right: Expr }
  | { tag: "Call"; name: string; args: Expr[] };

const MULTI_CHAR_OPS = ["==", "!=", "<=", ">=", "&&", "||"];

function isDigitChar(c: string): boolean {
  return c >= "0" && c <= "9";
}

function isIdentStart(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
}

function isIdentPart(c: string): boolean {
  return isIdentStart(c) || isDigitChar(c);
}

function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input.charAt(i);
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "(") {
      out.push({ type: "lparen", pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      out.push({ type: "rparen", pos: i });
      i++;
      continue;
    }
    if (c === "[") {
      out.push({ type: "lbracket", pos: i });
      i++;
      continue;
    }
    if (c === "]") {
      out.push({ type: "rbracket", pos: i });
      i++;
      continue;
    }
    if (c === ",") {
      out.push({ type: "comma", pos: i });
      i++;
      continue;
    }
    if (c === ".") {
      out.push({ type: "dot", pos: i });
      i++;
      continue;
    }
    // Multi-character operators
    const two = input.slice(i, i + 2);
    if (MULTI_CHAR_OPS.includes(two)) {
      out.push({ type: "op", value: two, pos: i });
      i += 2;
      continue;
    }
    if ("+-*/%<>!".includes(c)) {
      out.push({ type: "op", value: c, pos: i });
      i++;
      continue;
    }
    // String literal
    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      let str = "";
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          const next = input.charAt(i + 1);
          if (next === "n") str += "\n";
          else if (next === "t") str += "\t";
          else if (next === "r") str += "\r";
          else str += next;
          i += 2;
        } else {
          str += input[i];
          i++;
        }
      }
      if (input[i] !== quote) {
        throw new Error(`Unterminated string starting at position ${start}`);
      }
      i++;
      out.push({ type: "string", value: str, pos: start });
      continue;
    }
    // Number
    if (isDigitChar(c)) {
      const start = i;
      let n = "";
      while (i < input.length) {
        const next = input.charAt(i);
        if (!isDigitChar(next) && next !== ".") break;
        n += next;
        i++;
      }
      const value = Number.parseFloat(n);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number "${n}" at position ${start}`);
      }
      out.push({ type: "number", value, pos: start });
      continue;
    }
    // Identifier
    if (isIdentStart(c)) {
      const start = i;
      let id = "";
      while (i < input.length) {
        const next = input.charAt(i);
        if (!isIdentPart(next)) break;
        id += next;
        i++;
      }
      if (id === "true" || id === "false") {
        out.push({ type: "bool", value: id === "true", pos: start });
      } else if (id === "null") {
        out.push({ type: "null", pos: start });
      } else {
        out.push({ type: "ident", value: id, pos: start });
      }
      continue;
    }
    throw new Error(`Unexpected character "${c}" at position ${i}`);
  }
  return out;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: ReadonlyArray<Token>) {}

  parse(): Expr {
    const e = this.expr();
    const t = this.peek();
    if (t) {
      throw new Error(`Unexpected token at position ${t.pos}`);
    }
    return e;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("Unexpected end of formula");
    this.pos++;
    return t;
  }

  private matchOp(...ops: string[]): Token | null {
    const t = this.peek();
    if (t && t.type === "op" && ops.includes(t.value as string)) {
      this.consume();
      return t;
    }
    return null;
  }

  private expr(): Expr {
    return this.orExpr();
  }

  private orExpr(): Expr {
    let left = this.andExpr();
    while (this.matchOp("||")) {
      const right = this.andExpr();
      left = { tag: "Binary", op: "||", left, right };
    }
    return left;
  }

  private andExpr(): Expr {
    let left = this.cmpExpr();
    while (this.matchOp("&&")) {
      const right = this.cmpExpr();
      left = { tag: "Binary", op: "&&", left, right };
    }
    return left;
  }

  private cmpExpr(): Expr {
    let left = this.addExpr();
    while (true) {
      const tok = this.matchOp("==", "!=", "<", "<=", ">", ">=");
      if (!tok) break;
      const right = this.addExpr();
      left = { tag: "Binary", op: tok.value as string, left, right };
    }
    return left;
  }

  private addExpr(): Expr {
    let left = this.mulExpr();
    while (true) {
      const tok = this.matchOp("+", "-");
      if (!tok) break;
      const right = this.mulExpr();
      left = { tag: "Binary", op: tok.value as string, left, right };
    }
    return left;
  }

  private mulExpr(): Expr {
    let left = this.unary();
    while (true) {
      const tok = this.matchOp("*", "/", "%");
      if (!tok) break;
      const right = this.unary();
      left = { tag: "Binary", op: tok.value as string, left, right };
    }
    return left;
  }

  private unary(): Expr {
    const tok = this.matchOp("-", "!");
    if (tok) {
      const arg = this.unary();
      return { tag: "Unary", op: tok.value as "-" | "!", arg };
    }
    return this.postfix();
  }

  private postfix(): Expr {
    let e = this.primary();
    while (true) {
      const t = this.peek();
      if (!t) break;
      if (t.type === "dot") {
        this.consume();
        const ident = this.consume();
        if (ident.type !== "ident") {
          throw new Error(`Expected identifier after "." at position ${ident.pos}`);
        }
        e = { tag: "Field", target: e, key: ident.value as string };
        continue;
      }
      if (t.type === "lbracket") {
        this.consume();
        const key = this.expr();
        const close = this.consume();
        if (close.type !== "rbracket") {
          throw new Error(`Expected "]" at position ${close.pos}`);
        }
        e = { tag: "Index", target: e, key };
        continue;
      }
      break;
    }
    return e;
  }

  private primary(): Expr {
    const t = this.consume();
    switch (t.type) {
      case "number":
        return { tag: "Num", value: t.value as number };
      case "string":
        return { tag: "Str", value: t.value as string };
      case "bool":
        return { tag: "Bool", value: t.value as boolean };
      case "null":
        return { tag: "Null" };
      case "lparen": {
        const inner = this.expr();
        const close = this.consume();
        if (close.type !== "rparen") {
          throw new Error(`Expected ")" at position ${close.pos}`);
        }
        return inner;
      }
      case "ident": {
        const name = t.value as string;
        const next = this.peek();
        if (next && next.type === "lparen") {
          this.consume();
          const args: Expr[] = [];
          const afterLparen = this.peek();
          if (!(afterLparen && afterLparen.type === "rparen")) {
            args.push(this.expr());
            while (this.peek()?.type === "comma") {
              this.consume();
              args.push(this.expr());
            }
          }
          const close = this.consume();
          if (close.type !== "rparen") {
            throw new Error(`Expected ")" at position ${close.pos}`);
          }
          return { tag: "Call", name, args };
        }
        return { tag: "Var", name };
      }
      default:
        throw new Error(`Unexpected token at position ${t.pos}`);
    }
  }
}

export function parseFormula(input: string): Expr {
  return new Parser(tokenize(input)).parse();
}

function isTruthy(v: FormulaValue): boolean {
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function asNumber(v: FormulaValue): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  if (v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return null;
}

function asString(v: FormulaValue): string {
  if (v === null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(asString).join(",");
  return String(v);
}

function equals(a: FormulaValue, b: FormulaValue): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === "number" || typeof b === "number") {
    const an = asNumber(a);
    const bn = asNumber(b);
    if (an !== null && bn !== null) return an === bn;
  }
  return asString(a) === asString(b);
}

function compare(a: FormulaValue, b: FormulaValue): number {
  const an = asNumber(a);
  const bn = asNumber(b);
  if (an !== null && bn !== null) return an - bn;
  return asString(a).localeCompare(asString(b));
}

type BuiltinFn = (args: FormulaValue[]) => FormulaValue;

const BUILTINS: Record<string, BuiltinFn> = {
  length: (args) => {
    const v = args[0];
    if (v === null || v === undefined) return 0;
    if (Array.isArray(v)) return v.length;
    return asString(v).length;
  },
  lower: (args) => asString(args[0] ?? null).toLowerCase(),
  upper: (args) => asString(args[0] ?? null).toUpperCase(),
  trim: (args) => asString(args[0] ?? null).trim(),
  now: () => Date.now(),
  date: (args) => {
    const v = args[0];
    if (v === null || v === undefined) return null;
    const d = typeof v === "number" ? new Date(v) : new Date(asString(v));
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
  },
  datetime: (args) => {
    const v = args[0];
    if (v === null || v === undefined) return null;
    const d = typeof v === "number" ? new Date(v) : new Date(asString(v));
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  },
  concat: (args) => args.map(asString).join(""),
  if: (args) => (isTruthy(args[0] ?? null) ? (args[1] ?? null) : (args[2] ?? null)),
  contains: (args) => {
    const hay = args[0] ?? null;
    const needle = asString(args[1] ?? null);
    if (Array.isArray(hay)) return hay.some((x) => asString(x) === needle);
    return asString(hay).includes(needle);
  },
  startsWith: (args) => asString(args[0] ?? null).startsWith(asString(args[1] ?? null)),
  endsWith: (args) => asString(args[0] ?? null).endsWith(asString(args[1] ?? null)),
  coalesce: (args) => {
    for (const a of args) if (a !== null && a !== undefined && a !== "") return a;
    return null;
  },
  min: (args) => {
    let best: number | null = null;
    for (const a of args) {
      const n = asNumber(a);
      if (n !== null && (best === null || n < best)) best = n;
    }
    return best;
  },
  max: (args) => {
    let best: number | null = null;
    for (const a of args) {
      const n = asNumber(a);
      if (n !== null && (best === null || n > best)) best = n;
    }
    return best;
  },
  abs: (args) => {
    const n = asNumber(args[0] ?? null);
    return n === null ? null : Math.abs(n);
  },
  floor: (args) => {
    const n = asNumber(args[0] ?? null);
    return n === null ? null : Math.floor(n);
  },
  ceil: (args) => {
    const n = asNumber(args[0] ?? null);
    return n === null ? null : Math.ceil(n);
  },
  round: (args) => {
    const n = asNumber(args[0] ?? null);
    return n === null ? null : Math.round(n);
  },
};

/**
 * Evaluate a previously-parsed formula against a binding map. The map's keys
 * become resolvable identifiers; nested objects/arrays are reachable via `.`
 * and `[…]`. Function calls dispatch to a built-in set; unknown functions
 * return null.
 */
export function evaluateFormula(expr: Expr, bindings: Record<string, FormulaValue>): FormulaValue {
  switch (expr.tag) {
    case "Num":
      return expr.value;
    case "Str":
      return expr.value;
    case "Bool":
      return expr.value;
    case "Null":
      return null;
    case "Var":
      return bindings[expr.name] ?? null;
    case "Field": {
      const obj = evaluateFormula(expr.target, bindings);
      if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return null;
      const rec = obj as { readonly [k: string]: FormulaValue };
      return rec[expr.key] ?? null;
    }
    case "Index": {
      const target = evaluateFormula(expr.target, bindings);
      const key = evaluateFormula(expr.key, bindings);
      if (Array.isArray(target)) {
        const n = typeof key === "number" ? key : Number.parseInt(asString(key), 10);
        if (!Number.isFinite(n)) return null;
        return target[n] ?? null;
      }
      if (target !== null && typeof target === "object") {
        const k = asString(key);
        const rec = target as { readonly [k: string]: FormulaValue };
        return rec[k] ?? null;
      }
      return null;
    }
    case "Unary": {
      const v = evaluateFormula(expr.arg, bindings);
      if (expr.op === "-") {
        const n = asNumber(v);
        return n === null ? null : -n;
      }
      return !isTruthy(v);
    }
    case "Binary": {
      // Short-circuit on the boolean operators.
      if (expr.op === "&&") {
        const left = evaluateFormula(expr.left, bindings);
        if (!isTruthy(left)) return left;
        return evaluateFormula(expr.right, bindings);
      }
      if (expr.op === "||") {
        const left = evaluateFormula(expr.left, bindings);
        if (isTruthy(left)) return left;
        return evaluateFormula(expr.right, bindings);
      }
      const left = evaluateFormula(expr.left, bindings);
      const right = evaluateFormula(expr.right, bindings);
      switch (expr.op) {
        case "+": {
          if (typeof left === "string" || typeof right === "string") {
            return asString(left) + asString(right);
          }
          const ln = asNumber(left);
          const rn = asNumber(right);
          return ln !== null && rn !== null ? ln + rn : null;
        }
        case "-": {
          const ln = asNumber(left);
          const rn = asNumber(right);
          return ln !== null && rn !== null ? ln - rn : null;
        }
        case "*": {
          const ln = asNumber(left);
          const rn = asNumber(right);
          return ln !== null && rn !== null ? ln * rn : null;
        }
        case "/": {
          const ln = asNumber(left);
          const rn = asNumber(right);
          return ln !== null && rn !== null && rn !== 0 ? ln / rn : null;
        }
        case "%": {
          const ln = asNumber(left);
          const rn = asNumber(right);
          return ln !== null && rn !== null && rn !== 0 ? ln % rn : null;
        }
        case "==":
          return equals(left, right);
        case "!=":
          return !equals(left, right);
        case "<":
          return compare(left, right) < 0;
        case ">":
          return compare(left, right) > 0;
        case "<=":
          return compare(left, right) <= 0;
        case ">=":
          return compare(left, right) >= 0;
        default:
          return null;
      }
    }
    case "Call": {
      const fn = BUILTINS[expr.name];
      if (!fn) return null;
      const args = expr.args.map((a) => evaluateFormula(a, bindings));
      return fn(args);
    }
  }
}

/** Single-shot helper: parse and evaluate. Returns null on parse error. */
export function tryEvaluateFormula(
  source: string,
  bindings: Record<string, FormulaValue>,
): FormulaValue {
  try {
    return evaluateFormula(parseFormula(source), bindings);
  } catch {
    return null;
  }
}
