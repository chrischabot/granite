import type { VaultPath } from "@core/fs/types";
import { describe, expect, it } from "vitest";
import {
  EXTERNAL_EDIT_SYNC_BUDGET_MS,
  EXTERNAL_EDIT_SYNC_DEBOUNCE_MS,
  externalEditTouchesPath,
  shouldApplyExternalEdit,
} from "./external-edit";

describe("external edit synchronization", () => {
  it("keeps the debounce under the 500 ms acceptance budget", () => {
    expect(EXTERNAL_EDIT_SYNC_DEBOUNCE_MS).toBeLessThanOrEqual(EXTERNAL_EDIT_SYNC_BUDGET_MS);
    expect(EXTERNAL_EDIT_SYNC_BUDGET_MS).toBe(500);
  });

  it("recognizes watcher events for the open file", () => {
    const path = "Notes/A.md" as VaultPath;
    expect(externalEditTouchesPath({ type: "modify", path }, path)).toBe(true);
    expect(externalEditTouchesPath({ type: "create", path }, path)).toBe(true);
    expect(externalEditTouchesPath({ type: "delete", path }, path)).toBe(true);
    expect(
      externalEditTouchesPath(
        { type: "rename", oldPath: "Other.md" as VaultPath, newPath: path },
        path,
      ),
    ).toBe(true);
    expect(externalEditTouchesPath({ type: "modify", path: "Other.md" as VaultPath }, path)).toBe(
      false,
    );
  });

  it("applies external content only when the editor has no unsaved local edits", () => {
    expect(shouldApplyExternalEdit("old", "old", "new")).toBe(true);
    expect(shouldApplyExternalEdit("local dirty", "old", "new")).toBe(false);
    expect(shouldApplyExternalEdit("old", "old", "old")).toBe(false);
  });
});
