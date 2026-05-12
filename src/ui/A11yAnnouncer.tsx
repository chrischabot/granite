import { a11yAnnouncer } from "@core/a11y/announcer";
import { leafTitle } from "@core/workspace/types";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { useEffect, useRef, useSyncExternalStore } from "react";

export function A11yAnnouncer() {
  const announcement = useSyncExternalStore(
    a11yAnnouncer.subscribe,
    a11yAnnouncer.getSnapshot,
    a11yAnnouncer.getServerSnapshot,
  );

  return (
    <output className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement.message}
    </output>
  );
}

export function WorkspaceA11yAnnouncements() {
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activeLeafId = activeGroupId ? (groups.get(activeGroupId)?.activeLeafId ?? null) : null;
  const activeLeaf = activeLeafId ? (leaves.get(activeLeafId) ?? null) : null;
  const lastAnnouncedLeafId = useRef(activeLeafId);

  useEffect(() => {
    if (!activeLeafId || activeLeafId === lastAnnouncedLeafId.current) return;
    lastAnnouncedLeafId.current = activeLeafId;
    if (activeLeaf) a11yAnnouncer.announce(`Active tab: ${leafTitle(activeLeaf)}`);
  }, [activeLeafId, activeLeaf]);

  return null;
}
