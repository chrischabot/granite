import { describe, expect, it } from "vitest";
import { type PermissionCapableDirectoryHandle, ensureReadwritePermission } from "./permissions";

function handle({
  query,
  request,
}: {
  query?: PermissionState;
  request?: PermissionState;
}): PermissionCapableDirectoryHandle {
  return {
    kind: "directory",
    name: "Vault",
    ...(query ? { queryPermission: async () => query } : {}),
    ...(request ? { requestPermission: async () => request } : {}),
  } as unknown as PermissionCapableDirectoryHandle;
}

describe("ensureReadwritePermission", () => {
  it("accepts handles that already have read/write permission", async () => {
    await expect(ensureReadwritePermission(handle({ query: "granted" }))).resolves.toBe(true);
  });

  it("requests permission when the stored FSA handle is in prompt state", async () => {
    await expect(
      ensureReadwritePermission(handle({ query: "prompt", request: "granted" })),
    ).resolves.toBe(true);
  });

  it("rejects handles when the browser permission request is denied", async () => {
    await expect(
      ensureReadwritePermission(handle({ query: "prompt", request: "denied" })),
    ).resolves.toBe(false);
  });

  it("treats legacy handles without permission APIs as already usable", async () => {
    await expect(ensureReadwritePermission(handle({}))).resolves.toBe(true);
  });
});
