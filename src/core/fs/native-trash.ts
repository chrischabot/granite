import type { VaultPath } from "./types";

export interface NativeTrashRequest {
  readonly rootName: string;
  readonly path: VaultPath;
}

export interface NativeSystemTrashBridge {
  moveToSystemTrash(request: NativeTrashRequest): void | Promise<void>;
}

interface GraniteHostWindow {
  readonly graniteHost?: {
    readonly fs?: {
      readonly moveToSystemTrash?: (request: NativeTrashRequest) => void | Promise<void>;
    };
  };
}

function isNativeSystemTrashBridge(value: unknown): value is NativeSystemTrashBridge {
  return (
    typeof value === "object" &&
    value !== null &&
    "moveToSystemTrash" in value &&
    typeof (value as NativeSystemTrashBridge).moveToSystemTrash === "function"
  );
}

export function detectNativeSystemTrashBridge(
  host: GraniteHostWindow = globalThis as GraniteHostWindow,
): NativeSystemTrashBridge | null {
  const fsBridge = host.graniteHost?.fs;
  return isNativeSystemTrashBridge(fsBridge) ? fsBridge : null;
}
