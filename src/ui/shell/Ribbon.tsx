import {
  Calendar,
  Dice5,
  FileSearch,
  GitFork,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  Mic,
  PanelsTopLeft,
  Settings,
  Sheet,
  Table,
  Terminal,
} from "lucide-react";
import type { ReactNode } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { commandRegistry } from "@core/commands/CommandRegistry";
import { workspaceStore } from "@core/workspace/store";

interface RibbonItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface RibbonProps {
  onOpenPalette: () => void;
  onOpenSwitcher: () => void;
  onOpenVaults: () => void;
  onOpenSettings: () => void;
}

export function Ribbon({
  onOpenPalette,
  onOpenSwitcher,
  onOpenVaults,
  onOpenSettings,
}: RibbonProps) {
  const userActions: RibbonItem[] = [
    { id: "switcher", label: "Open quick switcher", icon: <FileSearch />, onClick: onOpenSwitcher },
    { id: "palette", label: "Open command palette", icon: <Terminal />, onClick: onOpenPalette },
    { id: "graph", label: "Open graph view", icon: <GitFork />, onClick: () => workspaceStore.openGraph() },
    { id: "canvas", label: "Create new canvas", icon: <LayoutDashboard />, onClick: () => workspaceStore.openCanvas() },
    { id: "base", label: "Create new base", icon: <Table />, onClick: () => workspaceStore.openBase() },
    {
      id: "daily",
      label: "Open today's daily note",
      icon: <Calendar />,
      onClick: () => void commandRegistry.run("daily-notes:open-today"),
    },
    {
      id: "workspaces",
      label: "Manage workspace layouts",
      icon: <PanelsTopLeft />,
      onClick: () => void commandRegistry.run("workspaces:save"),
    },
    {
      id: "template",
      label: "Insert template",
      icon: <LayoutTemplate />,
      onClick: () => void commandRegistry.run("templates:insert"),
    },
    {
      id: "unique",
      label: "Create new unique note",
      icon: <Sheet />,
      onClick: () => void commandRegistry.run("unique-note:create"),
    },
    {
      id: "random",
      label: "Open random note",
      icon: <Dice5 />,
      onClick: () => void commandRegistry.run("random-note:open"),
    },
    {
      id: "record",
      label: "Start/stop recording",
      icon: <Mic />,
      onClick: () => void commandRegistry.run("audio-recorder:toggle"),
    },
  ];

  const systemActions: RibbonItem[] = [
    { id: "vaults", label: "Manage vaults", icon: <PanelsTopLeft />, onClick: onOpenVaults },
    { id: "help", label: "Open help", icon: <HelpCircle />, onClick: () => void commandRegistry.run("help:open-cheat-sheet") },
    { id: "settings", label: "Open settings", icon: <Settings />, onClick: onOpenSettings },
  ];

  return (
    <div className="workspace-ribbon mod-left">
      <div className="side-dock-actions">
        {userActions.map((item) => (
          <ClickableIcon
            key={item.id}
            ariaLabel={item.label}
            icon={item.icon}
            modifier="side-dock-ribbon-action"
            onClick={item.onClick}
          />
        ))}
      </div>
      <div className="side-dock-settings">
        {systemActions.map((item) => (
          <ClickableIcon
            key={item.id}
            ariaLabel={item.label}
            icon={item.icon}
            modifier="side-dock-ribbon-action"
            onClick={item.onClick}
          />
        ))}
      </div>
    </div>
  );
}