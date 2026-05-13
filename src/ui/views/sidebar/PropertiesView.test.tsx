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
      parsedDue: new Date(Date.UTC(2026, 4, 14)),
      parsedStarts: new Date(Date.UTC(2026, 4, 14, 9, 30)),
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

    const dates = host.querySelectorAll<HTMLInputElement>("input[type='date']");
    const datetimes = host.querySelectorAll<HTMLInputElement>("input[type='datetime-local']");

    expect([...dates].map((input) => input.lang)).toEqual(["he", "he"]);
    expect([...datetimes].map((input) => input.lang)).toEqual(["he", "he"]);
    expect([...dates].map((input) => input.value)).toEqual(["2026-05-13", "2026-05-14"]);
    expect([...datetimes].map((input) => input.value)).toEqual([
      "2026-05-13T09:30",
      "2026-05-14T09:30",
    ]);
  });
});
