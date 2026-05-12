import { reportCapturedError, resetErrorReportsForTesting } from "@core/errors/reporter";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary async reporting", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    resetErrorReportsForTesting();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    resetErrorReportsForTesting();
    vi.restoreAllMocks();
  });

  it("renders reports from the shared Effect/error channel", async () => {
    await act(async () =>
      root.render(
        <ErrorBoundary>
          <div>Workspace</div>
        </ErrorBoundary>,
      ),
    );

    await act(async () => {
      reportCapturedError(new Error("Effect channel failed"), { source: "effect" });
    });

    const alert = host.querySelector<HTMLElement>("[role='alert']");
    expect(alert?.textContent).toContain("Granite hit an error (effect)");
    expect(alert?.textContent).toContain("Effect channel failed");
  });
});
