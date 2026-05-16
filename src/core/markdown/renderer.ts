import { splitFrontmatter } from "@core/metadata/frontmatter";
import markdownItKatex from "@vscode/markdown-it-katex";
import MarkdownIt from "markdown-it";
// @ts-expect-error — markdown-it-footnote ships JS without types
import markdownItFootnote from "markdown-it-footnote";
import { highlightSync } from "./highlight";

/** Convert "[[Target|Display]]" → resolved object. */
export interface WikilinkParts {
  readonly target: string;
  readonly display: string | null;
  readonly heading: string | null;
  readonly block: string | null;
}

export function parseWikilink(raw: string): WikilinkParts {
  let target = raw;
  let display: string | null = null;
  const pipeIdx = raw.indexOf("|");
  if (pipeIdx !== -1) {
    target = raw.slice(0, pipeIdx);
    display = raw.slice(pipeIdx + 1);
  }
  let heading: string | null = null;
  let block: string | null = null;
  const hashIdx = target.indexOf("#");
  if (hashIdx !== -1) {
    const after = target.slice(hashIdx + 1);
    target = target.slice(0, hashIdx);
    if (after.startsWith("^")) {
      block = after.slice(1);
    } else {
      heading = after;
    }
  }
  return { target: target.trim(), display, heading, block };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sanitize a fence info string into a CSS class-safe token. */
function sanitizeLang(lang: string): string {
  return lang.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** The set of recognized callout types and aliases → canonical (icon+color). */
const CALLOUT_ALIASES: Record<string, string> = {
  note: "note",
  abstract: "abstract",
  summary: "abstract",
  tldr: "abstract",
  info: "info",
  todo: "todo",
  tip: "tip",
  hint: "tip",
  important: "important",
  success: "success",
  check: "success",
  done: "success",
  question: "question",
  help: "question",
  faq: "question",
  warning: "warning",
  caution: "warning",
  attention: "warning",
  failure: "failure",
  fail: "failure",
  missing: "failure",
  danger: "danger",
  error: "danger",
  bug: "bug",
  example: "example",
  quote: "quote",
  cite: "quote",
};

/** SVG path data for each canonical callout type — copied from lucide-icons
 *  so reading-mode callout headers get a leading icon (Obsidian convention). */
const CALLOUT_ICONS: Record<string, string> = {
  note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  abstract:
    '<path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/><path d="M16 3h5v5"/><path d="M16 8 21 3"/><path d="M8 11h6"/><path d="M8 15h6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  todo: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  tip: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M2 12a10 10 0 1 1 17 7l-2 1H7l-2-1A10 10 0 0 1 2 12z"/>',
  important:
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
  question:
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  warning:
    '<path d="M21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  failure: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  danger:
    '<path d="m7.21 14.77.42-2.79"/><path d="m7.21 9.23.42 2.79"/><path d="M12 2v20"/><path d="m17.79 14.77-.42-2.79"/><path d="m17.79 9.23-.42 2.79"/><path d="M2 12h20"/>',
  bug: '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  example:
    '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>',
  quote:
    '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
};

function calloutIconSvg(type: string): string {
  const path = CALLOUT_ICONS[type] ?? CALLOUT_ICONS_NOTE_PATH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="callout-icon"><g>${path}</g></svg>`;
}

// Pre-compute the fallback path once. The `Record<string, string>` index
// signature makes both `.note` (tsc TS4111) and `["note"]` (biome literal-key
// hint) a friction point, so we narrow to a defined-keys helper.
const NOTE_KEY = "note" as const;
const CALLOUT_ICONS_NOTE_PATH: string = CALLOUT_ICONS[NOTE_KEY] ?? "";

let cachedMd: MarkdownIt | null = null;
let cachedCommonMarkMd: MarkdownIt | null = null;

type LinkOpenRule = (
  tokens: unknown[],
  idx: number,
  options: unknown,
  env: unknown,
  self: { renderToken: (...args: unknown[]) => string },
) => string;

interface AttrToken {
  attrGet: (k: string) => string | null;
  attrSet: (k: string, v: string) => void;
}

function installInternalLinkRenderer(md: MarkdownIt): void {
  const rules: Record<string, LinkOpenRule | undefined> = md.renderer.rules as unknown as Record<
    string,
    LinkOpenRule | undefined
  >;
  const RULE_KEY = "link_open";
  const previous: LinkOpenRule =
    rules[RULE_KEY] ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  rules[RULE_KEY] = (tokens, idx, options, env, self) => {
    const tok = (tokens as Array<AttrToken | undefined>)[idx];
    if (!tok) return previous(tokens, idx, options, env, self);
    const href = tok.attrGet("href") ?? "";
    const isExternal = /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
    const isFragment = href.startsWith("#") || href === "";
    if (!isExternal && !isFragment) {
      const existing = tok.attrGet("class");
      tok.attrSet("class", existing ? `${existing} internal-link` : "internal-link");
      tok.attrSet("data-href", href);
    }
    return previous(tokens, idx, options, env, self);
  };
}

function buildMd(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    breaks: false,
    highlight: (str, lang) => {
      if (lang) {
        const safe = sanitizeLang(lang);
        const html = highlightSync(str, lang);
        const cls = safe ? `language-${safe}` : "";
        return `<pre class="${cls}"><code class="${cls}">${html}</code></pre>`;
      }
      return "";
    },
  });

  md.use(markdownItFootnote);
  md.use(markdownItKatex, { throwOnError: false });

  // Mark `[text](path.md)` / `[text](path)` links that point at vault files
  // (not external URLs, mailto:, fragments, etc.) as `.internal-link` so the
  // ReadingView click handler treats them like wikilinks. Without this,
  // markdown-link clicks fall through to the default `<a href>` behaviour and
  // open as if they were absolute, missing the vault context.
  installInternalLinkRenderer(md);

  // ---- Heading slugs ---------------------------------------------------
  md.core.ruler.push("heading_slugs", (state) => {
    const seen = new Map<string, number>();
    for (let i = 0; i < state.tokens.length - 1; i++) {
      const open = state.tokens[i];
      const inline = state.tokens[i + 1];
      if (!open || !inline || !open.type.startsWith("heading_open") || inline.type !== "inline")
        continue;
      const text = inline.content;
      const base = slugify(text);
      if (!base) continue;
      const idx = seen.get(base) ?? 0;
      seen.set(base, idx + 1);
      const id = idx === 0 ? base : `${base}-${idx}`;
      open.attrSet("id", id);
    }
  });

  // ---- Wikilinks: [[Target|Display]] ------------------------------------
  md.inline.ruler.before("link", "wikilink", (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    let isEmbed = false;
    let start = pos;
    if (src.charCodeAt(start) === 0x21 /* ! */) {
      isEmbed = true;
      start += 1;
    }
    if (src.charCodeAt(start) !== 0x5b /* [ */ || src.charCodeAt(start + 1) !== 0x5b) {
      return false;
    }
    const closeIdx = src.indexOf("]]", start + 2);
    if (closeIdx === -1) return false;
    const inner = src.slice(start + 2, closeIdx);
    if (inner.length === 0) return false;

    if (!silent) {
      const parts = parseWikilink(inner);
      if (isEmbed) {
        const t = state.push("wikilink_embed", "", 0);
        t.attrSet("target", parts.target);
        if (parts.heading) t.attrSet("heading", parts.heading);
        if (parts.block) t.attrSet("block", parts.block);
        if (parts.display) t.attrSet("display", parts.display);
      } else {
        const t = state.push("wikilink", "", 0);
        t.attrSet("target", parts.target);
        if (parts.heading) t.attrSet("heading", parts.heading);
        if (parts.block) t.attrSet("block", parts.block);
        if (parts.display) t.attrSet("display", parts.display);
        else t.attrSet("display", parts.target);
      }
    }

    state.pos = closeIdx + 2;
    return true;
  });

  // biome-ignore lint/complexity/useLiteralKeys: MarkdownIt rules are index-signature typed.
  md.renderer.rules["wikilink"] = (tokens, idx) => {
    const t = tokens[idx];
    if (!t) return "";
    const target = t.attrGet("target") ?? "";
    const display = t.attrGet("display") ?? target;
    const heading = t.attrGet("heading");
    const block = t.attrGet("block");
    let suffix = "";
    if (heading) suffix = `#${heading}`;
    else if (block) suffix = `#^${block}`;
    return `<a class="internal-link" data-href="${escapeHtml(target + suffix)}" href="${escapeHtml(target + suffix)}">${escapeHtml(display)}</a>`;
  };

  // biome-ignore lint/complexity/useLiteralKeys: MarkdownIt rules are index-signature typed.
  md.renderer.rules["wikilink_embed"] = (tokens, idx) => {
    const t = tokens[idx];
    if (!t) return "";
    const target = t.attrGet("target") ?? "";
    const display = t.attrGet("display") ?? target;
    const heading = t.attrGet("heading");
    const block = t.attrGet("block");
    const suffix = heading ? `#${heading}` : block ? `#^${block}` : "";
    return `<span class="internal-embed" data-href="${escapeHtml(target + suffix)}" data-display="${escapeHtml(display)}">${escapeHtml(display)}</span>`;
  };

  // ---- Tags: #tag (with hierarchy) --------------------------------------
  md.inline.ruler.after("emphasis", "hashtag", (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x23 /* # */) return false;
    if (pos > 0) {
      const prev = src.charCodeAt(pos - 1);
      const isSep =
        prev === 0x20 ||
        prev === 0x0a ||
        prev === 0x0d ||
        prev === 0x09 ||
        prev === 0x28 ||
        prev === 0x5b;
      if (!isSep) return false;
    }
    let end = pos + 1;
    while (end < src.length) {
      const c = src.charCodeAt(end);
      const isLetter = (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
      const isDigit = c >= 0x30 && c <= 0x39;
      const isPunct = c === 0x2d || c === 0x5f || c === 0x2f;
      const isHigh = c >= 0x80;
      if (!(isLetter || isDigit || isPunct || isHigh)) break;
      end += 1;
    }
    const body = src.slice(pos + 1, end);
    if (body.length === 0) return false;
    if (/^[0-9]+$/.test(body)) return false;

    if (!silent) {
      const t = state.push("hashtag", "", 0);
      t.attrSet("tag", body);
    }
    state.pos = end;
    return true;
  });

  // biome-ignore lint/complexity/useLiteralKeys: MarkdownIt rules are index-signature typed.
  md.renderer.rules["hashtag"] = (tokens, idx) => {
    const tag = tokens[idx]?.attrGet("tag") ?? "";
    return `<a class="tag" data-tag="${escapeHtml(tag)}" href="#${escapeHtml(tag)}">#${escapeHtml(tag)}</a>`;
  };

  // ---- Highlight: ==text== ----------------------------------------------
  md.inline.ruler.after("emphasis", "mark_highlight", (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x3d || src.charCodeAt(pos + 1) !== 0x3d) return false;
    const closeIdx = src.indexOf("==", pos + 2);
    if (closeIdx === -1) return false;
    if (!silent) {
      const open = state.push("mark_open", "mark", 1);
      open.markup = "==";
      const text = state.push("text", "", 0);
      text.content = src.slice(pos + 2, closeIdx);
      const close = state.push("mark_close", "mark", -1);
      close.markup = "==";
    }
    state.pos = closeIdx + 2;
    return true;
  });

  // ---- Comments: %%text%% (inline, hidden) ----------------------------
  md.inline.ruler.after("emphasis", "obsidian_comment", (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x25 /* % */ || src.charCodeAt(pos + 1) !== 0x25) {
      return false;
    }
    const closeIdx = src.indexOf("%%", pos + 2);
    if (closeIdx === -1) return false;
    if (!silent) {
      // Emit nothing — comments are hidden in reading view.
    }
    state.pos = closeIdx + 2;
    return true;
  });

  // ---- Comments: %% ... %% (block, multi-line) ------------------------
  md.block.ruler.before("paragraph", "obsidian_comment_block", (state, startLine, endLine) => {
    const start = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
    const max = state.eMarks[startLine] ?? start;
    const line = state.src.slice(start, max);
    if (!line.startsWith("%%")) return false;
    let close = -1;
    for (let i = startLine + 1; i < endLine; i++) {
      const lineStart = (state.bMarks[i] ?? 0) + (state.tShift[i] ?? 0);
      const lineEnd = state.eMarks[i] ?? lineStart;
      const text = state.src.slice(lineStart, lineEnd);
      if (text.startsWith("%%")) {
        close = i;
        break;
      }
    }
    if (close === -1) return false;
    state.line = close + 1;
    return true;
  });

  // ---- Task lists: [ ] / [x] / [?] -------------------------------------
  md.core.ruler.push("task_list", (state) => {
    for (let i = 0; i < state.tokens.length - 2; i++) {
      const t = state.tokens[i];
      if (!t || t.type !== "list_item_open") continue;
      const p = state.tokens[i + 1];
      const inline = state.tokens[i + 2];
      if (!p || !inline || p.type !== "paragraph_open" || inline.type !== "inline") continue;
      const m = inline.content.match(/^\[([^\]\n])\] /);
      if (!m) continue;
      const marker = m[1] ?? " ";
      const checked = marker !== " ";
      const children = inline.children;
      if (!children) continue;
      inline.content = inline.content.slice(m[0].length);
      if (children[0]?.type === "text") {
        children[0].content = children[0].content.replace(/^\[([^\]\n])\] /, "");
      }
      const klass = (t.attrGet("class") ?? "").split(" ").filter(Boolean);
      klass.push("task-list-item");
      t.attrSet("class", klass.join(" "));
      t.attrSet("data-task", marker);
      const line = t.map ? t.map[0] : null;
      const Token = state.Token;
      const checkbox = new Token("html_inline", "", 0);
      const lineAttr = line !== null ? ` data-line="${line}"` : "";
      checkbox.content = `<input type="checkbox" class="task-list-item-checkbox"${lineAttr} data-checked="${escapeHtml(marker)}"${checked ? " checked" : ""}> `;
      children.unshift(checkbox);
    }
  });

  // ---- Callouts: > [!type] Title\n> body -------------------------------
  // Implemented as a core post-processor: walk the parsed tokens, find
  // blockquote_open whose first child paragraph starts with `[!type]`, and
  // wrap it as a callout. Foldable markers (`+`/`-`) are recognized.
  md.core.ruler.push("callouts", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i];
      if (!open || open.type !== "blockquote_open") continue;
      // Find the matching close.
      let depth = 1;
      let close = -1;
      for (let j = i + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) continue;
        if (t.type === "blockquote_open") depth += 1;
        else if (t.type === "blockquote_close") {
          depth -= 1;
          if (depth === 0) {
            close = j;
            break;
          }
        }
      }
      if (close === -1) continue;

      // Look for the first inline content of the blockquote.
      const firstParaOpen = tokens[i + 1];
      const firstInline = tokens[i + 2];
      if (
        !firstParaOpen ||
        !firstInline ||
        firstParaOpen.type !== "paragraph_open" ||
        firstInline.type !== "inline"
      )
        continue;

      const cm = firstInline.content.match(/^\[!([^\]\n]+)\]([+-]?)\s*(.*)/);
      if (!cm) continue;

      const rawType = (cm[1] ?? "").toLowerCase().trim();
      const fold = cm[2];
      const titleText = cm[3] ?? "";
      const canonical = CALLOUT_ALIASES[rawType] ?? "note";

      // Mutate the blockquote tokens to a callout structure.
      open.tag = "div";
      open.attrSet(
        "class",
        `callout${fold ? ` is-collapsible${fold === "-" ? " is-collapsed" : ""}` : ""}`,
      );
      open.attrSet("data-callout", canonical);
      const closeToken = tokens[close];
      if (!closeToken) continue;
      closeToken.tag = "div";

      // Replace the first paragraph with title + content wrapper.
      // Strip the [!...] prefix from the first inline and capture its title.
      firstInline.content = "";
      if (firstInline.children) {
        firstInline.children = [];
      }

      // Build the title HTML separately and inject as html_block.
      const iconSvg = calloutIconSvg(canonical);
      const titleHtml = `<div class="callout-title">${iconSvg}<div class="callout-title-inner">${escapeHtml(titleText.length > 0 ? titleText : capitalize(canonical))}</div></div><div class="callout-content">`;
      const titleToken = new state.Token("html_block", "", 0);
      titleToken.content = titleHtml;
      titleToken.block = true;

      // Replace [paragraph_open, inline (now empty), paragraph_close] with the
      // title html_block. Append a closing </div> just before blockquote_close.
      const paraClose = tokens[i + 3];
      if (!paraClose || paraClose.type !== "paragraph_close") continue;
      tokens.splice(i + 1, 3, titleToken);

      // Re-find close index after splice.
      let depth2 = 1;
      let closeAfter = -1;
      for (let j = i + 2; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) continue;
        if (t.type === "blockquote_open") depth2 += 1;
        else if (t.type === "blockquote_close") {
          depth2 -= 1;
          if (depth2 === 0) {
            closeAfter = j;
            break;
          }
        }
      }
      if (closeAfter === -1) continue;
      const tail = new state.Token("html_block", "", 0);
      tail.content = "</div>";
      tail.block = true;
      tokens.splice(closeAfter, 0, tail);
    }
  });

  return md;
}

function capitalize(s: string): string {
  return s.length > 0 ? (s[0]?.toUpperCase() ?? "") + s.slice(1) : s;
}

export function getMarkdownRenderer(): MarkdownIt {
  if (!cachedMd) cachedMd = buildMd();
  return cachedMd;
}

export function renderMarkdown(source: string): string {
  return getMarkdownRenderer().render(source);
}

export function getCommonMarkRenderer(): MarkdownIt {
  if (!cachedCommonMarkMd) {
    cachedCommonMarkMd = new MarkdownIt("commonmark", {
      html: true,
      linkify: false,
      typographer: false,
      breaks: false,
    });
  }
  return cachedCommonMarkMd;
}

export function renderCommonMark(source: string): string {
  return getCommonMarkRenderer().render(source);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Render a vault note: strip the YAML frontmatter from the rendered body so
 * it doesn't appear as `<hr>` + `<p>`, but rewrite every `data-line="N"` in
 * the output so it still points at the original source-file line. This lets
 * the reading-view task-list checkbox toggle the correct line in the file.
 */
export function renderNoteMarkdown(text: string): string {
  const { body, yamlText, newline } = splitFrontmatter(text);
  const html = renderMarkdown(body);
  if (yamlText === null) return html;
  const consumed = text.length - body.length;
  const offset = text.slice(0, consumed).split(newline).length - 1;
  if (offset === 0) return html;
  return html.replace(/data-line="(\d+)"/g, (_, n) => `data-line="${Number(n) + offset}"`);
}
