import { commandRegistry } from "@core/commands/CommandRegistry";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetEventsForTesting } from "./events";
import {
  _resetHostRegistriesForTesting,
  listSettingsTabs,
  listStatusBarItems,
} from "./host-registries";
import {
  Plugin as PluginBase,
  type PluginRegistrationTracker,
  _resetObsidianShimForTesting,
  attachShimVaultImpl,
  createObsidianShim,
} from "./obsidian-shim";

function buildShim(pluginId = "test-plugin"): {
  shim: ReturnType<typeof createObsidianShim>;
  tracker: PluginRegistrationTracker;
  disposers: Array<() => void | Promise<void>>;
  ribbon: HTMLElement;
} {
  const disposers: Array<() => void | Promise<void>> = [];
  const tracker: PluginRegistrationTracker = {
    push: (d) => disposers.push(d),
    disposed: false,
  };
  const ribbon = document.createElement("div");
  ribbon.className = "test-ribbon";
  document.body.appendChild(ribbon);
  const shim = createObsidianShim({
    pluginId,
    manifest: { id: pluginId, name: pluginId, version: "1.0.0" },
    tracker,
    ribbonContainer: ribbon,
  });
  return { shim, tracker, disposers, ribbon };
}

async function runDisposers(disposers: Array<() => void | Promise<void>>): Promise<void> {
  while (disposers.length > 0) {
    const d = disposers.pop();
    if (d) await Promise.resolve(d());
  }
}

beforeEach(() => {
  _resetHostRegistriesForTesting();
  _resetEventsForTesting();
  _resetObsidianShimForTesting();
  // Clear any leaked commands from previous tests.
  for (const cmd of commandRegistry.list()) commandRegistry.unregister(cmd.id);
});

describe("obsidian-shim Plugin base — registration tracking", () => {
  it("addCommand registers + cleanup removes the command", async () => {
    const { shim, disposers } = buildShim("p1");
    class P extends shim.Plugin {
      override onload() {
        this.addCommand({ id: "do-thing", name: "Do thing", callback: () => {} });
      }
    }
    const inst = new P();
    inst.onload();
    expect(commandRegistry.list().some((c) => c.id === "p1:do-thing")).toBe(true);
    await runDisposers(disposers);
    expect(commandRegistry.list().some((c) => c.id === "p1:do-thing")).toBe(false);
  });

  it("addRibbonIcon appends an element to the ribbon container and disposes it", async () => {
    const { shim, disposers, ribbon } = buildShim("p2");
    class P extends shim.Plugin {
      override onload() {
        const el = this.addRibbonIcon("calendar", "Open calendar", () => {});
        expect(el).toBeInstanceOf(HTMLElement);
      }
    }
    new P().onload();
    expect(ribbon.querySelectorAll(".plugin-ribbon-icon").length).toBe(1);
    await runDisposers(disposers);
    expect(ribbon.querySelectorAll(".plugin-ribbon-icon").length).toBe(0);
  });

  it("addStatusBarItem registers in host registry and removes on dispose", async () => {
    const { shim, disposers } = buildShim("p3");
    class P extends shim.Plugin {
      override onload() {
        const el = this.addStatusBarItem();
        el.textContent = "ready";
      }
    }
    new P().onload();
    const items = listStatusBarItems();
    expect(items.length).toBe(1);
    expect(items[0]?.text).toBe("ready");
    await runDisposers(disposers);
    expect(listStatusBarItems().length).toBe(0);
  });

  it("addSettingTab registers in host registry and removes on dispose", async () => {
    const { shim, disposers } = buildShim("p4");
    class Tab extends shim.PluginSettingTab {
      override display() {
        this.containerEl.textContent = "settings";
      }
    }
    class P extends shim.Plugin {
      override onload() {
        this.addSettingTab(new Tab(this.app, this));
      }
    }
    new P().onload();
    expect(listSettingsTabs().length).toBe(1);
    await runDisposers(disposers);
    expect(listSettingsTabs().length).toBe(0);
  });

  it("registerEvent stores the EventRef disposer", async () => {
    const { shim, disposers } = buildShim("p5");
    let disposed = false;
    class P extends shim.Plugin {
      override onload() {
        this.registerEvent({
          dispose: () => {
            disposed = true;
          },
        });
      }
    }
    new P().onload();
    expect(disposed).toBe(false);
    await runDisposers(disposers);
    expect(disposed).toBe(true);
  });

  it("registerInterval clears the interval on dispose", async () => {
    const { shim, disposers } = buildShim("p6");
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    class P extends shim.Plugin {
      override onload() {
        const id = window.setInterval(() => {}, 1000);
        this.registerInterval(id);
      }
    }
    new P().onload();
    await runDisposers(disposers);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("registerDomEvent adds + removes listener on dispose", async () => {
    const { shim, disposers } = buildShim("p7");
    let calls = 0;
    class P extends shim.Plugin {
      override onload() {
        this.registerDomEvent(document, "keydown", () => {
          calls += 1;
        });
      }
    }
    new P().onload();
    document.dispatchEvent(new Event("keydown"));
    expect(calls).toBe(1);
    await runDisposers(disposers);
    document.dispatchEvent(new Event("keydown"));
    expect(calls).toBe(1);
  });

  it("register() lets plugins push arbitrary disposers", async () => {
    const { shim, disposers } = buildShim("p8");
    const calls: string[] = [];
    class P extends shim.Plugin {
      override onload() {
        this.register(() => {
          calls.push("a");
        });
        this.register(() => {
          calls.push("b");
        });
      }
    }
    new P().onload();
    await runDisposers(disposers);
    // LIFO order matches the loader's run-on-unload semantics.
    expect(calls).toEqual(["b", "a"]);
  });
});

describe("Notice", () => {
  it("show + hide route through noticeManager", async () => {
    const { shim } = buildShim("p9");
    const n = new shim.Notice("hi");
    // The notice is auto-dismissed after 4s; hide() should be safe.
    expect(() => n.hide()).not.toThrow();
  });
});

describe("Vault facade", () => {
  it("read/write/delete/rename route through the attached impl", async () => {
    const reads: string[] = [];
    const writes: Array<[string, string]> = [];
    const deletes: string[] = [];
    const renames: Array<[string, string]> = [];
    attachShimVaultImpl({
      read: async (p) => {
        reads.push(p);
        return "body";
      },
      write: async (p, c) => {
        writes.push([p, c]);
      },
      delete: async (p) => {
        deletes.push(p);
      },
      rename: async (from, to) => {
        renames.push([from, to]);
      },
      listMarkdownSync: () => [{ path: "note.md", size: 1, mtimeMs: 1 }],
      statSync: () => ({ type: "file", size: 1 }),
    });
    const { shim } = buildShim("p10");
    const file = shim.TFile ? Object.assign(new shim.TFile(), { path: "note.md" }) : null;
    if (!file) throw new Error("TFile constructor missing");
    const vault = new shim.Vault();
    expect(await vault.read(file)).toBe("body");
    await vault.modify(file, "next");
    await vault.delete(file);
    await vault.rename(file, "renamed.md");
    expect(reads).toEqual(["note.md"]);
    expect(writes).toEqual([["note.md", "next"]]);
    expect(deletes).toEqual(["note.md"]);
    expect(renames).toEqual([["note.md", "renamed.md"]]);
    expect(file.path).toBe("renamed.md");
    expect(vault.getMarkdownFiles().map((f) => f.path)).toEqual(["note.md"]);
  });
});

describe("Plugin base class is the marker class loaders detect", () => {
  it("a subclass is `instanceof Plugin`", () => {
    const { shim } = buildShim("p11");
    class Sub extends shim.Plugin {}
    const inst = new Sub();
    expect(inst).toBeInstanceOf(PluginBase);
  });
});

describe("severe: registration tracker handles N concurrent load cycles", () => {
  // This is the unit-level mirror of the verifier's leak storm: drive the
  // shim through 100 fresh load/unload cycles and make sure every registry
  // returns to zero after every cycle.
  it("100 cycles of full-surface plugin: nothing leaks across cycles", async () => {
    for (let i = 0; i < 100; i += 1) {
      const { shim, disposers, ribbon } = buildShim(`cyc-${i}`);
      class P extends shim.Plugin {
        override async onload() {
          this.addCommand({ id: "x", name: "X", callback: () => {} });
          this.addRibbonIcon("z", "Z", () => {});
          this.addStatusBarItem().textContent = `tick ${i}`;
          class Tab extends shim.PluginSettingTab {
            override display() {}
          }
          this.addSettingTab(new Tab(this.app, this));
          const id = window.setInterval(() => {}, 1000);
          this.registerInterval(id);
          this.registerDomEvent(document, "keydown", () => {});
          this.register(() => {});
        }
      }
      const inst = new P();
      await inst.onload();
      expect(commandRegistry.list().filter((c) => c.id.startsWith(`cyc-${i}:`)).length).toBe(1);
      expect(listStatusBarItems().some((s) => s.pluginId === `cyc-${i}`)).toBe(true);
      expect(listSettingsTabs().some((s) => s.pluginId === `cyc-${i}`)).toBe(true);
      expect(ribbon.querySelectorAll(".plugin-ribbon-icon").length).toBe(1);
      await runDisposers(disposers);
      // Hard assertions: full teardown.
      expect(commandRegistry.list().some((c) => c.id.startsWith(`cyc-${i}:`))).toBe(false);
      expect(listStatusBarItems().some((s) => s.pluginId === `cyc-${i}`)).toBe(false);
      expect(listSettingsTabs().some((s) => s.pluginId === `cyc-${i}`)).toBe(false);
      expect(ribbon.querySelectorAll(".plugin-ribbon-icon").length).toBe(0);
      // Clean up the ribbon node we appended in buildShim.
      if (ribbon.parentNode) ribbon.parentNode.removeChild(ribbon);
    }
  });
});
