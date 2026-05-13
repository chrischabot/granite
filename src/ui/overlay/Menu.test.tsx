import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MenuHost, closeMenu, openMenu } from "./Menu";

describe("MenuHost keyboard navigation", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<MenuHost />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      closeMenu();
      root.unmount();
    });
    host.remove();
  });

  it("uses roving focus with arrow, Home, and End keys", async () => {
    await act(async () => {
      openMenu({
        x: 8,
        y: 8,
        items: [
          { id: "one", label: "One", callback: vi.fn() },
          { id: "two", label: "Two", callback: vi.fn() },
          { id: "three", label: "Three", callback: vi.fn() },
        ],
      });
    });

    const items = () => Array.from(document.querySelectorAll<HTMLElement>("[role='menuitem']"));

    expect(items()[0]).toBe(document.activeElement);
    expect(items().map((item) => item.tabIndex)).toEqual([0, -1, -1]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(items()[2]).toBe(document.activeElement);
    expect(items().map((item) => item.tabIndex)).toEqual([-1, -1, 0]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(items()[0]).toBe(document.activeElement);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(items()[0]).toBe(document.activeElement);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(items()[2]).toBe(document.activeElement);
  });

  it("activates the focused menu item with Space as well as Enter", async () => {
    const first = vi.fn();
    const second = vi.fn();
    await act(async () => {
      openMenu({
        x: 8,
        y: 8,
        items: [
          { id: "one", label: "One", callback: first },
          { id: "two", label: "Two", callback: second },
        ],
      });
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[role='menu']")).toBeNull();
  });
});
