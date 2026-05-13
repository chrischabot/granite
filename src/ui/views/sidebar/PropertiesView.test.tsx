import { setLocale } from "@core/i18n";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PropertiesView } from "./PropertiesView";

vi.mock("@core/metadata/useMetadata", () => ({
  useFileMetadata: () => ({
    frontmatter: {
      due: "2026-05-13",
      starts: "2026-05-13T09:30:00Z",
    },
  }),
}));

vi.mock("@core/workspace/useWorkspace", () => ({
  useWorkspace: () => ({
    activeGroupId: "group",
    groups: new Map([["group", { activeLeafId: "leaf" }]]),
    leaves: new Map([["leaf", { state: { type: "markdown", path: "Note.md" } }]]),
  }),
}));

describe("PropertiesView date inputs", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    setLocale("he");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    setLocale("en");
  });

  it("passes the active locale to native date and datetime pickers", async () => {
    await act(async () => root.render(<PropertiesView />));

    const date = host.querySelector<HTMLInputElement>("input[type='date']");
    const datetime = host.querySelector<HTMLInputElement>("input[type='datetime-local']");

    expect(date?.lang).toBe("he");
    expect(datetime?.lang).toBe("he");
  });
});
