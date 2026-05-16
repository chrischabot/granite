import { commandRegistry } from "@core/commands/CommandRegistry";
import { workspaceStore } from "@core/workspace/store";
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
import { useI18n } from "../i18n/useI18n";

interface RibbonItem {
  id: string;
  labelKey: string;
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
  const t = useI18n();
  const userActions: RibbonItem[] = [
    {
      id: "switcher",
      labelKey: "ribbon.quickSwitcher",
      icon: <FileSearch />,
      onClick: onOpenSwitcher,
    },
    {
      id: "palette",
      labelKey: "ribbon.commandPalette",
      icon: <Terminal />,
      onClick: onOpenPalette,
    },
    {
      id: "graph",
      labelKey: "ribbon.graph",
      icon: <GitFork />,
      onClick: () => workspaceStore.openGraph(),
    },
    {
      id: "canvas",
      labelKey: "ribbon.canvas",
      icon: <LayoutDashboard />,
      // Route through the command so it scaffolds an actual `.canvas` file
      // instead of just opening an empty viewer (which is what
      // workspaceStore.openCanvas() does on its own).
      onClick: () => void commandRegistry.run("canvas:open"),
    },
    {
      id: "base",
      labelKey: "ribbon.base",
      icon: <Table />,
      // Route through the bases-scaffold plugin's command which prompts for a
      // name and writes a real `.base` file before opening it.
      onClick: () => void commandRegistry.run("bases:create"),
    },
    {
      id: "daily",
      labelKey: "ribbon.daily",
      icon: <Calendar />,
      onClick: () => void commandRegistry.run("daily-notes:open-today"),
    },
    {
      id: "workspaces",
      labelKey: "ribbon.workspaces",
      icon: <PanelsTopLeft />,
      onClick: () => void commandRegistry.run("workspaces:save"),
    },
    {
      id: "template",
      labelKey: "ribbon.template",
      icon: <LayoutTemplate />,
      onClick: () => void commandRegistry.run("templates:insert"),
    },
    {
      id: "unique",
      labelKey: "ribbon.unique",
      icon: <Sheet />,
      onClick: () => void commandRegistry.run("unique-note:create"),
    },
    {
      id: "random",
      labelKey: "ribbon.random",
      icon: <Dice5 />,
      onClick: () => void commandRegistry.run("random-note:open"),
    },
    {
      id: "record",
      labelKey: "ribbon.record",
      icon: <Mic />,
      onClick: () => void commandRegistry.run("audio-recorder:toggle"),
    },
  ];

  const systemActions: RibbonItem[] = [
    { id: "vaults", labelKey: "ribbon.vaults", icon: <PanelsTopLeft />, onClick: onOpenVaults },
    {
      id: "help",
      labelKey: "ribbon.help",
      icon: <HelpCircle />,
      onClick: () => void commandRegistry.run("help:open-cheat-sheet"),
    },
    { id: "settings", labelKey: "ribbon.settings", icon: <Settings />, onClick: onOpenSettings },
  ];

  return (
    <div className="workspace-ribbon mod-left">
      <div className="side-dock-actions">
        {userActions.map((item) => (
          <ClickableIcon
            key={item.id}
            ariaLabel={t(item.labelKey)}
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
            ariaLabel={t(item.labelKey)}
            icon={item.icon}
            modifier="side-dock-ribbon-action"
            onClick={item.onClick}
          />
        ))}
      </div>
    </div>
  );
}
