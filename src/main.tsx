import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "katex/dist/katex.min.css";
import "./styles/index.css";

// Detect platform and tag body for OS-specific styles.
function detectPlatform(): "macos" | "windows" | "linux" {
  const ua = navigator.userAgent;
  if (/Mac|iPhone|iPad|iPod/.test(ua)) return "macos";
  if (/Win/.test(ua)) return "windows";
  return "linux";
}

const body = document.body;
body.classList.add(`mod-${detectPlatform()}`);
body.classList.add("show-ribbon");
body.classList.add("show-view-header");
body.classList.add("show-inline-title");

// Pop-out windows: tag the body so chrome is hidden. The popout gets its
// vault and initial leaf from URL parameters; VaultProvider handles the
// hookup.
if (new URLSearchParams(window.location.search).get("popout") === "1") {
  body.classList.add("is-popout");
}

// Initial focus state.
body.classList.toggle("is-focused", document.hasFocus());
window.addEventListener("focus", () => body.classList.add("is-focused"));
window.addEventListener("blur", () => body.classList.remove("is-focused"));

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      /* offline support is optional; ignore registration errors */
    });
  });
}

const root = document.getElementById("root");
if (!root) throw new Error("Granite: #root not found in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
