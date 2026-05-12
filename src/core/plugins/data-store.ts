import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { Effect } from "effect";

const PLUGIN_DATA_ROOT = ".granite/plugins";

function dataPath(pluginId: string): string {
  return `${PLUGIN_DATA_ROOT}/${pluginId}/data.json`;
}

/** Read the persisted JSON blob for a plugin, or null if missing/malformed. */
export async function loadPluginData<T = unknown>(pluginId: string): Promise<T | null> {
  try {
    const text = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(dataPath(pluginId));
      }),
    );
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Persist a JSON blob for a plugin under `.granite/plugins/<id>/data.json`. */
export async function savePluginData(pluginId: string, data: unknown): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      yield* fs.mkdir(`${PLUGIN_DATA_ROOT}/${pluginId}`);
      yield* fs.writeText(dataPath(pluginId), JSON.stringify(data, null, 2));
    }),
  );
}
