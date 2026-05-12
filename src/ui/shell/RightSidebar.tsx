import { workspaceStore } from "@core/workspace/store";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { RIGHT_SIDEBAR_TABS } from "../views/sidebar/registry";

type RightTabId = (typeof RIGHT_SIDEBAR_TABS)[number]["id"];

export function RightSidebar() {
  const [active, setActive] = useState<RightTabId>("outline");

  return (
    <div className="workspace-split mod-right-split mod-horizontal">
      <div className="workspace-leaf-resize-handle" />
      <div className="workspace-sidebar-inner">
        <div className="workspace-sidebar-tabs">
          {RIGHT_SIDEBAR_TABS.map((t) => (
            <ClickableIcon
              key={t.id}
              ariaLabel={t.label}
              icon={t.icon}
              active={active === t.id}
              onClick={() => setActive(t.id)}
            />
          ))}
          <ClickableIcon
            ariaLabel={`Open ${RIGHT_SIDEBAR_TABS.find((t) => t.id === active)?.label ?? active} in central area`}
            icon={<ExternalLink />}
            onClick={() => workspaceStore.openSidebarView("right", active, { newTab: true })}
          />
        </div>
        <div className="workspace-sidebar-content" data-active-tab={active}>
          {RIGHT_SIDEBAR_TABS.find((t) => t.id === active)?.render()}
        </div>
      </div>
    </div>
  );
}
