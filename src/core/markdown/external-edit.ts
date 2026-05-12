import type { FsEvent, VaultPath } from "@core/fs/types";

export const EXTERNAL_EDIT_SYNC_DEBOUNCE_MS = 200;
export const EXTERNAL_EDIT_SYNC_BUDGET_MS = 500;

export function externalEditTouchesPath(event: FsEvent, path: VaultPath): boolean {
  switch (event.type) {
    case "create":
    case "modify":
    case "delete":
      return event.path === path;
    case "rename":
      return event.oldPath === path || event.newPath === path;
  }
}

export function shouldApplyExternalEdit(
  currentDocument: string,
  lastSavedDocument: string,
  externalDocument: string,
): boolean {
  return currentDocument === lastSavedDocument && externalDocument !== lastSavedDocument;
}
