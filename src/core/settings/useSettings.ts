import { useSyncExternalStore } from "react";
import { settingsStore } from "./store";
import type { UserSettings } from "./store";

export function useSettings(): UserSettings {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getState,
    settingsStore.getServerSnapshot,
  );
}
