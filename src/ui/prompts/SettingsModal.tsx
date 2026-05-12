import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import {
  addUserHotkey,
  captureHotkey,
  clearUserHotkey,
  formatHotkey,
  getEffectiveHotkeys,
  getUserHotkeys,
  removeUserHotkey,
  subscribeHotkeys,
} from "@core/commands/hotkeys";
import { getDailyNotesSettings, setDailyNotesSettings } from "@core/plugins-core/daily-notes";
import { getTemplatesSettings, setTemplatesSettings } from "@core/plugins-core/templates";
import {
  type SettingsTabSpec,
  listSettingsTabs,
  subscribeSettingsTabs,
} from "@core/plugins/host-registries";
import { listPlugins, setPluginEnabled, subscribe as subscribePlugins } from "@core/plugins/loader";
import { settingsStore } from "@core/settings/store";
import { useSettings } from "@core/settings/useSettings";
import { listSnippets, setEnabled, subscribe as subscribeSnippets } from "@core/snippets/loader";
import {
  activeThemePath,
  listThemes,
  setActiveTheme,
  subscribe as subscribeThemes,
} from "@core/themes/loader";
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Modal } from "../overlay/Modal";
import { type ThemeMode, useTheme } from "../theme/ThemeProvider";
import { type SettingsSectionId, getVisibleSettingsSections } from "./settings-filter";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSectionId>("appearance");
  const [settingsFilter, setSettingsFilter] = useState("");
  const settings = useSettings();
  const theme = useTheme();
  const [dailyNotes, setDailyNotes] = useState(() => getDailyNotesSettings());
  const [templates, setTemplates] = useState(() => getTemplatesSettings());
  const snippets = useSyncExternalStore(subscribeSnippets, listSnippets, listSnippets);
  const themes = useSyncExternalStore(subscribeThemes, listThemes, listThemes);
  const activeTheme = useSyncExternalStore(
    subscribeThemes,
    () => activeThemePath(),
    () => activeThemePath(),
  );
  const plugins = useSyncExternalStore(subscribePlugins, listPlugins, listPlugins);
  const pluginSettingsTabs = useSyncExternalStore(
    subscribeSettingsTabs,
    listSettingsTabs,
    listSettingsTabs,
  );
  const commands = useSyncExternalStore(
    (listener) => commandRegistry.subscribe(listener),
    () => commandRegistry.list(),
    () => commandRegistry.list(),
  );
  const hotkeyVersion = useSyncExternalStore(subscribeHotkeys, getHotkeyVersion, getHotkeyVersion);
  const visibleSections = useMemo(
    () => getVisibleSettingsSections(settingsFilter, pluginSettingsTabs),
    [pluginSettingsTabs, settingsFilter],
  );
  const visibleSectionIds = useMemo(
    () => new Set(visibleSections.map((s) => s.id)),
    [visibleSections],
  );
  const visibleOptionSections = visibleSections.filter((s) => s.group === "options");
  const visiblePluginOptionSections = visibleSections.filter((s) => s.group === "plugin-options");

  // If the user is sitting on a plugin tab that just unregistered, fall back
  // to the appearance tab so the content area never points at nothing.
  useEffect(() => {
    if (!section.startsWith("plugin:")) return;
    const stillExists = pluginSettingsTabs.some((t) => `plugin:${t.id}` === section);
    if (!stillExists) setSection("appearance");
  }, [pluginSettingsTabs, section]);

  useEffect(() => {
    if (visibleSections.length === 0) return;
    const firstVisible = visibleSections[0];
    if (firstVisible && !visibleSectionIds.has(section)) setSection(firstVisible.id);
  }, [section, visibleSectionIds, visibleSections]);

  const updateDaily = (patch: Partial<typeof dailyNotes>) => {
    const next = { ...dailyNotes, ...patch };
    setDailyNotes(next);
    setDailyNotesSettings(next);
  };
  const updateTemplates = (patch: Partial<typeof templates>) => {
    const next = { ...templates, ...patch };
    setTemplates(next);
    setTemplatesSettings(next);
  };

  const activePluginTab = section.startsWith("plugin:")
    ? (pluginSettingsTabs.find((t) => `plugin:${t.id}` === section) ?? null)
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="Settings"
      modifier="mod-sidebar-layout mod-settings"
    >
      <div className="vertical-tabs-container">
        <div className="vertical-tab-header">
          <div className="settings-search-container">
            <input
              type="search"
              placeholder="Search settings"
              value={settingsFilter}
              onChange={(e) => setSettingsFilter(e.currentTarget.value)}
            />
          </div>
          <div className="vertical-tab-header-group">
            <div className="vertical-tab-header-group-title">Options</div>
            <div className="vertical-tab-header-group-items">
              {visibleOptionSections.map((item) => (
                <SettingsTab key={item.id} id={item.id} current={section} onChange={setSection}>
                  {item.title}
                </SettingsTab>
              ))}
            </div>
          </div>
          {visiblePluginOptionSections.length > 0 && (
            <div className="vertical-tab-header-group">
              <div className="vertical-tab-header-group-title">Plugin options</div>
              <div className="vertical-tab-header-group-items">
                {visiblePluginOptionSections.map((item) => (
                  <SettingsTab key={item.id} id={item.id} current={section} onChange={setSection}>
                    {item.title}
                  </SettingsTab>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="vertical-tab-content-container">
          <div className="vertical-tab-content">
            {visibleSections.length === 0 && (
              <div style={{ color: "var(--text-faint)" }}>No settings match your search.</div>
            )}
            {visibleSectionIds.has(section) && section === "appearance" && (
              <>
                <h2>Appearance</h2>
                <SettingItem
                  name="Base color scheme"
                  desc="Choose between light, dark, or follow the operating system."
                  control={
                    <select
                      className="dropdown"
                      value={theme.mode}
                      onChange={(e) => theme.setMode(e.currentTarget.value as ThemeMode)}
                    >
                      <option value="system">Adapt to system</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  }
                />
                <SettingItem
                  name="Accent color"
                  desc="Used for links, focused buttons, selection highlights."
                  control={
                    <input
                      type="color"
                      value={hslToHex(theme.accent.h, theme.accent.s, theme.accent.l)}
                      onChange={(e) => {
                        const { h, s, l } = hexToHsl(e.currentTarget.value);
                        theme.setAccent({ h, s, l });
                      }}
                    />
                  }
                />
                <SettingItem
                  name="Editor font size"
                  desc={`${settings.fontSize}px`}
                  control={
                    <input
                      type="range"
                      min={12}
                      max={24}
                      step={1}
                      value={settings.fontSize}
                      onChange={(e) =>
                        settingsStore.update({ fontSize: Number(e.currentTarget.value) })
                      }
                    />
                  }
                />
                <SettingItem
                  name="High contrast"
                  desc="Stronger text/border contrast and bigger focus rings for accessibility."
                  control={
                    <Toggle
                      checked={theme.highContrast}
                      onChange={(v) => theme.setHighContrast(v)}
                    />
                  }
                />
                <SettingItem
                  name="Translucent window"
                  desc="Drop the workspace background to transparent so the host window can blur whatever sits behind it. Has no visible effect in a regular browser tab; useful as a PWA install."
                  control={
                    <Toggle
                      checked={settings.translucent}
                      onChange={(v) => settingsStore.update({ translucent: v })}
                    />
                  }
                />

                <h2 style={{ marginTop: "var(--size-4-8)" }}>Themes</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  Drop a <code>.css</code> file in <code>.granite/themes/</code> at the vault root
                  and select it below to apply it as the active theme.
                </p>
                <SettingItem
                  name="Active theme"
                  desc={
                    themes.length === 0
                      ? "No themes found in .granite/themes/."
                      : `${themes.length} theme${themes.length === 1 ? "" : "s"} available.`
                  }
                  control={
                    <select
                      className="dropdown"
                      value={activeTheme ?? ""}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        void setActiveTheme(
                          v === "" ? null : (v as (typeof themes)[number]["path"]),
                        );
                      }}
                      disabled={themes.length === 0}
                    >
                      <option value="">None (default Granite theme)</option>
                      {themes.map((t) => (
                        <option key={t.path} value={t.path}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  }
                />

                <h2 style={{ marginTop: "var(--size-4-8)" }}>CSS snippets</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  Drop <code>.css</code> files in <code>.granite/snippets/</code> at the vault root
                  to override styles. Toggle them on or off below — changes apply instantly.
                </p>
                {snippets.length === 0 ? (
                  <div style={{ color: "var(--text-faint)" }}>No snippets found.</div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--size-4-2)",
                    }}
                  >
                    {snippets.map((s) => (
                      <SettingItem
                        key={s.path}
                        name={s.name}
                        desc={s.path}
                        control={
                          <Toggle
                            checked={s.enabled}
                            onChange={(enabled) => setEnabled(s.path, enabled)}
                          />
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            {visibleSectionIds.has(section) && section === "editor" && (
              <>
                <h2>Editor</h2>
                <SettingItem
                  name="Default view mode for new tabs"
                  desc="Whether opening a note shows source or reading view first."
                  control={
                    <select
                      className="dropdown"
                      value={settings.defaultViewMode}
                      onChange={(e) =>
                        settingsStore.update({
                          defaultViewMode: e.currentTarget.value as "source" | "reading",
                        })
                      }
                    >
                      <option value="source">Editing (source)</option>
                      <option value="reading">Reading view</option>
                    </select>
                  }
                />
                <SettingItem
                  name="Show line numbers"
                  desc="Display line numbers in the editor gutter."
                  control={
                    <Toggle
                      checked={settings.showLineNumbers}
                      onChange={(v) => settingsStore.update({ showLineNumbers: v })}
                    />
                  }
                />
                <SettingItem
                  name="Readable line length"
                  desc="Constrain editor body width to ~700 px so long lines wrap."
                  control={
                    <Toggle
                      checked={settings.readableLineWidth}
                      onChange={(v) => settingsStore.update({ readableLineWidth: v })}
                    />
                  }
                />
                <SettingItem
                  name="Auto-pair brackets"
                  desc="Automatically close (), [], {}, and quotes."
                  control={
                    <Toggle
                      checked={settings.autoPairBrackets}
                      onChange={(v) => settingsStore.update({ autoPairBrackets: v })}
                    />
                  }
                />
                <SettingItem
                  name="Spellcheck"
                  desc="Use the browser's native spellcheck inside the source editor."
                  control={
                    <Toggle
                      checked={settings.spellcheck}
                      onChange={(v) => settingsStore.update({ spellcheck: v })}
                    />
                  }
                />
                <SettingItem
                  name="Live preview"
                  desc="Hide markdown formatting characters (**bold**, ==highlight==, [[wikilink]] brackets) on lines without the cursor. The cursor line always stays raw so you can edit."
                  control={
                    <Toggle
                      checked={settings.livePreview}
                      onChange={(v) => settingsStore.update({ livePreview: v })}
                    />
                  }
                />
                <SettingItem
                  name="Editor key bindings"
                  desc="Choose standard browser-style editing keys or Vim normal/insert/visual mode."
                  control={
                    <select
                      className="dropdown"
                      value={settings.editorKeymap}
                      onChange={(e) =>
                        settingsStore.update({
                          editorKeymap: e.currentTarget.value as "standard" | "vim",
                        })
                      }
                    >
                      <option value="standard">Standard</option>
                      <option value="vim">Vim</option>
                    </select>
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "files" && (
              <>
                <h2>Files & links</h2>
                <SettingItem
                  name="Default folder for new notes"
                  desc="Path within the vault. Empty means the vault root."
                  control={
                    <input
                      type="text"
                      placeholder="(vault root)"
                      value={settings.newNoteFolder}
                      onChange={(e) =>
                        settingsStore.update({ newNoteFolder: e.currentTarget.value })
                      }
                    />
                  }
                />
                <SettingItem
                  name="Attachments folder"
                  desc="Folder where pasted / dropped files are saved. Empty means the vault root."
                  control={
                    <input
                      type="text"
                      placeholder="attachments"
                      value={settings.attachmentsFolder}
                      onChange={(e) =>
                        settingsStore.update({ attachmentsFolder: e.currentTarget.value })
                      }
                    />
                  }
                />
                <SettingItem
                  name="Confirm file deletion"
                  desc="Ask before deleting files from the file explorer."
                  control={
                    <Toggle
                      checked={settings.confirmFileDeletion}
                      onChange={(v) => settingsStore.update({ confirmFileDeletion: v })}
                    />
                  }
                />
                <SettingItem
                  name="Deleted files"
                  desc="Choose whether deletes use the OS trash, the vault .trash folder, or permanent deletion."
                  control={
                    <select
                      className="dropdown"
                      value={settings.deletedFiles}
                      onChange={(e) =>
                        settingsStore.update({
                          deletedFiles: e.currentTarget.value as "system" | "vault" | "permanent",
                        })
                      }
                    >
                      <option value="system">System trash</option>
                      <option value="vault">Vault trash (.trash)</option>
                      <option value="permanent">Permanently delete</option>
                    </select>
                  }
                />
                <SettingItem
                  name="Show nested tags"
                  desc="Display slash-separated tags as a hierarchy in the Tags sidebar."
                  control={
                    <Toggle
                      checked={settings.showNestedTags}
                      onChange={(v) => settingsStore.update({ showNestedTags: v })}
                    />
                  }
                />
                <SettingItem
                  name="Excluded files"
                  desc={
                    "One pattern per line. A bare name (e.g. `archive`) matches any segment; `**` crosses directories. Comment lines start with `#`. Excluded files don't appear in the file explorer, switcher, search, or metadata cache."
                  }
                  control={
                    <textarea
                      rows={5}
                      value={settings.excludedFiles}
                      onChange={(e) =>
                        settingsStore.update({ excludedFiles: e.currentTarget.value })
                      }
                      placeholder={"archive\n*.tmp\nprivate/**"}
                      style={{
                        width: 280,
                        fontFamily: "var(--font-monospace)",
                        fontSize: "var(--font-ui-smaller)",
                      }}
                    />
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "hotkeys" && (
              <>
                <h2>Hotkeys</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  Click <em>Edit</em> on a row to capture the next keypress and save it as a user
                  override. Press <kbd>Esc</kbd> while capturing to cancel. Use <em>Reset</em> to
                  remove the override and restore the default.
                </p>
                <HotkeyTable key={hotkeyVersion} commands={commands} />
              </>
            )}
            {visibleSectionIds.has(section) && section === "plugins" && (
              <>
                <h2>Plugins</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  Drop plugin folders in <code>.granite/plugins/</code> at the vault root. Each
                  folder needs a <code>manifest.json</code> (with <code>name</code>,{" "}
                  <code>version</code>) and a <code>main.js</code>. Plugins are disabled by default
                  — flip the toggle to enable. Disabling a plugin calls its <code>onUnload</code>{" "}
                  hook.
                </p>
                <div
                  style={{
                    marginBottom: "var(--size-4-3)",
                    display: "flex",
                    gap: "var(--size-4-2)",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="mod-cta"
                    onClick={() => void commandRegistry.run("plugins:install-from-url")}
                  >
                    Install plugin from URL…
                  </button>
                  <button
                    type="button"
                    onClick={() => void commandRegistry.run("plugins:check-updates")}
                  >
                    Check for updates
                  </button>
                </div>
                {plugins.length === 0 ? (
                  <div style={{ color: "var(--text-faint)" }}>No plugins found.</div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--size-4-2)",
                    }}
                  >
                    {plugins.map((p) => (
                      <SettingItem
                        key={p.manifest.id}
                        name={`${p.manifest.name} · v${p.manifest.version}`}
                        desc={p.manifest.description ?? p.manifest.id}
                        control={
                          <Toggle
                            checked={p.enabled}
                            onChange={(enabled) => void setPluginEnabled(p.manifest.id, enabled)}
                          />
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            {visibleSectionIds.has(section) && section === "daily-notes" && (
              <>
                <h2>Daily notes</h2>
                <SettingItem
                  name="Date format"
                  desc="Moment-style tokens: YYYY YY MM DD HH mm. Slashes create subfolders."
                  control={
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={dailyNotes.format}
                      onChange={(e) => updateDaily({ format: e.currentTarget.value })}
                    />
                  }
                />
                <SettingItem
                  name="New file location"
                  desc="Folder for daily notes. Empty = vault root."
                  control={
                    <input
                      type="text"
                      placeholder="(vault root)"
                      value={dailyNotes.folder}
                      onChange={(e) => updateDaily({ folder: e.currentTarget.value })}
                    />
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "templates" && (
              <>
                <h2>Templates</h2>
                <SettingItem
                  name="Template folder location"
                  desc="Folder containing your template `.md` files."
                  control={
                    <input
                      type="text"
                      placeholder="(no folder set)"
                      value={templates.templateFolder}
                      onChange={(e) => updateTemplates({ templateFolder: e.currentTarget.value })}
                    />
                  }
                />
                <SettingItem
                  name="Date format"
                  desc="Used by the {{date}} template token."
                  control={
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={templates.dateFormat}
                      onChange={(e) => updateTemplates({ dateFormat: e.currentTarget.value })}
                    />
                  }
                />
                <SettingItem
                  name="Time format"
                  desc="Used by the {{time}} template token."
                  control={
                    <input
                      type="text"
                      placeholder="HH:mm"
                      value={templates.timeFormat}
                      onChange={(e) => updateTemplates({ timeFormat: e.currentTarget.value })}
                    />
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && activePluginTab && (
              <PluginSettingsTabHost spec={activePluginTab} />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PluginSettingsTabHost({ spec }: { spec: SettingsTabSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    let cleanup: undefined | (() => void);
    try {
      const renderCleanup = spec.render(el);
      cleanup = typeof renderCleanup === "function" ? renderCleanup : undefined;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[granite] settings tab "${spec.name}" render failed:`, err);
      el.textContent = `Error rendering tab: ${err instanceof Error ? err.message : String(err)}`;
    }
    return () => {
      if (typeof cleanup === "function") {
        try {
          cleanup();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[granite] settings tab "${spec.name}" cleanup failed:`, err);
        }
      }
      el.innerHTML = "";
    };
  }, [spec]);
  return (
    <>
      <h2>{spec.name}</h2>
      <div ref={ref} />
    </>
  );
}

function HotkeyTable({ commands }: { commands: ReadonlyArray<Command> }) {
  const sorted = [...commands].sort(
    (a, b) => (a.category ?? "").localeCompare(b.category ?? "") || a.name.localeCompare(b.name),
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: "var(--font-ui-small)",
      }}
    >
      {sorted.map((cmd) => (
        <HotkeyRow key={cmd.id} cmd={cmd} />
      ))}
    </div>
  );
}

function HotkeyRow({ cmd }: { cmd: Command }) {
  const [capturing, setCapturing] = useState(false);
  const overrides = getUserHotkeys(cmd.id);
  const effective = getEffectiveHotkeys(cmd.id);
  const lastOverride = overrides.at(-1);
  const onEdit = async () => {
    setCapturing(true);
    try {
      const captured = await captureHotkey();
      if (captured) addUserHotkey(cmd.id, captured);
    } finally {
      setCapturing(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--size-4-2)",
        padding: "var(--size-2-3) var(--size-4-2)",
        borderRadius: "var(--radius-s)",
        background: "var(--background-primary-alt)",
      }}
    >
      {cmd.category && (
        <span
          style={{
            color: "var(--text-faint)",
            minWidth: 100,
            fontSize: "var(--font-ui-smaller)",
          }}
        >
          {cmd.category}
        </span>
      )}
      <span style={{ flex: "1 1 auto", color: "var(--text-normal)" }}>{cmd.name}</span>
      <span
        style={{
          color: overrides.length > 0 ? "var(--text-accent)" : "var(--text-muted)",
          fontFamily: "var(--font-monospace)",
          fontSize: "var(--font-ui-smaller)",
          minWidth: 180,
          textAlign: "right",
        }}
      >
        {capturing
          ? "Press a key…"
          : effective.length > 0
            ? effective.map(formatHotkey).join(", ")
            : "—"}
      </span>
      <button
        type="button"
        onClick={() => void onEdit()}
        disabled={capturing}
        style={{ minWidth: 64 }}
      >
        Add
      </button>
      {lastOverride && (
        <button
          type="button"
          onClick={() => removeUserHotkey(cmd.id, lastOverride)}
          disabled={capturing}
          style={{ minWidth: 64 }}
        >
          Remove
        </button>
      )}
      <button
        type="button"
        onClick={() => clearUserHotkey(cmd.id)}
        disabled={overrides.length === 0}
        style={{ minWidth: 64 }}
      >
        Reset
      </button>
    </div>
  );
}

function SettingsTab({
  id,
  current,
  onChange,
  children,
}: {
  id: SettingsSectionId;
  current: SettingsSectionId;
  onChange: (s: SettingsSectionId) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`vertical-tab-nav-item${current === id ? " is-active" : ""}`}
      onClick={() => onChange(id)}
    >
      <span className="vertical-tab-nav-item-title">{children}</span>
    </button>
  );
}

function SettingItem({
  name,
  desc,
  control,
}: {
  name: string;
  desc?: string;
  control: ReactNode;
}) {
  return (
    <div className="setting-item">
      <div className="setting-item-info">
        <div className="setting-item-name">{name}</div>
        {desc && <div className="setting-item-description">{desc}</div>}
      </div>
      <div className="setting-item-control">{control}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={`checkbox-container${checked ? " is-enabled" : ""}`}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
    </div>
  );
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) =>
    Math.round(255 * (lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  const r = f(0).toString(16).padStart(2, "0");
  const g = f(8).toString(16).padStart(2, "0");
  const b = f(4).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  const raw = m?.[1];
  if (!raw) return { h: 258, s: 88, l: 66 };
  const v = Number.parseInt(raw, 16);
  const r = ((v >> 16) & 0xff) / 255;
  const g = ((v >> 8) & 0xff) / 255;
  const b = (v & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

let _hotkeyVersion = 0;
function getHotkeyVersion(): number {
  return _hotkeyVersion;
}
subscribeHotkeys(() => {
  _hotkeyVersion += 1;
});
