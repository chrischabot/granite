import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "../i18n";
import {
  _peekActiveWatchControls,
  DEFAULT_WATCH_POLL_INTERVAL_MS,
  FileSystemCapabilityError,
  WATCH_BACKOFF_FACTOR,
  WATCH_BACKOFF_IDLE_TICKS,
  WATCH_BACKOFF_MAX_MS,
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
  it("keeps the default browser watcher poll interval within the external-edit budget", () => {
    expect(DEFAULT_WATCH_POLL_INTERVAL_MS).toBeLessThanOrEqual(200);
  });

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

  it("exposes idle-backoff bounds that match the documented contract", () => {
    expect(WATCH_BACKOFF_IDLE_TICKS).toBeGreaterThanOrEqual(5);
    expect(WATCH_BACKOFF_FACTOR).toBeGreaterThan(1);
    expect(WATCH_BACKOFF_MAX_MS).toBeGreaterThanOrEqual(2000);
  });

  it("backs off polling after consecutive idle ticks and recovers on activity", async () => {
    // Instrument setTimeout to record the delays the watcher requests.
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    const delays: number[] = [];
    type Pending = { fn: () => void; id: number };
    const pending = new Map<number, Pending>();
    let nextId = 1;
    const fakeSetTimeout = ((fn: () => void, delay?: number) => {
      const id = nextId++;
      pending.set(id, { fn, id });
      delays.push(delay ?? 0);
      // Resolve on the microtask queue so the test can pump ticks
      // synchronously by awaiting Promise.resolve() between probes.
      queueMicrotask(() => {
        const job = pending.get(id);
        if (!job) return;
        pending.delete(id);
        job.fn();
      });
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;
    const fakeClearTimeout = ((id: number) => {
      pending.delete(id);
    }) as typeof clearTimeout;
    globalThis.setTimeout = fakeSetTimeout;
    globalThis.clearTimeout = fakeClearTimeout;
    try {
      const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
      const adapter = handleAdapter(root, { pollIntervalMs: 100, systemTrash: null });
      const unsubscribe = adapter.watch(() => {});
      // Pump enough ticks to exceed the idle threshold and exercise backoff.
      // Each tick is async (walks the tree, schedules the next one), so we
      // pump a generous number of microtasks to let every tick complete.
      const pump = async (iterations: number) => {
        for (let i = 0; i < iterations; i++) {
          for (let j = 0; j < 20; j++) {
            await Promise.resolve();
          }
        }
      };
      await pump(WATCH_BACKOFF_IDLE_TICKS + 6);

      // First scheduled delay is 0 (immediate first tick). Subsequent ticks
      // schedule at the base interval until idleCount exceeds the threshold,
      // then the delay grows by WATCH_BACKOFF_FACTOR each tick.
      const baseDelays = delays.filter((d) => d === 100);
      expect(baseDelays.length).toBeGreaterThanOrEqual(WATCH_BACKOFF_IDLE_TICKS);
      const lastDelay = delays[delays.length - 1];
      expect(lastDelay).toBeGreaterThan(100);
      expect(lastDelay).toBeLessThanOrEqual(WATCH_BACKOFF_MAX_MS);

      // Simulate a diff: write a new file. The next tick should observe it
      // and reset the cadence back to the base interval.
      await Effect.runPromise(adapter.writeText("activity.md", "hello"));
      const delaysBefore = delays.length;
      await pump(6);
      const newDelays = delays.slice(delaysBefore);
      expect(newDelays.some((d) => d === 100)).toBe(true);

      unsubscribe();
    } finally {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    }
  });

  it("pauses and resumes the watcher via the exposed control surface", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { pollIntervalMs: 5, systemTrash: null });
    const events: Array<{ type: string; path: string }> = [];
    const control = adapter.watch((event) => {
      if ("path" in event) events.push(event);
    }) as unknown as (() => void) & { pause?: () => void; resume?: () => void };
    // Sanity: the watcher exposes pause/resume.
    expect(typeof control.pause).toBe("function");
    expect(typeof control.resume).toBe("function");

    try {
      // Let the baseline snapshot settle.
      await new Promise((resolve) => setTimeout(resolve, 20));
      // Pause, then mutate. We must NOT see any events while paused.
      control.pause?.();
      await Effect.runPromise(adapter.writeText("paused-while.md", "shh"));
      await new Promise((resolve) => setTimeout(resolve, 50));
      const seenWhilePaused = events.some((e) => e.path === "paused-while.md");
      expect(seenWhilePaused).toBe(false);

      // Resume — the change should now be observed.
      control.resume?.();
      const deadline = Date.now() + 500;
      while (!events.some((e) => e.path === "paused-while.md")) {
        if (Date.now() > deadline) throw new Error("Timed out waiting for resume");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      control();
    }
  });

  it("registers and unregisters watch controls in the global visibility registry", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { pollIntervalMs: 50, systemTrash: null });

    const initialSize = _peekActiveWatchControls().size;
    const ctrlA = adapter.watch(() => {});
    const ctrlB = adapter.watch(() => {});
    try {
      expect(_peekActiveWatchControls().size).toBe(initialSize + 2);
      expect(_peekActiveWatchControls().has(ctrlA)).toBe(true);
      expect(_peekActiveWatchControls().has(ctrlB)).toBe(true);
    } finally {
      ctrlA();
      ctrlB();
    }
    expect(_peekActiveWatchControls().size).toBe(initialSize);
    expect(_peekActiveWatchControls().has(ctrlA)).toBe(false);
    expect(_peekActiveWatchControls().has(ctrlB)).toBe(false);
  });

  it("pauses all active watchers when the document goes hidden and resumes them on visible", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { pollIntervalMs: 20, systemTrash: null });
    const eventsA: Array<{ type: string; path?: string }> = [];
    const eventsB: Array<{ type: string; path?: string }> = [];
    const ctrlA = adapter.watch((e) => {
      if ("path" in e) eventsA.push({ type: e.type, path: e.path });
    });
    const ctrlB = adapter.watch((e) => {
      if ("path" in e) eventsB.push({ type: e.type, path: e.path });
    });
    try {
      // Both watchers warmed up.
      await new Promise((r) => setTimeout(r, 40));
      // Hide the tab via the same DOM event the production code listens to.
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      // While hidden, this change must not surface in either handler.
      await Effect.runPromise(adapter.writeText("hidden-while.md", "hidden"));
      await new Promise((r) => setTimeout(r, 80));
      expect(eventsA.some((e) => e.path === "hidden-while.md")).toBe(false);
      expect(eventsB.some((e) => e.path === "hidden-while.md")).toBe(false);

      // Show the tab; both watchers must observe the change after resume.
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
      const deadline = Date.now() + 500;
      while (
        !eventsA.some((e) => e.path === "hidden-while.md") ||
        !eventsB.some((e) => e.path === "hidden-while.md")
      ) {
        if (Date.now() > deadline) {
          throw new Error(
            `Timed out waiting for resume; A=${eventsA.length}, B=${eventsB.length}`,
          );
        }
        await new Promise((r) => setTimeout(r, 10));
      }
    } finally {
      ctrlA();
      ctrlB();
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
    }
  });

  it("keeps .granite hidden from vault-wide listAll while still watching app-data changes", async () => {
    const root = new MockDirectoryHandle("Vault") as unknown as FileSystemDirectoryHandle;
    const adapter = handleAdapter(root, { pollIntervalMs: 5, systemTrash: null });
    const events: Array<{ type: string; path: string }> = [];
    await Effect.runPromise(adapter.writeText(".granite/plugins/demo/manifest.json", "{}"));

    const listed = await Effect.runPromise(adapter.listAll({ extensions: ["json"] }));
    expect(listed.map((entry) => entry.path)).not.toContain(".granite/plugins/demo/manifest.json");

    const unsubscribe = adapter.watch((event) => {
      if ("path" in event) events.push(event);
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await Effect.runPromise(adapter.writeText(".granite/plugins/demo/main.json", "{}"));
      const deadline = Date.now() + 500;
      while (!events.some((event) => event.path === ".granite/plugins/demo/main.json")) {
        if (Date.now() > deadline) throw new Error("Timed out waiting for watch event");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      unsubscribe();
    }
  });
});
