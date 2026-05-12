import { dirtyPaths, subscribeDirty } from "@core/workspace/dirty";
import { workspaceStore } from "@core/workspace/store";
import type { Leaf } from "@core/workspace/types";
import {
  ExternalLink,
  Pin,
  PinOff,
  SplitSquareHorizontal,
  SplitSquareVertical,
  X,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "../i18n/useI18n";
import { type MenuItem, openMenu } from "../overlay/Menu";
import { displayLeafTitle } from "./leaf-title";

export interface TabProps {
  leaf: Leaf;
  active: boolean;
}

export const TAB_DND_MIME = "application/granite-leaf";

function tryGetActiveVaultIdFromUrl(): string | null {
  // Granite stores the active vault inside React context, but we also keep
  // the registry in IndexedDB. To keep this component decoupled, we look up
  // the most-recent vault id from a globally exposed accessor injected by
  // VaultProvider. If unavailable, return null and let the popout open the
  // vault picker.
  return (window as unknown as { __graniteActiveVaultId?: string }).__graniteActiveVaultId ?? null;
}

function popOutLeaf(leaf: Leaf): void {
  const vaultId = tryGetActiveVaultIdFromUrl();
  const url = new URL(window.location.href);
  url.searchParams.set("popout", "1");
  if (vaultId) url.searchParams.set("vaultId", vaultId);
  url.searchParams.set("leaf", encodeURIComponent(JSON.stringify(leaf.state)));
  url.hash = "";
  window.open(url.toString(), "_blank", "width=900,height=700,popup");
}

export function Tab({ leaf, active }: TabProps) {
  const t = useI18n();
  const title = displayLeafTitle(leaf, t);
  const isMarkdown = leaf.state.type === "markdown";
  const isPinned = isMarkdown && leaf.state.pinned;
  const dirty = useSyncExternalStore(subscribeDirty, dirtyPaths, dirtyPaths);
  const isDirty = leaf.state.type === "markdown" && dirty.has(leaf.state.path);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const items: MenuItem[] = [
      {
        id: "close",
        label: t("workspace.menu.close"),
        icon: <X size={14} />,
        callback: () => workspaceStore.closeTab(leaf.id),
      },
      {
        id: "close-others",
        label: t("workspace.menu.closeOthers"),
        callback: () => workspaceStore.closeOtherTabs(leaf.id),
      },
      {
        id: "close-right",
        label: t("workspace.menu.closeRight"),
        callback: () => workspaceStore.closeRightTabs(leaf.id),
      },
      {
        id: "split-right",
        label: t("workspace.menu.splitRight"),
        icon: <SplitSquareHorizontal size={14} />,
        callback: () => workspaceStore.splitLeaf(leaf.id, "right"),
      },
      {
        id: "split-down",
        label: t("workspace.menu.splitDown"),
        icon: <SplitSquareVertical size={14} />,
        callback: () => workspaceStore.splitLeaf(leaf.id, "down"),
      },
      {
        id: "popout",
        label: t("workspace.menu.openNewWindow"),
        icon: <ExternalLink size={14} />,
        callback: () => popOutLeaf(leaf),
      },
    ];
    if (isMarkdown) {
      items.push({
        id: "pin",
        label: t(isPinned ? "workspace.menu.unpin" : "workspace.menu.pin"),
        icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
        callback: () => workspaceStore.togglePinned(leaf.id),
      });
    }
    openMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <div
      className={`workspace-tab-header${active ? " is-active" : ""}`}
      data-leaf-id={leaf.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(TAB_DND_MIME, leaf.id);
        e.dataTransfer.setData("text/plain", title);
      }}
      onClick={() => workspaceStore.focusTab(leaf.id)}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          workspaceStore.closeTab(leaf.id);
        }
      }}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter") workspaceStore.focusTab(leaf.id);
      }}
      role="tab"
      aria-selected={active}
      tabIndex={0}
    >
      <div className="workspace-tab-header-inner">
        <span className={`workspace-tab-header-inner-title${isDirty ? " is-dirty" : ""}`}>
          {isDirty ? "● " : ""}
          {title}
        </span>
        <span className="workspace-tab-header-status-container">
          {isPinned && (
            <button
              type="button"
              className="workspace-tab-header-status-icon mod-pinned"
              aria-label={t("workspace.menu.unpin")}
              onClick={(e) => {
                e.stopPropagation();
                workspaceStore.togglePinned(leaf.id);
              }}
            >
              <Pin size={14} />
            </button>
          )}
        </span>
        <button
          type="button"
          className="workspace-tab-header-inner-close-button"
          aria-label={t("workspace.tab.close")}
          onClick={(e) => {
            e.stopPropagation();
            workspaceStore.closeTab(leaf.id);
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
