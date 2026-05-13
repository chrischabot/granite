/**
 * Plugin host registries — status bar items and settings tabs.
 *
 * Plugins call `addStatusBarItem(pluginId, opts)` and `addSettingsTab(pluginId,
 * spec)` (via the `PluginApi` surface in `loader.ts`). The host UI subscribes
 * via `useSyncExternalStore(subscribe*, list*, list*)` and renders the live
 * set. `removeAll*ForPlugin` is the loader's safety net on plugin unload —
 * even if the plugin forgets to call the disposers returned from `add*`, the
 * loader will blast everything attributed to that plugin id.
 */

export interface StatusBarItemSpec {
  readonly id: string;
  readonly pluginId: string;
  readonly text: string;
  readonly tooltip: string | null;
  readonly onClick: (() => void) | null;
}

export interface StatusBarItemHandle {
  readonly id: string;
  setText(text: string): void;
  setTooltip(text: string | null): void;
  setOnClick(fn: (() => void) | null): void;
  remove(): void;
}

export interface SettingsTabSpec {
  readonly id: string;
  readonly pluginId: string;
  readonly name: string;
  readonly render: (container: HTMLElement) => undefined | (() => void);
}

let counter = 0;
const statusItems = new Map<string, StatusBarItemSpec>();
const settingsTabs = new Map<string, SettingsTabSpec>();
const statusSubs = new Set<() => void>();
const settingsSubs = new Set<() => void>();
let statusCache: ReadonlyArray<StatusBarItemSpec> | null = null;
let settingsCache: ReadonlyArray<SettingsTabSpec> | null = null;

function emitStatus(): void {
  statusCache = null;
  for (const cb of statusSubs) cb();
}

function emitSettings(): void {
  settingsCache = null;
  for (const cb of settingsSubs) cb();
}

export function listStatusBarItems(): ReadonlyArray<StatusBarItemSpec> {
  if (statusCache === null) statusCache = [...statusItems.values()];
  return statusCache;
}

export function subscribeStatusBarItems(listener: () => void): () => void {
  statusSubs.add(listener);
  return () => {
    statusSubs.delete(listener);
  };
}

export function addStatusBarItem(
  pluginId: string,
  opts: { text?: string; tooltip?: string; onClick?: () => void } = {},
): StatusBarItemHandle {
  const id = `status-${pluginId}-${(++counter).toString(36)}`;
  statusItems.set(id, {
    id,
    pluginId,
    text: opts.text ?? "",
    tooltip: opts.tooltip ?? null,
    onClick: opts.onClick ?? null,
  });
  emitStatus();
  return {
    id,
    setText(text) {
      const cur = statusItems.get(id);
      if (!cur) return;
      statusItems.set(id, { ...cur, text });
      emitStatus();
    },
    setTooltip(tooltip) {
      const cur = statusItems.get(id);
      if (!cur) return;
      statusItems.set(id, { ...cur, tooltip });
      emitStatus();
    },
    setOnClick(fn) {
      const cur = statusItems.get(id);
      if (!cur) return;
      statusItems.set(id, { ...cur, onClick: fn });
      emitStatus();
    },
    remove() {
      if (statusItems.delete(id)) emitStatus();
    },
  };
}

export function removeAllStatusBarItemsForPlugin(pluginId: string): void {
  let dropped = false;
  for (const [id, spec] of statusItems) {
    if (spec.pluginId === pluginId) {
      statusItems.delete(id);
      dropped = true;
    }
  }
  if (dropped) emitStatus();
}

export function listSettingsTabs(): ReadonlyArray<SettingsTabSpec> {
  if (settingsCache === null) settingsCache = [...settingsTabs.values()];
  return settingsCache;
}

export function subscribeSettingsTabs(listener: () => void): () => void {
  settingsSubs.add(listener);
  return () => {
    settingsSubs.delete(listener);
  };
}

export function addSettingsTab(
  pluginId: string,
  spec: { name: string; render: (container: HTMLElement) => undefined | (() => void) },
): () => void {
  const id = `tab-${pluginId}-${(++counter).toString(36)}`;
  settingsTabs.set(id, {
    id,
    pluginId,
    name: spec.name,
    render: spec.render,
  });
  emitSettings();
  return () => {
    if (settingsTabs.delete(id)) emitSettings();
  };
}

export function removeAllSettingsTabsForPlugin(pluginId: string): void {
  let dropped = false;
  for (const [id, spec] of settingsTabs) {
    if (spec.pluginId === pluginId) {
      settingsTabs.delete(id);
      dropped = true;
    }
  }
  if (dropped) emitSettings();
}

/** Test helper: drop everything. */
export function _resetHostRegistriesForTesting(): void {
  statusItems.clear();
  settingsTabs.clear();
  statusCache = null;
  settingsCache = null;
  emitStatus();
  emitSettings();
}
