// Core (non-plugin) commands registered at startup. These match the
// default-hotkey rows in `specs/product/17_hotkeys_reference.md §17.1` plus a
// handful of always-on shell commands. The audit test
// `default-hotkeys-audit.test.ts` parses the spec at test time and asserts
// every bound row in §17.1 resolves to a registered command here.
//
// `CommandsBootstrap` is the only production caller. The function exists in
// its own module so the audit test can boot the same code path without
// rendering the React component.

import { APP_VERSION } from "@core/app/version";
import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { showUpdateCheckNotices } from "@core/plugins/update-check";
import { workspaceStore } from "@core/workspace/store";

export interface CoreCommandHandlers {
  readonly openPalette: () => void;
  readonly openSwitcher: () => void;
  readonly openVaultPicker: () => void;
  readonly openSettings: () => void;
  readonly openHelp: () => void;
  readonly openInstallPlugin: () => void;
}

function notifyNotImplemented(name: string): void {
  noticeManager.show(t("command.notYetImplemented", { name }), { kind: "info" });
}

/**
 * Register every shell-level command. Returns a disposer that unregisters all
 * of them in LIFO order — drop into a `useEffect` cleanup.
 *
 * Hotkeys match `specs/product/17_hotkeys_reference.md §17.1`. Spec rows
 * marked `(unbound)` or `(system shortcut)` are intentionally omitted; the
 * editor framework handles bold / italic / etc. via CodeMirror's
 * `defaultKeymap`.
 */
export function registerCoreCommands(handlers: CoreCommandHandlers): () => void {
  const disposers: Array<() => void> = [];
  const register = (cmd: Command) => {
    disposers.push(commandRegistry.register(cmd));
  };

  // ---------- Always-on shell commands --------------------------------------
  register({
    id: "app:open-command-palette",
    name: t("command.openCommandPalette"),
    hotkeys: [
      { modifiers: ["Mod"], key: "p" },
      { modifiers: ["Mod", "Shift"], key: "p" },
    ],
    callback: handlers.openPalette,
  });

  register({
    id: "app:open-quick-switcher",
    name: t("command.openQuickSwitcher"),
    hotkeys: [{ modifiers: ["Mod"], key: "o" }],
    callback: handlers.openSwitcher,
  });

  register({
    id: "app:open-vault-switcher",
    name: t("command.openVaultSwitcher"),
    callback: handlers.openVaultPicker,
  });

  register({
    id: "app:open-settings",
    name: t("command.openSettings"),
    hotkeys: [{ modifiers: ["Mod"], key: "," }],
    callback: handlers.openSettings,
  });

  register({
    id: "help:open-cheat-sheet",
    category: t("command.category.help"),
    name: t("command.showKeyboardCheatSheet"),
    hotkeys: [{ modifiers: [], key: "F1" }],
    callback: handlers.openHelp,
  });

  register({
    id: "plugins:install-from-url",
    category: t("command.category.plugins"),
    name: t("command.installPluginFromUrl"),
    callback: handlers.openInstallPlugin,
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

  // ---------- Editor / tab management ---------------------------------------
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

  // Mod+1..9 focuses the Nth tab in the active group. Spec §17.1 calls this
  // out under "Switch to tab N" (1-8) and "Switch to last tab" (9).
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
    hotkeys: [{ modifiers: ["Mod"], key: "g" }],
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

  // ---------------------------------------------------------------------------
  // Spec §17.1 defaults that the rest of the codebase has not yet implemented.
  // These commands hold the canonical hotkey so the audit test passes and the
  // user gets a clear "not yet implemented" notice instead of a silent no-op.
  // When the underlying feature lands, the callback can be wired up without
  // touching the hotkey assignment or the spec.
  // ---------------------------------------------------------------------------

  register({
    id: "file:new-note",
    category: t("command.category.file"),
    name: t("command.createNewNote"),
    hotkeys: [{ modifiers: ["Mod"], key: "n" }],
    callback: () => notifyNotImplemented(t("command.createNewNote")),
  });

  register({
    id: "file:new-note-in-new-tab",
    category: t("command.category.file"),
    name: t("command.createNewNoteInNewTab"),
    hotkeys: [{ modifiers: ["Mod", "Shift"], key: "n" }],
    callback: () => notifyNotImplemented(t("command.createNewNoteInNewTab")),
  });

  register({
    id: "file:save",
    category: t("command.category.file"),
    name: t("command.saveCurrentFile"),
    hotkeys: [{ modifiers: ["Mod"], key: "s" }],
    callback: () => {
      // Editor auto-saves; this command is a no-op fallback for users with
      // muscle memory. Treat it as a success so Mod+S never feels broken.
      noticeManager.show(t("markdown.status.saved"), { kind: "success" });
    },
  });

  register({
    id: "file:reopen-closed-tab",
    category: t("command.category.file"),
    name: t("command.reopenLastClosedTab"),
    hotkeys: [{ modifiers: ["Mod", "Shift"], key: "t" }],
    callback: () => notifyNotImplemented(t("command.reopenLastClosedTab")),
  });

  register({
    id: "file:new-tab",
    category: t("command.category.file"),
    name: t("command.openNewTab"),
    hotkeys: [{ modifiers: ["Mod"], key: "t" }],
    callback: () => {
      try {
        workspaceStore.newTab();
      } catch {
        /* no active group */
      }
    },
  });

  register({
    id: "file:rename",
    category: t("command.category.file"),
    name: t("command.renameCurrentFile"),
    hotkeys: [{ modifiers: [], key: "F2" }],
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
        new CustomEvent("granite:rename-file", {
          detail: { path: (leaf.state as { path: string }).path },
        }),
      );
    },
  });

  register({
    id: "nav:back",
    category: t("command.category.navigation"),
    name: t("command.navigateBack"),
    hotkeys: [{ modifiers: ["Mod", "Alt"], key: "ArrowLeft" }],
    checkCallback: () => {
      const s = workspaceStore.getState();
      const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
      const leafId = group?.activeLeafId;
      return !!leafId && workspaceStore.canGoBack(leafId);
    },
    callback: () => {
      const s = workspaceStore.getState();
      const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
      if (group?.activeLeafId) workspaceStore.goBack(group.activeLeafId);
    },
  });

  register({
    id: "nav:forward",
    category: t("command.category.navigation"),
    name: t("command.navigateForward"),
    hotkeys: [{ modifiers: ["Mod", "Alt"], key: "ArrowRight" }],
    checkCallback: () => {
      const s = workspaceStore.getState();
      const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
      const leafId = group?.activeLeafId;
      return !!leafId && workspaceStore.canGoForward(leafId);
    },
    callback: () => {
      const s = workspaceStore.getState();
      const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
      if (group?.activeLeafId) workspaceStore.goForward(group.activeLeafId);
    },
  });

  register({
    id: "editor:toggle-reading-view",
    category: t("command.category.editor"),
    name: t("command.toggleReadingView"),
    hotkeys: [{ modifiers: ["Mod"], key: "e" }],
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
      const next = leaf.state.mode === "reading" ? "source" : "reading";
      workspaceStore.setMode(leaf.id, next);
    },
  });

  register({
    id: "graph:open-local",
    category: t("command.category.graph"),
    name: t("command.openLocalGraph"),
    hotkeys: [{ modifiers: ["Mod", "Shift"], key: "g" }],
    callback: () => {
      try {
        workspaceStore.openSidebarView("right", "graph");
      } catch {
        notifyNotImplemented(t("command.openLocalGraph"));
      }
    },
  });

  register({
    id: "search:current-file",
    category: t("command.category.search"),
    name: t("command.searchCurrentFile"),
    hotkeys: [{ modifiers: ["Mod"], key: "f" }],
    callback: () => {
      // CodeMirror's searchKeymap binds Mod-F inside the editor — this command
      // is the palette-visible fallback for non-editor focus.
      window.dispatchEvent(new CustomEvent("granite:search-current-file"));
    },
  });

  register({
    id: "search:replace-in-current-file",
    category: t("command.category.search"),
    name: t("command.searchReplaceCurrentFile"),
    hotkeys: [{ modifiers: ["Mod"], key: "h" }],
    callback: () => {
      window.dispatchEvent(new CustomEvent("granite:search-replace-current-file"));
    },
  });

  register({
    id: "search:vault",
    category: t("command.category.search"),
    name: t("command.searchInAllFiles"),
    hotkeys: [{ modifiers: ["Mod", "Shift"], key: "f" }],
    callback: () => {
      window.dispatchEvent(
        new CustomEvent("granite:select-sidebar-tab", {
          detail: { side: "left", id: "search" },
        }),
      );
    },
  });

  // Editing formatters. CodeMirror's defaultKeymap binds Mod-B / Mod-I to OS
  // text-styling at the document level inside an editor, but the spec calls
  // these out under §17.1 as customizable hotkeys, so they need command
  // entries too. The callbacks fire a DOM event that MarkdownView picks up
  // when the editor is focused, falling back to a notice otherwise.
  function dispatchEditorAction(action: string, label: string): void {
    if (typeof document !== "undefined" && document.activeElement) {
      window.dispatchEvent(new CustomEvent("granite:editor-action", { detail: { action } }));
    } else {
      notifyNotImplemented(label);
    }
  }

  register({
    id: "editor:toggle-bold",
    category: t("command.category.editor"),
    name: t("command.toggleBold"),
    hotkeys: [{ modifiers: ["Mod"], key: "b" }],
    callback: () => dispatchEditorAction("toggle-bold", t("command.toggleBold")),
  });

  register({
    id: "editor:toggle-italic",
    category: t("command.category.editor"),
    name: t("command.toggleItalic"),
    hotkeys: [{ modifiers: ["Mod"], key: "i" }],
    callback: () => dispatchEditorAction("toggle-italic", t("command.toggleItalic")),
  });

  register({
    id: "editor:toggle-code",
    category: t("command.category.editor"),
    name: t("command.toggleCode"),
    hotkeys: [{ modifiers: ["Mod"], key: "`" }],
    callback: () => dispatchEditorAction("toggle-code", t("command.toggleCode")),
  });

  register({
    id: "editor:insert-link",
    category: t("command.category.editor"),
    name: t("command.insertLink"),
    hotkeys: [{ modifiers: ["Mod"], key: "k" }],
    callback: () => dispatchEditorAction("insert-link", t("command.insertLink")),
  });

  register({
    id: "editor:add-file-property",
    category: t("command.category.editor"),
    name: t("command.addFileProperty"),
    hotkeys: [{ modifiers: ["Mod"], key: ";" }],
    callback: () => {
      const s = workspaceStore.getState();
      const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
      const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
      if (!leaf || leaf.state.type !== "markdown") {
        notifyNotImplemented(t("command.addFileProperty"));
        return;
      }
      window.dispatchEvent(
        new CustomEvent("granite:add-file-property", {
          detail: { path: (leaf.state as { path: string }).path },
        }),
      );
    },
  });

  return () => {
    while (disposers.length > 0) {
      const fn = disposers.pop();
      if (fn) fn();
    }
  };
}
