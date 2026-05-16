import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { inputPrompt } from "@/ui/overlay/inputPrompt";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { type IDBPDatabase, openDB } from "idb";

export interface RecoverySnapshot {
  readonly id: number;
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

async function takeSnapshot(snap: Omit<RecoverySnapshot, "id">): Promise<void> {
  const conn = await db();
  await conn.put(STORE, snap);
}

export async function listRecoverySnapshots(path: string): Promise<RecoverySnapshot[]> {
  const conn = await db();
  const tx = conn.transaction(STORE, "readonly");
  const idx = tx.store.index("by-path");
  const out: RecoverySnapshot[] = [];
  let cursor = await idx.openCursor(IDBKeyRange.only(path));
  while (cursor) {
    out.push({
      ...(cursor.value as Omit<RecoverySnapshot, "id">),
      id: cursor.primaryKey as number,
    });
    cursor = await cursor.continue();
  }
  await tx.done;
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

export async function clearRecoverySnapshots(path?: string): Promise<void> {
  const conn = await db();
  if (!path) {
    await conn.clear(STORE);
    return;
  }
  const tx = conn.transaction(STORE, "readwrite");
  const idx = tx.store.index("by-path");
  let cursor = await idx.openCursor(IDBKeyRange.only(path));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function restoreRecoverySnapshot(snapshot: RecoverySnapshot): Promise<void> {
  const { run } = await import("@core/effect/runtime");
  const { Effect } = await import("effect");
  const { FileSystem } = await import("@core/fs/FileSystem");
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      yield* fs.writeText(snapshot.path, snapshot.content);
    }),
  );
}

export async function saveRecoverySnapshotForTests(
  snap: Omit<RecoverySnapshot, "id">,
): Promise<void> {
  await takeSnapshot(snap);
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

export function registerFileRecoveryPlugin(openRecoveryUi?: (path: string) => void): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "file-recovery:view",
    category: t("plugin.fileRecovery.category"),
    name: t("plugin.fileRecovery.view"),
    callback: async () => {
      const state = workspaceStore.getState();
      const group = state.activeGroupId ? state.groups.get(state.activeGroupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (!leaf || leaf.state.type !== "markdown") {
        noticeManager.show(t("plugin.fileRecovery.openMarkdownFirst"), { kind: "warning" });
        return;
      }
      if (openRecoveryUi) {
        openRecoveryUi(leaf.state.path);
        return;
      }
      const list = await listRecoverySnapshots(leaf.state.path);
      if (list.length === 0) {
        noticeManager.show(t("plugin.fileRecovery.noSnapshots"), { kind: "info" });
        return;
      }
      const labels = list
        .map(
          (s, i) =>
            `${i + 1}. ${new Date(s.mtimeMs).toLocaleString()} (${t("fileRecovery.bytes", {
              bytes: String(s.content.length),
            })})`,
        )
        .join("\n");
      const pick = await inputPrompt({ title: t("plugin.fileRecovery.prompt.restore", { labels }) });
      const n = pick ? Number.parseInt(pick, 10) - 1 : -1;
      const chosen = list[n];
      if (!chosen) return;
      const restoreOk = confirm(
        t("plugin.fileRecovery.confirm.restore", {
          preview: `${chosen.content.slice(0, 500)}${chosen.content.length > 500 ? "\n..." : ""}`,
        }),
      );
      if (!restoreOk) return;
      try {
        await restoreRecoverySnapshot(chosen);
        noticeManager.show(t("fileRecovery.notice.restored"), { kind: "success" });
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : t("plugin.fileRecovery.error.restore"),
          {
            kind: "error",
          },
        );
      }
    },
  });

  register({
    id: "file-recovery:snapshot-now",
    category: t("plugin.fileRecovery.category"),
    name: t("plugin.fileRecovery.snapshotNow"),
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
    disposer();
  };
}
