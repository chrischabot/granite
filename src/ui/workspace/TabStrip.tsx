import { workspaceStore } from "@core/workspace/store";
import type { Leaf } from "@core/workspace/types";
import { Columns, Plus, Rows, X } from "lucide-react";
import { useRef, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { useI18n } from "../i18n/useI18n";
import { TAB_DND_MIME, Tab } from "./Tab";

export interface TabStripProps {
  leaves: ReadonlyArray<Leaf>;
  activeLeafId: string | null;
  groupId: string;
  canCloseGroup: boolean;
  stacked: boolean;
}

export function TabStrip({ leaves, activeLeafId, groupId, canCloseGroup, stacked }: TabStripProps) {
  const t = useI18n();
  const innerRef = useRef<HTMLDivElement>(null);
  const [insertBefore, setInsertBefore] = useState<string | null | undefined>(undefined);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes(TAB_DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const inner = innerRef.current;
    if (!inner) return;
    const tabs = inner.querySelectorAll<HTMLElement>("[data-leaf-id]");
    let target: string | null = null;
    for (const tab of tabs) {
      const rect = tab.getBoundingClientRect();
      if (
        stacked ? e.clientY < rect.top + rect.height / 2 : e.clientX < rect.left + rect.width / 2
      ) {
        target = tab.getAttribute("data-leaf-id");
        break;
      }
    }
    setInsertBefore(target);
  };

  const onDragLeave = () => setInsertBefore(undefined);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const id = e.dataTransfer.getData(TAB_DND_MIME);
    if (!id) {
      setInsertBefore(undefined);
      return;
    }
    e.preventDefault();
    workspaceStore.moveTab(id, groupId, insertBefore ?? null);
    setInsertBefore(undefined);
  };

  const focusLeafAt = (index: number) => {
    const leaf = leaves[index];
    if (!leaf) return;
    workspaceStore.focusTab(leaf.id);
    requestAnimationFrame(() => {
      innerRef.current?.querySelectorAll<HTMLElement>("[role='tab']")[index]?.focus();
    });
  };

  const onTabListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target =
      e.target instanceof HTMLElement ? e.target.closest<HTMLElement>("[role='tab']") : null;
    const leafId = target?.getAttribute("data-leaf-id");
    const index = leafId ? leaves.findIndex((leaf) => leaf.id === leafId) : -1;
    if (index === -1 || leaves.length === 0) return;

    const last = leaves.length - 1;
    let nextIndex: number | null = null;
    if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = last;
    else if (e.key === (stacked ? "ArrowDown" : "ArrowRight"))
      nextIndex = (index + 1) % leaves.length;
    else if (e.key === (stacked ? "ArrowUp" : "ArrowLeft")) {
      nextIndex = (index - 1 + leaves.length) % leaves.length;
    }

    if (nextIndex === null) return;
    e.preventDefault();
    focusLeafAt(nextIndex);
  };

  return (
    <div
      className="workspace-tab-header-container"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        ref={innerRef}
        className="workspace-tab-header-container-inner"
        role="tablist"
        aria-label={t("workspace.tab.list")}
        onKeyDown={onTabListKeyDown}
      >
        {leaves.map((leaf) => (
          <div
            key={leaf.id}
            data-leaf-id={leaf.id}
            className={insertBefore === leaf.id ? "workspace-tab-header-drop-before" : undefined}
            role="presentation"
          >
            <Tab leaf={leaf} active={leaf.id === activeLeafId} />
          </div>
        ))}
        <div
          className={`workspace-tab-header-spacer${
            insertBefore === null ? " workspace-tab-header-drop-end" : ""
          }`}
        />
      </div>
      <div className="workspace-tab-header-new-tab">
        <ClickableIcon
          ariaLabel={t("workspace.tab.new")}
          icon={<Plus />}
          onClick={() => {
            if (activeLeafId) workspaceStore.focusTab(activeLeafId);
            workspaceStore.newTab();
          }}
        />
        <ClickableIcon
          ariaLabel={t(stacked ? "workspace.tab.unstack" : "workspace.tab.stack")}
          icon={stacked ? <Columns /> : <Rows />}
          onClick={() => workspaceStore.toggleStacked(groupId)}
        />
        {canCloseGroup && (
          <ClickableIcon
            ariaLabel={t("workspace.tab.closeGroup")}
            icon={<X />}
            onClick={() => workspaceStore.closeGroup(groupId)}
          />
        )}
      </div>
    </div>
  );
}
