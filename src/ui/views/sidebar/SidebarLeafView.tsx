import { useI18n } from "../../i18n/useI18n";
import { type SidebarSide, findSidebarTab } from "./registry";

export function SidebarLeafView({ side, id }: { side: SidebarSide; id: string }) {
  const t = useI18n();
  const tab = findSidebarTab(side, id);
  if (!tab) {
    return <div className="workspace-sidedock-empty-state">{t("sidebar.unavailable")}</div>;
  }
  return <>{tab.render()}</>;
}
