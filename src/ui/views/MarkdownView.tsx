import { hideHoverPopover, showHoverPopover } from "@/ui/overlay/HoverPopover";
import { type CompletionSource, autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  codeFolding,
  defaultHighlightStyle,
  foldEffect,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  unfoldEffect,
} from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { commandRegistry } from "@core/commands/CommandRegistry";
import { markdownFileUrlLink, shouldDropExternalFileAsLink } from "@core/dnd/external-files";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { stem } from "@core/fs/path";
import { type FsError, FsNotFound } from "@core/fs/types";
import type { VaultPath } from "@core/fs/types";
import { noteDirectionFromFrontmatter } from "@core/i18n/direction";
import { isSupportedAttachmentMime, saveAttachment } from "@core/markdown/attach";
import { livePreviewDecorations } from "@core/markdown/cm-livepreview-decorations";
import { unresolvedWikilinkExtension } from "@core/markdown/cm-unresolved-wikilinks";
import {
  EXTERNAL_EDIT_SYNC_DEBOUNCE_MS,
  externalEditTouchesPath,
  shouldApplyExternalEdit,
} from "@core/markdown/external-edit";
import { parseWikilink } from "@core/markdown/renderer";
import { metadataCache } from "@core/metadata/cache";
import { useFileMetadata } from "@core/metadata/useMetadata";
import { noticeManager } from "@core/notices/notice";
import { useSettings } from "@core/settings/useSettings";
import { markClean, markDirty } from "@core/workspace/dirty";
import { collectFoldRanges, foldEffectsForRanges } from "@core/workspace/folds";
import { workspaceStore } from "@core/workspace/store";
import type { LeafId } from "@core/workspace/types";
import { vim } from "@replit/codemirror-vim";
import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { InlineTitle } from "./InlineTitle";

export interface MarkdownViewProps {
  leafId: LeafId;
  path: VaultPath;
  fragment?: string | null;
  folds?: ReadonlyArray<{ readonly from: number; readonly to: number }>;
}

const SAVE_DEBOUNCE_MS = 500;

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
type LoadState = "loading" | "loaded" | "missing" | "error";

interface ReadResult {
  content: string;
  state: LoadState;
}

async function readSafely(path: VaultPath): Promise<ReadResult> {
  try {
    const text = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(path);
      }),
    );
    return { content: text, state: "loaded" };
  } catch (err) {
    const e = (err as { _tag?: string; error?: unknown })?.error ?? err;
    const tag = (e as { _tag?: string })?._tag;
    if (tag === "FsNotFound") return { content: "", state: "missing" };
    if (e instanceof FsNotFound) return { content: "", state: "missing" };
    return { content: "", state: "error" };
  }
}

declare global {
  interface WindowEventMap {
    "granite:goto-line": CustomEvent<{ path: string; line: number }>;
    "granite:insert-text": CustomEvent<{ path: string; text: string }>;
    "granite:get-active-selection": CustomEvent<{ requestId: string }>;
    "granite:active-selection-response": CustomEvent<{
      requestId: string;
      path: string;
      selection: string;
      from: number;
      to: number;
    }>;
    "granite:replace-selection": CustomEvent<{
      path: string;
      from: number;
      to: number;
      replacement: string;
    }>;
    "granite:insert-block-id": CustomEvent<{ path: string }>;
  }
}

export function MarkdownView({ leafId, path, fragment, folds }: MarkdownViewProps) {
  const t = useI18n();
  const settings = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [readError, setReadError] = useState<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowSaveRef = useRef(false);
  const attachmentListenersRef = useRef<(() => void) | null>(null);
  const initialFoldsRef = useRef(folds);
  const fileMeta = useFileMetadata(path);
  const noteDirection = noteDirectionFromFrontmatter(fileMeta?.frontmatter);

  useEffect(() => {
    initialFoldsRef.current = folds;
  }, [folds]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setStatus("idle");
    setLoadState("loading");
    setReadError(null);
    allowSaveRef.current = false;
    let externalWatchCleanup: (() => void) | null = null;
    let externalWatchTimer: ReturnType<typeof setTimeout> | null = null;

    const applyExternalContent = async () => {
      const view = editorRef.current;
      if (!view || cancelled) return;
      const result = await readSafely(path);
      if (cancelled || result.state === "error") return;
      if (result.state === "missing") {
        setLoadState("missing");
        return;
      }
      const current = view.state.doc.toString();
      if (!shouldApplyExternalEdit(current, lastSavedRef.current, result.content)) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: result.content },
      });
      lastSavedRef.current = result.content;
      setLoadState("loaded");
      setStatus("saved");
      markClean(path);
    };

    const scheduleExternalRefresh = () => {
      if (externalWatchTimer) clearTimeout(externalWatchTimer);
      externalWatchTimer = setTimeout(() => {
        void applyExternalContent();
      }, EXTERNAL_EDIT_SYNC_DEBOUNCE_MS);
    };

    const init = async () => {
      const result = await readSafely(path);
      if (cancelled) return;

      if (result.state === "error") {
        setLoadState("error");
        setReadError(t("markdown.error.readSaveDisabled"));
        return;
      }

      lastSavedRef.current = result.content;
      setLoadState(result.state);
      allowSaveRef.current = true;

      const extensions = [
        history(),
        EditorState.allowMultipleSelections.of(true),
        drawSelection({ drawRangeCursor: true }),
        rectangularSelection(),
        crosshairCursor(),
        codeFolding(),
        foldGutter(),
        indentOnInput(),
        search({ top: true }),
        settings.showLineNumbers ? lineNumbers() : [],
        settings.autoPairBrackets ? closeBrackets() : [],
        autocompletion({
          override: [slashCommandSource, wikilinkCompletionSource, tagCompletionSource],
          activateOnTyping: true,
          closeOnBlur: true,
          icons: false,
        }),
        unresolvedWikilinkExtension,
        settings.livePreview ? livePreviewDecorations : [],
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage }),
        EditorView.lineWrapping,
        EditorView.theme(
          {
            "&": {
              height: "100%",
              fontSize: "var(--font-text-size)",
              fontFamily: "var(--font-text)",
              color: "var(--text-normal)",
              backgroundColor: "var(--background-primary)",
            },
            ".cm-scroller": {
              lineHeight: "var(--line-height-normal)",
              fontFamily: "inherit",
              padding: "var(--size-4-3) var(--size-4-8) var(--size-4-8)",
            },
            ".cm-content": {
              caretColor: "var(--caret-color)",
              maxWidth: settings.readableLineWidth ? "var(--file-line-width)" : "none",
              marginInline: "auto",
              width: "100%",
            },
            ".cm-cursor, .cm-dropCursor": {
              borderLeftColor: "var(--caret-color)",
            },
            "&.cm-focused .cm-selectionBackground, ::selection": {
              backgroundColor: "var(--text-selection)",
            },
            ".cm-gutters": {
              backgroundColor: "transparent",
              color: "var(--text-faint)",
              border: "none",
            },
            ".cm-panels": {
              backgroundColor: "var(--background-secondary)",
              color: "var(--text-normal)",
              borderColor: "var(--background-modifier-border)",
            },
            ".cm-panels.cm-panels-top": {
              borderBottom: "1px solid var(--background-modifier-border)",
            },
          },
          { dark: document.body.classList.contains("theme-dark") },
        ),
        settings.editorKeymap === "vim" ? vim({ status: true }) : [],
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap]),
        EditorView.updateListener.of((update) => {
          if (
            update.transactions.some((tr) =>
              tr.effects.some((effect) => effect.is(foldEffect) || effect.is(unfoldEffect)),
            )
          ) {
            workspaceStore.setMarkdownFolds(leafId, collectFoldRanges(update.state));
          }
          if (!update.docChanged) return;
          const docText = update.state.doc.toString();
          if (docText === lastSavedRef.current) {
            setStatus("saved");
            markClean(path);
            return;
          }
          setStatus("dirty");
          markDirty(path);
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            save(docText);
          }, SAVE_DEBOUNCE_MS);
        }),
      ];

      const state = EditorState.create({
        doc: result.content,
        extensions,
      });

      const parent = containerRef.current;
      if (!parent) return;
      const view = new EditorView({
        state,
        parent,
      });
      editorRef.current = view;
      const restoreFoldEffects = foldEffectsForRanges(
        initialFoldsRef.current,
        view.state.doc.length,
      );
      if (restoreFoldEffects.length > 0) {
        view.dispatch({ effects: restoreFoldEffects });
      }
      view.contentDOM.spellcheck = settings.spellcheck;

      const cleanupExternalWatch = await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return fs.watch((event) => {
            if (externalEditTouchesPath(event, path)) scheduleExternalRefresh();
          });
        }),
      );
      if (cancelled) {
        cleanupExternalWatch();
        return;
      }
      externalWatchCleanup = cleanupExternalWatch;

      const insertAttachment = async (bytes: Uint8Array, mime: string, nameHint?: string) => {
        try {
          const savedPath = await saveAttachment(bytes, mime, nameHint);
          const insert = `![[${savedPath}]]`;
          const sel = view.state.selection.main;
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert },
            selection: { anchor: sel.from + insert.length },
          });
        } catch (err) {
          noticeManager.show(err instanceof Error ? err.message : t("markdown.error.attachment"), {
            kind: "error",
          });
        }
      };

      const insertTextAtSelection = (insert: string) => {
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert },
          selection: { anchor: sel.from + insert.length },
        });
      };

      const onPaste = async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const consumed: Array<File> = [];
        for (const item of items) {
          if (item.kind !== "file") continue;
          const file = item.getAsFile();
          if (!file) continue;
          if (!isSupportedAttachmentMime(file.type)) continue;
          consumed.push(file);
        }
        if (consumed.length === 0) return;
        e.preventDefault();
        for (const file of consumed) {
          const buf = new Uint8Array(await file.arrayBuffer());
          await insertAttachment(buf, file.type, file.name);
        }
      };

      const onDrop = async (e: DragEvent) => {
        const vaultPath = e.dataTransfer?.getData("application/granite-vault-path");
        if (vaultPath) {
          e.preventDefault();
          const lowercase = vaultPath.toLowerCase();
          const isMd = lowercase.endsWith(".md");
          const isMedia =
            /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|mp3|wav|ogg|m4a|opus|flac|mp4|mov|webm|ogv|pdf)$/i.test(
              vaultPath,
            );
          let insert: string;
          if (isMd) {
            const fileStem = vaultPath.split("/").pop()?.replace(/\.md$/i, "") ?? vaultPath;
            insert = `[[${fileStem}]]`;
          } else if (isMedia) {
            insert = `![[${vaultPath}]]`;
          } else {
            const display = vaultPath.split("/").pop() ?? vaultPath;
            insert = `[${display}](${encodeURI(vaultPath)})`;
          }
          const sel = view.state.selection.main;
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert },
            selection: { anchor: sel.from + insert.length },
          });
          return;
        }
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;
        const droppedFiles = [...files];
        if (shouldDropExternalFileAsLink(e)) {
          const links = droppedFiles
            .map((file) => markdownFileUrlLink(file))
            .filter((link): link is string => link !== null);
          e.preventDefault();
          if (links.length === 0) {
            noticeManager.show(t("markdown.drop.pathsUnavailable"), {
              kind: "warning",
            });
            return;
          }
          insertTextAtSelection(links.join("\n"));
          if (links.length < droppedFiles.length) {
            noticeManager.show(t("markdown.drop.somePathsUnavailable"), {
              kind: "warning",
            });
          }
          return;
        }
        const accepted: File[] = [];
        for (const file of droppedFiles) {
          if (!isSupportedAttachmentMime(file.type)) continue;
          accepted.push(file);
        }
        if (accepted.length === 0) return;
        e.preventDefault();
        for (const file of accepted) {
          const buf = new Uint8Array(await file.arrayBuffer());
          await insertAttachment(buf, file.type, file.name);
        }
      };

      const onPasteSync = (ev: Event) => void onPaste(ev as ClipboardEvent);
      const onDropSync = (ev: Event) => void onDrop(ev as DragEvent);

      view.contentDOM.addEventListener("paste", onPasteSync);
      view.contentDOM.addEventListener("drop", onDropSync);

      // Hover popover for `[[wikilink]]` in the source editor.
      let openTimer: ReturnType<typeof setTimeout> | null = null;
      let hoveredRange: { start: number; end: number } | null = null;
      const onEditorMouseOver = (ev: MouseEvent) => {
        const pos = view.posAtCoords({ x: ev.clientX, y: ev.clientY });
        if (pos === null) return;
        const text = view.state.doc.toString();
        let inner = pos;
        while (inner > 0 && text.slice(inner - 2, inner) !== "[[" && text[inner - 1] !== "\n") {
          inner -= 1;
        }
        const insideOpen = text.slice(inner - 2, inner) === "[[";
        if (insideOpen) {
          let end = pos;
          while (end < text.length && text.slice(end, end + 2) !== "]]" && text[end] !== "\n") {
            end += 1;
          }
          if (text.slice(end, end + 2) === "]]") {
            const fullStart = inner - 2;
            const fullEnd = end + 2;
            if (hoveredRange && hoveredRange.start === fullStart && hoveredRange.end === fullEnd) {
              return;
            }
            hoveredRange = { start: fullStart, end: fullEnd };
            const parts = parseWikilink(text.slice(inner, end));
            if (!parts.target) {
              if (openTimer) clearTimeout(openTimer);
              openTimer = null;
              hideHoverPopover();
              return;
            }
            const targetPath = parts.target.endsWith(".md") ? parts.target : `${parts.target}.md`;
            const fragment = parts.heading ? parts.heading : parts.block ? `^${parts.block}` : null;
            if (openTimer) clearTimeout(openTimer);
            openTimer = setTimeout(() => {
              if (!hoveredRange || hoveredRange.start !== fullStart) return;
              const coords = view.coordsAtPos(fullStart);
              const x = coords?.left ?? ev.clientX;
              const y = (coords?.bottom ?? ev.clientY) + 6;
              showHoverPopover({ path: targetPath, fragment, x, y });
            }, 300);
            return;
          }
        }

        const lineObj = view.state.doc.lineAt(pos);
        const local = pos - lineObj.from;
        const linkRe = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
        let mdMatch: RegExpExecArray | null = linkRe.exec(lineObj.text);
        let chosen: { start: number; end: number; href: string } | null = null;
        while (mdMatch) {
          const start = mdMatch.index;
          const end = start + mdMatch[0].length;
          if (local >= start && local <= end) {
            const href = mdMatch[2]?.trim();
            if (href) chosen = { start, end, href };
            break;
          }
          mdMatch = linkRe.exec(lineObj.text);
        }
        if (!chosen) {
          if (hoveredRange || openTimer) {
            if (openTimer) clearTimeout(openTimer);
            openTimer = null;
            hoveredRange = null;
            hideHoverPopover();
          }
          return;
        }
        const href = chosen.href;
        if (
          !href ||
          /^[a-z][a-z0-9+.-]*:/i.test(href) ||
          href.startsWith("//") ||
          href.startsWith("#")
        ) {
          if (hoveredRange || openTimer) {
            if (openTimer) clearTimeout(openTimer);
            openTimer = null;
            hoveredRange = null;
            hideHoverPopover();
          }
          return;
        }
        const fullStartMd = lineObj.from + chosen.start;
        const fullEndMd = lineObj.from + chosen.end;
        if (hoveredRange && hoveredRange.start === fullStartMd && hoveredRange.end === fullEndMd) {
          return;
        }
        hoveredRange = { start: fullStartMd, end: fullEndMd };
        const hashIdx = href.indexOf("#");
        const pathPart = hashIdx === -1 ? href : href.slice(0, hashIdx);
        const fragmentPart = hashIdx === -1 ? null : href.slice(hashIdx + 1);
        let decoded = pathPart;
        try {
          decoded = decodeURIComponent(pathPart);
        } catch {
          /* fall through */
        }
        const targetMd = decoded.endsWith(".md") ? decoded : `${decoded}.md`;
        if (openTimer) clearTimeout(openTimer);
        openTimer = setTimeout(() => {
          if (!hoveredRange || hoveredRange.start !== fullStartMd) return;
          const coords = view.coordsAtPos(fullStartMd);
          const x = coords?.left ?? ev.clientX;
          const y = (coords?.bottom ?? ev.clientY) + 6;
          showHoverPopover({ path: targetMd, fragment: fragmentPart, x, y });
        }, 300);
      };
      const onEditorMouseOut = (ev: MouseEvent) => {
        const related = ev.relatedTarget as Node | null;
        if (related && view.contentDOM.contains(related)) return;
        if (openTimer) {
          clearTimeout(openTimer);
          openTimer = null;
        }
        hoveredRange = null;
        hideHoverPopover();
      };
      view.contentDOM.addEventListener("mouseover", onEditorMouseOver);
      view.contentDOM.addEventListener("mouseout", onEditorMouseOut);

      const onEditorClick = (ev: MouseEvent) => {
        if (!(ev.metaKey || ev.ctrlKey)) return;
        const pos = view.posAtCoords({ x: ev.clientX, y: ev.clientY });
        if (pos === null) return;
        const text = view.state.doc.toString();

        // 1) Wikilink under cursor.
        let inner = pos;
        while (inner > 0 && text.slice(inner - 2, inner) !== "[[" && text[inner - 1] !== "\n") {
          inner -= 1;
        }
        if (text.slice(inner - 2, inner) === "[[") {
          let end = pos;
          while (end < text.length && text.slice(end, end + 2) !== "]]" && text[end] !== "\n") {
            end += 1;
          }
          if (text.slice(end, end + 2) === "]]") {
            const parts = parseWikilink(text.slice(inner, end));
            if (parts.target) {
              ev.preventDefault();
              const targetPath = parts.target.endsWith(".md") ? parts.target : `${parts.target}.md`;
              const fragment = parts.heading
                ? parts.heading
                : parts.block
                  ? `^${parts.block}`
                  : null;
              hideHoverPopover(true);
              workspaceStore.openFile(targetPath, {
                newTab: ev.shiftKey,
                ...(fragment ? { fragment } : {}),
              });
              return;
            }
          }
        }

        // 2) Markdown-form link `[text](path)` under cursor.
        const lineObj = view.state.doc.lineAt(pos);
        const lineStart = lineObj.from;
        const lineText = lineObj.text;
        const local = pos - lineStart;
        const linkRe = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
        let mdMatch: RegExpExecArray | null = linkRe.exec(lineText);
        while (mdMatch) {
          const start = mdMatch.index;
          const end = start + mdMatch[0].length;
          if (local >= start && local <= end) {
            const hrefRaw = mdMatch[2]?.trim();
            if (!hrefRaw) break;
            if (
              /^[a-z][a-z0-9+.-]*:/i.test(hrefRaw) ||
              hrefRaw.startsWith("//") ||
              hrefRaw.startsWith("#")
            ) {
              return;
            }
            const hashIdx = hrefRaw.indexOf("#");
            const pathPart = hashIdx === -1 ? hrefRaw : hrefRaw.slice(0, hashIdx);
            const fragmentPart = hashIdx === -1 ? null : hrefRaw.slice(hashIdx + 1);
            let decoded: string;
            try {
              decoded = decodeURIComponent(pathPart);
            } catch {
              decoded = pathPart;
            }
            const target = decoded.endsWith(".md") ? decoded : `${decoded}.md`;
            ev.preventDefault();
            hideHoverPopover(true);
            workspaceStore.openFile(target, {
              newTab: ev.shiftKey,
              ...(fragmentPart ? { fragment: fragmentPart } : {}),
            });
            return;
          }
          mdMatch = linkRe.exec(lineText);
        }
      };
      view.contentDOM.addEventListener("click", onEditorClick);

      attachmentListenersRef.current = () => {
        view.contentDOM.removeEventListener("paste", onPasteSync);
        view.contentDOM.removeEventListener("drop", onDropSync);
        if (openTimer) clearTimeout(openTimer);
        view.contentDOM.removeEventListener("mouseover", onEditorMouseOver);
        view.contentDOM.removeEventListener("mouseout", onEditorMouseOut);
        view.contentDOM.removeEventListener("click", onEditorClick);
      };
    };

    void init();

    const save = async (content: string) => {
      if (!allowSaveRef.current) return;
      setStatus("saving");
      try {
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            yield* fs.writeText(path, content);
          }),
        );
        lastSavedRef.current = content;
        setStatus("saved");
        markClean(path);
      } catch {
        setStatus("error");
      }
    };

    const onSaveHotkey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (editorRef.current) save(editorRef.current.state.doc.toString());
      }
    };
    document.addEventListener("keydown", onSaveHotkey);

    const onGotoLine = (e: CustomEvent<{ path: string; line: number }>) => {
      if (e.detail.path !== path) return;
      const view = editorRef.current;
      if (!view) return;
      const lineN = Math.max(1, Math.min(view.state.doc.lines, e.detail.line + 1));
      const ln = view.state.doc.line(lineN);
      view.dispatch({
        selection: { anchor: ln.from, head: ln.from },
        effects: EditorView.scrollIntoView(ln.from, { y: "start" }),
      });
      view.focus();
    };
    window.addEventListener("granite:goto-line", onGotoLine);

    const onInsertText = (e: CustomEvent<{ path: string; text: string }>) => {
      if (e.detail.path !== path) return;
      const view = editorRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: e.detail.text },
        selection: { anchor: sel.from + e.detail.text.length },
      });
      view.focus();
    };
    window.addEventListener("granite:insert-text", onInsertText);

    const onGetSelection = (e: CustomEvent<{ requestId: string }>) => {
      const view = editorRef.current;
      if (!view) return;
      // Only respond if our editor is the focused one (heuristic: container has
      // focus-within).
      const root = containerRef.current;
      if (!root || !root.contains(document.activeElement)) return;
      const sel = view.state.selection.main;
      const text = view.state.sliceDoc(sel.from, sel.to);
      window.dispatchEvent(
        new CustomEvent("granite:active-selection-response", {
          detail: {
            requestId: e.detail.requestId,
            path,
            selection: text,
            from: sel.from,
            to: sel.to,
          },
        }),
      );
    };
    window.addEventListener("granite:get-active-selection", onGetSelection);

    const onReplaceSelection = (
      e: CustomEvent<{ path: string; from: number; to: number; replacement: string }>,
    ) => {
      if (e.detail.path !== path) return;
      const view = editorRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: e.detail.from, to: e.detail.to, insert: e.detail.replacement },
        selection: { anchor: e.detail.from + e.detail.replacement.length },
      });
    };
    window.addEventListener("granite:replace-selection", onReplaceSelection);

    const onInsertBlockId = (e: CustomEvent<{ path: string }>) => {
      if (e.detail.path !== path) return;
      const view = editorRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      const lineObj = view.state.doc.lineAt(sel.from);
      const fileStem = stem(path);
      const existingMatch = lineObj.text.match(/\s\^([a-zA-Z0-9-]+)\s*$/);
      if (existingMatch) {
        void navigator.clipboard.writeText(`[[${fileStem}#^${existingMatch[1]}]]`).catch(() => {});
        return;
      }
      const buf = new Uint8Array(4);
      crypto.getRandomValues(buf);
      const id = [...buf]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 6);
      const lineText = lineObj.text;
      const trimEnd = lineText.replace(/\s+$/, "");
      const insertion = `${trimEnd ? " " : ""}^${id}`;
      view.dispatch({
        changes: { from: lineObj.from + trimEnd.length, to: lineObj.to, insert: insertion },
        selection: { anchor: lineObj.from + trimEnd.length + insertion.length },
      });
      void navigator.clipboard.writeText(`[[${fileStem}#^${id}]]`).catch(() => {});
    };
    window.addEventListener("granite:insert-block-id", onInsertBlockId);

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onSaveHotkey);
      window.removeEventListener("granite:goto-line", onGotoLine);
      window.removeEventListener("granite:insert-text", onInsertText);
      window.removeEventListener("granite:get-active-selection", onGetSelection);
      window.removeEventListener("granite:replace-selection", onReplaceSelection);
      window.removeEventListener("granite:insert-block-id", onInsertBlockId);
      attachmentListenersRef.current?.();
      attachmentListenersRef.current = null;
      externalWatchCleanup?.();
      if (externalWatchTimer) clearTimeout(externalWatchTimer);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (editorRef.current && allowSaveRef.current) {
        const docText = editorRef.current.state.doc.toString();
        if (docText !== lastSavedRef.current) {
          void run(
            Effect.gen(function* () {
              const fs = yield* FileSystem;
              yield* fs.writeText(path, docText);
            }),
          );
        }
      }
      markClean(path);
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [
    leafId,
    path,
    settings.showLineNumbers,
    settings.autoPairBrackets,
    settings.readableLineWidth,
    settings.spellcheck,
    settings.livePreview,
    settings.editorKeymap,
    t,
  ]);

  useEffect(() => {
    if (!fragment || loadState !== "loaded") return;
    const id = setTimeout(async () => {
      const meta = metadataCache.getMetadata(path) ?? (await metadataCache.ensure(path));
      if (!meta) return;
      const isBlock = fragment.startsWith("^");
      const target = isBlock ? fragment.slice(1) : fragment;
      let line: number | null = null;
      if (isBlock) {
        const blk = meta.blocks.find((b) => b.id === target);
        line = blk?.line ?? null;
      } else {
        const wanted = target.trim().toLowerCase();
        const h = meta.headings.find((heading) => heading.text.trim().toLowerCase() === wanted);
        line = h?.line ?? null;
      }
      if (line === null) return;
      window.dispatchEvent(
        new CustomEvent("granite:goto-line", {
          detail: { path, line },
        }),
      );
    }, 50);
    return () => clearTimeout(id);
  }, [fragment, path, loadState]);

  return (
    <div className="markdown-view-container">
      {loadState === "error" && (
        <div className="message mod-error">{readError ?? t("markdown.error.read")}</div>
      )}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            padding: "var(--size-4-6) var(--size-4-8) 0",
            maxWidth: settings.readableLineWidth ? "var(--file-line-width)" : "none",
            margin: "0 auto",
            width: "100%",
            display: "var(--inline-title-display, block)",
          }}
        >
          <InlineTitle path={path} />
        </div>
        <div
          ref={containerRef}
          className={`cm-host markdown-source-view mod-cm6${settings.livePreview ? " is-live-preview" : ""}${noteDirection ? ` ${noteDirection}` : ""}`}
          dir={noteDirection ?? undefined}
          style={{
            display: loadState === "loaded" || loadState === "missing" ? "block" : "none",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "auto",
          }}
        />
      </div>
      <div className={`save-status save-status-${status}`} aria-live="polite">
        {status === "saving"
          ? t("markdown.status.saving")
          : status === "saved"
            ? t("markdown.status.saved")
            : status === "dirty"
              ? t("markdown.status.editing")
              : status === "error"
                ? t("markdown.status.saveFailed")
                : ""}
      </div>
    </div>
  );
}

export type { FsError };

const slashCommandSource: CompletionSource = (context) => {
  const before = context.matchBefore(/\/[\w-]*$/);
  if (!before) return null;
  if (before.from === before.to && !context.explicit) return null;
  const lineStart = context.state.doc.lineAt(before.from).from;
  const before_ = context.state.sliceDoc(lineStart, before.from);
  if (!/^\s*$/.test(before_)) return null;

  const commands = commandRegistry.list();
  return {
    from: before.from,
    options: commands.map((cmd) => ({
      label: cmd.name,
      detail: cmd.category ?? "",
      type: "function",
      apply: (view, _completion, from, to) => {
        view.dispatch({
          changes: { from, to, insert: "" },
          selection: { anchor: from },
        });
        setTimeout(() => void commandRegistry.run(cmd.id), 0);
      },
    })),
  };
};

/** CodeMirror completion source for wikilinks. Triggers when the user types
 *  `[[` (optionally followed by a query). Selecting an entry inserts a fully
 *  closed `[[Target]]` (or `[[Target|Alias]]`) and consumes the auto-closed
 *  `]]` if present. */
const wikilinkCompletionSource: CompletionSource = (context) => {
  const before = context.matchBefore(/\[\[([^[\]\n]*)$/);
  if (!before) return null;
  if (before.from === before.to && !context.explicit) return null;

  const after = context.state.sliceDoc(before.to, before.to + 2);
  const consumeTrailing = after === "]]" ? 2 : 0;

  const innerText = context.state.sliceDoc(before.from + 2, before.to);

  if (innerText.startsWith("##")) {
    const query = innerText.slice(2).toLowerCase();
    const headings = metadataCache.getAllHeadings();
    const filtered = query
      ? headings.filter((h) => h.text.toLowerCase().includes(query))
      : headings;
    return {
      from: before.from,
      options: filtered.slice(0, 100).map((h) => ({
        label: `## ${h.text}`,
        detail: stem(h.path),
        type: "namespace",
        apply: (view, _completion, from, to) => {
          const insert = `[[${stem(h.path)}#${h.text}]]`;
          const replaceTo = to + consumeTrailing;
          view.dispatch({
            changes: { from, to: replaceTo, insert },
            selection: { anchor: from + insert.length },
          });
        },
      })),
    };
  }

  if (innerText.startsWith("^^")) {
    const query = innerText.slice(2).toLowerCase();
    const blocks = metadataCache.getAllBlocks();
    const filtered = query ? blocks.filter((b) => b.id.toLowerCase().includes(query)) : blocks;
    return {
      from: before.from,
      options: filtered.slice(0, 100).map((b) => ({
        label: `^${b.id}`,
        detail: stem(b.path),
        type: "namespace",
        apply: (view, _completion, from, to) => {
          const insert = `[[${stem(b.path)}#^${b.id}]]`;
          const replaceTo = to + consumeTrailing;
          view.dispatch({
            changes: { from, to: replaceTo, insert },
            selection: { anchor: from + insert.length },
          });
        },
      })),
    };
  }

  const entries = metadataCache.getAllSwitcherEntries();
  return {
    from: before.from,
    options: entries.map((entry) => {
      const targetStem = stem(entry.path);
      const linkBody = entry.alias ? `${targetStem}|${entry.alias}` : targetStem;
      return {
        label: entry.displayName,
        detail: entry.alias ? `alias for ${targetStem}` : entry.path,
        type: entry.alias ? "variable" : "text",
        apply: (view, _completion, from, to) => {
          const insert = `[[${linkBody}]]`;
          const replaceTo = to + consumeTrailing;
          view.dispatch({
            changes: { from, to: replaceTo, insert },
            selection: { anchor: from + insert.length },
          });
        },
      };
    }),
  };
};

const tagCompletionSource: CompletionSource = (context) => {
  const before = context.matchBefore(/(^|[\s(\[])#([\p{L}\p{N}_/-]*)$/u);
  if (!before) return null;
  if (before.from === before.to && !context.explicit) return null;
  const matchText = context.state.sliceDoc(before.from, before.to);
  const hashIdx = matchText.indexOf("#");
  if (hashIdx === -1) return null;
  const triggerFrom = before.from + hashIdx;

  // Skip when inside a fenced code block: count `\n```` runs at line starts
  // before the trigger; odd → we're inside a fence.
  const beforeCursor = context.state.sliceDoc(0, triggerFrom);
  const fenceCount = (beforeCursor.match(/(^|\n)```/g) ?? []).length;
  if (fenceCount % 2 === 1) return null;

  // Skip when inside an inline-code span. Cheap heuristic: count every
  // backtick on the current line before the trigger; odd → cursor sits
  // inside an inline-code span. Escaped backticks are not handled because
  // they're rare inside markdown body text.
  const lineStart = context.state.doc.lineAt(triggerFrom).from;
  const lineHead = context.state.sliceDoc(lineStart, triggerFrom);
  const inlineTicks = (lineHead.match(/`/g) ?? []).length;
  if (inlineTicks % 2 === 1) return null;

  const query = matchText.slice(hashIdx + 1).toLowerCase();

  const all = metadataCache.getAllTags();
  const filtered = query ? all.filter((t) => t.name.toLowerCase().includes(query)) : all;
  if (filtered.length === 0) return null;
  return {
    from: triggerFrom,
    options: filtered.slice(0, 100).map((t) => ({
      label: `#${t.name}`,
      detail: `${t.count} note${t.count === 1 ? "" : "s"}`,
      type: "keyword",
      apply: (view, _completion, from, to) => {
        const insert = `#${t.name}`;
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        });
      },
    })),
  };
};
