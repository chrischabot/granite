import { commandRegistry } from "@core/commands/CommandRegistry";
import { ChevronsUpDown, Settings } from "lucide-react";
import { useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { useI18n } from "../i18n/useI18n";
import { VaultPicker } from "../prompts/VaultPicker";
import { useVault } from "../vault/VaultContext";

export function VaultProfile() {
  const t = useI18n();
  const { activeVault } = useVault();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="workspace-sidedock-vault-profile">
        <button
          type="button"
          className="workspace-drawer-vault-switcher"
          aria-label={t("vaultProfile.switch")}
          onClick={() => setPickerOpen(true)}
        >
          <span className="workspace-drawer-vault-name">
            {activeVault?.entry.name ?? t("vaultProfile.noVault")}
          </span>
          <span className="workspace-drawer-vault-switcher-icon">
            <ChevronsUpDown />
          </span>
        </button>
        <div className="workspace-drawer-vault-actions">
          <ClickableIcon
            ariaLabel={t("ribbon.settings")}
            icon={<Settings />}
            onClick={() => void commandRegistry.run("app:open-settings")}
          />
        </div>
      </div>
      <VaultPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
