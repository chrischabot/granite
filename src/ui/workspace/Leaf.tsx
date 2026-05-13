import { commandRegistry } from "@core/commands/CommandRegistry";
import { useSettings } from "@core/settings/useSettings";
import { workspaceStore } from "@core/workspace/store";
import type { Leaf } from "@core/workspace/types";
import {
  BookOpen,
  Edit3,
  FolderOpen,
  Globe,
  SplitSquareHorizontal,
  SplitSquareVertical,
} from "lucide-react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { useI18n } from "../i18n/useI18n";
import { useVault } from "../vault/VaultContext";
import { AssetView } from "../views/AssetView";
import { BasesView } from "../views/BasesView";
import { CanvasView } from "../views/CanvasView";
import { GraphView } from "../views/GraphView";
import { MarkdownView } from "../views/MarkdownView";
import { ReadingView } from "../views/ReadingView";
import { WebViewerView } from "../views/WebViewerView";
import { SidebarLeafView } from "../views/sidebar/SidebarLeafView";
import { displayLeafTitle } from "./leaf-title";

export interface LeafBodyProps {
  leaf: Leaf;
  groupId?: string;
  isActiveGroup?: boolean;
}

export function LeafBody({ leaf, groupId, isActiveGroup }: LeafBodyProps) {
  const dataType = leaf.state.type;
  return (
    <div
      className={`workspace-leaf mod-active${isActiveGroup ? " is-focused-group" : ""}`}
      data-type={dataType}
      onMouseDown={() => {
        if (groupId) workspaceStore.focusTab(leaf.id);
      }}
    >
      <ViewHeader leaf={leaf} {...(groupId ? { groupId } : {})} />
      <div className="view-content">
        <ViewBody leaf={leaf} />
      </div>
    </div>
  );
}

function ViewHeader({ leaf, groupId: _groupId }: { leaf: Leaf; groupId?: string }) {
  const t = useI18n();
  const settings = useSettings();
  const title = displayLeafTitle(leaf, t);
  const isMarkdown = leaf.state.type === "markdown";
  const isReading = isMarkdown && leaf.state.mode === "reading";
  return (
    <div className="view-header">
      <div className="view-header-left" />
      <div className="view-header-title-container">
        <div className="view-header-title">{title}</div>
      </div>
      <div className="view-actions">
        {isMarkdown && (
          <ClickableIcon
            ariaLabel={t(isReading ? "workspace.action.editNote" : "workspace.action.readNote")}
            icon={isReading ? <Edit3 /> : <BookOpen />}
            onClick={() =>
              workspaceStore.setMode(leaf.id, isReading ? settings.defaultEditingMode : "reading")
            }
          />
        )}
        {isMarkdown && (
          <ClickableIcon
            ariaLabel={t("workspace.menu.splitRight")}
            icon={<SplitSquareHorizontal />}
            onClick={() => workspaceStore.splitLeaf(leaf.id, "right")}
          />
        )}
        {isMarkdown && (
          <ClickableIcon
            ariaLabel={t("workspace.menu.splitDown")}
            icon={<SplitSquareVertical />}
            onClick={() => workspaceStore.splitLeaf(leaf.id, "down")}
          />
        )}
      </div>
    </div>
  );
}

function ViewBody({ leaf }: { leaf: Leaf }) {
  const s = leaf.state;
  switch (s.type) {
    case "markdown":
      if (s.mode === "reading") return <ReadingView path={s.path} />;
      return (
        <MarkdownView
          leafId={leaf.id}
          path={s.path}
          livePreview={s.mode === "live-preview"}
          fragment={s.fragment ?? null}
          {...(s.folds ? { folds: s.folds } : {})}
        />
      );
    case "webviewer":
      return <WebViewerView url={s.url} />;
    case "asset":
      return <AssetView path={s.path} kind={s.kind} />;
    case "graph":
      return <GraphView />;
    case "canvas":
      return <CanvasView path={s.path} />;
    case "bases":
      return <BasesView path={s.path} />;
    case "sidebar":
      return <SidebarLeafView side={s.side} id={s.id} />;
    case "empty":
      return <EmptyLeafBody />;
    case "file-explorer":
      return null;
    case "settings":
      return null;
  }
}

function EmptyLeafBody() {
  const t = useI18n();
  const { activeVault, canPickFolder, canUseOpfs, pickFolder, openOpfs } = useVault();

  if (!activeVault) {
    return (
      <div className="empty-state">
        <div className="empty-state-container">
          <div className="empty-state-title">{t("app.welcome.title")}</div>
          <div className="empty-state-action-list">{t("app.welcome.body")}</div>
          <div className="modal-button-container">
            <button
              type="button"
              className="mod-cta"
              disabled={!canPickFolder}
              onClick={() => {
                void pickFolder().catch((err) => {
                  alert(err instanceof Error ? err.message : String(err));
                });
              }}
              title={
                canPickFolder
                  ? t("vaultPicker.pickFolderTitle")
                  : t("vaultPicker.pickFolderUnavailable")
              }
            >
              <FolderOpen size={14} style={{ marginRight: "var(--size-2-2)" }} />
              {t("app.welcome.pickFolder")}
            </button>
            <button
              type="button"
              disabled={!canUseOpfs}
              onClick={() => {
                const name = prompt(
                  t("vaultPicker.prompt.opfsName"),
                  t("vaultPicker.prompt.opfsDefault"),
                );
                if (!name) return;
                void openOpfs(name).catch((err) => {
                  alert(err instanceof Error ? err.message : String(err));
                });
              }}
              title={t("workspace.empty.createBrowserVaultTitle")}
            >
              <Globe size={14} style={{ marginRight: "var(--size-2-2)" }} />
              {t("app.welcome.opfsVault")}
            </button>
          </div>
          <div className="empty-state-action-list">
            {t("app.welcome.haveVault")}{" "}
            <button
              type="button"
              className="empty-state-action"
              onClick={() => void commandRegistry.run("app:open-vault-switcher")}
            >
              {t("app.welcome.openSwitcher")}
            </button>
            .
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state-container">
        <div className="empty-state-title">{t("app.empty.noFile")}</div>
        <div className="empty-state-action-list">
          {t("workspace.empty.openHint.beforeQuickSwitcher")} <kbd>⌘O</kbd>{" "}
          {t("workspace.empty.openHint.afterQuickSwitcher")} <kbd>⌘P</kbd>{" "}
          {t("workspace.empty.openHint.afterCommandPalette")}
        </div>
      </div>
    </div>
  );
}
