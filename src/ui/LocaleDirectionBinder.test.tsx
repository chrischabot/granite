import { setLocale } from "@core/i18n";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocaleDirectionBinder } from "./LocaleDirectionBinder";

describe("LocaleDirectionBinder", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    setLocale("en");
    document.documentElement.removeAttribute("dir");
    document.body.classList.remove("mod-rtl", "is-rtl");
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    setLocale("en");
    document.documentElement.removeAttribute("dir");
    document.body.classList.remove("mod-rtl", "is-rtl");
  });

  it("applies and removes RTL body state when the locale changes", async () => {
    await act(async () => root.render(<LocaleDirectionBinder />));

    expect(document.documentElement.dir).toBe("ltr");
    expect(document.body.classList.contains("mod-rtl")).toBe(false);

    await act(async () => setLocale("he"));

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.body.classList.contains("mod-rtl")).toBe(true);
    expect(document.body.classList.contains("is-rtl")).toBe(true);
  });
});
