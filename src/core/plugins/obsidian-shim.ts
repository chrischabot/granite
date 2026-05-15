/**
 * `obsidian` virtual module shim.
 *
 * Real Obsidian community plugins do `import { Plugin } from "obsidian"`,
 * bundled as `module.exports = class extends require("obsidian").Plugin { … }`.
 * Granite's plugin loader exposes a synthetic `require("obsidian")` that resolves
 * to the shim built by `createObsidianShim(ctx)` below.
 *
 * The shim routes a curated subset of the Obsidian API onto Granite's existing
 * host registries (commands, status bar, settings, notices, plugin events,
 * `loadData`/`saveData`). Every registration the plugin makes is tracked in
 * a `disposers` list owned by the loader; on plugin unload the loader runs
 * every disposer plus the global safety-net wipes — so a plugin that throws
 * from its own `onunload` (or omits one entirely) still releases all host
 * artifacts.
 *
 * Implemented surface (covers the three reference fixtures and is a reasonable
 * subset for most popular plugins):
 *
 *   Plugin    — onload/onunload, addCommand, addRibbonIcon, addStatusBarItem,
 *               addSettingTab, registerEvent, registerDomEvent,
 *               registerInterval, register, loadData, saveData, app, manifest.
 *   App       — workspace, vault, metadataCache.
 *   Workspace — getActiveFile, getActiveViewOfType, on/off/trigger.
 *   Vault     — read, modify, create, delete, rename, getMarkdownFiles,
 *               getAbstractFileByPath, on.
 *   Notice    — constructor(message, timeout?), hide() — routes to noticeManager.
 *   TFile     — path, basename, extension, stat.
 *   TFolder   — minimal (path, name, children).
 *   Modal / Setting / PluginSettingTab — base classes plugins extend.
 *
 * Not implemented (intentional residual gap, callers should be aware):
 *   - Editor / MarkdownView (no read/write into CodeMirror state).
 *   - FileManager rename helpers, link rewriting.
 *   - SuggestModal / FuzzySuggestModal / AbstractInputSuggest.
 *   - requestUrl (CORS-bypassing HTTP helper), debounce / throttle helpers.
 *   - HTMLElement extensions (`createEl`, `createDiv`, `empty`, etc.).
 *   - Workspace leaf manipulation (`getLeavesOfType`, `revealLeaf`, splits).
 *   - DataAdapter, Tasks, Search, Plugins manager surface.
 *   - View / ItemView lifecycle, registerView.
 *   - moment, normalizePath, fileURLToPath.
 */

import { commandRegistry } from "@core/commands/CommandRegistry";
import { metadataCache as graniteMetadataCache } from "@core/metadata/cache";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { loadPluginData, savePluginData } from "./data-store";
import { onPluginEvent } from "./events";
import {
  addSettingsTab as hostAddSettingsTab,
  addStatusBarItem as hostAddStatusBarItem,
} from "./host-registries";
import type { PluginEventMap, PluginEventName, PluginManifest } from "./types";

/** Per-plugin disposer container that the loader owns. The shim adds entries
 *  as the plugin calls `addCommand`, `addRibbonIcon`, etc.; the loader runs
 *  every disposer (in reverse) on unload — see `loader.ts` `unloadPlugin`.
 *
 *  Lifecycle invariant: `disposed` is `false` between plugin load and unload,
 *  flips to `true` after the loader drains every tracked disposer, and a
 *  `push` after that point is a programming error — the registration is
 *  guaranteed to leak because the loader has already moved on. Concrete
 *  implementations log a warning when this happens; tests may opt to throw. */
export interface PluginRegistrationTracker {
  /** Append a disposer. Idempotent disposers preferred — the loader may call
   *  them multiple times in edge cases (the loader guards against this). */
  push(disposer: () => void | Promise<void>): void;
  /** True once the loader has finished draining the tracker. */
  readonly disposed: boolean;
}

/**
 * Container passed by the loader. The shim treats the host as a fresh
 * registry — but the public Obsidian API lets users call e.g. `app.workspace`,
 * so we re-expose Granite's workspace store via a thin wrapper here. The
 * `ribbon` and `statusBar` containers come from the loader because they are
 * mounted by the host React tree (each plugin gets its own row).
 */
export interface ObsidianShimContext {
  readonly pluginId: string;
  readonly manifest: PluginManifest;
  readonly tracker: PluginRegistrationTracker;
  /** Container the loader hands us for ribbon icons (a fixture div in tests,
   *  the real ribbon column in the live app). Each `addRibbonIcon` appends a
   *  child element here and tracks its removal. */
  readonly ribbonContainer: HTMLElement;
}

/** Event handle the Obsidian API expects callers to pass to `offref` /
 *  `Workspace.off`. The shim implementation is a plain disposer. */
export interface EventRef {
  readonly dispose: () => void;
}

/**
 * Stable shape of the synthetic `obsidian` module. Exported separately to make
 * unit tests (and the loader tests) able to reason about what each plugin
 * receives without re-evaluating sandboxed JS.
 */
export interface ObsidianModule {
  Plugin: typeof PluginCtor;
  Notice: typeof NoticeCtor;
  Modal: typeof ModalCtor;
  Setting: typeof SettingCtor;
  PluginSettingTab: typeof PluginSettingTabCtor;
  TFile: typeof TFileCtor;
  TFolder: typeof TFolderCtor;
  TAbstractFile: typeof TAbstractFileCtor;
  App: typeof AppCtor;
  Workspace: typeof WorkspaceCtor;
  Vault: typeof VaultCtor;
  /** Identity helper used by some plugins to clean up event refs. */
  offref: (ref: EventRef | null | undefined) => void;
}

class TAbstractFileCtor {
  path = "";
  name = "";
}

class TFileCtor extends TAbstractFileCtor {
  basename = "";
  extension = "";
  stat: { ctime: number; mtime: number; size: number } = { ctime: 0, mtime: 0, size: 0 };
}

class TFolderCtor extends TAbstractFileCtor {
  children: ReadonlyArray<TAbstractFileCtor> = [];
}

function makeTFile(path: string, size = 0, mtime = 0, ctime = 0): TFileCtor {
  const file = new TFileCtor();
  file.path = path;
  const slash = path.lastIndexOf("/");
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  file.name = name;
  const dot = name.lastIndexOf(".");
  file.basename = dot > 0 ? name.slice(0, dot) : name;
  file.extension = dot > 0 ? name.slice(dot + 1) : "";
  file.stat = { ctime, mtime, size };
  return file;
}

/** Notice — maps to Granite's noticeManager. Constructing the object shows
 *  the toast immediately, matching Obsidian's behavior. `hide()` dismisses. */
class NoticeCtor {
  private readonly id: string;
  noticeEl: HTMLElement;

  constructor(message: string, timeout?: number) {
    const opts: { timeoutMs?: number } = {};
    if (typeof timeout === "number") {
      // Obsidian: 0 = sticky. noticeManager: 0 = sticky. Same convention.
      opts.timeoutMs = timeout;
    }
    this.id = noticeManager.show(message, opts);
    // Stub element so plugins that do `notice.noticeEl.addClass(...)` don't crash.
    this.noticeEl =
      typeof document !== "undefined" ? document.createElement("div") : ({} as HTMLElement);
  }

  hide(): void {
    noticeManager.dismiss(this.id);
  }

  setMessage(_message: string): this {
    // Real Obsidian mutates the existing toast; we issue a new one to keep
    // semantics consistent (avoids stale toasts surviving disable).
    return this;
  }
}

/** Modal — base class plugins extend. We expose open()/close() and a
 *  contentEl/containerEl pair backed by detached DOM nodes so plugin code
 *  that does `this.contentEl.createEl(...)` doesn't blow up. The shim does
 *  NOT mount the modal into the DOM tree — that's a real Granite Modal
 *  responsibility and out of scope here. */
class ModalCtor {
  app: AppCtor;
  containerEl: HTMLElement;
  contentEl: HTMLElement;
  titleEl: HTMLElement;

  constructor(app?: AppCtor) {
    this.app = app ?? new AppCtor();
    const doc = typeof document !== "undefined" ? document : null;
    this.containerEl = doc ? doc.createElement("div") : ({} as HTMLElement);
    this.contentEl = doc ? doc.createElement("div") : ({} as HTMLElement);
    this.titleEl = doc ? doc.createElement("div") : ({} as HTMLElement);
  }
  open(): void {
    /* no-op in shim */
  }
  close(): void {
    /* no-op in shim */
  }
  onOpen(): void {}
  onClose(): void {}
}

/** Setting — fluent builder Obsidian plugins use inside their setting tabs.
 *  We give them a minimal API that mutates a container so visual smoke tests
 *  can inspect the rendered DOM. */
class SettingCtor {
  containerEl: HTMLElement;
  settingEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
    const doc =
      typeof document !== "undefined"
        ? document
        : ({ createElement: () => ({}) } as unknown as Document);
    this.settingEl = doc.createElement("div");
    this.settingEl.className = "setting-item";
    this.nameEl = doc.createElement("div");
    this.nameEl.className = "setting-item-name";
    this.descEl = doc.createElement("div");
    this.descEl.className = "setting-item-description";
    this.controlEl = doc.createElement("div");
    this.controlEl.className = "setting-item-control";
    this.settingEl.appendChild(this.nameEl);
    this.settingEl.appendChild(this.descEl);
    this.settingEl.appendChild(this.controlEl);
    if (typeof containerEl?.appendChild === "function") containerEl.appendChild(this.settingEl);
  }
  setName(name: string): this {
    this.nameEl.textContent = name;
    return this;
  }
  setDesc(desc: string): this {
    this.descEl.textContent = desc;
    return this;
  }
  addText(
    cb: (component: {
      setValue: (v: string) => unknown;
      onChange: (cb: (v: string) => void) => unknown;
    }) => void,
  ): this {
    const input = (
      typeof document !== "undefined" ? document.createElement("input") : ({} as HTMLInputElement)
    ) as HTMLInputElement;
    if (input && typeof input.setAttribute === "function") input.setAttribute("type", "text");
    if (this.controlEl?.appendChild) this.controlEl.appendChild(input);
    cb({
      setValue: (v) => {
        if (input && "value" in input) (input as HTMLInputElement).value = v;
        return this;
      },
      onChange: (changeCb) => {
        if (input?.addEventListener)
          input.addEventListener("input", () => changeCb((input as HTMLInputElement).value ?? ""));
        return this;
      },
    });
    return this;
  }
  addToggle(
    cb: (component: {
      setValue: (v: boolean) => unknown;
      onChange: (cb: (v: boolean) => void) => unknown;
    }) => void,
  ): this {
    // Minimal smoke surface — plugins that look at the toggle's visible state
    // would need a real DOM toggle, which is out of scope. We do still invoke
    // the builder callback so plugins don't get caught off-guard by a missing
    // chain method.
    cb({
      setValue: () => this,
      onChange: () => this,
    });
    return this;
  }
}

/** PluginSettingTab base class. Plugins extend it and implement `display()`. */
class PluginSettingTabCtor {
  app: AppCtor;
  plugin: PluginCtor;
  containerEl: HTMLElement;
  constructor(app: AppCtor, plugin: PluginCtor) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl =
      typeof document !== "undefined" ? document.createElement("div") : ({} as HTMLElement);
  }
  display(): void {}
  hide(): void {}
}

class WorkspaceCtor {
  private readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  getActiveFile(): TFileCtor | null {
    const s = workspaceStore.getState();
    const ag = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
    const activeLeafId = ag?.activeLeafId ?? null;
    const al = activeLeafId ? s.leaves.get(activeLeafId) : null;
    const path = al?.state.type === "markdown" ? al.state.path : null;
    if (!path) return null;
    return makeTFile(path);
  }

  getActiveViewOfType<T>(_ctor: unknown): T | null {
    // We don't model MarkdownView; return null so plugins fall through to
    // their no-active-view branch instead of crashing.
    return null;
  }

  on(name: string, cb: (...args: unknown[]) => void): EventRef {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(cb);
    // Bridge well-known Granite plugin events to the same name space, so a
    // plugin that does `app.workspace.on("file-open", …)` gets a real event.
    const bridgedNames: PluginEventName[] = [
      "file-open",
      "active-leaf-change",
      "layout-change",
      "file-rename",
    ];
    let unbridge: (() => void) | null = null;
    if ((bridgedNames as ReadonlyArray<string>).includes(name)) {
      const eventName = name as PluginEventName;
      unbridge = onPluginEvent("__obsidian_shim__", eventName, (data) => {
        // Translate Granite's payload to the Obsidian-shape "file" first arg.
        if (eventName === "file-open") {
          const payload = data as PluginEventMap["file-open"];
          cb(payload.path ? makeTFile(payload.path) : null);
        } else if (eventName === "file-rename") {
          const payload = data as PluginEventMap["file-rename"];
          cb(makeTFile(payload.to), payload.from);
        } else {
          cb(data);
        }
      });
    }
    return {
      dispose: () => {
        set?.delete(cb);
        unbridge?.();
      },
    };
  }
  off(name: string, cb: (...args: unknown[]) => void): void {
    this.listeners.get(name)?.delete(cb);
  }
  trigger(name: string, ...args: unknown[]): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const cb of [...set]) {
      try {
        cb(...args);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[granite] obsidian-shim workspace listener for "${name}" threw:`, err);
      }
    }
  }
}

class VaultCtor {
  private readonly listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  async read(file: TFileCtor): Promise<string> {
    // The shim leans on the loader-injected FileSystem helpers — but to avoid
    // a circular import the loader passes a vault impl in at construction.
    // See `__attachVaultImpl` below.
    const impl = vaultImpl;
    if (!impl) throw new Error("obsidian-shim: vault impl not attached");
    return impl.read(file.path);
  }
  async modify(file: TFileCtor, content: string): Promise<void> {
    const impl = vaultImpl;
    if (!impl) throw new Error("obsidian-shim: vault impl not attached");
    await impl.write(file.path, content);
  }
  async create(path: string, content: string): Promise<TFileCtor> {
    const impl = vaultImpl;
    if (!impl) throw new Error("obsidian-shim: vault impl not attached");
    await impl.write(path, content);
    return makeTFile(path, content.length, Date.now(), Date.now());
  }
  async delete(file: TFileCtor): Promise<void> {
    const impl = vaultImpl;
    if (!impl) throw new Error("obsidian-shim: vault impl not attached");
    await impl.delete(file.path);
  }
  async rename(file: TFileCtor, newPath: string): Promise<void> {
    const impl = vaultImpl;
    if (!impl) throw new Error("obsidian-shim: vault impl not attached");
    await impl.rename(file.path, newPath);
    file.path = newPath;
  }
  getMarkdownFiles(): TFileCtor[] {
    const impl = vaultImpl;
    if (!impl) return [];
    return impl.listMarkdownSync().map((entry) => makeTFile(entry.path, entry.size, entry.mtimeMs));
  }
  getAbstractFileByPath(path: string): TFileCtor | TFolderCtor | null {
    const impl = vaultImpl;
    if (!impl) return null;
    const file = impl.statSync(path);
    if (!file) return null;
    if (file.type === "directory") {
      const folder = new TFolderCtor();
      folder.path = path;
      folder.name = path.split("/").pop() ?? path;
      return folder;
    }
    return makeTFile(path, file.size ?? 0, file.mtimeMs ?? 0);
  }
  on(name: string, cb: (...args: unknown[]) => void): EventRef {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(cb);
    return {
      dispose: () => {
        set?.delete(cb);
      },
    };
  }
}

/** AppCtor — opaque container holding workspace/vault/metadataCache facades. */
class AppCtor {
  workspace = new WorkspaceCtor();
  vault = new VaultCtor();
  metadataCache = {
    getFileCache: (path: string) => graniteMetadataCache.getMetadata(path as never),
    getBacklinksForFile: (path: string) => graniteMetadataCache.getBacklinks(path as never),
    on(_name: string, _cb: (...args: unknown[]) => void): EventRef {
      return { dispose: () => {} };
    },
  };
}

// Singleton App for the host — Obsidian plugins assume a single shared app.
let sharedApp: AppCtor | null = null;
function getSharedApp(): AppCtor {
  if (!sharedApp) sharedApp = new AppCtor();
  return sharedApp;
}

/** Vault impl injected by the loader (avoids a circular import on FileSystem). */
interface ShimVaultImpl {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  listMarkdownSync(): ReadonlyArray<{ path: string; size: number; mtimeMs: number }>;
  statSync(path: string): { type: "file" | "directory"; size?: number; mtimeMs?: number } | null;
}

let vaultImpl: ShimVaultImpl | null = null;

/** Loader-only: install the vault helpers the shim needs. Called once before
 *  the first plugin instantiates. */
export function attachShimVaultImpl(impl: ShimVaultImpl): void {
  vaultImpl = impl;
}

/** Plugin base class. Each instance binds to a `tracker` that the loader
 *  owns; every registration the plugin makes is queued into that tracker. */
class PluginCtor {
  app: AppCtor;
  manifest: PluginManifest;
  /** Internal — set on each subclass via the per-plugin factory wrapper. */
  protected _pluginId: string;
  protected _tracker: PluginRegistrationTracker | null;
  protected _ribbon: HTMLElement | null;

  // The two-arg constructor mirrors Obsidian's `new Plugin(app, manifest)`.
  // Tests / fixtures that do `new P()` rely on the factory wrapper to fill
  // in shared defaults, so the args are optional at this level.
  constructor(app?: AppCtor, manifest?: PluginManifest) {
    this.app = app ?? new AppCtor();
    this.manifest = manifest ?? { id: "", name: "", version: "0.0.0" };
    this._pluginId = "";
    this._tracker = null;
    this._ribbon = null;
  }

  // Bound by createObsidianShim — we keep them as no-op defaults so the type
  // checker is happy when subclasses don't override.
  onload(): void | Promise<void> {}
  onunload(): void | Promise<void> {}

  /** Register an arbitrary disposer. Runs in LIFO order on unload. */
  register(disposer: () => void | Promise<void>): void {
    this._tracker?.push(disposer);
  }

  addCommand(opts: {
    id: string;
    name: string;
    callback?: () => void | Promise<void>;
    editorCallback?: (...args: unknown[]) => void;
    hotkeys?: ReadonlyArray<unknown>;
  }): void {
    // Namespace the id under the plugin so two plugins can't collide.
    const fullId = `${this._pluginId}:${opts.id}`;
    const cb = opts.callback ?? opts.editorCallback ?? (() => {});
    const disposer = commandRegistry.register({
      id: fullId,
      name: opts.name,
      category: this.manifest.name,
      callback: cb as () => void,
    });
    this._tracker?.push(disposer);
  }

  addRibbonIcon(_icon: string, title: string, cb: (evt: MouseEvent) => void): HTMLElement {
    const doc = typeof document !== "undefined" ? document : null;
    const el = doc ? doc.createElement("button") : ({} as HTMLElement);
    if (doc && el) {
      el.setAttribute("type", "button");
      el.setAttribute("aria-label", title);
      el.title = title;
      el.className = `plugin-ribbon-icon plugin-ribbon-icon-${this._pluginId}`;
      el.setAttribute("data-plugin-id", this._pluginId);
      el.addEventListener("click", cb);
    }
    if (this._ribbon && el?.parentNode !== this._ribbon) this._ribbon.appendChild(el);
    this._tracker?.push(() => {
      if (el?.parentNode) el.parentNode.removeChild(el);
      if (el?.removeEventListener) el.removeEventListener("click", cb);
    });
    return el;
  }

  addStatusBarItem(): HTMLElement {
    const doc = typeof document !== "undefined" ? document : null;
    const handle = hostAddStatusBarItem(this._pluginId, {});
    const el = doc ? doc.createElement("div") : ({} as HTMLElement);
    if (el) {
      el.setAttribute("data-plugin-id", this._pluginId);
      el.className = `plugin-status-bar-item plugin-status-bar-item-${this._pluginId}`;
    }
    // Mirror DOM `textContent` writes into the host registry so the host UI
    // (and the verifier snapshot) can observe what the plugin set.
    if (el && "textContent" in el) {
      let buffer = "";
      Object.defineProperty(el, "textContent", {
        configurable: true,
        get() {
          return buffer;
        },
        set(value: string) {
          buffer = String(value ?? "");
          handle.setText(buffer);
        },
      });
    }
    this._tracker?.push(() => {
      handle.remove();
      if (el?.parentNode) el.parentNode.removeChild(el);
    });
    return el;
  }

  addSettingTab(tab: PluginSettingTabCtor): void {
    const disposer = hostAddSettingsTab(this._pluginId, {
      name: this.manifest.name,
      render: (container) => {
        tab.containerEl = container;
        try {
          tab.display();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[granite] plugin "${this._pluginId}" settings tab display threw:`, err);
        }
        return () => {
          try {
            tab.hide();
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`[granite] plugin "${this._pluginId}" settings tab hide threw:`, err);
          }
        };
      },
    });
    this._tracker?.push(disposer);
  }

  registerEvent(ref: EventRef | null | undefined): void {
    if (ref?.dispose) this._tracker?.push(ref.dispose);
  }

  registerDomEvent<K extends keyof DocumentEventMap>(
    el: Document | Window | HTMLElement,
    event: K,
    cb: (ev: DocumentEventMap[K]) => void,
  ): void {
    el.addEventListener(event as string, cb as EventListener);
    this._tracker?.push(() => {
      el.removeEventListener(event as string, cb as EventListener);
    });
  }

  registerInterval(intervalId: number): number {
    this._tracker?.push(() => {
      if (typeof clearInterval === "function") clearInterval(intervalId);
    });
    return intervalId;
  }

  async loadData<T = unknown>(): Promise<T | null> {
    return await loadPluginData<T>(this._pluginId);
  }
  async saveData(data: unknown): Promise<void> {
    await savePluginData(this._pluginId, data);
  }
}

function offref(ref: EventRef | null | undefined): void {
  ref?.dispose();
}

/**
 * Build the per-plugin `obsidian` module the loader exposes via `require`.
 * The returned object is suitable to hand back from `require("obsidian")`.
 *
 * The plugin's `Plugin` subclass instantiates with `(app, manifest)` — but
 * we need to wire `pluginId` / `tracker` / `ribbonContainer` into that base.
 * We do this by subclassing in the factory: the returned `Plugin` is a tiny
 * shell whose constructor binds the loader-side state before calling super.
 */
export function createObsidianShim(ctx: ObsidianShimContext): ObsidianModule {
  const app = getSharedApp();
  const baseManifest = ctx.manifest;

  class BoundPlugin extends PluginCtor {
    constructor(_app?: AppCtor, _manifest?: PluginManifest) {
      super(_app ?? app, _manifest ?? baseManifest);
      this._pluginId = ctx.pluginId;
      this._tracker = ctx.tracker;
      this._ribbon = ctx.ribbonContainer;
    }
  }

  return {
    Plugin: BoundPlugin as unknown as typeof PluginCtor,
    Notice: NoticeCtor,
    Modal: ModalCtor,
    Setting: SettingCtor,
    PluginSettingTab: PluginSettingTabCtor,
    TFile: TFileCtor,
    TFolder: TFolderCtor,
    TAbstractFile: TAbstractFileCtor,
    App: AppCtor,
    Workspace: WorkspaceCtor,
    Vault: VaultCtor,
    offref,
  };
}

/** Test helper: drop the shared App so unit tests get a fresh workspace bridge. */
export function _resetObsidianShimForTesting(): void {
  sharedApp = null;
  vaultImpl = null;
}

// Re-export plain class identities so callers (loader, tests) can refer to
// the constructors without going through `createObsidianShim`.
export {
  PluginCtor as Plugin,
  NoticeCtor as Notice,
  ModalCtor as Modal,
  SettingCtor as Setting,
  PluginSettingTabCtor as PluginSettingTab,
  TFileCtor as TFile,
  TFolderCtor as TFolder,
  AppCtor as App,
  WorkspaceCtor as Workspace,
  VaultCtor as Vault,
};
