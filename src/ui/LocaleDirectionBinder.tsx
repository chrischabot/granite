import { getLocale, subscribeI18n } from "@core/i18n";
import { localeDirection } from "@core/i18n/direction";
import { useEffect } from "react";

function applyLocaleDirection(): void {
  const direction = localeDirection(getLocale());
  document.documentElement.dir = direction;
  document.body.classList.toggle("mod-rtl", direction === "rtl");
  document.body.classList.toggle("is-rtl", direction === "rtl");
}

export function LocaleDirectionBinder() {
  useEffect(() => {
    applyLocaleDirection();
    return subscribeI18n(applyLocaleDirection);
  }, []);

  return null;
}
