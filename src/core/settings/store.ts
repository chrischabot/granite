import type { DeletedFilesMode } from "@core/fs/trash";
import { readConfigJson, writeConfigJson } from "@core/vault/granite-config";

const STORAGE_KEY = "granite.settings.v1";
const DISK_CONFIG_NAME = "settings";

export type FileExplorerSort =
  | "name-asc"
  | "name-desc"
  | "mtime-desc"
  | "mtime-asc"
  | "ctime-desc"
  | "ctime-asc";

export interface UserSettings {
  fontSize: number;
  showLineNumbers: boolean;
  readableLineWidth: boolean;
  autoPairBrackets: boolean;
  newNoteFolder: string;
  defaultViewMode: "source" | "reading";
  attachmentsFolder: string;
  confirmFileDeletion: boolean;
  deletedFiles: DeletedFilesMode;
  showNestedTags: boolean;
  /** Newline-separated glob list — patterns hide matching files from every
   *  vault listing (file explorer, switcher, search, metadata cache, graph). */
  excludedFiles: string;
  /** Browser spellcheck inside the source editor. */
  spellcheck: boolean;
  /** When true, format markers like `**`, `==`, and wikilink brackets are
   *  hidden on non-cursor lines for a cleaner reading experience. */
  livePreview: boolean;
  /** Source-editor keybinding profile. */
  editorKeymap: "standard" | "vim";
  /** Sort order applied to files inside each folder in the file explorer.
   *  Folders always come first (alphabetical) regardless of this setting. */
  fileExplorerSort: FileExplorerSort;
  /** Translucent window mode — sets `body.is-translucent` so the workspace
   *  background goes transparent. Pairs with browser-side window styling
   *  (PWA installs / future Electron host). */
  translucent: boolean;
  /** Show a diagnostic notice when measured startup exceeds the cold-start budget. */
  notifySlowStartup: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  fontSize: 16,
  showLineNumbers: false,
  readableLineWidth: true,
  autoPairBrackets: true,
  newNoteFolder: "",
  defaultViewMode: "source",
  attachmentsFolder: "attachments",
  confirmFileDeletion: true,
  deletedFiles: "system",
  showNestedTags: true,
  excludedFiles: "",
  spellcheck: false,
  livePreview: true,
  editorKeymap: "standard",
  fileExplorerSort: "name-asc",
  translucent: false,
  notifySlowStartup: true,
};

function loadFromStorage(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(s: UserSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

let state: UserSettings = loadFromStorage();
let diskBound = false;
const subscribers = new Set<() => void>();

function emit() {
  for (const s of subscribers) s();
}

function applyDocumentSideEffects(s: UserSettings) {
  document.documentElement.style.setProperty("--font-text-size", `${s.fontSize}px`);
  document.body.classList.toggle("is-translucent", s.translucent);
}

applyDocumentSideEffects(state);

function normalizeSettings(s: Partial<UserSettings> | null | undefined): UserSettings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

function persistDiskSettings(s: UserSettings): void {
  if (!diskBound) return;
  void writeConfigJson(DISK_CONFIG_NAME, s).catch(() => {
    /* localStorage remains the fallback when disk persistence is unavailable */
  });
}

export async function bindSettings(): Promise<void> {
  const onDisk = await readConfigJson<Partial<UserSettings>>(DISK_CONFIG_NAME);
  diskBound = true;
  state = normalizeSettings(onDisk ?? loadFromStorage());
  saveToStorage(state);
  await writeConfigJson(DISK_CONFIG_NAME, state).catch(() => {
    /* keep hydrated in memory even if disk write fails */
  });
  applyDocumentSideEffects(state);
  emit();
}

export function unbindSettings(): void {
  diskBound = false;
}

export function resetSettingsForTests(next: UserSettings = DEFAULT_SETTINGS): void {
  diskBound = false;
  state = next;
  saveToStorage(state);
  applyDocumentSideEffects(state);
  emit();
}

export const settingsStore = {
  getState(): UserSettings {
    return state;
  },
  getServerSnapshot(): UserSettings {
    return state;
  },
  subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  },
  update(patch: Partial<UserSettings>) {
    state = { ...state, ...patch };
    saveToStorage(state);
    persistDiskSettings(state);
    applyDocumentSideEffects(state);
    emit();
  },
};
