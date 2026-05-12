import { describe, expect, it } from "vitest";
import { buildVaultWindowUrl, parseVaultWindowRequest } from "./window-url";

describe("buildVaultWindowUrl", () => {
  it("builds a standalone vault-window URL without inherited popout leaf state", () => {
    expect(
      buildVaultWindowUrl(
        "https://granite.local/app?popout=1&vaultId=old&leaf=%7B%7D#pane",
        "vault-123",
      ),
    ).toBe("https://granite.local/app?vaultId=vault-123&vaultWindow=1");
  });

  it("parses standalone vault-window requests", () => {
    expect(parseVaultWindowRequest("?vaultWindow=1&vaultId=vault-123")).toEqual({
      mode: "vault",
      vaultId: "vault-123",
      leaf: null,
    });
  });

  it("parses popout requests with serialized leaf state", () => {
    expect(parseVaultWindowRequest("?popout=1&vaultId=vault-123&leaf=%7B%7D")).toEqual({
      mode: "popout",
      vaultId: "vault-123",
      leaf: "{}",
    });
  });

  it("ignores window requests without a vault id", () => {
    expect(parseVaultWindowRequest("?vaultWindow=1")).toBeNull();
    expect(parseVaultWindowRequest("?popout=1")).toBeNull();
  });
});
