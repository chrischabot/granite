import { workspaceStore } from "@core/workspace/store";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { LEFT_SIDEBAR_TABS } from "../views/sidebar/registry";
import { VaultProfile } from "./VaultProfile";

type SidebarTabId = (typeof LEFT_SIDEBAR_TABS)[number]["id"];

export function LeftSidebar() {
  const [active, setActive] = useState<SidebarTabId>("explorer");

  useEffect(() => {
    const onSelect = (e: Event) => {
      const ce = e as CustomEvent<{ side: "left" | "right"; id: string }>;
      if (ce.detail.side !== "left") return;
      const matching = LEFT_SIDEBAR_TABS.find((t) => t.id === ce.detail.id);
      if (matching) setActive(matching.id);
    };
    window.addEventListener("granite:select-sidebar-tab", onSelect);
    return () => window.removeEventListener("granite:select-sidebar-tab", onSelect);
  }, []);

  return (
    <div className="workspace-split mod-left-split mod-horizontal">
      <div className="workspace-sidebar-inner">
        <div className="workspace-sidebar-tabs">
          {LEFT_SIDEBAR_TABS.map((t) => (
            <ClickableIcon
              key={t.id}
              ariaLabel={t.label}
              icon={t.icon}
              active={active === t.id}
              onClick={() => setActive(t.id)}
            />
          ))}
          <ClickableIcon
            ariaLabel={`Open ${LEFT_SIDEBAR_TABS.find((t) => t.id === active)?.label ?? active} in central area`}
            icon={<ExternalLink />}
            onClick={() => workspaceStore.openSidebarView("left", active, { newTab: true })}
          />
        </div>
        <div className="workspace-sidebar-content" data-active-tab={active}>
          {LEFT_SIDEBAR_TABS.find((t) => t.id === active)?.render()}
        </div>
        <VaultProfile />
      </div>
      <div className="workspace-leaf-resize-handle" />
    </div>
  );
}
