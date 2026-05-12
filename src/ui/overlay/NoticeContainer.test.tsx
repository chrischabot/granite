import { a11yAnnouncer } from "@core/a11y/announcer";
import { noticeManager } from "@core/notices/notice";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoticeContainer } from "./NoticeContainer";

function clearNotices(): void {
  for (const notice of [...noticeManager.list()]) noticeManager.dismiss(notice.id);
}

describe("NoticeContainer accessibility announcements", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    clearNotices();
    a11yAnnouncer.reset();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    clearNotices();
    a11yAnnouncer.reset();
  });

  it("announces newly shown notice content", async () => {
    await act(async () => root.render(<NoticeContainer />));

    await act(async () => {
      noticeManager.show("Export finished", { kind: "success", timeoutMs: 0 });
    });

    expect(a11yAnnouncer.getSnapshot().message).toBe("Success: Export finished");
    expect(document.body.querySelector("[role='alert']")?.textContent).toContain("Export finished");
  });
});
