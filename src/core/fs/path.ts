import type { VaultPath } from "./types";

/** Extract the basename without extension. */
export function basename(path: VaultPath): string {
  const last = path.split("/").at(-1) ?? "";
  return last;
}

/** File name without extension. */
export function stem(path: VaultPath): string {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
}

/** Lowercase extension without leading dot. Empty string if none. */
export function extension(path: VaultPath): string {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Parent directory path, "" for root files. */
export function dirname(path: VaultPath): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

/** Join path segments, dropping empties and trimming slashes. */
export function join(...parts: ReadonlyArray<string>): VaultPath {
  return parts
    .flatMap((p) => p.split("/"))
    .filter((p) => p.length > 0 && p !== ".")
    .join("/");
}

/** Normalize a user-supplied path to the canonical vault form. */
export function normalize(path: string): VaultPath {
  const segments: string[] = [];
  for (const seg of path.replace(/\\/g, "/").split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      segments.pop();
      continue;
    }
    segments.push(seg);
  }
  return segments.join("/");
}

/**
 * Resolve a markdown-link href against the source note's path.
 *
 *   ./twitter-x.md                        → siblings of source
 *   ../tactics/content-strategy.md        → parent + sibling dir
 *   bluesky-mastodon-threads.md           → also sibling (no `./` is implicit)
 *   subfolder/note.md                     → child dir
 *   /vault-rooted/abs-path.md             → vault-absolute (leading slash)
 *
 * External URLs (http://, mailto:, javascript:, …) and fragment-only hrefs
 * (#anchor) are filtered out by the caller; this function assumes a local
 * file href.
 */
export function resolveRelative(sourcePath: VaultPath, href: string): VaultPath {
  if (href.startsWith("/")) return normalize(href);
  return normalize(`${dirname(sourcePath)}/${href}`);
}

const ILLEGAL_CHARS = '<>:"\\|?*';

/** Returns true if `name` contains characters disallowed by Windows or POSIX. */
export function isInvalidName(name: string): boolean {
  if (!name || name === "." || name === "..") return true;
  return [...name].some((char) => ILLEGAL_CHARS.includes(char) || char.charCodeAt(0) < 32);
}
