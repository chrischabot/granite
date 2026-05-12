const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function dateFromIsoDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDateOnly(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatPropertyValue(value: unknown, locale?: string): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) {
    const isMidnightUtc =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    if (isMidnightUtc) {
      return formatDateOnly(
        new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
        locale,
      );
    }
    return formatDateTime(value, locale);
  }
  if (typeof value === "string") {
    if (ISO_DATE_RE.test(value)) {
      const date = dateFromIsoDate(value);
      if (date) return formatDateOnly(date, locale);
    }
    if (ISO_DATETIME_RE.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return formatDateTime(date, locale);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((x) => formatPropertyValue(x, locale)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
