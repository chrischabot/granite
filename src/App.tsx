import { useMetadataCache } from "@core/metadata/useMetadata";
import { bindNativeHistory } from "@core/workspace/native-history";
import { bindRecentsToFs } from "@core/workspace/recents";
import { useCallback, useEffect, useState } from "react";
import { A11yAnnouncer, WorkspaceA11yAnnouncements } from "./ui/A11yAnnouncer";
import { CssClassesBinder } from "./ui/CssClassesBinder";
import { LocaleDirectionBinder } from "./ui/LocaleDirectionBinder";
import { CommandsBootstrap } from "./ui/commands/CommandsBootstrap";
import { ErrorBoundary } from "./ui/overlay/ErrorBoundary";
import { HoverPopoverHost } from "./ui/overlay/HoverPopover";
import { MenuHost } from "./ui/overlay/Menu";
import { NoticeContainer } from "./ui/overlay/NoticeContainer";
import { OverlayHost } from "./ui/overlay/OverlayHost";
import { TooltipHost } from "./ui/overlay/Tooltip";
import { CommandPalette } from "./ui/prompts/CommandPalette";
import { FileRecoveryModal } from "./ui/prompts/FileRecoveryModal";
import { HelpModal } from "./ui/prompts/HelpModal";
import { InstallPluginModal } from "./ui/prompts/InstallPluginModal";
import { QuickSwitcher } from "./ui/prompts/QuickSwitcher";
import { SettingsModal } from "./ui/prompts/SettingsModal";
import { TemplatePicker } from "./ui/prompts/TemplatePicker";
import { VaultPicker } from "./ui/prompts/VaultPicker";
import { LeftSidebar } from "./ui/shell/LeftSidebar";
import { Ribbon } from "./ui/shell/Ribbon";
import { RightSidebar } from "./ui/shell/RightSidebar";
import { StatusBar } from "./ui/shell/StatusBar";
import { Titlebar } from "./ui/shell/Titlebar";
import { Workspace } from "./ui/shell/Workspace";
import { ThemeProvider } from "./ui/theme/ThemeProvider";
import { useVault } from "./ui/vault/VaultContext";
import { VaultProvider } from "./ui/vault/VaultContext";

function MetadataCacheBinder() {
  useMetadataCache();
  return null;
}

function NativeHistoryBinder() {
  useEffect(() => bindNativeHistory(), []);
  return null;
}

function RecentsFsBinder() {
  const { activeVault } = useVault();
  useEffect(() => {
    if (!activeVault) return;
    return bindRecentsToFs();
  }, [activeVault]);
  return null;
}

export function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installPluginOpen, setInstallPluginOpen] = useState(false);
  const [fileRecoveryPath, setFileRecoveryPath] = useState<string | null>(null);

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
  const openFileRecovery = useCallback((path: string) => setFileRecoveryPath(path), []);
  const closeFileRecovery = useCallback(() => setFileRecoveryPath(null), []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <VaultProvider>
          <MetadataCacheBinder />
          <NativeHistoryBinder />
          <RecentsFsBinder />
          <CssClassesBinder />
          <LocaleDirectionBinder />
          <A11yAnnouncer />
          <WorkspaceA11yAnnouncements />
          <CommandsBootstrap
            openPalette={openPalette}
            openSwitcher={openSwitcher}
            openVaultPicker={openVaults}
            openSettings={openSettings}
            openHelp={openHelp}
            openInstallPlugin={openInstallPlugin}
            openFileRecovery={openFileRecovery}
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
          <FileRecoveryModal path={fileRecoveryPath} onClose={closeFileRecovery} />
          <TemplatePicker />

          <NoticeContainer />
          <TooltipHost />
          <MenuHost />
          <HoverPopoverHost />
          <OverlayHost />
        </VaultProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
