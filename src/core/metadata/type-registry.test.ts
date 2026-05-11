import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getRegistryVersion,
  getTypeOverride,
  listAllOverrides,
  setTypeOverride,
  subscribeTypeRegistry,
  unbindTypeRegistry,
} from "./type-registry";

beforeEach(() => {
  unbindTypeRegistry();
});

describe("type registry", () => {
  it("returns null when no override is set", () => {
    expect(getTypeOverride("foo")).toBeNull();
  });

  it("setTypeOverride stores the type", async () => {
    await setTypeOverride("foo", "date");
    expect(getTypeOverride("foo")).toBe("date");
  });

  it("setTypeOverride(null) removes a previously set override", async () => {
    await setTypeOverride("foo", "date");
    await setTypeOverride("foo", null);
    expect(getTypeOverride("foo")).toBeNull();
  });

  it("setTypeOverride is a no-op when nothing changes", async () => {
    await setTypeOverride("foo", "date");
    const before = getRegistryVersion();
    await setTypeOverride("foo", "date");
    expect(getRegistryVersion()).toBe(before);
  });

  it("setTypeOverride(null) is a no-op when no override existed", async () => {
    const before = getRegistryVersion();
    await setTypeOverride("missing", null);
    expect(getRegistryVersion()).toBe(before);
  });

  it("listAllOverrides returns a shallow snapshot", async () => {
    await setTypeOverride("a", "date");
    await setTypeOverride("b", "number");
    const snap = listAllOverrides();
    expect(snap).toEqual({ a: "date", b: "number" });
    // Snapshot is detached — mutating it shouldn't affect future reads.
    snap["a"] = "text";
    expect(getTypeOverride("a")).toBe("date");
  });

  it("subscribers fire on changes", async () => {
    const cb = vi.fn();
    const unsub = subscribeTypeRegistry(cb);
    await setTypeOverride("foo", "date");
    expect(cb).toHaveBeenCalledTimes(1);
    await setTypeOverride("foo", "number");
    expect(cb).toHaveBeenCalledTimes(2);
    await setTypeOverride("foo", null);
    expect(cb).toHaveBeenCalledTimes(3);
    unsub();
    await setTypeOverride("foo", "list");
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("getRegistryVersion increments on change", async () => {
    const v0 = getRegistryVersion();
    await setTypeOverride("foo", "checkbox");
    expect(getRegistryVersion()).toBeGreaterThan(v0);
  });

  it("unbindTypeRegistry clears the state", async () => {
    await setTypeOverride("foo", "date");
    unbindTypeRegistry();
    expect(getTypeOverride("foo")).toBeNull();
    expect(listAllOverrides()).toEqual({});
  });
});
