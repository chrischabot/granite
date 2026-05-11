type MermaidApi = typeof import("mermaid").default;

let mermaidPromise: Promise<MermaidApi> | null = null;
let initialized = false;
let initializedTheme: "default" | "dark" = "default";

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

function currentTheme(): "default" | "dark" {
  return document.body.classList.contains("theme-dark") ? "dark" : "default";
}

async function ensureInitialized(): Promise<MermaidApi> {
  const mermaid = await loadMermaid();
  const theme = currentTheme();
  if (initialized && initializedTheme === theme) return mermaid;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "strict",
    fontFamily: "var(--font-text)",
  });
  initialized = true;
  initializedTheme = theme;
  return mermaid;
}

let counter = 0;

/**
 * Find every fenced `mermaid` code block under `root` and render its diagram
 * in place. The Mermaid library is fetched lazily on first invocation, so
 * vaults that never use mermaid avoid the download entirely. Errors are
 * swallowed so a single broken diagram does not break the rest of the page.
 */
export async function renderMermaidIn(root: HTMLElement): Promise<void> {
  const blocks = root.querySelectorAll<HTMLElement>("pre.language-mermaid");
  if (blocks.length === 0) return;
  const mermaid = await ensureInitialized();
  for (const pre of blocks) {
    const code = pre.querySelector("code");
    if (!code) continue;
    const source = code.textContent ?? "";
    const id = `mermaid-${(++counter).toString(36)}-${Date.now().toString(36)}`;
    const wrapper = document.createElement("div");
    wrapper.className = "mermaid-block mermaid";
    pre.replaceWith(wrapper);
    try {
      const { svg } = await mermaid.render(id, source);
      wrapper.innerHTML = svg;
    } catch (err) {
      wrapper.innerHTML = `<pre class="mermaid-error">${escapeHtml(
        err instanceof Error ? err.message : String(err),
      )}</pre>`;
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}