import { ChevronsUpDown, Settings } from "lucide-react";
import { useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { useVault } from "../vault/VaultContext";
import { VaultPicker } from "../prompts/VaultPicker";
import { commandRegistry } from "@core/commands/CommandRegistry";

export function VaultProfile() {
  const { activeVault } = useVault();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="workspace-sidedock-vault-profile">
        <button
          type="button"
          className="workspace-drawer-vault-switcher"
          aria-label="Switch vault"
          onClick={() => setPickerOpen(true)}
        >
          <span className="workspace-drawer-vault-name">
            {activeVault?.entry.name ?? "No vault"}
          </span>
          <span className="workspace-drawer-vault-switcher-icon">
            <ChevronsUpDown />
          </span>
        </button>
        <div className="workspace-drawer-vault-actions">
          <ClickableIcon
            ariaLabel="Open settings"
            icon={<Settings />}
            onClick={() => void commandRegistry.run("app:open-settings")}
          />
        </div>
      </div>
      <VaultPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}