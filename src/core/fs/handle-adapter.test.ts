import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { handleAdapter } from "./handle-adapter";

describe("handleAdapter", () => {
  it("wires the native system-trash bridge when the host provides one", async () => {
    const calls: Array<{ rootName: string; path: string }> = [];
    const adapter = handleAdapter({ name: "Vault" } as FileSystemDirectoryHandle, {
      systemTrash: {
        moveToSystemTrash: (request) => {
          calls.push(request);
        },
      },
    });

    const moveToSystemTrash = adapter.moveToSystemTrash;
    expect(moveToSystemTrash).toBeDefined();
    if (!moveToSystemTrash) throw new Error("Missing system trash adapter");
    await Effect.runPromise(moveToSystemTrash("Notes/A.md"));
    expect(calls).toEqual([{ rootName: "Vault", path: "Notes/A.md" }]);
  });

  it("does not expose system trash without a native host bridge", () => {
    const adapter = handleAdapter({ name: "Vault" } as FileSystemDirectoryHandle, {
      systemTrash: null,
    });

    expect(adapter.moveToSystemTrash).toBeUndefined();
  });
});
