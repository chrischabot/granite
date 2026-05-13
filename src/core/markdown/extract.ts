const HEADING_RE = /^(#{1,6})[ \t]+(.+?)[ \t]*$/;
const BLOCK_END_RE = /\s\^([a-zA-Z0-9-]+)\s*$/;

/**
 * Extract a heading section from a markdown document. The match is
 * case-insensitive on the trimmed heading text. Returns the heading line
 * itself plus all following content up to the next heading at equal or
 * shallower depth.
 */
export function extractHeadingSection(text: string, heading: string): string | null {
  const wanted = heading.trim().toLowerCase();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = (lines[i] ?? "").match(HEADING_RE);
    if (!m) continue;
    if (m[2]?.trim().toLowerCase() !== wanted) continue;
    const startLevel = m[1]?.length;
    if (startLevel === undefined) continue;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const nextLevel = (lines[j] ?? "").match(HEADING_RE)?.[1]?.length;
      if (nextLevel !== undefined && nextLevel <= startLevel) {
        end = j;
        break;
      }
    }
    return lines.slice(i, end).join("\n");
  }
  return null;
}

/**
 * Extract a block: the paragraph (or list item) whose last line ends with
 * `^blockId`. We walk backward from the matching line to the nearest blank
 * line to capture the whole paragraph.
 */
export function extractBlock(text: string, id: string): string | null {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(BLOCK_END_RE);
    if (m && m[1] === id) {
      // Find the start of the block (paragraph): walk back to the nearest
      // blank line or the document start.
      let start = i;
      while (start > 0 && (lines[start - 1] ?? "").trim() !== "") {
        start -= 1;
      }
      // Strip the trailing `^id` for cleaner display.
      const cleaned = line.replace(BLOCK_END_RE, "");
      const slice = lines.slice(start, i + 1);
      slice[slice.length - 1] = cleaned;
      return slice.join("\n");
    }
  }
  return null;
}
