import { APP_VERSION } from "@core/app/version";
import { resetSettingsForTests } from "@core/settings/store";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../theme/ThemeProvider";
import { SettingsModal } from "./SettingsModal";

describe("SettingsModal", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    resetSettingsForTests();
    document.body.innerHTML = "";
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("exposes the spec-required About section with version, license, and credits", async () => {
    await act(async () =>
      root.render(
        <ThemeProvider>
          <SettingsModal open={true} onClose={() => {}} />
        </ThemeProvider>,
      ),
    );

    const aboutTab = [...document.body.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "About",
    );
    expect(aboutTab).toBeDefined();

    await act(async () => aboutTab?.click());

    expect(document.body.textContent).toContain("Current version");
    expect(document.body.textContent).toContain(APP_VERSION);
    expect(document.body.textContent).toContain("License");
    expect(document.body.textContent).toContain("Credits");
  });
});
