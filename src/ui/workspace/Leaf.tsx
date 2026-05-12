import { commandRegistry } from "@core/commands/CommandRegistry";
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
            onClick={() => workspaceStore.setMode(leaf.id, isReading ? "source" : "reading")}
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
          fragment={s.fragment ?? null}
          {...(s.folds ? { folds: s.folds } : {})}
        />
      );
    case "webviewer":
      return <WebViewerView url={s.url} />;
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
      <div
        className="empty-state"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "var(--size-4-4)",
          color: "var(--text-faint)",
          userSelect: "none",
          padding: "var(--size-4-6)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-ui-large)",
            fontWeight: "var(--font-semibold)",
            color: "var(--text-normal)",
          }}
        >
          {t("app.welcome.title")}
        </div>
        <div
          style={{
            fontSize: "var(--font-ui-medium)",
            maxWidth: 480,
            color: "var(--text-muted)",
          }}
        >
          {t("app.welcome.body")}
        </div>
        <div style={{ display: "flex", gap: "var(--size-4-2)", marginTop: "var(--size-4-4)" }}>
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
        <div
          style={{
            fontSize: "var(--font-ui-small)",
            color: "var(--text-faint)",
            marginTop: "var(--size-4-3)",
          }}
        >
          {t("app.welcome.haveVault")}{" "}
          <button
            type="button"
            style={{
              background: "none",
              border: 0,
              color: "var(--text-accent)",
              cursor: "var(--cursor)",
              padding: 0,
              textDecoration: "underline",
              boxShadow: "none",
              height: "auto",
            }}
            onClick={() => void commandRegistry.run("app:open-vault-switcher")}
          >
            {t("app.welcome.openSwitcher")}
          </button>
          .
        </div>
      </div>
    );
  }

  return (
    <div
      className="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "var(--size-4-3)",
        color: "var(--text-faint)",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: "var(--font-ui-large)",
          fontWeight: "var(--font-semibold)",
          color: "var(--text-normal)",
        }}
      >
        {t("app.empty.noFile")}
      </div>
      <div style={{ fontSize: "var(--font-ui-small)", maxWidth: 420, textAlign: "center" }}>
        {t("workspace.empty.openHint.beforeQuickSwitcher")}{" "}
        <kbd
          style={{
            padding: "0 4px",
            borderRadius: 4,
            background: "var(--background-secondary)",
            color: "var(--text-normal)",
          }}
        >
          ⌘O
        </kbd>{" "}
        {t("workspace.empty.openHint.afterQuickSwitcher")}{" "}
        <kbd
          style={{
            padding: "0 4px",
            borderRadius: 4,
            background: "var(--background-secondary)",
            color: "var(--text-normal)",
          }}
        >
          ⌘P
        </kbd>{" "}
        {t("workspace.empty.openHint.afterCommandPalette")}
      </div>
    </div>
  );
}
