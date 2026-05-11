import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";

export const GRANITE_DIR = ".granite";

/**
 * Read and parse a JSON config file inside `.granite/`. Returns `null` when
 * the file is missing, unreadable, or malformed — the caller decides how to
 * fall back (typically to localStorage during the migration window).
 */
export async function readConfigJson<T>(name: string): Promise<T | null> {
  try {
    const text = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(`${GRANITE_DIR}/${name}.json`);
      }),
    );
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON config file inside `.granite/`. Creates the `.granite` folder
 * idempotently and uses the FileSystem's atomic write protocol.
 */
export async function writeConfigJson(name: string, data: unknown): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      yield* fs.mkdir(GRANITE_DIR);
      yield* fs.writeText(
        `${GRANITE_DIR}/${name}.json`,
        JSON.stringify(data, null, 2),
      );
    }),
  );
}

/** Remove a JSON config file inside `.granite/`. Errors are swallowed. */
export async function removeConfigJson(name: string): Promise<void> {
  try {
    await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        yield* fs.remove(`${GRANITE_DIR}/${name}.json`);
      }),
    );
  } catch {
    /* swallow */
  }
}