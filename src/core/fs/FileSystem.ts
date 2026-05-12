import { Context, type Effect } from "effect";
import type { FsError, FsEvent, VaultEntry, VaultFile, VaultPath } from "./types";

/** Disposer returned by FileSystem.watch — call to stop receiving events. */
export type FsUnsubscribe = () => void;

export interface FileSystemImpl {
  /** Human-readable display name of the vault root (folder name on disk). */
  readonly rootName: string;

  /** List immediate children of `dir`. Returns sorted entries (dirs first). */
  list(dir: VaultPath): Effect.Effect<ReadonlyArray<VaultEntry>, FsError>;

  /** List every file recursively, optionally filtered by extension list. */
  listAll(opts?: {
    readonly extensions?: ReadonlyArray<string>;
  }): Effect.Effect<ReadonlyArray<VaultFile>, FsError>;

  /** Read file contents as UTF-8 text. */
  readText(path: VaultPath): Effect.Effect<string, FsError>;

  /** Read raw bytes (for images, audio, PDFs). */
  readBytes(path: VaultPath): Effect.Effect<Uint8Array, FsError>;

  /**
   * Atomic write: writes to a temp sibling, then moves over.
   * If `path` exists, it is overwritten. Parent directories are created.
   */
  writeText(path: VaultPath, content: string): Effect.Effect<void, FsError>;

  writeBytes(path: VaultPath, bytes: Uint8Array): Effect.Effect<void, FsError>;

  /** Create a directory (and parents) idempotently. */
  mkdir(dir: VaultPath): Effect.Effect<void, FsError>;

  /** Move or rename. */
  rename(from: VaultPath, to: VaultPath): Effect.Effect<void, FsError>;

  /** Delete file or directory recursively. */
  remove(path: VaultPath): Effect.Effect<void, FsError>;

  /**
   * Move a path to the operating system trash/recycle bin.
   *
   * Browser File System Access does not expose this capability, so adapters may
   * omit it. Callers must treat absence as unsupported instead of falling back
   * to permanent deletion.
   */
  moveToSystemTrash?(path: VaultPath): Effect.Effect<void, FsError>;

  /** Stat a path (returns null for non-existent). */
  stat(path: VaultPath): Effect.Effect<VaultEntry | null, FsError>;

  /**
   * Subscribe to filesystem changes. Returns a disposer.
   * The handler is called on the JS event loop (no Effect wrapping needed for
   * the consumer side — this is the lowest-friction subscription API).
   */
  watch(handler: (event: FsEvent) => void): FsUnsubscribe;
}

/**
 * The `FileSystem` Effect 4 service class. Use `yield* FileSystem` inside
 * `Effect.gen` to get the `FileSystemImpl`, or `Layer.succeed(FileSystem, impl)`
 * when constructing the runtime layer.
 */
export class FileSystem extends Context.Service<FileSystem, FileSystemImpl>()(
  "granite/FileSystem",
) {}
