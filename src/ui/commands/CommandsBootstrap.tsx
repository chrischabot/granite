import { APP_VERSION } from "@core/app/version";
import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { initHotkeyDispatcher } from "@core/commands/hotkeys";
import { getLocale, subscribeI18n, t as translate } from "@core/i18n";
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
import { showUpdateCheckNotices } from "@core/plugins/update-check";
import { workspaceStore } from "@core/workspace/store";
import { useCallback, useEffect, useSyncExternalStore } from "react";

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
  const locale = useSyncExternalStore(subscribeI18n, getLocale, getLocale);
  const t = useCallback<typeof translate>(
    (key, params) => {
      // Rebind localized command labels when the active locale changes.
      void locale;
      return translate(key, params);
    },
    [locale],
  );

  useEffect(() => {
    const dispose = initHotkeyDispatcher();
    const registrations: Array<() => void> = [];

    const register = (cmd: Command) => {
      registrations.push(commandRegistry.register(cmd));
    };

    register({
      id: "app:open-command-palette",
      name: t("command.openCommandPalette"),
      hotkeys: [
        { modifiers: ["Mod"], key: "p" },
        { modifiers: ["Mod", "Shift"], key: "p" },
      ],
      callback: openPalette,
    });

    register({
      id: "app:open-quick-switcher",
      name: t("command.openQuickSwitcher"),
      hotkeys: [{ modifiers: ["Mod"], key: "o" }],
      callback: openSwitcher,
    });

    register({
      id: "app:open-vault-switcher",
      name: t("command.openVaultSwitcher"),
      callback: openVaultPicker,
    });

    register({
      id: "app:open-settings",
      name: t("command.openSettings"),
      hotkeys: [{ modifiers: ["Mod"], key: "," }],
      callback: openSettings,
    });

    register({
      id: "help:open-cheat-sheet",
      category: t("command.category.help"),
      name: t("command.showKeyboardCheatSheet"),
      hotkeys: [{ modifiers: [], key: "F1" }],
      callback: openHelp,
    });

    register({
      id: "plugins:install-from-url",
      category: t("command.category.plugins"),
      name: t("command.installPluginFromUrl"),
      callback: openInstallPlugin,
    });

    register({
      id: "plugins:check-updates",
      category: t("command.category.plugins"),
      name: t("command.checkPluginUpdates"),
      callback: () => showUpdateCheckNotices({ appVersion: APP_VERSION }),
    });

    register({
      id: "app:toggle-theme",
      category: t("command.category.appearance"),
      name: t("command.toggleLightDarkTheme"),
      callback: () => {
        const body = document.body;
        const isDark = body.classList.contains("theme-dark");
        body.classList.toggle("theme-dark", !isDark);
        body.classList.toggle("theme-light", isDark);
      },
    });

    register({
      id: "editor:split-right",
      category: t("command.category.editor"),
      name: t("command.splitRight"),
      hotkeys: [{ modifiers: ["Mod"], key: "\\" }],
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        return !!group?.activeLeafId;
      },
      callback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        if (group?.activeLeafId) workspaceStore.splitLeaf(group.activeLeafId, "right");
      },
    });

    register({
      id: "editor:split-down",
      category: t("command.category.editor"),
      name: t("command.splitDown"),
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "\\" }],
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        return !!group?.activeLeafId;
      },
      callback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        if (group?.activeLeafId) workspaceStore.splitLeaf(group.activeLeafId, "down");
      },
    });

    register({
      id: "editor:close-group",
      category: t("command.category.editor"),
      name: t("command.closeCurrentTabGroup"),
      checkCallback: () => {
        const s = workspaceStore.getState();
        return s.rootGroupIds.length > 1 && !!s.activeGroupId;
      },
      callback: () => {
        const s = workspaceStore.getState();
        if (s.activeGroupId) workspaceStore.closeGroup(s.activeGroupId);
      },
    });

    register({
      id: "editor:close-active-tab",
      category: t("command.category.editor"),
      name: t("command.closeActiveTab"),
      hotkeys: [{ modifiers: ["Mod"], key: "w" }],
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        return !!group?.activeLeafId;
      },
      callback: () => workspaceStore.closeActiveTab(),
    });

    register({
      id: "tabs:cycle-next",
      category: t("command.category.tabs"),
      name: t("command.switchNextTab"),
      hotkeys: [{ modifiers: ["Ctrl"], key: "Tab" }],
      callback: () => workspaceStore.cycleTab("next"),
    });

    register({
      id: "tabs:cycle-previous",
      category: t("command.category.tabs"),
      name: t("command.switchPreviousTab"),
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "Tab" }],
      callback: () => workspaceStore.cycleTab("previous"),
    });

    register({
      id: "editor:insert-block-id",
      category: t("command.category.editor"),
      name: t("command.insertBlockId"),
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        return leaf?.state.type === "markdown";
      },
      callback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        if (leaf?.state.type === "markdown") {
          window.dispatchEvent(
            new CustomEvent("granite:insert-block-id", {
              detail: { path: leaf.state.path },
            }),
          );
        }
      },
    });

    // Mod+1..9 focuses the Nth tab in the active group.
    for (let n = 1; n <= 9; n++) {
      const key = String(n);
      register({
        id: `editor:focus-tab-${n}`,
        category: t("command.category.editor"),
        name: t("command.focusTab", { number: String(n) }),
        hotkeys: [{ modifiers: ["Mod"], key }],
        hidden: true,
        callback: () => {
          const s = workspaceStore.getState();
          const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
          if (!group) return;
          const idx = n - 1;
          const target = group.leafIds[idx];
          if (target) workspaceStore.focusTab(target);
        },
      });
    }

    register({
      id: "editor:toggle-pin",
      category: t("command.category.editor"),
      name: t("command.togglePin"),
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        return leaf?.state.type === "markdown";
      },
      callback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        if (group?.activeLeafId) workspaceStore.togglePinned(group.activeLeafId);
      },
    });

    register({
      id: "editor:reveal-in-explorer",
      category: t("command.category.editor"),
      name: t("command.revealActiveFile"),
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        return leaf?.state.type === "markdown";
      },
      callback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        if (!leaf || leaf.state.type !== "markdown") return;
        window.dispatchEvent(
          new CustomEvent("granite:select-sidebar-tab", {
            detail: { side: "left", id: "explorer" },
          }),
        );
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("granite:reveal-in-explorer", {
              detail: { path: (leaf.state as { path: string }).path },
            }),
          );
        }, 50);
      },
    });

    register({
      id: "graph:open",
      category: t("command.category.graph"),
      name: t("command.openGraphView"),
      callback: () => {
        workspaceStore.openGraph();
      },
    });

    register({
      id: "file:print-active-note",
      category: t("command.category.file"),
      name: t("command.printActiveNote"),
      checkCallback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        return leaf?.state.type === "markdown";
      },
      callback: () => {
        const s = workspaceStore.getState();
        const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
        const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
        if (leaf?.state.type !== "markdown") return;
        workspaceStore.setMode(leaf.id, "reading");
        setTimeout(() => window.print(), 50);
      },
    });

    register({
      id: "canvas:open",
      category: t("command.category.canvas"),
      name: t("command.createNewCanvas"),
      callback: () => {
        workspaceStore.openCanvas();
      },
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
      for (const fn of registrations) fn();
    };
  }, [
    openPalette,
    openSwitcher,
    openVaultPicker,
    openSettings,
    openHelp,
    openInstallPlugin,
    openFileRecovery,
    t,
  ]);

  return null;
}
