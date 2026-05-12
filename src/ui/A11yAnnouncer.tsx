import { a11yAnnouncer } from "@core/a11y/announcer";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useI18n } from "./i18n/useI18n";
import { displayLeafTitle } from "./workspace/leaf-title";

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
  const t = useI18n();
  const { activeGroupId, groups, leaves } = useWorkspace();
  const activeLeafId = activeGroupId ? (groups.get(activeGroupId)?.activeLeafId ?? null) : null;
  const activeLeaf = activeLeafId ? (leaves.get(activeLeafId) ?? null) : null;
  const lastAnnouncedLeafId = useRef(activeLeafId);

  useEffect(() => {
    if (!activeLeafId || activeLeafId === lastAnnouncedLeafId.current) return;
    lastAnnouncedLeafId.current = activeLeafId;
    if (activeLeaf) {
      a11yAnnouncer.announce(
        t("workspace.announce.activeTab", { title: displayLeafTitle(activeLeaf, t) }),
      );
    }
  }, [activeLeafId, activeLeaf, t]);

  return null;
}
