import MarkdownIt from "markdown-it";
// @ts-expect-error — markdown-it-footnote ships JS without types
import markdownItFootnote from "markdown-it-footnote";
import markdownItKatex from "@vscode/markdown-it-katex";
import { splitFrontmatter } from "@core/metadata/frontmatter";
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

let cachedMd: MarkdownIt | null = null;

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

  // ---- Heading slugs ---------------------------------------------------
  md.core.ruler.push("heading_slugs", (state) => {
    const seen = new Map<string, number>();
    for (let i = 0; i < state.tokens.length - 1; i++) {
      const open = state.tokens[i];
      const inline = state.tokens[i + 1];
      if (
        !open ||
        !inline ||
        !open.type.startsWith("heading_open") ||
        inline.type !== "inline"
      )
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

  md.renderer.rules["wikilink"] = (tokens, idx) => {
    const t = tokens[idx]!;
    const target = t.attrGet("target") ?? "";
    const display = t.attrGet("display") ?? target;
    const heading = t.attrGet("heading");
    const block = t.attrGet("block");
    let suffix = "";
    if (heading) suffix = `#${heading}`;
    else if (block) suffix = `#^${block}`;
    return `<a class="internal-link" data-href="${escapeHtml(target + suffix)}" href="${escapeHtml(target + suffix)}">${escapeHtml(display)}</a>`;
  };

  md.renderer.rules["wikilink_embed"] = (tokens, idx) => {
    const t = tokens[idx]!;
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

  md.renderer.rules["hashtag"] = (tokens, idx) => {
    const tag = tokens[idx]!.attrGet("tag") ?? "";
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
    const start = state.bMarks[startLine]! + state.tShift[startLine]!;
    const max = state.eMarks[startLine]!;
    const line = state.src.slice(start, max);
    if (!line.startsWith("%%")) return false;
    let close = -1;
    for (let i = startLine + 1; i < endLine; i++) {
      const lineStart = state.bMarks[i]! + state.tShift[i]!;
      const lineEnd = state.eMarks[i]!;
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

  // ---- Task lists: [ ] / [x] -------------------------------------------
  md.core.ruler.push("task_list", (state) => {
    for (let i = 0; i < state.tokens.length - 2; i++) {
      const t = state.tokens[i];
      if (!t || t.type !== "list_item_open") continue;
      const p = state.tokens[i + 1];
      const inline = state.tokens[i + 2];
      if (!p || !inline || p.type !== "paragraph_open" || inline.type !== "inline") continue;
      const m = inline.content.match(/^\[( |x|X)\] /);
      if (!m) continue;
      const checked = m[1] !== " ";
      const children = inline.children;
      if (!children) continue;
      inline.content = inline.content.slice(m[0].length);
      if (children[0]?.type === "text") {
        children[0].content = children[0].content.replace(/^\[( |x|X)\] /, "");
      }
      const klass = (t.attrGet("class") ?? "").split(" ").filter(Boolean);
      klass.push("task-list-item");
      t.attrSet("class", klass.join(" "));
      t.attrSet("data-task", checked ? "x" : " ");
      const line = t.map ? t.map[0] : null;
      const Token = state.Token;
      const checkbox = new Token("html_inline", "", 0);
      const lineAttr = line !== null ? ` data-line="${line}"` : "";
      checkbox.content = `<input type="checkbox" class="task-list-item-checkbox"${lineAttr} data-checked="${checked ? "x" : " "}"${checked ? " checked" : ""}> `;
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
        const t = tokens[j]!;
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
      open.attrSet("class", `callout${fold ? ` is-collapsible${fold === "-" ? " is-collapsed" : ""}` : ""}`);
      open.attrSet("data-callout", canonical);
      const closeToken = tokens[close]!;
      closeToken.tag = "div";

      // Replace the first paragraph with title + content wrapper.
      // Strip the [!...] prefix from the first inline and capture its title.
      firstInline.content = "";
      if (firstInline.children) {
        firstInline.children = [];
      }

      // Build the title HTML separately and inject as html_block.
      const titleHtml = `<div class="callout-title"><div class="callout-title-inner">${escapeHtml(titleText.length > 0 ? titleText : capitalize(canonical))}</div></div><div class="callout-content">`;
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
        const t = tokens[j]!;
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
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

export function getMarkdownRenderer(): MarkdownIt {
  if (!cachedMd) cachedMd = buildMd();
  return cachedMd;
}

export function renderMarkdown(source: string): string {
  return getMarkdownRenderer().render(source);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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