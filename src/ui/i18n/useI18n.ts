import { getLocale, subscribeI18n, t } from "@core/i18n";
import { useCallback, useSyncExternalStore } from "react";

export function useI18n(): typeof t {
  useSyncExternalStore(subscribeI18n, getLocale, getLocale);
  return useCallback<typeof t>((key, params) => t(key, params), []);
}
