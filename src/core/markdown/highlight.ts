import Prism from "prismjs";

// Load core languages eagerly. Additional languages are loaded on demand.
// (We call `await import(...)` inside `highlightLater` for unknown langs.)
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";

const LANG_ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  json5: "json",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  html: "markup",
  xml: "markup",
};

/** Synchronous highlight when the language is already loaded. */
export function highlightSync(code: string, lang: string): string {
  const resolved = LANG_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
  const grammar = Prism.languages[resolved];
  if (!grammar) return escapeHtml(code);
  try {
    return Prism.highlight(code, grammar, resolved);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
