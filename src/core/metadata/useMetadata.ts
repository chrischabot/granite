import { useEffect, useState, useSyncExternalStore } from "react";
import { metadataCache } from "./cache";
import { parseMetadata, type ParsedMetadata } from "./parser";
import { useVault } from "@/ui/vault/VaultContext";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { Effect } from "effect";
import type { VaultPath } from "@core/fs/types";

/** Returns a counter that increments each time the cache emits. Subscribe to
 * trigger re-render; call back into the cache for the actual data. */
export function useMetadataVersion(): number {
  return useSyncExternalStore(
    metadataCache.subscribe,
    () => versionCounter,
    () => versionCounter,
  );
}

let versionCounter = 0;
metadataCache.subscribe(() => {
  versionCounter += 1;
});

/** Drive the cache lifecycle: reset + index when active vault changes. */
export function useMetadataCache(): void {
  const { activeVault } = useVault();
  useEffect(() => {
    metadataCache.reset();
    if (activeVault) {
      void metadataCache.indexVault();
    }
  }, [activeVault]);
}

/** Live metadata for a single path. Falls back to a fresh parse if the cache
 * doesn't have it yet. */
export function useFileMetadata(path: VaultPath | null): ParsedMetadata | null {
  useMetadataVersion();
  const [fallback, setFallback] = useState<ParsedMetadata | null>(null);

  useEffect(() => {
    if (!path) {
      setFallback(null);
      return;
    }
    if (metadataCache.getMetadata(path)) return;
    let cancelled = false;
    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readText(path);
      }),
    )
      .then((text) => {
        if (!cancelled) setFallback(parseMetadata(text));
      })
      .catch(() => {
        if (!cancelled) setFallback(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) return null;
  return metadataCache.getMetadata(path) ?? fallback;
}