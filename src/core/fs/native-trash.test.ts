import { describe, expect, it } from "vitest";
import { type NativeTrashRequest, detectNativeSystemTrashBridge } from "./native-trash";

describe("detectNativeSystemTrashBridge", () => {
  it("returns null when no trusted host filesystem bridge exists", () => {
    expect(detectNativeSystemTrashBridge({})).toBeNull();
    expect(detectNativeSystemTrashBridge({ graniteHost: {} })).toBeNull();
    expect(detectNativeSystemTrashBridge({ graniteHost: { fs: {} } })).toBeNull();
  });

  it("detects the native host system-trash capability", async () => {
    const calls: NativeTrashRequest[] = [];
    const bridge = detectNativeSystemTrashBridge({
      graniteHost: {
        fs: {
          moveToSystemTrash: (request) => {
            calls.push(request);
          },
        },
      },
    });

    expect(bridge).not.toBeNull();
    await bridge?.moveToSystemTrash({ rootName: "Vault", path: "Notes/A.md" });
    expect(calls).toEqual([{ rootName: "Vault", path: "Notes/A.md" }]);
  });
});
