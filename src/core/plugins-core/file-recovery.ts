import { openDB, type IDBPDatabase } from "idb";
import { commandRegistry, type Command } from "@core/commands/CommandRegistry";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";

interface Snapshot {
  readonly path: string;
  readonly mtimeMs: number;
  readonly content: string;
}

const DB_NAME = "granite-recovery";
const DB_VERSION = 1;
const STORE = "snapshots";
const SETTINGS_KEY = "granite.file-recovery.v1";

interface RecoverySettings {
  intervalMs: number;
  retentionMs: number;
}

const DEFAULT: RecoverySettings = {
  intervalMs: 5 * 60 * 1000,
  retentionMs: 7 * 24 * 60 * 60 * 1000,
};

function loadSettings(): RecoverySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<RecoverySettings>) };
  } catch {
    return DEFAULT;
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          const store = database.createObjectStore(STORE, { autoIncrement: true });
          store.createIndex("by-path", "path");
          store.createIndex("by-mtime", "mtimeMs");
        }
      },
    });
  }
  return dbPromise;
}

async function takeSnapshot(snap: Snapshot): Promise<void> {
  const conn = await db();
  await conn.put(STORE, snap);
}

async function listSnapshots(path: string): Promise<Array<Snapshot & { id: number }>> {
  const conn = await db();
  const tx = conn.transaction(STORE, "readonly");
  const idx = tx.store.index("by-path");
  const out: Array<Snapshot & { id: number }> = [];
  let cursor = await idx.openCursor(IDBKeyRange.only(path));
  while (cursor) {
    out.push({ ...(cursor.value as Snapshot), id: cursor.primaryKey as number });
    cursor = await cursor.continue();
  }
  await tx.done;
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

async function pruneOld(): Promise<void> {
  const settings = loadSettings();
  const cutoff = Date.now() - settings.retentionMs;
  const conn = await db();
  const tx = conn.transaction(STORE, "readwrite");
  const idx = tx.store.index("by-mtime");
  let cursor = await idx.openCursor(IDBKeyRange.upperBound(cutoff, true));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastSnapshotByPath = new Map<string, number>();

async function tryAutoSnapshot(): Promise<void> {
  // Only snapshot the active markdown leaf — avoids hammering FSA.
  const state = workspaceStore.getState();
  const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
  const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
  if (!leaf || leaf.state.type !== "markdown") return;

  const path = leaf.state.path;
  const settings = loadSettings();
  const last = lastSnapshotByPath.get(path) ?? 0;
  if (Date.now() - last < settings.intervalMs) return;

  // Read the current content via the editor's last-saved snapshot — for
  // simplicity we read from the FS.
  try {
    // Lazy-import to avoid a cycle.
    const { run } = await import("@core/effect/runtime");
    const { Effect } = await import("effect");
    const { FileSystem } = await import("@core/fs/FileSystem");
    const result = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const stat = yield* fs.stat(path);
        if (!stat || stat.type !== "file") return null;
        const text = yield* fs.readText(path);
        return { mtimeMs: stat.mtimeMs, text };
      }),
    );
    if (!result) return;
    await takeSnapshot({ path, mtimeMs: result.mtimeMs, content: result.text });
    lastSnapshotByPath.set(path, Date.now());
    void pruneOld();
  } catch {
    /* swallow */
  }
}

export function registerFileRecoveryPlugin(): () => void {
  const registrations: Array<() => void> = [];
  const register = (cmd: Command) => {
    registrations.push(commandRegistry.register(cmd));
  };

  register({
    id: "file-recovery:view",
    category: "File recovery",
    name: "View recovery snapshots for current file",
    callback: async () => {
      const state = workspaceStore.getState();
      const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (!leaf || leaf.state.type !== "markdown") {
        noticeManager.show("Open a markdown note first.", { kind: "warning" });
        return;
      }
      const list = await listSnapshots(leaf.state.path);
      if (list.length === 0) {
        noticeManager.show("No snapshots yet for this file.", { kind: "info" });
        return;
      }
      const labels = list
        .map(
          (s, i) =>
            `${i + 1}. ${new Date(s.mtimeMs).toLocaleString()} (${s.content.length} bytes)`,
        )
        .join("\n");
      const pick = prompt(
        `Restore which snapshot?\n${labels}\n\nEnter number to view contents:`,
      );
      const n = pick ? parseInt(pick, 10) - 1 : -1;
      const chosen = list[n];
      if (!chosen) return;
      const restoreOk = confirm(
        `Restore this snapshot? Current contents will be overwritten.\n\n--- Preview ---\n${chosen.content.slice(0, 500)}${chosen.content.length > 500 ? "\n..." : ""}`,
      );
      if (!restoreOk) return;
      const { run } = await import("@core/effect/runtime");
      const { Effect } = await import("effect");
      const { FileSystem } = await import("@core/fs/FileSystem");
      try {
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            yield* fs.writeText(chosen.path, chosen.content);
          }),
        );
        noticeManager.show("Snapshot restored.", { kind: "success" });
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : "Restore failed",
          { kind: "error" },
        );
      }
    },
  });

  register({
    id: "file-recovery:snapshot-now",
    category: "File recovery",
    name: "Take a snapshot of the current file now",
    callback: () => {
      lastSnapshotByPath.delete("__force__");
      // Force a snapshot regardless of the interval.
      const state = workspaceStore.getState();
      const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (leaf && leaf.state.type === "markdown") {
        lastSnapshotByPath.set(leaf.state.path, 0);
      }
      void tryAutoSnapshot();
    },
  });

  // Start the auto-snapshot timer.
  pollTimer = setInterval(() => void tryAutoSnapshot(), 60 * 1000); // check every minute

  return () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    lastSnapshotByPath = new Map();
    for (const fn of registrations) fn();
  };
}