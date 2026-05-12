export type TextDirection = "ltr" | "rtl";

const RTL_LOCALES = new Set(["ar", "fa", "he", "ur"]);

export function localeDirection(locale: string): TextDirection {
  const base = locale.toLowerCase().split(/[-_]/)[0] ?? locale.toLowerCase();
  return RTL_LOCALES.has(base) ? "rtl" : "ltr";
}

export function noteDirectionFromFrontmatter(
  frontmatter: Record<string, unknown> | null | undefined,
): TextDirection | null {
  const raw = frontmatter ? Reflect.get(frontmatter, "dir") : undefined;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "rtl" || normalized === "ltr") return normalized;
  return null;
}
