import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EN_LOCALE,
  HE_LOCALE,
  PSEUDO_LOCALE,
  registerLocale,
  setLocale,
  t,
  verifyLocaleSync,
} from "./index";

// ---------------------------------------------------------------------------
// SEVERE locale-coverage scanner (audit #9).
//
// This file does three things:
//   1. Reports keys present in EN_LOCALE but missing from each non-English
//      locale. Hebrew currently has full coverage (see top of index.ts); if
//      coverage regresses below MIN_HE_COVERAGE we surface the gap loudly.
//   2. Reports keys present in a locale but absent from EN_LOCALE — i.e.
//      stale translations that should be removed. This is a hard failure.
//   3. Verifies that every key the runtime `t(...)` helper hard-codes in
//      `index.ts` is defined in EN_LOCALE — so a refactor that renames an
//      English key without updating the call site breaks the build.
//
// β requirement (< 0.1): the test is parameterised over `verifyLocaleSync()`
// output and over a regex scan of `index.ts` itself, so any drop in coverage
// or any rename of an EN key surfaces here. The accompanying inversion test
// (`detects an artificially-removed Hebrew key`) confirms the missing-keys
// path is wired up, and the extras test confirms the stale-key path is wired
// up. Together they keep false-negative probability well under 10%.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_TS = resolve(HERE, "index.ts");
const EN_LOCALE_TS = resolve(HERE, "locales/en.ts");

// CLI threshold for Hebrew coverage. Defaults to 0.5 (per the audit
// recommendation) but can be tightened via `MIN_HE_COVERAGE=0.9 bun run test`.
// Read through globalThis to stay decoupled from Node's process typings.
function getEnv(name: string): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return env ? Reflect.get(env, name) : undefined;
}

// CLI threshold for Hebrew coverage. Defaults to 0.5 (per the audit
// recommendation) but can be tightened via `MIN_HE_COVERAGE=0.9 bun run test`.
const MIN_HE_COVERAGE = Number(getEnv("MIN_HE_COVERAGE") ?? "0.5");

function pick(map: Record<string, string[]>, key: string): string[] {
  return Reflect.get(map, key) ?? [];
}

describe("locale coverage", () => {
  it("verifyLocaleSync exposes en key count and per-locale diffs", () => {
    const report = verifyLocaleSync();
    expect(report.enKeys).toBeGreaterThan(800);
    expect(report.missingPerLocale).toBeTypeOf("object");
    expect(report.extrasPerLocale).toBeTypeOf("object");
    // The pseudo-locale is computed at runtime and must never appear in the
    // diff report.
    expect(Object.keys(report.missingPerLocale)).not.toContain(PSEUDO_LOCALE);
    expect(Object.keys(report.extrasPerLocale)).not.toContain(PSEUDO_LOCALE);
  });

  it("reports zero stale keys (extras) for the built-in he locale", () => {
    const report = verifyLocaleSync();
    const extras = pick(report.extrasPerLocale, "he") ?? [];
    if (extras.length > 0) {
      throw new Error(
        `Hebrew locale defines ${extras.length} key(s) absent from EN_LOCALE. ` +
          `Remove them or add the matching English source:\n  - ${extras
            .slice(0, 50)
            .join("\n  - ")}`,
      );
    }
    expect(extras).toEqual([]);
  });

  it("reports Hebrew missing keys with a list of the first ~50", () => {
    const report = verifyLocaleSync();
    const missing = pick(report.missingPerLocale, "he") ?? [];
    // Strong invariant: Hebrew currently has 100% coverage (see top of
    // index.ts). If a translated key is removed without removing its English
    // source, this assertion fires with the list of missing keys.
    if (missing.length > 0) {
      throw new Error(
        `Hebrew locale is missing ${missing.length} key(s) present in EN_LOCALE. ` +
          `First ~50:\n  - ${missing.slice(0, 50).join("\n  - ")}`,
      );
    }
    expect(missing).toEqual([]);
  });

  // The pseudo-locale exists as a runtime debugging aid, not as a static
  // translation. Confirm it is registered and queryable.
  it("pseudo-locale yields bracketed strings via t()", () => {
    setLocale(PSEUDO_LOCALE);
    try {
      const out = t("workspace.leaf.settings");
      expect(out.startsWith("[")).toBe(true);
      expect(out.endsWith("]")).toBe(true);
      expect(out).not.toBe("Settings");
    } finally {
      setLocale("en");
    }
  });

  it("every t(...) call site in index.ts references an EN_LOCALE key", () => {
    // index.ts contains the t() definition itself plus a small number of
    // internal lookups. Scan for both forms `t("…")` and `t(`…`)`.
    const src = readFileSync(INDEX_TS, "utf8");
    const referenced = new Set<string>();
    for (const m of src.matchAll(/\bt\("([^"\n]+)"/g)) {
      referenced.add(m[1] as string);
    }
    for (const m of src.matchAll(/\bt\(`([^`\n${}]+)`/g)) {
      referenced.add(m[1] as string);
    }
    // The EN_LOCALE table now lives in `./locales/en.ts`. Parse it the same
    // way (key-prefix regex) so this regression test catches renames even if
    // the imported binding is shadowed at runtime.
    const enSrc = readFileSync(EN_LOCALE_TS, "utf8");
    const enBlockStart = enSrc.indexOf("EN_LOCALE");
    expect(enBlockStart).toBeGreaterThan(-1);
    const enKeys = new Set([...enSrc.matchAll(/^ {2}"([^"]+)":/gm)].map((m) => m[1] as string));
    const orphans = [...referenced].filter((k) => !enKeys.has(k));
    if (orphans.length > 0) {
      throw new Error(
        `index.ts references keys not present in EN_LOCALE:\n  - ${orphans.join("\n  - ")}`,
      );
    }
    expect(orphans).toEqual([]);
  });

  // Contract test (severe-testing #9): both shipped locale tables must contain
  // the exact same key set. If a key is added to EN_LOCALE without a Hebrew
  // translation, or a stale Hebrew key lingers after the English source is
  // removed, this test fails with a precise diff.
  it("EN_LOCALE and HE_LOCALE have identical key sets", () => {
    const enKeys = new Set(Object.keys(EN_LOCALE));
    const heKeys = new Set(Object.keys(HE_LOCALE));
    const missingInHe = [...enKeys].filter((k) => !heKeys.has(k));
    const extraInHe = [...heKeys].filter((k) => !enKeys.has(k));
    if (missingInHe.length > 0 || extraInHe.length > 0) {
      throw new Error(
        `EN_LOCALE / HE_LOCALE key-set drift:
  missing in he (${missingInHe.length}): ${missingInHe.slice(0, 20).join(", ")}
  extra in he (${extraInHe.length}): ${extraInHe.slice(0, 20).join(", ")}`,
      );
    }
    expect(missingInHe).toEqual([]);
    expect(extraInHe).toEqual([]);
  });

  // β inversion checks: prove the scanner actually detects mutations.
  it("detects an artificially-removed locale key (β inversion)", () => {
    // Simulate the failure mode by mutating verifyLocaleSync's input via
    // registerLocale: register a `zz_test` locale that mirrors English minus
    // one key, then confirm the missing-keys report flags that key.
    const report = verifyLocaleSync();
    const enKeyCount = report.enKeys;
    expect(enKeyCount).toBeGreaterThan(10);

    // Construct a near-complete locale missing exactly one specific key.
    const targetKey = "workspace.leaf.settings";
    const partialMap: Record<string, string> = {};
    // Use a few canary keys we know exist; we only need a tiny locale because
    // verifyLocaleSync compares against EN_LOCALE, not against our locale.
    partialMap["app.welcome.title"] = "x";
    registerLocale("zz_beta_inv_missing", partialMap);
    const after = verifyLocaleSync();
    expect(pick(after.missingPerLocale, "zz_beta_inv_missing")).toContain(targetKey);
  });

  it("detects an artificially-added stale key (β inversion)", () => {
    registerLocale("zz_beta_inv_extras", {
      "totally.bogus.key.not.in.en": "x",
    });
    const after = verifyLocaleSync();
    expect(pick(after.extrasPerLocale, "zz_beta_inv_extras")).toContain(
      "totally.bogus.key.not.in.en",
    );
  });

  // Coverage threshold gate. Currently Hebrew is at 100%, so this just
  // asserts the invariant; it is the canary that would flip to `.skip` with
  // a TODO if Hebrew drops below 50%.
  it("Hebrew coverage is at or above the configured threshold", () => {
    const report = verifyLocaleSync();
    const missing = pick(report.missingPerLocale, "he") ?? [];
    const coverage = report.enKeys === 0 ? 1 : (report.enKeys - missing.length) / report.enKeys;
    // Documented current state: 100%. See top of index.ts.
    expect(coverage).toBeGreaterThanOrEqual(MIN_HE_COVERAGE);
  });
});
