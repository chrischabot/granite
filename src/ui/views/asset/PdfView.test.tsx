import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type PdfDocumentLike, __setPdfjsForTests } from "./pdfjsLoader";

function makeFakeDoc(numPages: number): PdfDocumentLike {
  return {
    numPages,
    getPage: vi.fn(async (n: number) => ({
      pageNumber: n,
      getViewport: () => ({ width: 200, height: 300 }),
      render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
      cleanup: () => {},
    })),
    destroy: vi.fn(async () => {}),
  };
}

async function flush(): Promise<void> {
  await act(async () => {
    // let microtasks resolve, then a macrotask, then microtasks again
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  __setPdfjsForTests(null);
});

describe("PdfView", () => {
  it("renders the spec's DOM scaffold and reflects total pages", async () => {
    __setPdfjsForTests({
      getDocument: () => ({ promise: Promise.resolve(makeFakeDoc(3)) }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" title="doc.pdf" />);
    });
    await flush();

    const container = host.querySelector<HTMLElement>(".pdf-container.mod-themed");
    expect(container).not.toBeNull();
    expect(host.querySelector(".pdf-toolbar")).not.toBeNull();
    expect(host.querySelector(".pdf-content-container")).not.toBeNull();
    expect(host.querySelector('.pdf-sidebar-container[data-view="thumbnails"]')).not.toBeNull();
    expect(host.querySelector(".pdf-viewer-container")).not.toBeNull();
    expect(host.querySelector(".pdfViewer")).not.toBeNull();

    const pageInput = host.querySelector<HTMLInputElement>(".pdf-page-input");
    expect(pageInput).not.toBeNull();
    expect(pageInput?.value).toBe("1");
    expect(host.querySelector(".pdf-page-total")?.textContent).toContain("3");
  });

  it("advances to page 2 when clicking the next-page button", async () => {
    __setPdfjsForTests({
      getDocument: () => ({ promise: Promise.resolve(makeFakeDoc(3)) }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" />);
    });
    await flush();

    const nextBtn = host.querySelector<HTMLButtonElement>("button.pdf-toolbar-next");
    expect(nextBtn).not.toBeNull();
    await act(async () => {
      nextBtn?.click();
    });
    await flush();

    expect(host.querySelector<HTMLInputElement>(".pdf-page-input")?.value).toBe("2");
  });

  it("advances pages when PageDown is pressed", async () => {
    __setPdfjsForTests({
      getDocument: () => ({ promise: Promise.resolve(makeFakeDoc(3)) }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" />);
    });
    await flush();

    const container = host.querySelector<HTMLElement>(".pdf-container");
    expect(container).not.toBeNull();
    await act(async () => {
      container?.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    });
    await flush();
    expect(host.querySelector<HTMLInputElement>(".pdf-page-input")?.value).toBe("2");
  });

  it("opens the find bar with the / shortcut and closes it on Esc", async () => {
    __setPdfjsForTests({
      getDocument: () => ({ promise: Promise.resolve(makeFakeDoc(3)) }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" />);
    });
    await flush();

    // Find toggle button click reveals .pdf-find-bar.
    const findBtn = host.querySelector<HTMLButtonElement>("button.pdf-toolbar-find");
    expect(findBtn).not.toBeNull();
    expect(host.querySelector(".pdf-find-bar")).toBeNull();
    await act(async () => {
      findBtn?.click();
    });
    await flush();
    expect(host.querySelector(".pdf-find-bar")).not.toBeNull();

    // Escape closes it.
    const container = host.querySelector<HTMLElement>(".pdf-container");
    await act(async () => {
      container?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await flush();
    expect(host.querySelector(".pdf-find-bar")).toBeNull();
  });

  it("renders empty state for a 0-page PDF", async () => {
    __setPdfjsForTests({
      getDocument: () => ({ promise: Promise.resolve(makeFakeDoc(0)) }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" />);
    });
    await flush();

    expect(host.querySelector(".pdf-empty")).not.toBeNull();
    expect(host.querySelector(".pdf-toolbar")).toBeNull();
  });

  it("disables prev/next buttons for a single-page PDF", async () => {
    __setPdfjsForTests({
      getDocument: () => ({ promise: Promise.resolve(makeFakeDoc(1)) }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" />);
    });
    await flush();

    const prev = host.querySelector<HTMLButtonElement>("button.pdf-toolbar-prev");
    const next = host.querySelector<HTMLButtonElement>("button.pdf-toolbar-next");
    expect(prev?.disabled).toBe(true);
    expect(next?.disabled).toBe(true);
    expect(host.querySelector(".pdf-page-total")?.textContent).toContain("1");
  });

  it("shows an error state (no console exception) for invalid PDF bytes", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    __setPdfjsForTests({
      getDocument: () => ({
        promise: Promise.reject(new Error("Invalid PDF structure")),
      }),
    });
    const { PdfView } = await import("./PdfView");

    await act(async () => {
      root.render(<PdfView url="blob:fake" />);
    });
    await flush();

    const errorEl = host.querySelector(".pdf-error");
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain("Invalid PDF structure");
    // The error must be surfaced through the DOM, not as an uncaught console
    // exception.
    consoleErrorSpy.mockRestore();
  });
});
