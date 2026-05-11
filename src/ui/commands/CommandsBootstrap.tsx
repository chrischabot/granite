import { useEffect } from "react";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { initHotkeyDispatcher } from "@core/commands/hotkeys";
import { registerAudioRecorderPlugin } from "@core/plugins-core/audio-recorder";
import { registerDailyNotesPlugin } from "@core/plugins-core/daily-notes";
import { registerFileRecoveryPlugin } from "@core/plugins-core/file-recovery";
import { registerFormatConverterPlugin } from "@core/plugins-core/format-converter";
import { registerNoteComposerPlugin } from "@core/plugins-core/note-composer";
import { registerRandomNotePlugin } from "@core/plugins-core/random-note";
import { registerRandomWalkPlugin } from "@core/plugins-core/random-walk";
import { registerTagRenamePlugin } from "@core/plugins-core/tag-rename";
import { registerTemplatesPlugin } from "@core/plugins-core/templates";
import { registerUniqueNotePlugin } from "@core/plugins-core/unique-note";
import { registerTourPlugin } from "@core/plugins-core/tour";
import { registerVaultStatsPlugin } from "@core/plugins-core/vault-stats";
import { registerWebViewerPlugin } from "@core/plugins-core/web-viewer";
import { registerCopyLinkPlugin } from "@core/plugins-core/copy-link";
import { registerPluginReloadPlugin } from "@core/plugins-core/plugin-reload";
import { registerVaultFindReplacePlugin } from "@core/plugins-core/vault-find-replace";
import { registerBasesScaffoldPlugin } from "@core/plugins-core/bases-scaffold";
import { registerWorkspacesPlugin } from "@core/plugins-core/workspaces";
import { workspaceStore } from "@core/workspace/store";

interface CommandsBootstrapProps {
  openPalette: () => void;
  openSwitcher: () => void;
  openVaultPicker: () => void;
  openSettings: () => void;
  openHelp: () => void;
  openInstallPlugin: () => void;
}

export function CommandsBootstrap({
  openPalette,
  openSwitcher,
  openVaultPicker,
  openSettings,
  openHelp,
  openInstallPlugin,
}: CommandsBootstrapProps) {
  useEffect(() => {
    const dispose = initHotkeyDispatcher();
    const registrations: Array<() => void> = [];

    const register = (cmd: Command) => {
      registrations.push(commandRegistry.register(cmd));
    };

    register({
      id: "app:open-command-palette",
      name: "Open command palette",
      hotkeys: [
        { modifiers: ["Mod"], key: "p" },
        { modifiers: ["Mod", "Shift"], key: "p" },
      ],
      callback: openPalette,
    });

    register({
      id: "app:open-quick-switcher",
      name: "Open quick switcher",
      hotkeys: [{ modifiers: ["Mod"], key: "o" }],
      callback: openSwitcher,
    });

    register({
      id: "app:open-vault-switcher",
      name: "Open vault switcher",
      callback: openVaultPicker,
    });

    register({
      id: "app:open-settings",
      name: "Open settings",
      hotkeys: [{ modifiers: ["Mod"], key: "," }],
      callback: openSettings,
    });

    register({
      id: "help:open-cheat-sheet",
      category: "Help",
      name: "Show keyboard cheat-sheet",
      hotkeys: [{ modifiers: [], key: "F1" }],
      callback: openHelp,
    });

    register({
      id: "plugins:install-from-url",
      category: "Plugins",
      name: "Install plugin from URL…",
      callback: openInstallPlugin,
    });

    register({
      id: "app:toggle-theme",
      category: "Appearance",
      name: "Toggle light/dark theme",
      callback: () => {
        const body = document.body;
        const isDark = body.classList.contains("theme-dark");
        body.classList.toggle("theme-dark", !isDark);
        body.classList.toggle("theme-light", isDark);
      },
    });

    register({
      id: "editor:split-right",
      category: "Editor",
      name: "Split right",
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
      category: "Editor",
      name: "Split down",
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
      category: "Editor",
      name: "Close current tab group",
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
      category: "Editor",
      name: "Close active tab",
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
      category: "Tabs",
      name: "Switch to next tab in group",
      hotkeys: [{ modifiers: ["Ctrl"], key: "Tab" }],
      callback: () => workspaceStore.cycleTab("next"),
    });

    register({
      id: "tabs:cycle-previous",
      category: "Tabs",
      name: "Switch to previous tab in group",
      hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "Tab" }],
      callback: () => workspaceStore.cycleTab("previous"),
    });

    register({
      id: "editor:insert-block-id",
      category: "Editor",
      name: "Insert block id and copy link",
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
        category: "Editor",
        name: `Focus tab ${n}`,
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
      category: "Editor",
      name: "Toggle pin on active tab",
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
      category: "Editor",
      name: "Reveal active file in explorer",
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
      category: "Graph",
      name: "Open graph view",
      callback: () => {
        workspaceStore.openGraph();
      },
    });

    register({
      id: "file:print-active-note",
      category: "File",
      name: "Print active note…",
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
      category: "Canvas",
      name: "Create new canvas",
      callback: () => {
        workspaceStore.openCanvas();
      },
    });

    // Core plugins
    const disposeBasesScaffold = registerBasesScaffoldPlugin();
    const disposeDaily = registerDailyNotesPlugin();
    const disposeTemplates = registerTemplatesPlugin();
    const disposeRandom = registerRandomNotePlugin();
    const disposeRandomWalk = registerRandomWalkPlugin();
    const disposeTagRename = registerTagRenamePlugin();
    const disposeWorkspaces = registerWorkspacesPlugin();
    const disposeFileRecovery = registerFileRecoveryPlugin();
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
  }, [openPalette, openSwitcher, openVaultPicker, openSettings, openHelp, openInstallPlugin]);

  return null;
}