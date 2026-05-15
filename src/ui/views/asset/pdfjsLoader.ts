// Lazy loader for pdf.js.
//
// pdf.js ships its own worker (~700KB). To keep the main bundle slim, we only
// import the library when a `.pdf` is opened. We configure the worker source
// via Vite's `?url` query so the worker file is emitted as an asset and
// referenced by URL — this avoids the runtime warnings pdf.js prints when the
// worker isn't configured and lets the bundler version-pin the worker.
//
// Tests use `vi.mock("pdfjs-dist")` to substitute a fake document; the
// `loadPdfjs()` factory below is therefore the single seam between the
// production lib and the test double.

export interface PdfJsModule {
  getDocument: (params: unknown) => { promise: Promise<PdfDocumentLike> };
  GlobalWorkerOptions?: { workerSrc?: string };
}

export interface PdfPageLike {
  pageNumber: number;
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render?: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
    cancel?: () => void;
  };
  cleanup?: () => void;
}

export interface PdfDocumentLike {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageLike>;
  destroy?: () => Promise<void>;
}

let cached: Promise<PdfJsModule> | null = null;

export function loadPdfjs(): Promise<PdfJsModule> {
  if (cached) return cached;
  cached = import("pdfjs-dist").then(async (mod) => {
    // Configure the worker. Use Vite's `?url` import so the worker file ships
    // as a hashed asset and is fetched at runtime (rather than bundled inline).
    // The dynamic import keeps this off the main bundle.
    if (mod.GlobalWorkerOptions && !mod.GlobalWorkerOptions.workerSrc) {
      try {
        const workerMod = (await import("pdfjs-dist/build/pdf.worker.mjs?url")) as {
          default: string;
        };
        mod.GlobalWorkerOptions.workerSrc = workerMod.default;
      } catch {
        // Test/SSR environments where the `?url` import isn't resolvable —
        // pdf.js will fall back to a same-origin worker or fake-worker mode.
      }
    }
    return mod as unknown as PdfJsModule;
  });
  return cached;
}

/** Test-only: replace the cached module loader. */
export function __setPdfjsForTests(mod: PdfJsModule | null): void {
  cached = mod ? Promise.resolve(mod) : null;
}
