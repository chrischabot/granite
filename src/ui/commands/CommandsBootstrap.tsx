import { registerCoreCommands } from "@core/commands/core-commands";
import { initHotkeyDispatcher } from "@core/commands/hotkeys";
import { getLocale, subscribeI18n } from "@core/i18n";
import { registerAudioRecorderPlugin } from "@core/plugins-core/audio-recorder";
import { registerBasesScaffoldPlugin } from "@core/plugins-core/bases-scaffold";
import { registerCopyLinkPlugin } from "@core/plugins-core/copy-link";
import { registerDailyNotesPlugin } from "@core/plugins-core/daily-notes";
import { registerDebugInfoPlugin } from "@core/plugins-core/debug-info";
import { registerFileRecoveryPlugin } from "@core/plugins-core/file-recovery";
import { registerFormatConverterPlugin } from "@core/plugins-core/format-converter";
import { registerNoteComposerPlugin } from "@core/plugins-core/note-composer";
import { registerPluginReloadPlugin } from "@core/plugins-core/plugin-reload";
import { registerRandomNotePlugin } from "@core/plugins-core/random-note";
import { registerRandomWalkPlugin } from "@core/plugins-core/random-walk";
import { registerTagRenamePlugin } from "@core/plugins-core/tag-rename";
import { registerTemplatesPlugin } from "@core/plugins-core/templates";
import { registerTourPlugin } from "@core/plugins-core/tour";
import { registerUniqueNotePlugin } from "@core/plugins-core/unique-note";
import { registerVaultFindReplacePlugin } from "@core/plugins-core/vault-find-replace";
import { registerVaultStatsPlugin } from "@core/plugins-core/vault-stats";
import { registerWebViewerPlugin } from "@core/plugins-core/web-viewer";
import { registerWorkspacesPlugin } from "@core/plugins-core/workspaces";
import { useEffect, useSyncExternalStore } from "react";

interface CommandsBootstrapProps {
  openPalette: () => void;
  openSwitcher: () => void;
  openVaultPicker: () => void;
  openSettings: () => void;
  openHelp: () => void;
  openInstallPlugin: () => void;
  openFileRecovery: (path: string) => void;
}

export function CommandsBootstrap({
  openPalette,
  openSwitcher,
  openVaultPicker,
  openSettings,
  openHelp,
  openInstallPlugin,
  openFileRecovery,
}: CommandsBootstrapProps) {
  // Re-register commands when the active locale changes so localized names
  // (used in the palette) refresh.
  const locale = useSyncExternalStore(subscribeI18n, getLocale, getLocale);

  useEffect(() => {
    void locale;
    const dispose = initHotkeyDispatcher();
    const disposeCore = registerCoreCommands({
      openPalette,
      openSwitcher,
      openVaultPicker,
      openSettings,
      openHelp,
      openInstallPlugin,
    });

    // Core plugins
    const disposeBasesScaffold = registerBasesScaffoldPlugin();
    const disposeDaily = registerDailyNotesPlugin();
    const disposeDebugInfo = registerDebugInfoPlugin();
    const disposeTemplates = registerTemplatesPlugin();
    const disposeRandom = registerRandomNotePlugin();
    const disposeRandomWalk = registerRandomWalkPlugin();
    const disposeTagRename = registerTagRenamePlugin();
    const disposeWorkspaces = registerWorkspacesPlugin();
    const disposeFileRecovery = registerFileRecoveryPlugin(openFileRecovery);
    const disposeUniqueNote = registerUniqueNotePlugin();
    const disposeNoteComposer = registerNoteComposerPlugin();
    const disposeAudio = registerAudioRecorderPlugin();
    const disposeWebViewer = registerWebViewerPlugin();
    const disposeFormat = registerFormatConverterPlugin();
    const disposeVaultStats = registerVaultStatsPlugin();
    const disposeTour = registerTourPlugin();
    const disposeCopyLink = registerCopyLinkPlugin();
    const disposePluginReload = registerPluginReloadPlugin();
    const disposeVaultFindReplace = registerVaultFindReplacePlugin();

    return () => {
      dispose();
      disposeCore();
      disposeBasesScaffold();
      disposeDaily();
      disposeDebugInfo();
      disposeTemplates();
      disposeRandom();
      disposeRandomWalk();
      disposeTagRename();
      disposeWorkspaces();
      disposeFileRecovery();
      disposeUniqueNote();
      disposeNoteComposer();
      disposeAudio();
      disposeWebViewer();
      disposeFormat();
      disposeVaultStats();
      disposeTour();
      disposeCopyLink();
      disposePluginReload();
      disposeVaultFindReplace();
    };
  }, [
    openPalette,
    openSwitcher,
    openVaultPicker,
    openSettings,
    openHelp,
    openInstallPlugin,
    openFileRecovery,
    locale,
  ]);

  return null;
}
