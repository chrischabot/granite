const STORAGE_KEY = "granite.recents.v1";
const MAX_RECENTS = 32;

const subscribers = new Set<() => void>();
let cache: string[] | null = null;

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function save(list: ReadonlyArray<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

function emit(): void {
  cache = null;
  for (const cb of subscribers) cb();
}

export function listRecents(): ReadonlyArray<string> {
  if (cache === null) cache = load();
  return cache;
}

export function addRecent(path: string): void {
  if (!path) return;
  const current = load();
  const next = [path, ...current.filter((p) => p !== path)].slice(0, MAX_RECENTS);
  save(next);
  emit();
}

export function removeRecent(path: string): void {
  const current = load();
  const next = current.filter((p) => p !== path);
  if (next.length === current.length) return;
  save(next);
  emit();
}

export function clearRecents(): void {
  save([]);
  emit();
}

export function subscribeRecents(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}