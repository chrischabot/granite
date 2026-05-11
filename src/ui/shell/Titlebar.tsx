import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";
import { workspaceStore } from "@core/workspace/store";

export function Titlebar() {
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
            ariaLabel="Navigate back"
            icon={<ChevronLeft />}
            disabled={!canBack}
            onClick={() => activeLeafId && workspaceStore.goBack(activeLeafId)}
          />
          <ClickableIcon
            ariaLabel="Navigate forward"
            icon={<ChevronRight />}
            disabled={!canForward}
            onClick={() => activeLeafId && workspaceStore.goForward(activeLeafId)}
          />
        </div>
        <div className="titlebar-text" aria-hidden="true">
          Granite
        </div>
        <div className="titlebar-button-container mod-right">{/* OS controls (web has none) */}</div>
      </div>
    </div>
  );
}