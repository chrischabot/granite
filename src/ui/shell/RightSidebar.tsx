import { workspaceStore } from "@core/workspace/store";
import { ExternalLink, SplitSquareVertical, X } from "lucide-react";
import { useRef, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { RIGHT_SIDEBAR_TABS } from "../views/sidebar/registry";
import {
  type SidebarGroupState,
  closeSidebarGroup,
  setSidebarGroupActive,
  splitSidebarGroup,
} from "./sidebar-groups";

type RightTabId = (typeof RIGHT_SIDEBAR_TABS)[number]["id"];

export function RightSidebar() {
  const nextGroupId = useRef(1);
  const [groups, setGroups] = useState<ReadonlyArray<SidebarGroupState<RightTabId>>>([
    { id: "right-0", active: "outline" },
  ]);

  return (
    <div className="workspace-split mod-right-split mod-horizontal">
      <div className="workspace-leaf-resize-handle" />
      <div className="workspace-sidebar-inner">
        <div className="workspace-sidebar-groups">
          {groups.map((group, index) => {
            const activeTab = RIGHT_SIDEBAR_TABS.find((t) => t.id === group.active);
            return (
              <div className="workspace-sidebar-group" key={group.id}>
                {index > 0 && <div className="workspace-leaf-resize-handle mod-sidebar-row" />}
                <div className="workspace-sidebar-tabs">
                  {RIGHT_SIDEBAR_TABS.map((t) => (
                    <ClickableIcon
                      key={t.id}
                      ariaLabel={t.label}
                      icon={t.icon}
                      active={group.active === t.id}
                      onClick={() =>
                        setGroups((current) => setSidebarGroupActive(current, group.id, t.id))
                      }
                    />
                  ))}
                  <ClickableIcon
                    ariaLabel={`Open ${activeTab?.label ?? group.active} in central area`}
                    icon={<ExternalLink />}
                    onClick={() =>
                      workspaceStore.openSidebarView("right", group.active, { newTab: true })
                    }
                  />
                  <ClickableIcon
                    ariaLabel={`Split ${activeTab?.label ?? group.active} sidebar group`}
                    icon={<SplitSquareVertical />}
                    onClick={() =>
                      setGroups((current) =>
                        splitSidebarGroup(current, group.id, `right-${nextGroupId.current++}`),
                      )
                    }
                  />
                  {groups.length > 1 && (
                    <ClickableIcon
                      ariaLabel={`Close ${activeTab?.label ?? group.active} sidebar group`}
                      icon={<X />}
                      onClick={() => setGroups((current) => closeSidebarGroup(current, group.id))}
                    />
                  )}
                </div>
                <div className="workspace-sidebar-content" data-active-tab={group.active}>
                  {activeTab?.render()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
