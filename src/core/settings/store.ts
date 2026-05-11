const STORAGE_KEY = "granite.settings.v1";

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
  /** Newline-separated glob list — patterns hide matching files from every
   *  vault listing (file explorer, switcher, search, metadata cache, graph). */
  excludedFiles: string;
  /** Browser spellcheck inside the source editor. */
  spellcheck: boolean;
  /** When true, format markers like `**`, `==`, and wikilink brackets are
   *  hidden on non-cursor lines for a cleaner reading experience. */
  livePreview: boolean;
  /** Sort order applied to files inside each folder in the file explorer.
   *  Folders always come first (alphabetical) regardless of this setting. */
  fileExplorerSort: FileExplorerSort;
  /** Translucent window mode — sets `body.is-translucent` so the workspace
   *  background goes transparent. Pairs with browser-side window styling
   *  (PWA installs / future Electron host). */
  translucent: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  fontSize: 16,
  showLineNumbers: false,
  readableLineWidth: true,
  autoPairBrackets: true,
  newNoteFolder: "",
  defaultViewMode: "source",
  attachmentsFolder: "attachments",
  excludedFiles: "",
  spellcheck: false,
  livePreview: true,
  fileExplorerSort: "name-asc",
  translucent: false,
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
const subscribers = new Set<() => void>();

function emit() {
  for (const s of subscribers) s();
}

function applyDocumentSideEffects(s: UserSettings) {
  document.documentElement.style.setProperty("--font-text-size", `${s.fontSize}px`);
  document.body.classList.toggle("is-translucent", s.translucent);
}

applyDocumentSideEffects(state);

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
    applyDocumentSideEffects(state);
    emit();
  },
};