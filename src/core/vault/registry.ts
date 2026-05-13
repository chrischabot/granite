import { type IDBPDatabase, openDB } from "idb";

export interface VaultEntry {
  readonly id: string;
  readonly name: string;
  readonly kind: "fsa" | "opfs";
  /** When this vault was last opened. */
  readonly lastOpenedMs: number;
  /** When the vault was first added. */
  readonly addedMs: number;
}

const DB_NAME = "granite";
const DB_VERSION = 1;
const STORE_HANDLES = "vault-handles";
const STORE_META = "vault-meta";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_HANDLES)) {
          database.createObjectStore(STORE_HANDLES);
        }
        if (!database.objectStoreNames.contains(STORE_META)) {
          database.createObjectStore(STORE_META);
        }
      },
    });
  }
  return dbPromise;
}

export async function listVaults(): Promise<ReadonlyArray<VaultEntry>> {
  const conn = await db();
  const meta = await conn.get(STORE_META, "vaults");
  return (meta as VaultEntry[] | undefined) ?? [];
}

export async function persistVault(
  entry: VaultEntry,
  handle: FileSystemDirectoryHandle | null,
): Promise<void> {
  const conn = await db();
  const existing = ((await conn.get(STORE_META, "vaults")) as VaultEntry[] | undefined) ?? [];
  const others = existing.filter((v) => v.id !== entry.id);
  const next = [...others, entry].sort((a, b) => b.lastOpenedMs - a.lastOpenedMs);
  await conn.put(STORE_META, next, "vaults");
  if (handle && entry.kind === "fsa") {
    await conn.put(STORE_HANDLES, handle, entry.id);
  }
}

export async function loadHandle(id: string): Promise<FileSystemDirectoryHandle | null> {
  const conn = await db();
  return ((await conn.get(STORE_HANDLES, id)) as FileSystemDirectoryHandle | undefined) ?? null;
}

export async function removeVault(id: string): Promise<void> {
  const conn = await db();
  const existing = ((await conn.get(STORE_META, "vaults")) as VaultEntry[] | undefined) ?? [];
  await conn.put(
    STORE_META,
    existing.filter((v) => v.id !== id),
    "vaults",
  );
  await conn.delete(STORE_HANDLES, id);
}

/** Make a stable id from the vault display name + creation time. */
export function freshVaultId(): string {
  // 12 random hex chars + ms timestamp. Plenty of entropy for a single user.
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex}-${Date.now().toString(36)}`;
}
