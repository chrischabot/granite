import { Data } from "effect";

/** Path within a vault, always forward-slash separated, never starting with /. */
export type VaultPath = string;

export interface VaultFile {
  readonly type: "file";
  readonly path: VaultPath;
  readonly name: string;
  readonly size: number;
  readonly mtimeMs: number;
  readonly ctimeMs: number;
  readonly extension: string;
}

export interface VaultDirectory {
  readonly type: "directory";
  readonly path: VaultPath;
  readonly name: string;
}

export type VaultEntry = VaultFile | VaultDirectory;

/** Filesystem errors as a tagged ADT. */
export class FsNotFound extends Data.TaggedError("FsNotFound")<{ path: VaultPath }> {}
export class FsAccessDenied extends Data.TaggedError("FsAccessDenied")<{ path: VaultPath; reason: string }> {}
export class FsAlreadyExists extends Data.TaggedError("FsAlreadyExists")<{ path: VaultPath }> {}
export class FsIoError extends Data.TaggedError("FsIoError")<{ path: VaultPath; cause: unknown }> {}
export class FsUnsupported extends Data.TaggedError("FsUnsupported")<{ feature: string }> {}

export type FsError = FsNotFound | FsAccessDenied | FsAlreadyExists | FsIoError | FsUnsupported;

/** Watcher event — filesystem change notification. */
export type FsEvent =
  | { readonly type: "create"; readonly path: VaultPath }
  | { readonly type: "modify"; readonly path: VaultPath }
  | { readonly type: "delete"; readonly path: VaultPath }
  | { readonly type: "rename"; readonly oldPath: VaultPath; readonly newPath: VaultPath };