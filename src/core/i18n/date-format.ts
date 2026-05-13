import { getLocale } from "./index";

const PAD2 = (n: number) => n.toString().padStart(2, "0");

function datePart(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Tiny Moment-format implementation for Granite date/template settings. */
export function formatMomentDate(date: Date, format: string, locale = getLocale()): string {
  return format.replace(/YYYY|YY|MMMM|MMM|MM|DD|dddd|ddd|HH|mm|ss|D|M/g, (token) => {
    switch (token) {
      case "YYYY":
        return date.getFullYear().toString();
      case "YY":
        return date.getFullYear().toString().slice(-2);
      case "MMMM":
        return datePart(date, locale, { month: "long" });
      case "MMM":
        return datePart(date, locale, { month: "short" });
      case "MM":
        return PAD2(date.getMonth() + 1);
      case "M":
        return (date.getMonth() + 1).toString();
      case "DD":
        return PAD2(date.getDate());
      case "D":
        return date.getDate().toString();
      case "dddd":
        return datePart(date, locale, { weekday: "long" });
      case "ddd":
        return datePart(date, locale, { weekday: "short" });
      case "HH":
        return PAD2(date.getHours());
      case "mm":
        return PAD2(date.getMinutes());
      case "ss":
        return PAD2(date.getSeconds());
      default:
        return token;
    }
  });
}
