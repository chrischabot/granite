import { workspaceStore } from "@core/workspace/store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { useI18n } from "../i18n/useI18n";

export function Titlebar() {
  const t = useI18n();
  // Subscribe to workspace state to recompute back/forward enablement.
  const [, force] = useState(0);
  useEffect(() => workspaceStore.subscribe(() => force((n) => n + 1)), []);

  const state = workspaceStore.getState();
  const activeLeafId = (() => {
    const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
    return group?.activeLeafId ?? null;
  })();
  const canBack = activeLeafId ? workspaceStore.canGoBack(activeLeafId) : false;
  const canForward = activeLeafId ? workspaceStore.canGoForward(activeLeafId) : false;

  return (
    <div className="titlebar">
      <div className="titlebar-inner">
        <div className="titlebar-button-container mod-left">
          <ClickableIcon
            ariaLabel={t("titlebar.navigateBack")}
            icon={<ChevronLeft />}
            disabled={!canBack}
            onClick={() => activeLeafId && workspaceStore.goBack(activeLeafId)}
          />
          <ClickableIcon
            ariaLabel={t("titlebar.navigateForward")}
            icon={<ChevronRight />}
            disabled={!canForward}
            onClick={() => activeLeafId && workspaceStore.goForward(activeLeafId)}
          />
        </div>
        <div className="titlebar-text" aria-hidden="true">
          Granite
        </div>
        <div className="titlebar-button-container mod-right">
          {/* OS controls (web has none) */}
        </div>
      </div>
    </div>
  );
}
