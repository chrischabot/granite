import { useSyncExternalStore } from "react";
import { workspaceStore } from "./store";
import type { WorkspaceState } from "./types";

/**
 * Subscribe to the workspace state. The full state object is structurally
 * stable across renders — `setState` creates a new top-level object only when
 * an action runs, so consumers can safely destructure or pass-through.
 *
 * Do NOT pass an inline selector that returns a fresh object literal — that
 * breaks `useSyncExternalStore`'s caching contract.
 */
export function useWorkspace(): WorkspaceState {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getState,
    workspaceStore.getServerSnapshot,
  );
}
