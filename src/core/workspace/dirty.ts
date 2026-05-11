const paths = new Set<string>();
const subscribers = new Set<() => void>();
let snapshot: ReadonlySet<string> = paths;

function emit(): void {
  snapshot = new Set(paths);
  for (const cb of subscribers) cb();
}

export function dirtyPaths(): ReadonlySet<string> {
  return snapshot;
}

export function markDirty(path: string): void {
  if (paths.has(path)) return;
  paths.add(path);
  emit();
}

export function markClean(path: string): void {
  if (!paths.has(path)) return;
  paths.delete(path);
  emit();
}

export function subscribeDirty(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}