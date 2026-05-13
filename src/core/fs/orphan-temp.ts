import { run } from "@core/effect/runtime";
import { Effect } from "effect";
import { FileSystem } from "./FileSystem";
import type { VaultFile, VaultPath } from "./types";

const ORPHAN_TEMP_RE = /(?:\.tmp~|\.granite-tmp~)$/;

export function findOrphanAtomicWriteTemps(
  files: ReadonlyArray<VaultFile>,
): ReadonlyArray<VaultPath> {
  return files
    .filter((file) => ORPHAN_TEMP_RE.test(file.path))
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b));
}

export async function scanOrphanAtomicWriteTemps(): Promise<ReadonlyArray<VaultPath>> {
  const files = await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      return yield* fs.listAll();
    }),
  );
  return findOrphanAtomicWriteTemps(files);
}
