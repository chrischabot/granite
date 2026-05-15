import { APP_VERSION } from "@core/app/version";
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
import { showStartupTimingReport } from "@core/perf/startup";
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
import { useI18n } from "../i18n/useI18n";
import { Modal } from "../overlay/Modal";
import { type ThemeMode, useTheme } from "../theme/ThemeProvider";
import {
  type SettingsSectionId,
  type SettingsSectionInfo,
  getVisibleSettingsSections,
} from "./settings-filter";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const t = useI18n();
  const [section, setSection] = useState<SettingsSectionId>("general");
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
      ariaLabel={t("settings.title")}
      modifier="mod-sidebar-layout mod-settings"
    >
      <div className="vertical-tabs-container">
        <div className="vertical-tab-header">
          <div className="settings-search-container">
            <input
              type="search"
              placeholder={t("settings.searchPlaceholder")}
              value={settingsFilter}
              onChange={(e) => setSettingsFilter(e.currentTarget.value)}
            />
          </div>
          <div className="vertical-tab-header-group">
            <div className="vertical-tab-header-group-title">{t("settings.group.options")}</div>
            <div className="vertical-tab-header-group-items">
              {visibleOptionSections.map((item) => (
                <SettingsTab key={item.id} id={item.id} current={section} onChange={setSection}>
                  {settingsSectionTitle(item, t)}
                </SettingsTab>
              ))}
            </div>
          </div>
          {visiblePluginOptionSections.length > 0 && (
            <div className="vertical-tab-header-group">
              <div className="vertical-tab-header-group-title">
                {t("settings.group.pluginOptions")}
              </div>
              <div className="vertical-tab-header-group-items">
                {visiblePluginOptionSections.map((item) => (
                  <SettingsTab key={item.id} id={item.id} current={section} onChange={setSection}>
                    {settingsSectionTitle(item, t)}
                  </SettingsTab>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="vertical-tab-content-container">
          <div className="vertical-tab-content">
            {visibleSections.length === 0 && (
              <div style={{ color: "var(--text-faint)" }}>{t("settings.empty.noMatch")}</div>
            )}
            {visibleSectionIds.has(section) && section === "general" && (
              <>
                <h2>{t("settings.general")}</h2>
                <h3>{t("settings.general.advanced")}</h3>
                <SettingItem
                  name={t("settings.general.notifySlowStartup")}
                  desc={t("settings.general.notifySlowStartupDesc")}
                  control={
                    <Toggle
                      checked={settings.notifySlowStartup}
                      onChange={(v) => settingsStore.update({ notifySlowStartup: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.general.checkStartupTime")}
                  desc={t("settings.general.checkStartupTimeDesc")}
                  control={
                    <button type="button" onClick={() => showStartupTimingReport()}>
                      {t("settings.general.checkStartupTime")}
                    </button>
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "appearance" && (
              <>
                <h2>{t("settings.appearance")}</h2>
                <SettingItem
                  name={t("settings.appearance.baseScheme")}
                  desc={t("settings.appearance.baseSchemeDesc")}
                  control={
                    <select
                      className="dropdown"
                      value={theme.mode}
                      onChange={(e) => theme.setMode(e.currentTarget.value as ThemeMode)}
                    >
                      <option value="system">{t("settings.theme.system")}</option>
                      <option value="light">{t("settings.theme.light")}</option>
                      <option value="dark">{t("settings.theme.dark")}</option>
                    </select>
                  }
                />
                <SettingItem
                  name={t("settings.appearance.accentColor")}
                  desc={t("settings.appearance.accentColorDesc")}
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
                  name={t("settings.appearance.fontSize")}
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
                  name={t("settings.appearance.highContrast")}
                  desc={t("settings.appearance.highContrastDesc")}
                  control={
                    <Toggle
                      checked={theme.highContrast}
                      onChange={(v) => theme.setHighContrast(v)}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.appearance.translucent")}
                  desc={t("settings.appearance.translucentDesc")}
                  control={
                    <Toggle
                      checked={settings.translucent}
                      onChange={(v) => settingsStore.update({ translucent: v })}
                    />
                  }
                />

                <h2 style={{ marginTop: "var(--size-4-8)" }}>{t("settings.appearance.themes")}</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  {t("settings.appearance.themesDesc.before")} <code>.css</code>{" "}
                  {t("settings.appearance.themesDesc.middle")} <code>.granite/themes/</code>{" "}
                  {t("settings.appearance.themesDesc.after")}
                </p>
                <SettingItem
                  name={t("settings.appearance.activeTheme")}
                  desc={
                    themes.length === 0
                      ? t("settings.appearance.noThemes")
                      : t("settings.appearance.themeCount", {
                          count: String(themes.length),
                          themeLabel: t(
                            themes.length === 1
                              ? "settings.appearance.theme"
                              : "settings.appearance.themesPlural",
                          ),
                        })
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
                      <option value="">{t("settings.appearance.defaultTheme")}</option>
                      {themes.map((t) => (
                        <option key={t.path} value={t.path}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  }
                />

                <h2 style={{ marginTop: "var(--size-4-8)" }}>
                  {t("settings.appearance.cssSnippets")}
                </h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  {t("settings.appearance.snippetsDesc.before")} <code>.css</code>{" "}
                  {t("settings.appearance.snippetsDesc.middle")} <code>.granite/snippets/</code>{" "}
                  {t("settings.appearance.snippetsDesc.after")}
                </p>
                {snippets.length === 0 ? (
                  <div style={{ color: "var(--text-faint)" }}>
                    {t("settings.appearance.noSnippets")}
                  </div>
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
                <h2>{t("settings.editor")}</h2>
                <SettingItem
                  name={t("settings.editor.defaultView")}
                  desc={t("settings.editor.defaultViewDesc")}
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
                      <option value="source">{t("settings.editor.view.source")}</option>
                      <option value="reading">{t("settings.editor.view.reading")}</option>
                    </select>
                  }
                />
                <SettingItem
                  name={t("settings.editor.defaultEditingMode")}
                  desc={t("settings.editor.defaultEditingModeDesc")}
                  control={
                    <select
                      className="dropdown"
                      value={settings.defaultEditingMode}
                      onChange={(e) =>
                        settingsStore.update({
                          defaultEditingMode: e.currentTarget.value as "live-preview" | "source",
                        })
                      }
                    >
                      <option value="live-preview">{t("settings.editor.mode.livePreview")}</option>
                      <option value="source">{t("settings.editor.mode.source")}</option>
                    </select>
                  }
                />
                <SettingItem
                  name={t("settings.editor.lineNumbers")}
                  desc={t("settings.editor.lineNumbersDesc")}
                  control={
                    <Toggle
                      checked={settings.showLineNumbers}
                      onChange={(v) => settingsStore.update({ showLineNumbers: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.editor.readableLineLength")}
                  desc={t("settings.editor.readableLineLengthDesc")}
                  control={
                    <Toggle
                      checked={settings.readableLineWidth}
                      onChange={(v) => settingsStore.update({ readableLineWidth: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.editor.autoPair")}
                  desc={t("settings.editor.autoPairDesc")}
                  control={
                    <Toggle
                      checked={settings.autoPairBrackets}
                      onChange={(v) => settingsStore.update({ autoPairBrackets: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.editor.spellcheck")}
                  desc={t("settings.editor.spellcheckDesc")}
                  control={
                    <Toggle
                      checked={settings.spellcheck}
                      onChange={(v) => settingsStore.update({ spellcheck: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.editor.spellcheckLanguages")}
                  desc={t("settings.editor.spellcheckLanguagesDesc")}
                  control={
                    <input
                      className="input"
                      value={settings.spellcheckLanguages}
                      placeholder={t("settings.editor.spellcheckLanguagesPlaceholder")}
                      onChange={(e) =>
                        settingsStore.update({ spellcheckLanguages: e.currentTarget.value })
                      }
                    />
                  }
                />
                <SettingItem
                  name={t("settings.editor.livePreview")}
                  desc={t("settings.editor.livePreviewDesc")}
                  control={
                    <Toggle
                      checked={settings.livePreview}
                      onChange={(v) => settingsStore.update({ livePreview: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.editor.keyBindings")}
                  desc={t("settings.editor.keyBindingsDesc")}
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
                      <option value="standard">{t("settings.editor.keymap.standard")}</option>
                      <option value="vim">{t("settings.editor.keymap.vim")}</option>
                    </select>
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "files" && (
              <>
                <h2>{t("settings.files")}</h2>
                <SettingItem
                  name={t("settings.files.newNoteFolder")}
                  desc={t("settings.files.newNoteFolderDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.files.vaultRootPlaceholder")}
                      value={settings.newNoteFolder}
                      onChange={(e) =>
                        settingsStore.update({ newNoteFolder: e.currentTarget.value })
                      }
                    />
                  }
                />
                <SettingItem
                  name={t("settings.files.attachmentsFolder")}
                  desc={t("settings.files.attachmentsFolderDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.files.attachmentsPlaceholder")}
                      value={settings.attachmentsFolder}
                      onChange={(e) =>
                        settingsStore.update({ attachmentsFolder: e.currentTarget.value })
                      }
                    />
                  }
                />
                <SettingItem
                  name={t("settings.files.confirmDelete")}
                  desc={t("settings.files.confirmDeleteDesc")}
                  control={
                    <Toggle
                      checked={settings.confirmFileDeletion}
                      onChange={(v) => settingsStore.update({ confirmFileDeletion: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.files.deletedFiles")}
                  desc={t("settings.files.deletedFilesDesc")}
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
                      <option value="system">{t("settings.files.trash.system")}</option>
                      <option value="vault">{t("settings.files.trash.vault")}</option>
                      <option value="permanent">{t("settings.files.trash.permanent")}</option>
                    </select>
                  }
                />
                <SettingItem
                  name={t("settings.files.showNestedTags")}
                  desc={t("settings.files.showNestedTagsDesc")}
                  control={
                    <Toggle
                      checked={settings.showNestedTags}
                      onChange={(v) => settingsStore.update({ showNestedTags: v })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.files.excludedFiles")}
                  desc={t("settings.files.excludedFilesDesc")}
                  control={
                    <textarea
                      rows={5}
                      value={settings.excludedFiles}
                      onChange={(e) =>
                        settingsStore.update({ excludedFiles: e.currentTarget.value })
                      }
                      placeholder={t("settings.files.excludedFilesPlaceholder")}
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
                <h2>{t("settings.hotkeys")}</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  {t("settings.hotkeys.desc.beforeEdit")} <em>{t("settings.hotkeys.edit")}</em>{" "}
                  {t("settings.hotkeys.desc.afterEdit")} <kbd>Esc</kbd>{" "}
                  {t("settings.hotkeys.desc.afterEsc")} <em>{t("settings.hotkeys.reset")}</em>{" "}
                  {t("settings.hotkeys.desc.afterReset")}
                </p>
                <HotkeyTable key={hotkeyVersion} commands={commands} />
              </>
            )}
            {visibleSectionIds.has(section) && section === "about" && (
              <>
                <h2>{t("settings.about")}</h2>
                <SettingItem
                  name={t("settings.about.version")}
                  desc={t("settings.about.versionDesc")}
                  control={<code>{APP_VERSION}</code>}
                />
                <SettingItem
                  name={t("settings.about.license")}
                  desc={t("settings.about.licenseDesc")}
                  control={<span>{t("settings.about.licenseValue")}</span>}
                />
                <SettingItem
                  name={t("settings.about.credits")}
                  desc={t("settings.about.creditsDesc")}
                  control={<span>{t("settings.about.creditsValue")}</span>}
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "plugins" && (
              <>
                <h2>{t("settings.plugins")}</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
                  {t("settings.plugins.desc.beforePath")} <code>.granite/plugins/</code>{" "}
                  {t("settings.plugins.desc.afterPath")} <code>manifest.json</code>{" "}
                  {t("settings.plugins.desc.with")} <code>name</code>, <code>version</code>
                  {t("settings.plugins.desc.and")} <code>main.js</code>.{" "}
                  {t("settings.plugins.desc.afterMain")} <code>onUnload</code>{" "}
                  {t("settings.plugins.desc.afterUnload")}
                </p>
                <SettingItem
                  name={t("settings.plugins.restrictedMode")}
                  desc={t("settings.plugins.restrictedModeDesc")}
                  control={
                    <Toggle
                      checked={settings.pluginRestrictedMode}
                      onChange={(v) => settingsStore.update({ pluginRestrictedMode: v })}
                    />
                  }
                />
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
                    {t("settings.plugins.installFromUrl")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void commandRegistry.run("plugins:check-updates")}
                  >
                    {t("settings.plugins.checkUpdates")}
                  </button>
                </div>
                {plugins.length === 0 ? (
                  <div style={{ color: "var(--text-faint)" }}>{t("settings.plugins.empty")}</div>
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
                <h2>{t("settings.dailyNotes")}</h2>
                <SettingItem
                  name={t("settings.dailyNotes.dateFormat")}
                  desc={t("settings.dailyNotes.dateFormatDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.dailyNotes.dateFormatPlaceholder")}
                      value={dailyNotes.format}
                      onChange={(e) => updateDaily({ format: e.currentTarget.value })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.dailyNotes.newFileLocation")}
                  desc={t("settings.dailyNotes.newFileLocationDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.files.vaultRootPlaceholder")}
                      value={dailyNotes.folder}
                      onChange={(e) => updateDaily({ folder: e.currentTarget.value })}
                    />
                  }
                />
              </>
            )}
            {visibleSectionIds.has(section) && section === "templates" && (
              <>
                <h2>{t("settings.templates")}</h2>
                <SettingItem
                  name={t("settings.templates.folderLocation")}
                  desc={t("settings.templates.folderLocationDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.templates.noFolderPlaceholder")}
                      value={templates.templateFolder}
                      onChange={(e) => updateTemplates({ templateFolder: e.currentTarget.value })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.templates.dateFormat")}
                  desc={t("settings.templates.dateFormatDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.templates.dateFormatPlaceholder")}
                      value={templates.dateFormat}
                      onChange={(e) => updateTemplates({ dateFormat: e.currentTarget.value })}
                    />
                  }
                />
                <SettingItem
                  name={t("settings.templates.timeFormat")}
                  desc={t("settings.templates.timeFormatDesc")}
                  control={
                    <input
                      type="text"
                      placeholder={t("settings.templates.timeFormatPlaceholder")}
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
  const t = useI18n();
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
      el.textContent = t("settings.pluginTab.renderError", {
        message: err instanceof Error ? err.message : String(err),
      });
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
  }, [spec, t]);
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
  const t = useI18n();
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
          ? t("settings.hotkeys.pressKey")
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
        {t("settings.hotkeys.add")}
      </button>
      {lastOverride && (
        <button
          type="button"
          onClick={() => removeUserHotkey(cmd.id, lastOverride)}
          disabled={capturing}
          style={{ minWidth: 64 }}
        >
          {t("settings.hotkeys.remove")}
        </button>
      )}
      <button
        type="button"
        onClick={() => clearUserHotkey(cmd.id)}
        disabled={overrides.length === 0}
        style={{ minWidth: 64 }}
      >
        {t("settings.hotkeys.reset")}
      </button>
    </div>
  );
}

function settingsSectionTitle(item: SettingsSectionInfo, t: ReturnType<typeof useI18n>): string {
  return item.titleKey ? t(item.titleKey) : (item.title ?? item.id);
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
