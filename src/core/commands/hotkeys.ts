import { type Hotkey, commandRegistry } from "./CommandRegistry";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

const US_CODE_KEY: Readonly<Record<string, string>> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

function codeToUsKey(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  return US_CODE_KEY[code] ?? null;
}

function eventKeyForHotkey(e: KeyboardEvent): string {
  return codeToUsKey(e.code) ?? e.key;
}

function eventToHotkey(e: KeyboardEvent): Hotkey {
  const modifiers: Hotkey["modifiers"][number][] = [];
  if (isMac && e.metaKey) modifiers.push("Mod");
  if (!isMac && e.ctrlKey) modifiers.push("Mod");
  if (e.altKey) modifiers.push("Alt");
  if (e.shiftKey) modifiers.push("Shift");
  return { modifiers, key: eventKeyForHotkey(e) };
}

function normalizeKey(key: string): string {
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function hotkeyKey(h: Hotkey): string {
  const mods = [...h.modifiers].sort().join("+");
  return `${mods}|${normalizeKey(h.key)}`;
}

interface UserHotkey {
  commandId: string;
  hotkey: Hotkey;
}

const STORAGE_KEY = "granite.hotkeys.v1";
let userOverrides: UserHotkey[] = [];
const subscribers = new Set<() => void>();

function emitHotkeys(): void {
  for (const cb of subscribers) cb();
}

function loadOverrides(): UserHotkey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserHotkey[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveOverrides(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOverrides));
  } catch {
    /* noop */
  }
}

export function setUserHotkey(commandId: string, hotkey: Hotkey | null): void {
  userOverrides = userOverrides.filter((u) => u.commandId !== commandId);
  if (hotkey) userOverrides.push({ commandId, hotkey });
  saveOverrides();
  rebuild();
  emitHotkeys();
}

export function addUserHotkey(commandId: string, hotkey: Hotkey): void {
  const key = hotkeyKey(hotkey);
  userOverrides = userOverrides.filter(
    (u) => !(u.commandId === commandId && hotkeyKey(u.hotkey) === key),
  );
  userOverrides.push({ commandId, hotkey });
  saveOverrides();
  rebuild();
  emitHotkeys();
}

export function removeUserHotkey(commandId: string, hotkey: Hotkey): void {
  const key = hotkeyKey(hotkey);
  userOverrides = userOverrides.filter(
    (u) => !(u.commandId === commandId && hotkeyKey(u.hotkey) === key),
  );
  saveOverrides();
  rebuild();
  emitHotkeys();
}

export function clearUserHotkey(commandId: string): void {
  setUserHotkey(commandId, null);
}

export function getUserHotkey(commandId: string): Hotkey | null {
  const found = userOverrides.find((u) => u.commandId === commandId);
  return found?.hotkey ?? null;
}

export function getUserHotkeys(commandId: string): ReadonlyArray<Hotkey> {
  return userOverrides.filter((u) => u.commandId === commandId).map((u) => u.hotkey);
}

export function getEffectiveHotkeys(commandId: string): ReadonlyArray<Hotkey> {
  const user = getUserHotkeys(commandId);
  if (user.length > 0) return user;
  return commandRegistry.get(commandId)?.hotkeys ?? [];
}

export function subscribeHotkeys(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

let cachedOverridesList: UserHotkey[] | null = null;
export function listUserHotkeys(): ReadonlyArray<UserHotkey> {
  if (cachedOverridesList === null) cachedOverridesList = [...userOverrides];
  return cachedOverridesList;
}

function buildLookup(): Map<string, string> {
  const overriddenIds = new Set(userOverrides.map((u) => u.commandId));
  const map = new Map<string, string>();
  for (const cmd of commandRegistry.list()) {
    if (overriddenIds.has(cmd.id)) continue;
    for (const h of cmd.hotkeys ?? []) {
      map.set(hotkeyKey(h), cmd.id);
    }
  }
  for (const u of userOverrides) {
    map.set(hotkeyKey(u.hotkey), u.commandId);
  }
  return map;
}

let lookup = new Map<string, string>();

function rebuild(): void {
  lookup = buildLookup();
  cachedOverridesList = null;
}

let initialized = false;

export function initHotkeyDispatcher(): () => void {
  if (initialized) return () => undefined;
  initialized = true;

  userOverrides = loadOverrides();
  rebuild();
  const unsub = commandRegistry.subscribe(rebuild);

  const onKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) &&
      !(e.ctrlKey || e.metaKey)
    ) {
      return;
    }

    const hk = eventToHotkey(e);
    const id = lookup.get(hotkeyKey(hk));
    if (!id) return;
    const cmd = commandRegistry.get(id);
    if (!cmd) return;
    if (cmd.checkCallback && !cmd.checkCallback(false)) return;
    e.preventDefault();
    void cmd.callback();
  };

  document.addEventListener("keydown", onKey, { capture: true });
  return () => {
    document.removeEventListener("keydown", onKey, { capture: true });
    unsub();
    initialized = false;
  };
}

export function formatHotkey(h: Hotkey): string {
  const parts: string[] = [];
  for (const m of h.modifiers) {
    if (m === "Mod") parts.push(isMac ? "⌘" : "Ctrl");
    else if (m === "Cmd") parts.push("⌘");
    else if (m === "Ctrl") parts.push("Ctrl");
    else if (m === "Alt") parts.push(isMac ? "⌥" : "Alt");
    else if (m === "Shift") parts.push(isMac ? "⇧" : "Shift");
  }
  parts.push(normalizeKey(h.key));
  return parts.join(isMac ? "" : "+");
}

/** Capture a single keypress and return the corresponding Hotkey, or null on Escape. */
export function captureHotkey(): Promise<Hotkey | null> {
  return new Promise((resolve) => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener("keydown", onKey, true);
      if (e.key === "Escape") {
        resolve(null);
        return;
      }
      // Skip pure modifier keypresses (waiting for a real key).
      if (
        e.key === "Control" ||
        e.key === "Meta" ||
        e.key === "Alt" ||
        e.key === "Shift" ||
        e.key === "OS"
      ) {
        // Re-listen.
        window.addEventListener("keydown", onKey, true);
        return;
      }
      resolve(eventToHotkey(e));
    };
    window.addEventListener("keydown", onKey, true);
  });
}

export function resetHotkeysForTests(): void {
  userOverrides = [];
  lookup = new Map<string, string>();
  cachedOverridesList = null;
  initialized = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
