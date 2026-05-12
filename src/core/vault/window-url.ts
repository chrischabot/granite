export type VaultWindowMode = "popout" | "vault";

export interface VaultWindowRequest {
  readonly mode: VaultWindowMode;
  readonly vaultId: string;
  readonly leaf: string | null;
}

export function buildVaultWindowUrl(currentHref: string, vaultId: string): string {
  const url = new URL(currentHref);
  url.searchParams.delete("popout");
  url.searchParams.delete("leaf");
  url.searchParams.set("vaultWindow", "1");
  url.searchParams.set("vaultId", vaultId);
  url.hash = "";
  return url.toString();
}

export function parseVaultWindowRequest(search: string): VaultWindowRequest | null {
  const params = new URLSearchParams(search);
  const mode: VaultWindowMode | null =
    params.get("popout") === "1" ? "popout" : params.get("vaultWindow") === "1" ? "vault" : null;
  if (!mode) return null;
  const vaultId = params.get("vaultId");
  if (!vaultId) return null;
  return {
    mode,
    vaultId,
    leaf: params.get("leaf"),
  };
}
