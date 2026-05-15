import { ChevronDown, ChevronUp, PanelLeft, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ClickableIcon } from "../../controls/ClickableIcon";
import { useI18n } from "../../i18n/useI18n";
import { type PdfDocumentLike, type PdfPageLike, loadPdfjs } from "./pdfjsLoader";

export interface PdfViewProps {
  url: string;
  /** Optional file name for accessibility labels. */
  title?: string;
}

type FitMode = "page" | "width";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; doc: PdfDocumentLike }
  | { status: "empty" }
  | { status: "error"; message: string };

const ZOOM_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

function clampPage(value: number, total: number): number {
  if (total <= 0) return 0;
  if (value < 1) return 1;
  if (value > total) return total;
  return Math.floor(value);
}

export function PdfView({ url, title }: PdfViewProps) {
  const t = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<FitMode>("page");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);

  const total = state.status === "ready" ? state.doc.numPages : 0;

  // Load the PDF document.
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PdfDocumentLike | null = null;
    setState({ status: "loading" });
    setPage(1);
    setPageInput("1");

    void (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({ url });
        const doc = await task.promise;
        if (cancelled) {
          void doc.destroy?.();
          return;
        }
        loadedDoc = doc;
        if (doc.numPages <= 0) {
          setState({ status: "empty" });
          return;
        }
        setState({ status: "ready", doc });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error && err.message ? err.message : t("pdf.error.invalid");
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
      if (loadedDoc) void loadedDoc.destroy?.();
    };
  }, [url, t]);

  // Keep the page-input string in sync when the page changes externally.
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  // Render visible pages into canvases when document or zoom changes.
  useEffect(() => {
    if (state.status !== "ready") return;
    const doc = state.doc;
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;
    const renderedCanvases: HTMLCanvasElement[] = [];
    const pageEls: HTMLDivElement[] = [];

    // Build page placeholders up-front. The visible page is rendered eagerly;
    // the rest are rendered lazily via IntersectionObserver.
    viewer.replaceChildren();
    for (let i = 1; i <= doc.numPages; i += 1) {
      const pageEl = document.createElement("div");
      pageEl.className = "page";
      pageEl.setAttribute("data-page-number", String(i));
      const wrapper = document.createElement("div");
      wrapper.className = "canvasWrapper";
      const canvas = document.createElement("canvas");
      wrapper.appendChild(canvas);
      pageEl.appendChild(wrapper);
      const textLayer = document.createElement("div");
      textLayer.className = "textLayer";
      pageEl.appendChild(textLayer);
      const annLayer = document.createElement("div");
      annLayer.className = "annotationLayer";
      pageEl.appendChild(annLayer);
      viewer.appendChild(pageEl);
      pageEls.push(pageEl);
      renderedCanvases.push(canvas);
    }

    const renderedSet = new Set<number>();

    async function renderPage(pageNumber: number): Promise<void> {
      if (cancelled) return;
      if (renderedSet.has(pageNumber)) return;
      renderedSet.add(pageNumber);
      let pageProxy: PdfPageLike | null = null;
      try {
        pageProxy = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = pageProxy.getViewport({ scale: zoom });
        const canvas = renderedCanvases[pageNumber - 1];
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const pageEl = pageEls[pageNumber - 1];
        if (pageEl) {
          pageEl.style.width = `${Math.floor(viewport.width)}px`;
          pageEl.style.height = `${Math.floor(viewport.height)}px`;
        }
        const ctx = canvas.getContext("2d");
        if (ctx && pageProxy.render) {
          const task = pageProxy.render({ canvasContext: ctx, viewport });
          await task.promise;
        }
      } catch {
        renderedSet.delete(pageNumber);
      } finally {
        pageProxy?.cleanup?.();
      }
    }

    // Always render the current page eagerly.
    void renderPage(page);

    // Lazy-render others as they enter the viewport.
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const num = Number(
              (entry.target as HTMLElement).getAttribute("data-page-number") ?? "0",
            );
            if (num > 0) void renderPage(num);
          }
        },
        { root: viewer, rootMargin: "200px" },
      );
      for (const el of pageEls) observer.observe(el);
    } else {
      // Fallback: render everything.
      for (let i = 1; i <= doc.numPages; i += 1) void renderPage(i);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [state, zoom, page]);

  const gotoPage = useCallback(
    (next: number) => {
      setPage((current) => {
        const clamped = clampPage(next, total);
        return clamped || current;
      });
    },
    [total],
  );

  const onPageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPageInput(event.target.value);
  }, []);

  const commitPageInput = useCallback(() => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      gotoPage(parsed);
    } else {
      setPageInput(String(page));
    }
  }, [pageInput, page, gotoPage]);

  const onPageInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitPageInput();
      }
    },
    [commitPageInput],
  );

  const onZoomIn = useCallback(() => {
    setFit("page");
    setZoom((z) => ZOOM_STEPS.find((step) => step > z + 0.001) ?? ZOOM_MAX);
  }, []);

  const onZoomOut = useCallback(() => {
    setFit("page");
    setZoom((z) => {
      const reversed = [...ZOOM_STEPS].reverse();
      return reversed.find((step) => step < z - 0.001) ?? ZOOM_MIN;
    });
  }, []);

  const onFitToggle = useCallback(() => {
    setFit((prev) => (prev === "page" ? "width" : "page"));
  }, []);

  const openFindBar = useCallback(() => {
    setFindOpen(true);
    // Focus next tick so the input is mounted.
    queueMicrotask(() => findInputRef.current?.focus());
  }, []);

  const closeFindBar = useCallback(() => {
    setFindOpen(false);
  }, []);

  // Global keyboard shortcuts when focus is inside the container.
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;

      if (event.key === "Escape" && findOpen) {
        event.preventDefault();
        closeFindBar();
        return;
      }
      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        openFindBar();
        return;
      }
      if (event.key === "PageDown" && !isEditable) {
        event.preventDefault();
        gotoPage(page + 1);
        return;
      }
      if (event.key === "PageUp" && !isEditable) {
        event.preventDefault();
        gotoPage(page - 1);
      }
    },
    [findOpen, closeFindBar, openFindBar, gotoPage, page],
  );

  const containerClasses = useMemo(() => {
    const classes = ["pdf-container", "mod-themed"];
    return classes.join(" ");
  }, []);

  const contentClasses = useMemo(() => {
    const classes = ["pdf-content-container"];
    if (sidebarOpen) classes.push("sidebarOpen");
    return classes.join(" ");
  }, [sidebarOpen]);

  const toolbarClasses = useMemo(() => {
    const classes = ["pdf-toolbar"];
    if (findOpen) classes.push("findbarOpen");
    return classes.join(" ");
  }, [findOpen]);

  if (state.status === "loading") {
    return (
      <div className="asset-view mod-pdf">
        <div className={containerClasses}>
          <div className="empty-state">{t("asset.loading")}</div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="asset-view mod-pdf">
        <div className={containerClasses}>
          <div className="empty-state pdf-error" role="alert">
            {state.message || t("pdf.error.invalid")}
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="asset-view mod-pdf">
        <div className={containerClasses}>
          <div className="empty-state pdf-empty">{t("pdf.empty.noPages")}</div>
        </div>
      </div>
    );
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= total;

  return (
    <div className="asset-view mod-pdf">
      <div
        ref={containerRef}
        className={containerClasses}
        onKeyDown={onKeyDown}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: makes the viewer focusable so keyboard shortcuts work.
        tabIndex={0}
        aria-label={title}
      >
        <div className={toolbarClasses}>
          <div className="pdf-toolbar-left">
            <ClickableIcon
              icon={<PanelLeft size={16} />}
              ariaLabel={t("pdf.toolbar.toggleSidebar")}
              active={sidebarOpen}
              onClick={() => setSidebarOpen((v) => !v)}
              modifier="pdf-toolbar-sidebar-toggle"
            />
            <ClickableIcon
              icon={<ChevronUp size={16} />}
              ariaLabel={t("pdf.toolbar.prevPage")}
              onClick={() => gotoPage(page - 1)}
              disabled={prevDisabled}
              modifier="pdf-toolbar-prev"
            />
            <ClickableIcon
              icon={<ChevronDown size={16} />}
              ariaLabel={t("pdf.toolbar.nextPage")}
              onClick={() => gotoPage(page + 1)}
              disabled={nextDisabled}
              modifier="pdf-toolbar-next"
            />
          </div>
          <div className="pdf-toolbar-center">
            <div className="pdf-page-numbers">
              <input
                className="pdf-page-input"
                type="text"
                inputMode="numeric"
                value={pageInput}
                aria-label={t("pdf.toolbar.pageInputLabel")}
                onChange={onPageInputChange}
                onBlur={commitPageInput}
                onKeyDown={onPageInputKeyDown}
              />
              <span className="pdf-page-total">{t("pdf.toolbar.pageOf", { total })}</span>
            </div>
            <span className="pdf-toolbar-divider" />
          </div>
          <div className="pdf-toolbar-spacer" />
          <div className="pdf-toolbar-right">
            <ClickableIcon
              icon={<ZoomOut size={16} />}
              ariaLabel={t("pdf.toolbar.zoomOut")}
              onClick={onZoomOut}
              modifier="pdf-toolbar-zoom-out"
            />
            <ClickableIcon
              icon={<ZoomIn size={16} />}
              ariaLabel={t("pdf.toolbar.zoomIn")}
              onClick={onZoomIn}
              modifier="pdf-toolbar-zoom-in"
            />
            <ClickableIcon
              icon={<span aria-hidden>{fit === "page" ? "↕" : "↔"}</span>}
              ariaLabel={t("pdf.toolbar.fitToggle")}
              active={fit === "width"}
              onClick={onFitToggle}
              modifier="pdf-toolbar-fit"
            />
            <ClickableIcon
              icon={<Search size={16} />}
              ariaLabel={t("pdf.toolbar.toggleFind")}
              active={findOpen}
              onClick={() => (findOpen ? closeFindBar() : openFindBar())}
              modifier="pdf-toolbar-find"
            />
          </div>
        </div>
        {findOpen ? (
          <search className="pdf-findbar pdf-find-bar">
            <div className="pdf-search-wrapper">
              <input
                ref={findInputRef}
                className="pdf-find-input"
                type="search"
                placeholder={t("pdf.findbar.placeholder")}
                aria-label={t("pdf.findbar.placeholder")}
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
              />
              <span className="pdf-find-results-count" aria-live="polite" />
              <ClickableIcon
                icon={<X size={14} />}
                ariaLabel={t("pdf.findbar.close")}
                onClick={closeFindBar}
                modifier="pdf-findbar-close"
              />
            </div>
          </search>
        ) : null}
        <div className={contentClasses}>
          <div className="pdf-sidebar-container" data-view="thumbnails">
            <div className="pdf-sidebar-content-wrapper">
              <div className="pdf-sidebar-content" />
            </div>
          </div>
          <div className="pdf-sidebar-resizer" />
          <div className="pdf-viewer-container">
            <div ref={viewerRef} className="pdfViewer" />
          </div>
        </div>
      </div>
    </div>
  );
}
