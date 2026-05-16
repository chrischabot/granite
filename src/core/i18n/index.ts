// i18n status (per audit #9, severe-testing):
// - English (en) is the source of truth.
// - Hebrew (he) currently has 100% coverage of EN_LOCALE keys; the
//   locale-coverage test enforces this is preserved while still tolerating
//   future partial locales gracefully.
// - The `__pseudo__` locale is a dev/debug accessibility tool: it ASCII-
//   transforms every English value at lookup time and wraps it in `[ … ]`,
//   so any visible string that bypassed the `t(...)` helper sticks out.
// - Locale tables live in `./locales/<lang>.ts`. Adding a new locale is a
//   1-file PR: drop the table in, list it in `./locales/index.ts`, and
//   `verifyLocaleSync()` will report missing/extra keys.

import { BUILTIN_LOCALES, EN_LOCALE, HE_LOCALE } from "./locales";

export type LocaleId = "en" | (string & {});

export type LocaleMap = Record<string, string>;

export interface LookupOptions {
  params?: Record<string, string | number>;
}

const STORAGE_KEY = "granite.locale.v1";

/** Synthetic locale id used for the runtime-only pseudo transform. */
export const PSEUDO_LOCALE = "__pseudo__" as const;

// ---------------------------------------------------------------------------
// Locale registry
// ---------------------------------------------------------------------------

const locales: Record<string, LocaleMap> = {};
let currentLocale: LocaleId = "en";
const subscribers = new Set<() => void>();

function emit(): void {
  for (const cb of subscribers) cb();
}

function loadStoredLocale(): LocaleId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return raw as LocaleId;
  } catch {
    /* ignore */
  }
  return "en";
}

/** Add or replace a locale's strings. */
export function registerLocale(id: LocaleId, strings: LocaleMap): void {
  locales[id] = { ...(locales[id] ?? {}), ...strings };
  if (id === currentLocale) emit();
}

// Register every built-in locale at module init. Done before any consumer can
// call `t(...)` because module-level imports run top-to-bottom.
for (const [id, map] of Object.entries(BUILTIN_LOCALES)) {
  registerLocale(id, map as LocaleMap);
}

currentLocale = loadStoredLocale();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Pseudo-locale support
// ---------------------------------------------------------------------------
//
// The pseudo-locale wraps every English value in `[ … ]` brackets and
// substitutes a small ASCII-7 lookalike set for vowels and a couple of
// consonants. The goal is *not* to look like a real locale — it's to make
// any string that bypassed `t(...)` instantly visible at runtime (since it
// will appear without the surrounding brackets / accented letters).

const PSEUDO_CHARS: Record<string, string> = {
  a: "á",
  A: "Á",
  e: "é",
  E: "É",
  i: "ı",
  I: "İ",
  o: "ó",
  O: "Ó",
  u: "ú",
  U: "Ú",
  s: "ş",
  S: "Ş",
  t: "ț",
  T: "Ț",
};

// Small allowlist of values we never pseudo-transform: brand names and
// non-translatable code tokens. These remain identical to their English
// source so the pseudo-locale doesn't garble shortcuts in tooltips, etc.
export const PSEUDO_VALUE_ALLOWLIST = new Set<string>([
  "Granite",
  "Obsidian",
  "Markdown",
  "Ctrl+P",
  "YYYY-MM-DD",
  "HH:mm",
  "attachments",
]);

function isNonTranslatableValue(value: string): boolean {
  if (PSEUDO_VALUE_ALLOWLIST.has(value)) return true;
  // Single-token strings that contain at least one *non-letter* code marker
  // (digits, `+`, `-`, `_`, `.`, `:`, `/`) and no whitespace are treated as
  // code tokens (e.g. "YYYY-MM-DD", "Ctrl+P", "tag:work", "HH:mm") and not
  // transformed. Pure-letter single words (e.g. "Settings", "Save") are
  // legitimate UI labels and must be transformed.
  if (/^[A-Za-z0-9+\-_.:/]+$/.test(value) && !/\s/.test(value) && /[0-9+\-_.:/]/.test(value)) {
    return true;
  }
  return false;
}

function pseudoTransformChars(input: string): string {
  let out = "";
  for (const ch of input) {
    out += PSEUDO_CHARS[ch] ?? ch;
  }
  return out;
}

/**
 * Transform an English string into its pseudo-locale rendering without
 * touching `{placeholder}` segments. The output is always wrapped in `[…]`.
 *
 * Exported for direct testing — production code should go through `t(...)`.
 */
export function transformPseudo(_key: string, fallbackEn: string): string {
  if (isNonTranslatableValue(fallbackEn)) {
    // Even allowlisted values get bracketed so they remain distinguishable
    // from any string that skipped the `t(...)` lookup entirely.
    return `[${fallbackEn}]`;
  }
  // Split on `{…}` segments; only transform the non-placeholder pieces.
  const parts = fallbackEn.split(/(\{[^}]*\})/g);
  const rebuilt = parts
    .map((part) => (part.startsWith("{") && part.endsWith("}") ? part : pseudoTransformChars(part)))
    .join("");
  return `[${rebuilt}]`;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Look up a translation, applying optional `{name}` parameter substitution. */
export function t(key: string, params?: Record<string, string | number>): string {
  const fallback = (Reflect.get(locales, "en") as LocaleMap | undefined) ?? EN_LOCALE;
  let template: string;
  if (currentLocale === PSEUDO_LOCALE) {
    const en = fallback[key];
    template = en === undefined ? key : transformPseudo(key, en);
  } else {
    const map = locales[currentLocale] ?? fallback;
    template = map[key] ?? fallback[key] ?? key;
  }
  if (params) {
    template = resolvePluralBlocks(template, params);
    for (const [name, value] of Object.entries(params)) {
      template = template.replace(new RegExp(`\\{${escapeRegex(name)}\\}`, "g"), String(value));
    }
  }
  return template;
}

const PLURAL_BLOCK_RE = /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g;

function resolvePluralBlocks(template: string, params: Record<string, string | number>): string {
  return template.replace(PLURAL_BLOCK_RE, (_match, name, oneBranch, otherBranch) => {
    const raw = params[name];
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n === 1 ? oneBranch : otherBranch;
  });
}

/** Look up the source English string for migration logic, not for rendering. */
export function getDefaultLocaleText(key: string): string {
  return EN_LOCALE[key] ?? key;
}

export function setLocale(id: LocaleId): void {
  currentLocale = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  emit();
}

export function getLocale(): LocaleId {
  return currentLocale;
}

export function listLocales(): LocaleId[] {
  return Object.keys(locales) as LocaleId[];
}

export function subscribeI18n(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/**
 * Report missing and extra keys per non-English locale, relative to
 * `EN_LOCALE`. Intended for debugging and for the locale-coverage test.
 *
 * - `enKeys` — count of source-of-truth keys.
 * - `missingPerLocale[locale]` — keys present in English but absent from the
 *   locale.
 * - `extrasPerLocale[locale]` — keys present in the locale but not in
 *   English (suspect stale translations).
 *
 * The pseudo-locale is excluded because it is computed at runtime and has no
 * static map to compare against.
 */
export function verifyLocaleSync(): {
  enKeys: number;
  missingPerLocale: Record<string, string[]>;
  extrasPerLocale: Record<string, string[]>;
} {
  const enKeyList = Object.keys(EN_LOCALE);
  const enSet = new Set(enKeyList);
  const missingPerLocale: Record<string, string[]> = {};
  const extrasPerLocale: Record<string, string[]> = {};
  for (const id of Object.keys(locales)) {
    if (id === "en" || id === PSEUDO_LOCALE) continue;
    const map = locales[id] ?? {};
    const localeKeys = new Set(Object.keys(map));
    missingPerLocale[id] = enKeyList.filter((k) => !localeKeys.has(k));
    extrasPerLocale[id] = Object.keys(map).filter((k) => !enSet.has(k));
  }
  return { enKeys: enKeyList.length, missingPerLocale, extrasPerLocale };
}

// Re-export locale tables for tests and external diagnostics.
export { EN_LOCALE, HE_LOCALE };
