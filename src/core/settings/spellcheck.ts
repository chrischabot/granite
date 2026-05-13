import type { UserSettings } from "./store";

const LANGUAGE_TAG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function spellcheckLanguageTags(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && LANGUAGE_TAG_RE.test(tag));
}

export function primarySpellcheckLanguage(value: string): string {
  return spellcheckLanguageTags(value)[0] ?? "";
}

export function applySpellcheckAttributes(
  contentDOM: HTMLElement,
  settings: Pick<UserSettings, "spellcheck" | "spellcheckLanguages">,
): void {
  contentDOM.spellcheck = settings.spellcheck;
  const language = settings.spellcheck
    ? primarySpellcheckLanguage(settings.spellcheckLanguages)
    : "";
  if (language) contentDOM.lang = language;
  else contentDOM.removeAttribute("lang");
}
