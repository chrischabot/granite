/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const here = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: [".preview.dev.igent.ai", ".preview.igent.ai", "localhost"],
  },
  resolve: {
    alias: {
      "@": `${here}/src`,
      "@core": `${here}/src/core`,
      "@ui": `${here}/src/ui`,
      "@styles": `${here}/src/styles`,
      "@api": `${here}/src/api`,
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("/katex/")) {
            return "vendor-katex";
          }
          if (id.includes("/prismjs/")) {
            return "vendor-prism";
          }
          if (
            id.includes("/mermaid/") ||
            id.includes("/dagre-d3-es/") ||
            id.includes("/cytoscape/") ||
            id.includes("/d3-") ||
            id.includes("/d3/") ||
            id.includes("/khroma/") ||
            id.includes("/dompurify/")
          ) {
            return "vendor-mermaid";
          }
          if (
            id.includes("/@codemirror/") ||
            id.includes("/@lezer/") ||
            id.includes("/codemirror/")
          ) {
            return "vendor-codemirror";
          }
          if (id.includes("/effect/") || id.includes("/@effect/")) {
            return "vendor-effect";
          }
          if (
            id.includes("/markdown-it/") ||
            id.includes("/markdown-it-footnote/") ||
            id.includes("/@vscode/markdown-it-katex/")
          ) {
            return "vendor-markdown";
          }
          if (id.includes("/lucide-react/") || id.includes("/lucide/")) {
            return "vendor-lucide";
          }
          if (id.includes("/idb/") || id.includes("/js-yaml/") || id.includes("/fzf/")) {
            return "vendor-utils";
          }
          return "vendor";
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["src/test/setup.ts"],
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules/**", "dist/**", ".bun/**", "specs/**"],
  },
});
