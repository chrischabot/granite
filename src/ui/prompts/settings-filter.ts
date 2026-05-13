import type { SettingsTabSpec } from "@core/plugins/host-registries";

export type BuiltinSettingsSection =
  | "general"
  | "appearance"
  | "editor"
  | "files"
  | "daily-notes"
  | "templates"
  | "hotkeys"
  | "about"
  | "plugins";

/** Either a builtin section id, or `plugin:<tabId>` for a plugin-supplied tab. */
export type SettingsSectionId = BuiltinSettingsSection | `plugin:${string}`;

export interface SettingsSectionInfo {
  readonly id: SettingsSectionId;
  readonly title?: string;
  readonly titleKey?: string;
  readonly group: "options" | "plugin-options";
  readonly searchText: string;
}

export const BUILTIN_SETTINGS_SECTIONS: ReadonlyArray<SettingsSectionInfo> = [
  {
    id: "general",
    titleKey: "settings.general",
    group: "options",
    searchText:
      "general version updates language help account advanced startup time profiling performance diagnostics",
  },
  {
    id: "appearance",
    titleKey: "settings.appearance",
    group: "options",
    searchText:
      "appearance base color scheme accent color editor font size high contrast translucent window themes css snippets",
  },
  {
    id: "editor",
    titleKey: "settings.editor",
    group: "options",
    searchText:
      "editor default view mode source reading line numbers readable line length auto pair brackets spellcheck languages locale live preview key bindings vim",
  },
  {
    id: "files",
    titleKey: "settings.files",
    group: "options",
    searchText:
      "files links default folder new notes attachments folder deleted files confirm deletion trash system vault permanent excluded files wikilinks metadata cache tags nested",
  },
  {
    id: "hotkeys",
    titleKey: "settings.hotkeys",
    group: "options",
    searchText: "hotkeys keyboard shortcuts commands capture reset conflicts",
  },
  {
    id: "about",
    titleKey: "settings.about",
    group: "options",
    searchText: "about version credits license legal app information",
  },
  {
    id: "plugins",
    titleKey: "settings.plugins",
    group: "options",
    searchText: "plugins community restricted mode install update enable disable",
  },
  {
    id: "daily-notes",
    titleKey: "settings.dailyNotes",
    group: "plugin-options",
    searchText: "daily notes date format new file location folder",
  },
  {
    id: "templates",
    titleKey: "settings.templates",
    group: "plugin-options",
    searchText: "templates folder date format time format tokens",
  },
];

function normalizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function getVisibleSettingsSections(
  query: string,
  pluginTabs: ReadonlyArray<Pick<SettingsTabSpec, "id" | "name">>,
): SettingsSectionInfo[] {
  const pluginSections = pluginTabs.map<SettingsSectionInfo>((tab) => ({
    id: `plugin:${tab.id}`,
    title: tab.name,
    group: "plugin-options",
    searchText: `${tab.name} ${tab.id} plugin options`.toLowerCase(),
  }));

  const sections = [...BUILTIN_SETTINGS_SECTIONS, ...pluginSections];
  const terms = normalizeQuery(query);
  if (terms.length === 0) return sections;

  return sections.filter((section) => {
    const haystack = `${section.title ?? ""} ${section.searchText}`.toLowerCase();
    const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
    return terms.every((term) => words.some((word) => word.startsWith(term)));
  });
}
