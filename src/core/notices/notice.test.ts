import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { noticeManager } from "./notice";

beforeEach(() => {
  vi.useFakeTimers();
  // Clear state by dismissing all current notices.
  for (const n of [...noticeManager.list()]) noticeManager.dismiss(n.id);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("noticeManager", () => {
  it("starts empty", () => {
    expect(noticeManager.list().length).toBe(0);
  });

  it("show() adds a notice with the requested message + kind", () => {
    const id = noticeManager.show("hello", { kind: "success" });
    const list = noticeManager.list();
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(id);
    expect(list[0]!.message).toBe("hello");
    expect(list[0]!.kind).toBe("success");
  });

  it("defaults kind to 'info' and timeout to 4000", () => {
    noticeManager.show("hi");
    const n = noticeManager.list()[0]!;
    expect(n.kind).toBe("info");
    expect(n.timeoutMs).toBe(4000);
  });

  it("auto-dismisses after the timeout", () => {
    noticeManager.show("ephemeral", { timeoutMs: 1000 });
    expect(noticeManager.list().length).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(noticeManager.list().length).toBe(0);
  });

  it("does not auto-dismiss when timeoutMs is 0", () => {
    noticeManager.show("sticky", { timeoutMs: 0 });
    vi.advanceTimersByTime(60_000);
    expect(noticeManager.list().length).toBe(1);
  });

  it("dismiss(id) removes the matching notice", () => {
    const a = noticeManager.show("A");
    const b = noticeManager.show("B");
    noticeManager.dismiss(a);
    const list = noticeManager.list();
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(b);
  });

  it("dismiss is a no-op for an unknown id", () => {
    noticeManager.show("A");
    noticeManager.dismiss("does-not-exist");
    expect(noticeManager.list().length).toBe(1);
  });

  it("subscribe is invoked on add, dismiss, and timeout", () => {
    const cb = vi.fn();
    const unsub = noticeManager.subscribe(cb);
    noticeManager.show("A", { timeoutMs: 500 });
    expect(cb).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(501);
    expect(cb).toHaveBeenCalledTimes(2);
    unsub();
    noticeManager.show("B");
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("stores onActivate when provided", () => {
    const fn = vi.fn();
    noticeManager.show("clickable", { onActivate: fn, timeoutMs: 0 });
    const n = noticeManager.list()[0]!;
    expect(typeof n.onActivate).toBe("function");
    n.onActivate?.();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});