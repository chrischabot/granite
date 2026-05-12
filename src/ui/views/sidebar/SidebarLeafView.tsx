import { type SidebarSide, findSidebarTab } from "./registry";

export function SidebarLeafView({ side, id }: { side: SidebarSide; id: string }) {
  const tab = findSidebarTab(side, id);
  if (!tab) {
    return (
      <div className="workspace-sidedock-empty-state">Sidebar view is no longer available.</div>
    );
  }
  return <>{tab.render()}</>;
}
