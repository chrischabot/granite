import { Effect } from "effect";
import { t } from "../i18n";
import { FileSystem } from "./FileSystem";
import { basename, dirname, extension, join } from "./path";
import { type FsError, FsUnsupported, type VaultPath } from "./types";

export type DeletedFilesMode = "system" | "vault" | "permanent";

const VAULT_TRASH_DIR = ".trash";

function vaultTrashCandidate(path: VaultPath, suffix: number): VaultPath {
  if (suffix === 0) return join(VAULT_TRASH_DIR, path);
  const dir = dirname(path);
  const name = basename(path);
  const ext = extension(name);
  const dotExt = ext ? `.${ext}` : "";
  const base = ext ? name.slice(0, -(ext.length + 1)) : name;
  return join(VAULT_TRASH_DIR, dir, `${base} ${suffix}${dotExt}`);
}

function moveToVaultTrash(path: VaultPath): Effect.Effect<void, FsError, FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem;
    if (path === VAULT_TRASH_DIR || path.startsWith(`${VAULT_TRASH_DIR}/`)) {
      yield* fs.remove(path);
      return;
    }

    for (let suffix = 0; suffix < 1000; suffix++) {
      const target = vaultTrashCandidate(path, suffix);
      const exists = yield* fs.stat(target);
      if (exists) continue;
      const targetDir = dirname(target);
      if (targetDir) yield* fs.mkdir(targetDir);
      yield* fs.rename(path, target);
      return;
    }

    return yield* Effect.fail(
      new FsUnsupported({ feature: t("fs.trash.error.vaultPathUnavailable", { path }) }),
    );
  });
}

export function deleteVaultPath(
  path: VaultPath,
  mode: DeletedFilesMode,
): Effect.Effect<void, FsError, FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem;
    if (mode === "permanent") {
      yield* fs.remove(path);
      return;
    }
    if (mode === "vault") {
      yield* moveToVaultTrash(path);
      return;
    }
    if (!fs.moveToSystemTrash) {
      return yield* Effect.fail(
        new FsUnsupported({
          feature: t("fs.trash.error.systemUnavailable"),
        }),
      );
    }
    yield* fs.moveToSystemTrash(path);
  });
}
