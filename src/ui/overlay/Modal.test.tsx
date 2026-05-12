import { a11yAnnouncer } from "@core/a11y/announcer";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal accessibility announcements", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    a11yAnnouncer.reset();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    a11yAnnouncer.reset();
  });

  it("announces the dialog title when opened", async () => {
    await act(async () =>
      root.render(
        <Modal open onClose={vi.fn()} title="Command palette">
          Search commands
        </Modal>,
      ),
    );

    expect(a11yAnnouncer.getSnapshot().message).toBe("Opened dialog: Command palette");
  });

  it("labels title-less dialogs with aria-label and announces that label", async () => {
    await act(async () =>
      root.render(
        <Modal open onClose={vi.fn()} ariaLabel="Settings">
          Settings content
        </Modal>,
      ),
    );

    const dialog = document.body.querySelector<HTMLElement>("dialog");
    expect(dialog?.getAttribute("aria-label")).toBe("Settings");
    expect(a11yAnnouncer.getSnapshot().message).toBe("Opened dialog: Settings");
  });
});
