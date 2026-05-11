import type { commandRegistry } from "@core/commands/CommandRegistry";
import type { workspaceStore } from "@core/workspace/store";
import type { noticeManager } from "@core/notices/notice";

export interface PluginManifest {
  /** Lowercase identifier; matches the directory name. */
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  /** Path to the main JS file relative to the plugin directory. Defaults to `main.js`. */
  readonly main?: string;
}

/** Object returned from a plugin's `module.exports`. Both lifecycle hooks
 *  receive the plugin API (same instance the loader passes in). */
export interface PluginExports {
  onLoad?: (api: PluginApi) => void | Promise<void>;
  onUnload?: (api: PluginApi) => void | Promise<void>;
}

/** Active-vault metadata exposed to plugins. */
export interface PluginVaultInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: "fsa" | "opfs";
}

/** Vault file helpers. Read/write are scoped to the active vault. */
export interface PluginVaultApi {
  readonly active: PluginVaultInfo;
  /** Read a UTF-8 file from the vault. */
  read: (path: string) => Promise<string>;
  /** Write a UTF-8 file to the vault. */
  write: (path: string, content: string) => Promise<void>;
  /** List markdown files in the vault. */
  listMarkdown: () => Promise<ReadonlyArray<{ path: string; size: number; mtimeMs: number }>>;
}

/** Granite-specific helpers. */
export interface PluginGraniteApi {
  /** Granite version this build identifies as. */
  readonly version: string;
  /** Path of the active CSS theme (within the vault), or null when none is selected. */
  readonly activeThemePath: string | null;
}

/** API surface exposed to plugins. Stable across plugin versions. */
export interface PluginApi {
  readonly commands: typeof commandRegistry;
  readonly workspace: typeof workspaceStore;
  readonly notice: typeof noticeManager;
  readonly vault: PluginVaultApi;
  readonly granite: PluginGraniteApi;
  /** A small `console.log`-style logger, prefixed with the plugin id. */
  readonly log: (...args: unknown[]) => void;
}

export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  readonly enabled: boolean;
  /** When loaded, holds the cleanup callback gathered while the plugin ran. */
  readonly cleanup?: () => void | Promise<void>;
}