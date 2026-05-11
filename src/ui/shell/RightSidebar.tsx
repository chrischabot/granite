import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Hash,
  History,
  List,
  ListChecks,
  ListTree,
  Network,
} from "lucide-react";
import { useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { AllPropertiesView } from "../views/sidebar/AllPropertiesView";
import { BacklinksView } from "../views/sidebar/BacklinksView";
import { FootnotesView } from "../views/sidebar/FootnotesView";
import { LocalGraphView } from "../views/sidebar/LocalGraphView";
import { OutgoingLinksView } from "../views/sidebar/OutgoingLinksView";
import { OutlineView } from "../views/sidebar/OutlineView";
import { PropertiesView } from "../views/sidebar/PropertiesView";
import { RecentsView } from "../views/sidebar/RecentsView";

const SIDEBAR_TABS = [
  { id: "backlinks", label: "Backlinks", icon: <ArrowDownToLine /> },
  { id: "outgoing", label: "Outgoing links", icon: <ArrowUpFromLine /> },
  { id: "outline", label: "Outline", icon: <ListTree /> },
  { id: "recents", label: "Recent files", icon: <History /> },
  { id: "graph", label: "Local graph", icon: <Network /> },
  { id: "properties", label: "File properties", icon: <List /> },
  { id: "all-properties", label: "All properties (vault)", icon: <ListChecks /> },
  { id: "footnotes", label: "Footnotes", icon: <Hash /> },
] as const;

type RightTabId = (typeof SIDEBAR_TABS)[number]["id"];

export function RightSidebar() {
  const [active, setActive] = useState<RightTabId>("outline");

  return (
    <div className="workspace-split mod-right-split mod-horizontal">
      <div className="workspace-leaf-resize-handle" />
      <div className="workspace-sidebar-inner">
        <div className="workspace-sidebar-tabs">
          {SIDEBAR_TABS.map((t) => (
            <ClickableIcon
              key={t.id}
              ariaLabel={t.label}
              icon={t.icon}
              active={active === t.id}
              onClick={() => setActive(t.id)}
            />
          ))}
        </div>
        <div className="workspace-sidebar-content" data-active-tab={active}>
          {active === "outline" && <OutlineView />}
          {active === "backlinks" && <BacklinksView />}
          {active === "outgoing" && <OutgoingLinksView />}
          {active === "recents" && <RecentsView />}
          {active === "graph" && <LocalGraphView />}
          {active === "properties" && <PropertiesView />}
          {active === "all-properties" && <AllPropertiesView />}
          {active === "footnotes" && <FootnotesView />}
        </div>
      </div>
    </div>
  );
}