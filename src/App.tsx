import { useCallback, useEffect, useState } from "react";
import { ThemeProvider } from "./ui/theme/ThemeProvider";
import { VaultProvider } from "./ui/vault/VaultContext";
import { Titlebar } from "./ui/shell/Titlebar";
import { Ribbon } from "./ui/shell/Ribbon";
import { LeftSidebar } from "./ui/shell/LeftSidebar";
import { RightSidebar } from "./ui/shell/RightSidebar";
import { Workspace } from "./ui/shell/Workspace";
import { StatusBar } from "./ui/shell/StatusBar";
import { CommandsBootstrap } from "./ui/commands/CommandsBootstrap";
import { CommandPalette } from "./ui/prompts/CommandPalette";
import { QuickSwitcher } from "./ui/prompts/QuickSwitcher";
import { VaultPicker } from "./ui/prompts/VaultPicker";
import { SettingsModal } from "./ui/prompts/SettingsModal";
import { HelpModal } from "./ui/prompts/HelpModal";
import { InstallPluginModal } from "./ui/prompts/InstallPluginModal";
import { TemplatePicker } from "./ui/prompts/TemplatePicker";
import { NoticeContainer } from "./ui/overlay/NoticeContainer";
import { TooltipHost } from "./ui/overlay/Tooltip";
import { MenuHost } from "./ui/overlay/Menu";
import { HoverPopoverHost } from "./ui/overlay/HoverPopover";
import { ErrorBoundary } from "./ui/overlay/ErrorBoundary";
import { useMetadataCache } from "@core/metadata/useMetadata";
import { bindNativeHistory } from "@core/workspace/native-history";
import { CssClassesBinder } from "./ui/CssClassesBinder";

function MetadataCacheBinder() {
  useMetadataCache();
  return null;
}

function NativeHistoryBinder() {
  useEffect(() => bindNativeHistory(), []);
  return null;
}

export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installPluginOpen, setInstallPluginOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);
  const openVaults = useCallback(() => setVaultPickerOpen(true), []);
  const closeVaults = useCallback(() => setVaultPickerOpen(false), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const openInstallPlugin = useCallback(() => setInstallPluginOpen(true), []);
  const closeInstallPlugin = useCallback(() => setInstallPluginOpen(false), []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <VaultProvider>
          <MetadataCacheBinder />
          <NativeHistoryBinder />
          <CssClassesBinder />
          <CommandsBootstrap
            openPalette={openPalette}
            openSwitcher={openSwitcher}
            openVaultPicker={openVaults}
            openSettings={openSettings}
            openHelp={openHelp}
            openInstallPlugin={openInstallPlugin}
          />
          <Titlebar />
          <div className="app-container">
            <div className="horizontal-main-container">
              <Ribbon
                onOpenPalette={openPalette}
                onOpenSwitcher={openSwitcher}
                onOpenVaults={openVaults}
                onOpenSettings={openSettings}
              />
              <LeftSidebar />
              <Workspace />
              <RightSidebar />
            </div>
          </div>
          <StatusBar />

          <CommandPalette open={paletteOpen} onClose={closePalette} />
          <QuickSwitcher open={switcherOpen} onClose={closeSwitcher} />
          <VaultPicker open={vaultPickerOpen} onClose={closeVaults} />
          <SettingsModal open={settingsOpen} onClose={closeSettings} />
          <HelpModal open={helpOpen} onClose={closeHelp} />
          <InstallPluginModal open={installPluginOpen} onClose={closeInstallPlugin} />
          <TemplatePicker />

          <NoticeContainer />
          <TooltipHost />
          <MenuHost />
          <HoverPopoverHost />
        </VaultProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}