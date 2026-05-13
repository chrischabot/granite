import { setLocale } from "@core/i18n";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookmarksView } from "./BookmarksView";

vi.mock("@/ui/vault/VaultContext", () => ({
  useVault: () => ({ activeVault: null }),
}));

vi.mock("@core/metadata/useMetadata", () => ({
  useFileMetadata: () => null,
}));

vi.mock("@core/workspace/useWorkspace", () => ({
  useWorkspace: () => ({
    activeGroupId: null,
    groups: new Map(),
    leaves: new Map(),
  }),
}));

describe("BookmarksView add menu keyboard navigation", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    setLocale("en");
    localStorage.clear();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    localStorage.clear();
    vi.restoreAllMocks();
    setLocale("en");
  });

  it("uses roving focus with arrow, Home, and End keys", async () => {
    await act(async () => root.render(<BookmarksView />));

    const addButton = host.querySelector<HTMLButtonElement>("[aria-label='Add bookmark…']");
    expect(addButton).not.toBeNull();

    await act(async () => {
      addButton?.click();
    });

    const items = () => Array.from(host.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));

    expect(items()).toHaveLength(5);
    expect(items()[0]).toBe(document.activeElement);
    expect(items().map((item) => item.tabIndex)).toEqual([0, -1, -1, -1, -1]);

    await act(async () => {
      host
        .querySelector("[role='menu']")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(items()[4]).toBe(document.activeElement);
    expect(items().map((item) => item.tabIndex)).toEqual([-1, -1, -1, -1, 0]);

    await act(async () => {
      host
        .querySelector("[role='menu']")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(items()[0]).toBe(document.activeElement);

    await act(async () => {
      host
        .querySelector("[role='menu']")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(items()[0]).toBe(document.activeElement);

    await act(async () => {
      host
        .querySelector("[role='menu']")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(items()[4]).toBe(document.activeElement);
  });

  it("closes the menu with Escape and restores focus to the trigger", async () => {
    await act(async () => root.render(<BookmarksView />));

    const addButton = host.querySelector<HTMLButtonElement>("[aria-label='Add bookmark…']");
    await act(async () => {
      addButton?.click();
    });

    expect(host.querySelector("[role='menu']")).not.toBeNull();

    await act(async () => {
      host
        .querySelector("[role='menu']")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(host.querySelector("[role='menu']")).toBeNull();
    expect(addButton).toBe(document.activeElement);
  });

  it("localizes legacy default bookmark groups instead of rendering saved English", async () => {
    localStorage.setItem(
      "granite.bookmarks.v3",
      JSON.stringify([
        {
          kind: "search",
          title: "tag:project",
          query: "tag:project",
          addedMs: 1,
          group: "Bookmarks",
        },
      ]),
    );
    setLocale("he");

    await act(async () => root.render(<BookmarksView />));

    const groupOptions = Array.from(host.querySelectorAll<HTMLOptionElement>("select option")).map(
      (option) => option.textContent,
    );
    expect(groupOptions).toContain("סימניות");
    expect(groupOptions).not.toContain("Bookmarks");
    expect(host.textContent).toContain("סימניות");
  });
});
