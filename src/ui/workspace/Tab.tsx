import {
  Pin,
  X,
  PinOff,
  SplitSquareHorizontal,
  SplitSquareVertical,
  ExternalLink,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Leaf } from "@core/workspace/types";
import { leafTitle } from "@core/workspace/types";
import { workspaceStore } from "@core/workspace/store";
import { dirtyPaths, subscribeDirty } from "@core/workspace/dirty";
import { openMenu, type MenuItem } from "../overlay/Menu";

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
  return (
    (window as unknown as { __graniteActiveVaultId?: string }).__graniteActiveVaultId ?? null
  );
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
  const title = leafTitle(leaf);
  const isMarkdown = leaf.state.type === "markdown";
  const isPinned = isMarkdown && leaf.state.pinned;
  const dirty = useSyncExternalStore(subscribeDirty, dirtyPaths, dirtyPaths);
  const isDirty =
    leaf.state.type === "markdown" && dirty.has(leaf.state.path);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const items: MenuItem[] = [
      {
        id: "close",
        label: "Close",
        icon: <X size={14} />,
        callback: () => workspaceStore.closeTab(leaf.id),
      },
      {
        id: "close-others",
        label: "Close other tabs",
        callback: () => workspaceStore.closeOtherTabs(leaf.id),
      },
      {
        id: "close-right",
        label: "Close tabs to the right",
        callback: () => workspaceStore.closeRightTabs(leaf.id),
      },
      {
        id: "split-right",
        label: "Split right",
        icon: <SplitSquareHorizontal size={14} />,
        callback: () => workspaceStore.splitLeaf(leaf.id, "right"),
      },
      {
        id: "split-down",
        label: "Split down",
        icon: <SplitSquareVertical size={14} />,
        callback: () => workspaceStore.splitLeaf(leaf.id, "down"),
      },
      {
        id: "popout",
        label: "Open in new window",
        icon: <ExternalLink size={14} />,
        callback: () => popOutLeaf(leaf),
      },
    ];
    if (isMarkdown) {
      items.push({
        id: "pin",
        label: isPinned ? "Unpin tab" : "Pin tab",
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
        <span
          className={`workspace-tab-header-inner-title${isDirty ? " is-dirty" : ""}`}
        >
          {isDirty ? "● " : ""}
          {title}
        </span>
        <span className="workspace-tab-header-status-container">
          {isPinned && (
            <span
              className="workspace-tab-header-status-icon mod-pinned"
              role="button"
              aria-label="Unpin tab"
              onClick={(e) => {
                e.stopPropagation();
                workspaceStore.togglePinned(leaf.id);
              }}
            >
              <Pin size={14} />
            </span>
          )}
        </span>
        <button
          type="button"
          className="workspace-tab-header-inner-close-button"
          aria-label="Close tab"
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