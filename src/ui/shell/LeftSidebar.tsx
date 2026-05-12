import { workspaceStore } from "@core/workspace/store";
import { ExternalLink, SplitSquareVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { LEFT_SIDEBAR_TABS } from "../views/sidebar/registry";
import { VaultProfile } from "./VaultProfile";
import {
  type SidebarGroupState,
  closeSidebarGroup,
  setSidebarGroupActive,
  splitSidebarGroup,
} from "./sidebar-groups";

type SidebarTabId = (typeof LEFT_SIDEBAR_TABS)[number]["id"];

export function LeftSidebar() {
  const nextGroupId = useRef(1);
  const [groups, setGroups] = useState<ReadonlyArray<SidebarGroupState<SidebarTabId>>>([
    { id: "left-0", active: "explorer" },
  ]);

  useEffect(() => {
    const onSelect = (e: Event) => {
      const ce = e as CustomEvent<{ side: "left" | "right"; id: string }>;
      if (ce.detail.side !== "left") return;
      const matching = LEFT_SIDEBAR_TABS.find((t) => t.id === ce.detail.id);
      if (!matching) return;
      setGroups((current) =>
        setSidebarGroupActive(current, current[0]?.id ?? "left-0", matching.id),
      );
    };
    window.addEventListener("granite:select-sidebar-tab", onSelect);
    return () => window.removeEventListener("granite:select-sidebar-tab", onSelect);
  }, []);

  return (
    <div className="workspace-split mod-left-split mod-horizontal">
      <div className="workspace-sidebar-inner">
        <div className="workspace-sidebar-groups">
          {groups.map((group, index) => {
            const activeTab = LEFT_SIDEBAR_TABS.find((t) => t.id === group.active);
            return (
              <div className="workspace-sidebar-group" key={group.id}>
                {index > 0 && <div className="workspace-leaf-resize-handle mod-sidebar-row" />}
                <div className="workspace-sidebar-tabs">
                  {LEFT_SIDEBAR_TABS.map((t) => (
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
                      workspaceStore.openSidebarView("left", group.active, { newTab: true })
                    }
                  />
                  <ClickableIcon
                    ariaLabel={`Split ${activeTab?.label ?? group.active} sidebar group`}
                    icon={<SplitSquareVertical />}
                    onClick={() =>
                      setGroups((current) =>
                        splitSidebarGroup(current, group.id, `left-${nextGroupId.current++}`),
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
        <VaultProfile />
      </div>
      <div className="workspace-leaf-resize-handle" />
    </div>
  );
}
