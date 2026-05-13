import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { useEffect } from "react";

const APPLIED_KEY = "__granite_applied_cssclasses__";

export function CssClassesBinder() {
  // Trigger re-runs when metadata changes, even if the active leaf is unchanged.
  useMetadataVersion();
  const { activeGroupId, groups, leaves } = useWorkspace();

  useEffect(() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    const leaf = group?.activeLeafId ? leaves.get(group.activeLeafId) : null;
    const path = leaf?.state.type === "markdown" ? leaf.state.path : null;
    const meta = path ? metadataCache.getMetadata(path) : null;
    const desired = new Set<string>(meta?.cssClasses ?? []);

    const body = document.body;
    const previous =
      (body as unknown as { [APPLIED_KEY]?: Set<string> })[APPLIED_KEY] ?? new Set<string>();

    // Remove classes that are no longer wanted.
    for (const cls of previous) {
      if (!desired.has(cls)) body.classList.remove(cls);
    }
    // Add new ones.
    for (const cls of desired) {
      if (!previous.has(cls)) body.classList.add(cls);
    }
    (body as unknown as { [APPLIED_KEY]: Set<string> })[APPLIED_KEY] = desired;

    return () => {
      // On unmount, drop the binding's classes.
      for (const cls of desired) body.classList.remove(cls);
      delete (body as unknown as { [APPLIED_KEY]?: Set<string> })[APPLIED_KEY];
    };
  }, [activeGroupId, groups, leaves]);

  return null;
}
