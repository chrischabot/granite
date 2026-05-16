import { attachHoverPopoverListeners } from "@/ui/overlay/HoverPopover";
import { parseBaseConfig } from "@core/bases/schema";
import { parseCanvas } from "@core/canvas/schema";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { mimeForNativeExtension, nativeFileKindForExtension } from "@core/fs/file-formats";
import { extension, resolveRelative, stem } from "@core/fs/path";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { noteDirectionFromFrontmatter } from "@core/i18n/direction";
import { extractBlock, extractHeadingSection } from "@core/markdown/extract";
import { renderMermaidIn } from "@core/markdown/mermaid";
import { renderMarkdown, renderNoteMarkdown } from "@core/markdown/renderer";
import { metadataCache } from "@core/metadata/cache";
import { formatPropertyValue } from "@core/metadata/property-format";
import { useFileMetadata, useMetadataVersion } from "@core/metadata/useMetadata";
import { fileMatchesQuery, parseQuery } from "@core/search/query";
import { settingsStore } from "@core/settings/store";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type Root, createRoot } from "react-dom/client";
import { useI18n } from "../i18n/useI18n";
import { CanvasView } from "./CanvasView";

export interface ReadingViewProps {
  path: VaultPath;
}

function activeFragmentForPath(path: VaultPath): string | null {
  const state = workspaceStore.getState();
  const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
  if (!group?.activeLeafId) return null;
  const leaf = state.leaves.get(group.activeLeafId);
  if (leaf?.state.type === "markdown" && leaf.state.path === path) {
    return leaf.state.fragment ?? null;
  }
  return null;
}

function useActiveFragmentForPath(path: VaultPath): string | null {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    () => activeFragmentForPath(path),
    () => activeFragmentForPath(path),
  );
}

export function ReadingView({ path }: ReadingViewProps) {
  const t = useI18n();
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const metadataVersion = useMetadataVersion();
  const fragment = useActiveFragmentForPath(path);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return yield* fs.readText(path);
        }),
      );
      setContent(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return fs.watch((event) => {
          if (cancelled) return;
          if ("path" in event && event.path === path) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => void reload(), 150);
          }
        });
      }),
    ).then((d) => {
      if (cancelled) d();
      else unsub = d;
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsub?.();
    };
  }, [path, reload]);

  const html = useMemo(() => renderNoteMarkdown(content), [content]);

  const fileMeta = useFileMetadata(path);
  const frontmatterEntries = useMemo(() => {
    if (!fileMeta) return [] as Array<[string, unknown]>;
    return Object.entries(fileMeta.frontmatter);
  }, [fileMeta]);
  const noteDirection = noteDirectionFromFrontmatter(fileMeta?.frontmatter);
  const renderedDirection = noteDirection ?? "ltr";

  // Click-to-navigate on internal links / embeds. Heading/block suffixes are
  // resolved within the rendered DOM when the link points to the same file,
  // and propagated as a `fragment` to `openFile` for cross-file links.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      // Task list checkbox toggle.
      const checkbox = (e.target as HTMLElement | null)?.closest<HTMLInputElement>(
        ".task-list-item-checkbox[data-line]",
      );
      if (checkbox) {
        e.preventDefault();
        const lineStr = checkbox.getAttribute("data-line");
        if (lineStr === null) return;
        const lineNo = Number(lineStr);
        if (!Number.isFinite(lineNo)) return;
        const wasChecked = checkbox.getAttribute("data-checked") === "x";
        void run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const text = yield* fs.readText(path);
            const lines = text.split("\n");
            const line = lines[lineNo];
            if (line === undefined) return;
            const replaced = wasChecked
              ? line.replace(/^(\s*[-*+]\s+)\[[xX]\]/, "$1[ ]")
              : line.replace(/^(\s*[-*+]\s+)\[ \]/, "$1[x]");
            if (replaced === line) return;
            lines[lineNo] = replaced;
            yield* fs.writeText(path, lines.join("\n"));
          }),
        );
        return;
      }

      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("a.internal-link");
      if (!target) return;
      const href = target.getAttribute("data-href") ?? target.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      const hashIdx = href.indexOf("#");
      const cleanPath = (hashIdx === -1 ? href : href.slice(0, hashIdx)).trim();
      const fragmentText = hashIdx === -1 ? null : href.slice(hashIdx + 1);

      if (cleanPath === "") {
        scrollToFragment(root, fragmentText);
        return;
      }
      const withExt = cleanPath.endsWith(".md") ? cleanPath : `${cleanPath}.md`;
      let decoded = withExt;
      try {
        decoded = decodeURIComponent(withExt);
      } catch {
        /* fall through */
      }
      const pathToOpen = resolveRelative(path, decoded);
      workspaceStore.openFile(pathToOpen, {
        newTab: e.metaKey || e.ctrlKey,
        ...(fragmentText ? { fragment: fragmentText } : {}),
      });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [path]);

  // Hover-popover preview for internal links.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    return attachHoverPopoverListeners(
      root,
      (el) => {
        const href = el.getAttribute("data-href") ?? el.getAttribute("href");
        if (!href) return null;
        const hashIdx = href.indexOf("#");
        const cleanPath = (hashIdx === -1 ? href : href.slice(0, hashIdx)).trim();
        if (cleanPath === "") return null;
        const pathToOpen = cleanPath.endsWith(".md") ? cleanPath : `${cleanPath}.md`;
        const fragmentText = hashIdx === -1 ? null : href.slice(hashIdx + 1);
        return { path: pathToOpen, fragment: fragmentText };
      },
      "a.internal-link",
    );
  }, []);

  // Resolve image embeds.
  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;

    for (const u of blobUrlsRef.current) URL.revokeObjectURL(u);
    blobUrlsRef.current = [];

    let cancelled = false;
    const embeds = root.querySelectorAll<HTMLElement>(".internal-embed[data-href]");

    const resolve = async (el: HTMLElement) => {
      const href = el.getAttribute("data-href") ?? "";
      const cleanPath = href.replace(/#.*$/, "");
      const ext = extension(cleanPath);
      const kind = nativeFileKindForExtension(ext);
      if (kind !== "image" && kind !== "audio" && kind !== "video" && kind !== "pdf") return;
      try {
        const bytes = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readBytes(cleanPath);
          }),
        );
        if (cancelled) return;
        const mimeType = mimeForNativeExtension(ext);
        const blob = new Blob([bytes as BlobPart], { type: mimeType });
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.push(url);

        const display = el.getAttribute("data-display") ?? cleanPath;
        let replacement: HTMLElement;
        if (kind === "image") {
          const img = document.createElement("img");
          img.src = url;
          img.alt = display;
          img.style.maxWidth = "100%";
          replacement = img;
        } else if (kind === "audio") {
          const audio = document.createElement("audio");
          audio.src = url;
          audio.controls = true;
          audio.style.width = "100%";
          replacement = audio;
        } else if (kind === "video") {
          const video = document.createElement("video");
          video.src = url;
          video.controls = true;
          video.style.maxWidth = "100%";
          replacement = video;
        } else {
          const wrap = document.createElement("div");
          wrap.className = "pdf-embed pdf-container mod-themed";
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.title = display;
          iframe.className = "pdf-embed-frame";
          wrap.appendChild(iframe);
          replacement = wrap;
        }
        el.replaceWith(replacement);
      } catch {
        el.classList.add("is-unresolved");
      }
    };

    for (const el of embeds) void resolve(el);

    return () => {
      cancelled = true;
    };
  }, [html]);

  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;
    let cancelled = false;
    const mountedRoots: Root[] = [];

    const resolve = async (el: HTMLElement) => {
      const href = el.getAttribute("data-href") ?? "";
      const cleanPath = href.replace(/#.*$/, "");
      const ext = extension(cleanPath);
      const isCanvas = ext === "canvas";
      const isBase = ext === "base";
      if (!isCanvas && !isBase) return;

      let summary = "";
      try {
        const text = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readText(cleanPath);
          }),
        );
        if (cancelled) return;
        if (isCanvas) {
          const canvas = parseCanvas(text);
          const n = canvas.nodes.length;
          const ec = canvas.edges.length;
          summary = t("reading.embed.canvasSummary", {
            nodes: String(n),
            nodeLabel: t(n === 1 ? "reading.embed.node" : "reading.embed.nodes"),
            edges: String(ec),
            edgeLabel: t(ec === 1 ? "reading.embed.edge" : "reading.embed.edges"),
          });
        } else {
          const config = parseBaseConfig(text);
          const filter = config.filter.trim();
          summary = filter
            ? t("reading.embed.filterSummary", { filter })
            : t("reading.embed.columnSummary", {
                count: String(config.columns.length),
                columnLabel: t(
                  config.columns.length === 1 ? "reading.embed.column" : "reading.embed.columns",
                ),
              });
        }
      } catch {
        el.classList.add("is-unresolved");
        return;
      }
      if (cancelled) return;

      if (isCanvas) {
        const card = document.createElement("div");
        card.className = "canvas-embed is-interactive";
        card.setAttribute("data-href", cleanPath);
        card.style.height = "460px";
        card.style.overflow = "hidden";

        const header = document.createElement("div");
        header.className = "embed-kind";
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.justifyContent = "space-between";
        header.style.gap = "var(--size-4-2)";

        const label = document.createElement("span");
        label.textContent = `${stem(cleanPath)} · ${summary}`;
        header.appendChild(label);

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "clickable-icon";
        openButton.textContent = t("reading.embed.open");
        openButton.setAttribute(
          "aria-label",
          t("reading.embed.openCanvas", { name: stem(cleanPath) }),
        );
        openButton.addEventListener("click", (clickEvt) => {
          clickEvt.preventDefault();
          clickEvt.stopPropagation();
          workspaceStore.openCanvas({
            path: cleanPath,
            newTab: clickEvt.metaKey || clickEvt.ctrlKey,
          });
        });
        header.appendChild(openButton);

        const mount = document.createElement("div");
        mount.style.height = "calc(100% - 32px)";
        mount.style.minHeight = "0";
        card.append(header, mount);
        el.replaceWith(card);

        const embeddedRoot = createRoot(mount);
        mountedRoots.push(embeddedRoot);
        embeddedRoot.render(<CanvasView path={cleanPath} />);
        return;
      }

      const card = document.createElement("div");
      card.className = "base-embed";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.setAttribute("data-href", cleanPath);
      const fileName = stem(cleanPath);
      const kindLabel = t("reading.embed.base");
      card.innerHTML = `
        <div class="embed-kind">${escapeAttr(kindLabel)}</div>
        <div class="embed-title">${escapeAttr(fileName)}</div>
        <div class="embed-summary">${escapeAttr(summary)}</div>
      `;
      const open = (newTab: boolean) => {
        workspaceStore.openBase({ path: cleanPath, newTab });
      };
      card.addEventListener("click", (clickEvt) => {
        clickEvt.preventDefault();
        open(clickEvt.metaKey || clickEvt.ctrlKey);
      });
      card.addEventListener("keydown", (kbEvt) => {
        if (kbEvt.key === "Enter" || kbEvt.key === " ") {
          kbEvt.preventDefault();
          open(kbEvt.metaKey || kbEvt.ctrlKey);
        }
      });
      el.replaceWith(card);
    };

    const embeds = root.querySelectorAll<HTMLElement>(".internal-embed[data-href]");
    for (const el of embeds) void resolve(el);

    return () => {
      cancelled = true;
      for (const embeddedRoot of mountedRoots) {
        queueMicrotask(() => embeddedRoot.unmount());
      }
    };
  }, [html, t]);

  // Resolve markdown embeds (`![[Note]]`, `![[Note#Heading]]`, `![[Note#^block]]`).
  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;
    let cancelled = false;

    const MAX_DEPTH = 4;

    const resolve = async (el: HTMLElement, visited: ReadonlySet<string>) => {
      const href = el.getAttribute("data-href") ?? "";
      const hashIdx = href.indexOf("#");
      const cleanPath = (hashIdx === -1 ? href : href.slice(0, hashIdx)).trim();
      const fragmentText = hashIdx === -1 ? null : href.slice(hashIdx + 1);
      const ext = extension(cleanPath);
      // Anything with a media/PDF/canvas/base ext was already handled by an
      // earlier effect (or is intentionally not recursed into).
      const kind = nativeFileKindForExtension(ext);
      if (kind && kind !== "markdown") return;
      if (ext && ext !== "md") return;
      const targetPath = cleanPath.endsWith(".md") ? cleanPath : `${cleanPath}.md`;
      const cycleKey = `${targetPath}#${fragmentText ?? ""}`;

      if (visited.has(cycleKey)) {
        const stub = document.createElement("div");
        stub.className = "markdown-embed is-resolved is-cyclic";
        stub.innerHTML = `<div class="markdown-embed-title">${escapeAttr(stem(targetPath))}${fragmentText ? ` · ${escapeAttr(fragmentText)}` : ""}</div><div class="markdown-embed-content"><em>${escapeAttr(t("reading.embed.circular"))}</em></div>`;
        el.replaceWith(stub);
        return;
      }

      let text: string;
      try {
        text = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readText(targetPath);
          }),
        );
      } catch {
        const stub = document.createElement("div");
        stub.className = "markdown-embed is-resolved is-unresolved";
        stub.innerHTML = `<div class="markdown-embed-title">${escapeAttr(stem(targetPath))}</div><div class="markdown-embed-content"><em>${escapeAttr(t("reading.embed.fileNotFound", { path: targetPath }))}</em></div>`;
        el.replaceWith(stub);
        return;
      }
      if (cancelled) return;

      let body = text;
      if (fragmentText) {
        if (fragmentText.startsWith("^")) {
          body = extractBlock(text, fragmentText.slice(1)) ?? "";
        } else {
          body = extractHeadingSection(text, fragmentText) ?? "";
        }
      } else {
        if (body.startsWith("---\n")) {
          const end = body.indexOf("\n---", 4);
          if (end !== -1) body = body.slice(end + 4).replace(/^\s+/, "");
        }
      }
      const inner = renderMarkdown(body);
      const wrap = document.createElement("div");
      wrap.className = "markdown-embed is-resolved";
      wrap.innerHTML = `
        <a class="markdown-embed-link internal-link" data-href="${escapeAttr(href)}" href="${escapeAttr(href)}" title="${escapeAttr(t("reading.embed.openNote", { name: stem(targetPath) }))}">↗</a>
        <div class="markdown-embed-title">${escapeAttr(stem(targetPath))}${fragmentText ? ` · ${escapeAttr(fragmentText)}` : ""}</div>
        <div class="markdown-embed-content markdown-rendered">${inner}</div>
      `;
      el.replaceWith(wrap);

      if (visited.size < MAX_DEPTH) {
        const nextVisited = new Set([...visited, cycleKey]);
        const nested = wrap.querySelectorAll<HTMLElement>(
          ".internal-embed[data-href]:not(.is-resolved)",
        );
        for (const nestedEl of nested) {
          if (cancelled) return;
          await resolve(nestedEl, nextVisited);
        }
      }
    };

    const embeds = root.querySelectorAll<HTMLElement>(
      ".internal-embed[data-href]:not(.is-resolved)",
    );
    for (const el of embeds) void resolve(el, new Set());
    return () => {
      cancelled = true;
    };
  }, [html, t]);

  // Resolve embedded base blocks: ```base …``` → live filtered table.
  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;
    let cancelled = false;

    interface BaseHandle {
      wrap: HTMLElement;
      yamlText: string;
      cleanup?: () => void;
    }
    const handles: BaseHandle[] = [];

    for (const pre of root.querySelectorAll<HTMLElement>("pre.language-base:not(.is-resolved)")) {
      const code = pre.querySelector("code");
      if (!code) continue;
      const yamlText = (code.textContent ?? "").trim();
      const wrap = document.createElement("div");
      wrap.className = "bases-fence";
      wrap.innerHTML = `<div class="bases-fence-header"><span class="bases-fence-name">${escapeAttr(t("reading.embed.base"))}</span></div><div class="bases-fence-body">${escapeAttr(t("reading.loading"))}</div>`;
      pre.replaceWith(wrap);
      handles.push({ wrap, yamlText });
      wrap.classList.add("is-resolved");
    }

    const renderAll = async () => {
      const { renderBasesEmbed } = await import("./bases/embed");
      if (cancelled) return;
      for (const handle of handles) {
        if (cancelled || !handle.wrap.isConnected) continue;
        handle.cleanup?.();
        try {
          handle.cleanup = await renderBasesEmbed(handle.wrap, handle.yamlText, path);
        } catch (err) {
          const body = handle.wrap.querySelector(".bases-fence-body");
          if (body) {
            body.innerHTML = `<div class="message mod-error">${
              err instanceof Error ? err.message : String(err)
            }</div>`;
          }
        }
      }
    };

    void renderAll();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void renderAll(), 300);
    };
    const unsub = metadataCache.subscribe(scheduleRefresh);
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      unsub();
      for (const handle of handles) handle.cleanup?.();
    };
  }, [html, path, t]);

  // Resolve embedded query blocks: ```query …``` → live result list.
  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;
    let cancelled = false;
    const blocks = root.querySelectorAll<HTMLElement>("pre.language-query:not(.is-resolved)");

    interface QueryHandle {
      wrap: HTMLElement;
      queryText: string;
    }
    const handles: QueryHandle[] = [];

    const runOne = async (handle: QueryHandle) => {
      const { wrap, queryText } = handle;
      const list = wrap.querySelector(".query-results-list");
      if (!list) return;
      try {
        const parsed = parseQuery(queryText);
        const patterns = parseExcludePatterns(settingsStore.getState().excludedFiles);
        const files: ReadonlyArray<VaultFile> = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.listAll({ extensions: ["md"] });
          }),
        );
        if (cancelled) return;
        const eligible =
          patterns.length === 0 ? files : files.filter((f) => !isExcluded(f.path, patterns));
        const matches: Array<{ path: string; preview: string }> = [];
        for (const file of eligible) {
          if (cancelled) return;
          let text: string;
          try {
            text = await run(
              Effect.gen(function* () {
                const fs = yield* FileSystem;
                return yield* fs.readText(file.path);
              }),
            );
          } catch {
            continue;
          }
          const meta = metadataCache.getMetadata(file.path);
          if (fileMatchesQuery(parsed, { file, content: text, metadata: meta })) {
            const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? "";
            matches.push({ path: file.path, preview: firstLine.trim().slice(0, 120) });
          }
        }
        if (cancelled) return;
        if (matches.length === 0) {
          list.innerHTML = `<div class="query-results-empty">${escapeAttr(t("reading.query.noResults"))}</div>`;
        } else {
          const rows = matches
            .slice(0, 50)
            .map(
              (m) =>
                `<div class="query-results-row" data-href="${escapeAttr(m.path)}">
                   <div class="query-results-title">${escapeAttr(stem(m.path))}</div>
                   <div class="query-results-preview">${escapeAttr(m.preview)}</div>
                 </div>`,
            )
            .join("");
          list.innerHTML = rows;
          for (const row of list.querySelectorAll<HTMLElement>(".query-results-row")) {
            row.addEventListener("click", () => {
              const href = row.getAttribute("data-href");
              if (href) workspaceStore.openFile(href);
            });
          }
        }
        wrap.classList.add("is-resolved");
      } catch (err) {
        const list2 = wrap.querySelector(".query-results-list");
        if (list2)
          list2.innerHTML = `<div class="query-results-error">${escapeAttr(
            err instanceof Error ? err.message : t("reading.query.failed"),
          )}</div>`;
      }
    };

    for (const pre of blocks) {
      const code = pre.querySelector("code");
      if (!code) continue;
      const queryText = (code.textContent ?? "").trim();
      const wrap = document.createElement("div");
      wrap.className = "query-results-block";
      wrap.innerHTML = `<div class="query-results-header">${escapeAttr(t("reading.query.header"))}: <code>${escapeAttr(queryText)}</code></div><div class="query-results-list">${escapeAttr(t("reading.query.running"))}</div>`;
      pre.replaceWith(wrap);
      handles.push({ wrap, queryText });
    }

    for (const h of handles) void runOne(h);

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        for (const h of handles) {
          if (!h.wrap.isConnected) continue;
          void runOne(h);
        }
      }, 250);
    };
    const unsub = metadataCache.subscribe(scheduleRefresh);

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      unsub();
    };
  }, [html, t]);

  // Resolve embedded `backlinks` fences into a live list of incoming links
  // for the current file.
  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;
    let cancelled = false;

    const wraps: HTMLElement[] = [];
    for (const pre of root.querySelectorAll<HTMLElement>(
      "pre.language-backlinks:not(.is-resolved)",
    )) {
      const wrap = document.createElement("div");
      wrap.className = "backlinks-block";
      wrap.innerHTML = `<div class="backlinks-block-header">${escapeAttr(t("reading.backlinks.title"))}</div><div class="backlinks-block-list">${escapeAttr(t("reading.loading"))}</div>`;
      pre.replaceWith(wrap);
      wraps.push(wrap);
    }

    const render = () => {
      if (cancelled) return;
      const incoming = metadataCache.getBacklinks(path);
      for (const wrap of wraps) {
        const list = wrap.querySelector(".backlinks-block-list");
        if (!list) continue;
        if (incoming.length === 0) {
          list.innerHTML = `<div class="backlinks-block-empty">${escapeAttr(t("reading.backlinks.empty"))}</div>`;
          continue;
        }
        list.innerHTML = incoming
          .map(
            (l) =>
              `<div class="backlinks-block-row" data-href="${escapeAttr(l.source)}">
                 <div class="backlinks-block-title">${escapeAttr(stem(l.source))}</div>
                 <div class="backlinks-block-count">${escapeAttr(
                   t("reading.backlinks.references", {
                     count: String(l.lines.length),
                     referenceLabel: t(
                       l.lines.length === 1
                         ? "reading.backlinks.reference"
                         : "reading.backlinks.referencePlural",
                     ),
                   }),
                 )}</div>
               </div>`,
          )
          .join("");
        for (const row of list.querySelectorAll<HTMLElement>(".backlinks-block-row")) {
          row.addEventListener("click", (ev) => {
            const href = row.getAttribute("data-href");
            if (href) {
              const me = ev as MouseEvent;
              workspaceStore.openFile(href, { newTab: me.metaKey || me.ctrlKey });
            }
          });
        }
        wrap.classList.add("is-resolved");
      }
    };

    render();
    const unsub = metadataCache.subscribe(render);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [html, path, t]);

  // After rendering, if the active leaf has a fragment, scroll to it.
  useEffect(() => {
    void html;
    if (!fragment || loading) return;
    const root = containerRef.current;
    if (!root) return;
    const id = setTimeout(() => scrollToFragment(root, fragment), 50);
    return () => clearTimeout(id);
  }, [fragment, loading, html]);

  // Tag plain markdown-form internal anchors so click/hover handlers apply,
  // and render mermaid diagrams.
  useEffect(() => {
    void html;
    const root = containerRef.current;
    if (!root) return;

    const skipClasses = new Set([
      "internal-link",
      "tag",
      "external-link",
      "footnote-link",
      "footnote-ref",
      "footnote-backref",
    ]);

    for (const a of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const cls = a.className.split(/\s+/).filter(Boolean);
      if (cls.some((c) => skipClasses.has(c))) continue;
      const href = a.getAttribute("href") ?? "";
      if (!href) continue;
      // Skip schemes, anchor-only, and absolute URLs.
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) {
        a.classList.add("external-link");
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        continue;
      }
      // Treat as internal: ensure data-href + class.
      a.classList.add("internal-link");
      if (!a.hasAttribute("data-href")) a.setAttribute("data-href", href);
    }

    void renderMermaidIn(root);
  }, [html]);

  useEffect(() => {
    void html;
    void metadataVersion;
    const root = containerRef.current;
    if (!root) return;
    for (const a of root.querySelectorAll<HTMLAnchorElement>("a.internal-link")) {
      const href = a.getAttribute("data-href") ?? a.getAttribute("href") ?? "";
      const cleanPath = href.replace(/#.*$/, "").trim();
      if (!cleanPath) {
        a.classList.remove("is-unresolved");
        continue;
      }
      const withExt = cleanPath.endsWith(".md") ? cleanPath : `${cleanPath}.md`;
      let decoded = withExt;
      try {
        decoded = decodeURIComponent(withExt);
      } catch {
        /* fall through */
      }
      const targetPath = resolveRelative(path, decoded);
      if (metadataCache.getMetadata(targetPath)) {
        a.classList.remove("is-unresolved");
      } else {
        a.classList.add("is-unresolved");
      }
    }
  }, [html, metadataVersion, path]);

  // Final unmount: revoke blob URLs.
  useEffect(() => {
    const ref = blobUrlsRef;
    return () => {
      for (const u of ref.current) URL.revokeObjectURL(u);
      ref.current = [];
    };
  }, []);

  return (
    <div
      className="markdown-reading-view"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        ref={containerRef}
        className="markdown-preview-view is-readable-line-width"
        style={{ flex: "1 1 auto", overflowY: "auto" }}
      >
        <div className="markdown-preview-sizer">
          <div className="markdown-preview-section">
            {error ? (
              <div className="message mod-error">{error}</div>
            ) : loading && !content ? (
              <div style={{ color: "var(--text-faint)" }}>{t("reading.loading")}</div>
            ) : (
              <>
                {frontmatterEntries.length > 0 && (
                  <PropertiesStrip path={path} entries={frontmatterEntries} />
                )}
                <div
                  className={`markdown-rendered ${renderedDirection}`}
                  dir={renderedDirection}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown is rendered with html disabled and then post-processed for trusted app embeds.
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function scrollToFragment(root: HTMLElement, fragment: string | null): void {
  if (!fragment) return;
  const isBlock = fragment.startsWith("^");
  const target = isBlock ? fragment.slice(1) : fragment;
  if (isBlock) {
    for (const el of root.querySelectorAll<HTMLElement>("p, li, blockquote, td, th")) {
      if (el.textContent?.trim().endsWith(`^${target}`)) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
        el.classList.add("is-flashing");
        setTimeout(() => el.classList.remove("is-flashing"), 1500);
        return;
      }
    }
  } else {
    const wanted = target.trim().toLowerCase();
    for (const el of root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")) {
      if ((el.textContent ?? "").trim().toLowerCase() === wanted) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
        el.classList.add("is-flashing");
        setTimeout(() => el.classList.remove("is-flashing"), 1500);
        return;
      }
    }
  }
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const propertiesCollapsed = new Map<string, boolean>();

function PropertiesStrip({
  path,
  entries,
}: {
  path: string;
  entries: ReadonlyArray<[string, unknown]>;
}) {
  const t = useI18n();
  const [collapsed, setCollapsedState] = useState<boolean>(
    () => propertiesCollapsed.get(path) ?? false,
  );
  useEffect(() => {
    setCollapsedState(propertiesCollapsed.get(path) ?? false);
  }, [path]);

  const setCollapsed = (next: boolean) => {
    propertiesCollapsed.set(path, next);
    setCollapsedState(next);
  };

  return (
    <div
      className={`properties-strip${collapsed ? " is-collapsed" : ""}`}
      style={{
        marginBottom: "var(--size-4-6)",
        background: "var(--background-primary-alt)",
        border: "1px solid var(--background-modifier-border)",
        borderRadius: "var(--radius-m)",
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          color: "var(--text-muted)",
          font: "inherit",
          fontSize: "var(--font-ui-smaller)",
          fontWeight: "var(--font-semibold)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "var(--size-4-2) var(--size-4-3)",
          border: 0,
          cursor: "var(--cursor)",
          height: "auto",
          boxShadow: "none",
        }}
        aria-expanded={!collapsed}
      >
        <span>{t("reading.properties.count", { count: String(entries.length) })}</span>
        <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 180px) 1fr",
            columnGap: "var(--size-4-3)",
            rowGap: "var(--size-2-3)",
            padding: "var(--size-2-3) var(--size-4-3) var(--size-4-3)",
            borderTop: "1px solid var(--background-modifier-border)",
            fontSize: "var(--font-ui-small)",
          }}
        >
          {entries.map(([key, value]) => (
            <PropertyKVPair key={key} k={key} v={value} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyKVPair({ k, v }: { k: string; v: unknown }) {
  return (
    <>
      <div
        style={{
          color: "var(--text-muted)",
          fontWeight: "var(--font-medium)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {k}
      </div>
      <div style={{ color: "var(--text-normal)", overflow: "hidden" }}>
        <PropertyValue propKey={k} value={v} />
      </div>
    </>
  );
}

function isTagKey(key: string): boolean {
  return key.toLowerCase() === "tags";
}

function dispatchSearch(query: string): void {
  window.dispatchEvent(new CustomEvent("granite:set-search-query", { detail: { query } }));
  window.dispatchEvent(
    new CustomEvent("granite:select-sidebar-tab", {
      detail: { side: "left", id: "search" },
    }),
  );
}

function PropertyValue({ propKey, value }: { propKey: string; value: unknown }) {
  if (isTagKey(propKey) && Array.isArray(value)) {
    return (
      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
        {value.map((tag) => {
          const text = String(tag);
          return (
            <a
              key={text}
              className="tag"
              href={`#${text}`}
              onClick={(e) => {
                e.preventDefault();
                dispatchSearch(`tag:${text}`);
              }}
              style={{
                cursor: "var(--cursor-link)",
                background: "var(--tag-background)",
                color: "var(--tag-color)",
                borderRadius: "var(--tag-radius)",
                padding: "var(--tag-padding-y) var(--tag-padding-x)",
                fontSize: "var(--tag-size)",
                textDecoration: "none",
              }}
            >
              #{text}
            </a>
          );
        })}
      </span>
    );
  }
  return <>{formatPropertyValue(value)}</>;
}
