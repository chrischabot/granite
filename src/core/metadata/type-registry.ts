import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";

export type PropertyType = "text" | "number" | "checkbox" | "list" | "date" | "datetime" | "json";

export const PROPERTY_TYPES: ReadonlyArray<PropertyType> = [
  "text",
  "number",
  "checkbox",
  "list",
  "date",
  "datetime",
  "json",
];

const VALID_TYPES = new Set<PropertyType>(PROPERTY_TYPES);

let state: Record<string, PropertyType> = {};
let stateVersion = 0;
const subscribers = new Set<() => void>();
let activeVaultId: string | null = null;

function emit(): void {
  stateVersion += 1;
  for (const cb of subscribers) cb();
}

/** Bind the registry to a vault. Loads `.granite/types.json` if present. */
export async function bindTypeRegistry(vaultId: string): Promise<void> {
  unbindTypeRegistry();
  activeVaultId = vaultId;
  const loaded = await readConfigJson<Record<string, unknown>>("types");
  if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
    const sanitized: Record<string, PropertyType> = {};
    for (const [k, v] of Object.entries(loaded)) {
      if (typeof v === "string" && VALID_TYPES.has(v as PropertyType)) {
        sanitized[k] = v as PropertyType;
      }
    }
    state = sanitized;
  } else {
    state = {};
  }
  emit();
}

/** Clear in-memory state and detach from any vault. */
export function unbindTypeRegistry(): void {
  state = {};
  activeVaultId = null;
  emit();
}

/** Returns the user-set type override for a property name, or null. */
export function getTypeOverride(name: string): PropertyType | null {
  return state[name] ?? null;
}

/** Returns a shallow snapshot of every override currently set. */
export function listAllOverrides(): Record<string, PropertyType> {
  return { ...state };
}

/** Set or remove an override. Persists to disk asynchronously; failures are
 *  swallowed (the override still applies in-memory until next load). */
export async function setTypeOverride(name: string, type: PropertyType | null): Promise<void> {
  if (type === null) {
    if (!(name in state)) return;
    delete state[name];
  } else {
    if (state[name] === type) return;
    state[name] = type;
  }
  if (activeVaultId) {
    try {
      await writeConfigJson("types", state);
    } catch {
      /* in-memory state retained; disk write retried on next change */
    }
  }
  emit();
}

/** Monotonically incrementing version — pass to `useSyncExternalStore` so
 *  React re-renders without depending on a fresh object snapshot each tick. */
export function getRegistryVersion(): number {
  return stateVersion;
}

export function subscribeTypeRegistry(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
