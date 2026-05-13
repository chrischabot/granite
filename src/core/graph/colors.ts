/**
 * Deterministic string → HSL color mapping.
 *
 * Used by Graph's "color by tag" / "color by folder" presets. The same input
 * always produces the same hue, so a vault's color scheme is stable across
 * sessions without us needing to persist a mapping.
 */

function hashStringToHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

/** Return a CSS color for the given string. Two stable saturation/lightness
 *  values keep colors readable on both light and dark backgrounds. */
export function colorForString(s: string): string {
  return `hsl(${hashStringToHue(s)}, 65%, 55%)`;
}

/** Pick the dominant tag for a file and return a color for it.
 *  Returns null if the file has no tags. */
export function tagColorForFile(tags: ReadonlyArray<string>): string | null {
  if (tags.length === 0) return null;
  // Sort lexicographically so the "dominant" tag is deterministic regardless
  // of source ordering.
  const dominant = [...tags].sort((a, b) => a.localeCompare(b))[0];
  if (!dominant) return null;
  return colorForString(dominant);
}

/** Color the file by its top-level folder. Returns a vault-root color for
 *  files at the vault root. */
export function folderColorForPath(path: string): string {
  const slash = path.indexOf("/");
  const root = slash === -1 ? "(root)" : path.slice(0, slash);
  return colorForString(root);
}
