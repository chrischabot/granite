import { a11yAnnouncer } from "@core/a11y/announcer";
import type { VaultPath } from "@core/fs/types";
import { workspaceStore } from "@core/workspace/store";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { A11yAnnouncer, WorkspaceA11yAnnouncements } from "./A11yAnnouncer";

describe("A11yAnnouncer", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    a11yAnnouncer.reset();
    workspaceStore.reset();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    a11yAnnouncer.reset();
    workspaceStore.reset();
  });

  it("renders the latest announcement in a polite live region", async () => {
    await act(async () => root.render(<A11yAnnouncer />));

    await act(async () => a11yAnnouncer.announce("Active tab: Journal"));

    const region = host.querySelector<HTMLElement>("output");
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("aria-atomic")).toBe("true");
    expect(region?.textContent).toBe("Active tab: Journal");
  });

  it("announces active tab changes after the initial workspace render", async () => {
    await act(async () =>
      root.render(
        <>
          <A11yAnnouncer />
          <WorkspaceA11yAnnouncements />
        </>,
      ),
    );

    await act(async () => {
      workspaceStore.openFile("Daily.md" as VaultPath);
      workspaceStore.openFile("Projects.md" as VaultPath, { newTab: true });
    });

    expect(host.querySelector<HTMLElement>("output")?.textContent).toBe("Active tab: Projects");
  });
});
