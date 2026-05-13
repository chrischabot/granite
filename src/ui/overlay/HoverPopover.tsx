import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { stem } from "@core/fs/path";
import { renderMarkdown } from "@core/markdown/renderer";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/useI18n";

export interface HoverPopoverRequest {
  /** Vault path to preview (with `.md` extension). */
  path: string;
  /** Heading or block fragment (without leading `#` or `^`). */
  fragment: string | null;
  /** Page coordinates of the popover top-left. */
  x: number;
  y: number;
}

/** Resolver result: just identifies the link target. The helper supplies coords. */
export interface HoverLinkTarget {
  path: string;
  fragment: string | null;
}

const HIDE_DELAY_MS = 200;
const OPEN_DELAY_MS = 300;
const MAX_PREVIEW_LINES = 40;

let listeners: Array<(req: HoverPopoverRequest | null) => void> = [];
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showHoverPopover(req: HoverPopoverRequest): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  for (const cb of listeners) cb(req);
}

export function hideHoverPopover(immediate = false): void {
  if (hideTimer) clearTimeout(hideTimer);
  if (immediate) {
    for (const cb of listeners) cb(null);
    return;
  }
  hideTimer = setTimeout(() => {
    for (const cb of listeners) cb(null);
    hideTimer = null;
  }, HIDE_DELAY_MS);
}

export function HoverPopoverHost() {
  const [req, setReq] = useState<HoverPopoverRequest | null>(null);

  useEffect(() => {
    const handler = (next: HoverPopoverRequest | null) => setReq(next);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((h) => h !== handler);
    };
  }, []);

  if (!req) return null;
  return <HoverPopover request={req} onClose={() => setReq(null)} />;
}

interface HoverPopoverProps {
  request: HoverPopoverRequest;
  onClose: () => void;
}

function HoverPopover({ request, onClose }: HoverPopoverProps) {
  const t = useI18n();
  const { path, fragment, x, y } = request;
  const [content, setContent] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setMissing(false);
    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(path);
      }),
    )
      .then((text) => {
        if (cancelled) return;
        const lines = text.split("\n");
        let preview = lines.slice(0, MAX_PREVIEW_LINES).join("\n");
        if (lines.length > MAX_PREVIEW_LINES) preview += "\n…";
        setContent(preview);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const html = useMemo(() => {
    if (!content) return "";
    return renderMarkdown(content);
  }, [content]);

  const POP_W = 360;
  const POP_H = 280;
  const margin = 12;
  const maxX = window.innerWidth - POP_W - margin;
  const maxY = window.innerHeight - POP_H - margin;
  const clampedX = Math.max(margin, Math.min(maxX, x));
  const clampedY = Math.max(margin, Math.min(maxY, y));

  return createPortal(
    <div
      ref={popoverRef}
      className="popover hover-popover"
      style={{
        position: "fixed",
        top: clampedY,
        left: clampedX,
        width: POP_W,
        maxHeight: POP_H,
        zIndex: 30,
        background: "var(--background-primary)",
        border: "1px solid var(--background-modifier-border-focus)",
        borderRadius: "var(--radius-m)",
        boxShadow: "var(--shadow-l)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={() => {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
      }}
      onMouseLeave={() => hideHoverPopover()}
    >
      <button
        type="button"
        style={{
          width: "100%",
          padding: "var(--size-2-2) var(--size-4-3)",
          fontSize: "var(--font-ui-smaller)",
          color: "var(--text-muted)",
          background: "var(--background-secondary)",
          border: 0,
          borderBottom: "1px solid var(--background-modifier-border)",
          cursor: "var(--cursor-link)",
          userSelect: "none",
          textAlign: "left",
        }}
        onClick={() => {
          workspaceStore.openFile(path, {
            ...(fragment ? { fragment } : {}),
          });
          hideHoverPopover(true);
          onClose();
        }}
      >
        {stem(path)}
        {fragment && <span style={{ color: "var(--text-faint)" }}> · {fragment}</span>}
      </button>
      <div
        className="markdown-preview-view markdown-rendered"
        style={{
          flex: "1 1 auto",
          overflowY: "auto",
          padding: "var(--size-4-3) var(--size-4-4)",
          fontSize: "var(--font-text-size)",
          lineHeight: "var(--line-height-normal)",
        }}
      >
        {missing ? (
          <div style={{ color: "var(--text-faint)", fontStyle: "italic" }}>
            {t("hoverPopover.fileNotFound")}
          </div>
        ) : !content ? (
          <div style={{ color: "var(--text-faint)" }}>{t("hoverPopover.loading")}</div>
        ) : (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: renderMarkdown sanitizes Markdown output before preview injection.
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Install hover listeners on a root element. The resolver returns only the
 * link target (path + fragment). The helper computes coordinates from the
 * hovered element's bounding rectangle and positions the popover just below.
 */
export function attachHoverPopoverListeners(
  root: HTMLElement,
  resolver: (el: HTMLElement) => HoverLinkTarget | null,
  selector: string,
): () => void {
  let triggerEl: HTMLElement | null = null;
  let openTimer: ReturnType<typeof setTimeout> | null = null;

  const onOver = (e: MouseEvent) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(selector);
    if (!target || !root.contains(target)) return;
    triggerEl = target;
    if (openTimer) clearTimeout(openTimer);
    openTimer = setTimeout(() => {
      if (triggerEl !== target) return;
      const link = resolver(target);
      if (!link) return;
      const rect = target.getBoundingClientRect();
      showHoverPopover({
        path: link.path,
        fragment: link.fragment,
        x: rect.left,
        y: rect.bottom + 6,
      });
    }, OPEN_DELAY_MS);
  };

  const onOut = (e: MouseEvent) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(selector);
    if (!target) return;
    const related = e.relatedTarget as Node | null;
    if (related && target.contains(related)) return;
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    triggerEl = null;
    hideHoverPopover();
  };

  root.addEventListener("mouseover", onOver);
  root.addEventListener("mouseout", onOut);
  return () => {
    if (openTimer) clearTimeout(openTimer);
    root.removeEventListener("mouseover", onOver);
    root.removeEventListener("mouseout", onOut);
  };
}
