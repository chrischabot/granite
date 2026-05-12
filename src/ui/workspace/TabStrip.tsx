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

  return (
    <div
      className="workspace-tab-header-container"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div ref={innerRef} className="workspace-tab-header-container-inner">
        {leaves.map((leaf) => (
          <div
            key={leaf.id}
            data-leaf-id={leaf.id}
            className={insertBefore === leaf.id ? "workspace-tab-header-drop-before" : undefined}
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
