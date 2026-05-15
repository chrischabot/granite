// Built-in locale registry. The orchestrator (`src/core/i18n/index.ts`) imports
// this map at module init and registers every entry via `registerLocale`.
//
// To add a new locale:
//   1. Create `./<lang>.ts` exporting `<LANG>_LOCALE: Readonly<Record<string, string>>`.
//   2. Add it to `BUILTIN_LOCALES` below.
//   3. Run `bun run test` — the locale-coverage test will report any missing or
//      stale keys versus EN_LOCALE.

import { EN_LOCALE } from "./en";
import { HE_LOCALE } from "./he";

export { EN_LOCALE, HE_LOCALE };

export const BUILTIN_LOCALES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  en: EN_LOCALE,
  he: HE_LOCALE,
};
