import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "../i18n";
import {
  FileSystemCapabilityError,
  handleAdapter,
  openOPFS,
  pickDirectoryFSA,
} from "./handle-adapter";

const originalShowDirectoryPickerDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "showDirectoryPicker",
);
const originalStorageDescriptor = Object.getOwnPropertyDescriptor(navigator, "storage");

type MockFileRecord = {
  content: string | Uint8Array;
  lastModified: number;
};

class MockFileHandle {
  readonly kind = "file";

  constructor(
    readonly name: string,
    private record: MockFileRecord,
  ) {}

  async getFile() {
    const current = this.record.content;
    const bytes = typeof current === "string" ? new TextEncoder().encode(current) : current;
    return {
      size: bytes.byteLength,
      lastModified: this.record.lastModified,
      text: async () => (typeof current === "string" ? current : new TextDecoder().decode(current)),
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  }

  async createWritable() {
    const chunks: Array<string | Uint8Array | ArrayBuffer | Blob> = [];
    return {
      write: async (chunk: string | Uint8Array | ArrayBuffer | Blob) => {
        chunks.push(chunk);
      },
      close: async () => {
        const normalized = await Promise.all(
          chunks.map(async (chunk) => {
            if (typeof chunk === "string") return chunk;
            if (chunk instanceof Blob) return new Uint8Array(await chunk.arrayBuffer());
            if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
            return chunk;
          }),
        );
        if (normalized.every((chunk): chunk is string => typeof chunk === "string")) {
          this.record.content = normalized.join("");
        } else {
          const byteChunks = normalized.map((chunk) =>
            typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
          );
          const size = byteChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
          const out = new Uint8Array(size);
          let offset = 0;
          for (const chunk of byteChunks) {
            out.set(chunk, offset);
            offset += chunk.byteLength;
          }
          this.record.content = out;
        }
        this.record.lastModified += 1;
      },
    };
  }
}

class MockDirectoryHandle {
  readonly kind = "directory";
  private readonly files = new Map<string, MockFileRecord>();
  private readonly dirs = new Map<string, MockDirectoryHandle>();

  constructor(readonly name: string) {}

  async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
    const existing = this.dirs.get(name);
    if (existing) return existing;
    if (!opts?.create) throw new DOMException("Directory not found", "NotFoundError");
    const next = new MockDirectoryHandle(name);
    this.dirs.set(name, next);
    return next;
  }

  async getFileHandle(name: string, opts?: { create?: boolean }) {
    const existing = this.files.get(name);
    if (existing) return new MockFileHandle(name, existing);
    if (!opts?.create) throw new DOMException("File not found", "NotFoundError");
    const record = { content: "", lastModified: 1 };
    this.files.set(name, record);
    return new MockFileHandle(name, record);
  }

  async removeEntry(name: string) {
    if (this.files.delete(name) || this.dirs.delete(name)) return;
    throw new DOMException("Entry not found", "NotFoundError");
  }

  async *values(): AsyncGenerator<MockFileHandle | MockDirectoryHandle> {
    for (const dir of this.dirs.values()) {
      yield dir;
    }
    for (const [name, record] of this.files) {
      yield new MockFileHandle(name, record);
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalShowDirectoryPickerDescriptor) {
    Object.defineProperty(window, "showDirectoryPicker", originalShowDirectoryPickerDescriptor);
  } else {
    Reflect.deleteProperty(window, "showDirectoryPicker");
  }
  if (originalStorageDescriptor) {
    Object.defineProperty(navigator, "storage", originalStorageDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "storage");
  }
});

describe("handleAdapter", () => {
  it("throws coded capability errors when folder picking is unavailable", async () => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: undefined,
    });

    await expect(pickDirectoryFSA()).rejects.toMatchObject({
      name: "FileSystemCapabilityError",
      code: "fsa-unavailable",
    });
  });

  it("throws coded capability errors when folder permission is denied", async () => {
    const handle = {
      name: "Vault",
      kind: "directory",
      queryPermission: async () => "prompt" as PermissionState,
      requestPermission: async () => "denied" as PermissionState,
    };
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => handle,
    });

    await expect(pickDirectoryFSA()).rejects.toMatchObject({
      name: "FileSystemCapabilityError",
      code: "fsa-permission-denied",
    });
  });

  it("throws coded capability errors when OPFS is unavailable", async () => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: undefined,
    });

    await expect(openOPFS()).rejects.toBeInstanceOf(FileSystemCapabilityError);
    await expect(openOPFS()).rejects.toMatchObject({
      name: "FileSystemCapabilityError",
      code: "opfs-unavailable",
    });
  });

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

  it("keeps atomic text save round-trips under the 50 ms budget", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { systemTrash: null });
    const payload = `${"# Heading\n\n"}${"body text ".repeat(12_000)}`;

    await Effect.runPromise(adapter.writeText("Notes/Budget.md", "warmup"));
    const start = performance.now();
    await Effect.runPromise(adapter.writeText("Notes/Budget.md", payload));
    const elapsed = performance.now() - start;
    const saved = await Effect.runPromise(adapter.readText("Notes/Budget.md"));

    expect(saved).toBe(payload);
    expect(elapsed).toBeLessThan(50);
  });

  it("reports localized access-denied reasons for empty-path writes", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { systemTrash: null });

    await expect(Effect.runPromise(adapter.writeText("" as never, "body"))).rejects.toMatchObject({
      _tag: "FsAccessDenied",
      path: "",
      reason: t("fs.error.emptyPath"),
    });
  });

  it("reports localized access-denied reasons for directory renames", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { systemTrash: null });

    await Effect.runPromise(adapter.mkdir("Folder"));

    await expect(Effect.runPromise(adapter.rename("Folder", "Renamed"))).rejects.toMatchObject({
      _tag: "FsAccessDenied",
      path: "Folder",
      reason: t("fs.error.directoryRenameUnsupported"),
    });
  });
});
