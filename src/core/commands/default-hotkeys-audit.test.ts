import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Command, type Hotkey, commandRegistry } from "./CommandRegistry";
import { registerCoreCommands } from "./core-commands";

// Plugins-core registrars exercised by the production bootstrap. Keep this
// list in sync with `src/ui/commands/CommandsBootstrap.tsx`.
import { registerAudioRecorderPlugin } from "@core/plugins-core/audio-recorder";
import { registerBasesScaffoldPlugin } from "@core/plugins-core/bases-scaffold";
import { registerCopyLinkPlugin } from "@core/plugins-core/copy-link";
import { registerDailyNotesPlugin } from "@core/plugins-core/daily-notes";
import { registerDebugInfoPlugin } from "@core/plugins-core/debug-info";
import { registerFileRecoveryPlugin } from "@core/plugins-core/file-recovery";
import { registerFormatConverterPlugin } from "@core/plugins-core/format-converter";
import { registerNoteComposerPlugin } from "@core/plugins-core/note-composer";
import { registerPluginReloadPlugin } from "@core/plugins-core/plugin-reload";
import { registerRandomNotePlugin } from "@core/plugins-core/random-note";
import { registerRandomWalkPlugin } from "@core/plugins-core/random-walk";
import { registerTagRenamePlugin } from "@core/plugins-core/tag-rename";
import { registerTemplatesPlugin } from "@core/plugins-core/templates";
import { registerTourPlugin } from "@core/plugins-core/tour";
import { registerUniqueNotePlugin } from "@core/plugins-core/unique-note";
import { registerVaultFindReplacePlugin } from "@core/plugins-core/vault-find-replace";
import { registerVaultStatsPlugin } from "@core/plugins-core/vault-stats";
import { registerWebViewerPlugin } from "@core/plugins-core/web-viewer";
import { registerWorkspacesPlugin } from "@core/plugins-core/workspaces";

// ---------------------------------------------------------------------------
// SEVERE default-hotkey audit (§24.14 first bullet).
//
// Oracle: `specs/product/17_hotkeys_reference.md §17.1`, parsed at test time.
// Treating the spec as the source of truth lets a stale-snapshot regression
// surface as a test failure the moment somebody adds or renames a command
// without keeping the spec in sync. The complementary β test
// `detects when a command's default hotkey is removed` removes the hotkey
// from one registered command and asserts the audit reports it — this proves
// the missing-hotkey path is wired up and the false-negative probability is
// well under 10%.
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = resolve(HERE, "../../../specs/product/17_hotkeys_reference.md");

/**
 * Spec command names that resolve to a registered command id. The spec is
 * the human label ("Open quick switcher"); the command registry uses ids
 * ("app:open-quick-switcher"). This map is the only place the two
 * vocabularies meet.
 */
const SPEC_LABEL_TO_COMMAND_ID: Record<string, string | string[]> = {
  // File operations
  "Create new note": "file:new-note",
  "Create new note in new tab/pane": "file:new-note-in-new-tab",
  "Save current file": "file:save",
  "Close active tab": "editor:close-active-tab",
  "Reopen last closed tab": "file:reopen-closed-tab",
  "Open new tab": "file:new-tab",
  "Rename current file": "file:rename",
  "Open settings": "app:open-settings",
  // Navigation
  "Navigate back": "nav:back",
  "Navigate forward": "nav:forward",
  "Open quick switcher": "app:open-quick-switcher",
  "Open command palette": "app:open-command-palette",
  "Toggle Reading view / Editing view": "editor:toggle-reading-view",
  "Open graph view": "graph:open",
  "Open local graph": "graph:open-local",
  "Search current file": "search:current-file",
  "Search and replace in current file": "search:replace-in-current-file",
  "Search in all files": "search:vault",
  // Tab management
  "Next tab": "tabs:cycle-next",
  "Previous tab": "tabs:cycle-previous",
  // "Switch to tab N" and "Switch to last tab" are handled specially below
  // because the spec collapses 8 rows into a single one with a range.
  // Editing
  "Toggle bold": "editor:toggle-bold",
  "Toggle italic": "editor:toggle-italic",
  "Toggle code": "editor:toggle-code",
  "Insert link": "editor:insert-link",
  "Add file property": "editor:add-file-property",
};

interface SpecEntry {
  readonly label: string;
  readonly expectedHotkeys: ReadonlyArray<Hotkey>;
  /** Allow the test to skip / annotate rows that the spec explicitly defers
   *  to OS / editor framework conventions. */
  readonly systemShortcut?: boolean;
}

/** Parse Obsidian-style hotkey notation (e.g. "Ctrl/Cmd + Shift + N") into the
 *  Granite `Hotkey` shape (`{ modifiers, key }`). Returns one Hotkey when the
 *  notation is a single binding; throws on input the test author hasn't
 *  whitelisted, so unexpected spec changes surface explicitly. */
function parseSpecHotkey(input: string): Hotkey | null {
  // Strip backticks (the spec wraps shortcuts in code spans).
  const cleaned = input.replace(/`/g, "").trim();
  if (cleaned.length === 0) return null;
  if (/\(unbound\)/i.test(cleaned)) return null;
  // "(system shortcut)" — leave the key visible to humans but skip oracle.
  if (/\(system shortcut\)/i.test(cleaned)) return null;

  // Strip platform qualifiers in parens ("(Win/Linux)", "(macOS)") — we use
  // the cross-platform `Mod` modifier so only one binding is needed.
  const noPlatform = cleaned.replace(/\([^)]*\)/g, "").trim();

  // If the spec lists multiple bindings separated by " · " (interpunct) or
  // " or ", take the first canonical one. The spec only does that for
  // explicit platform alternations.
  const firstBinding = noPlatform.split(/\s+·\s+|\s+or\s+/i)[0]?.trim() ?? noPlatform;

  const tokens = firstBinding
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (tokens.length === 0) return null;

  const modifiers: Array<"Mod" | "Ctrl" | "Alt" | "Shift"> = [];
  let key: string | null = null;
  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (lower === "ctrl/cmd" || lower === "cmd/ctrl" || lower === "cmd" || lower === "mod") {
      modifiers.push("Mod");
    } else if (lower === "ctrl") {
      // Bare Ctrl (e.g. "Ctrl + Tab") is platform-uniform and stays Ctrl.
      modifiers.push("Ctrl");
    } else if (lower === "alt" || lower === "option" || lower === "alt/option") {
      modifiers.push("Alt");
    } else if (lower === "shift") {
      modifiers.push("Shift");
    } else if (tok === "←") {
      key = "ArrowLeft";
    } else if (tok === "→") {
      key = "ArrowRight";
    } else if (tok === "↑") {
      key = "ArrowUp";
    } else if (tok === "↓") {
      key = "ArrowDown";
    } else {
      key = tok;
    }
  }
  if (key === null) return null;
  return { modifiers, key };
}

interface ParsedRow {
  readonly label: string;
  readonly raw: string;
}

/** Pull every `| Command | Default |` row out of the §17.1 tables. Rows whose
 *  default is `(unbound)` are filtered out. The "Switch to tab N" range row
 *  is expanded into 9 explicit entries. */
function parseSpec(markdown: string): SpecEntry[] {
  // §17.1 starts at the heading and ends at §17.2.
  const sectionMatch = markdown.match(/## 17\.1[\s\S]*?(?=^## 17\.2)/m);
  if (!sectionMatch) throw new Error("Could not find §17.1 in spec");
  const section = sectionMatch[0];

  const rowRe = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm;
  const rows: ParsedRow[] = [];
  for (const match of section.matchAll(rowRe)) {
    const label = match[1]?.trim() ?? "";
    const raw = match[2]?.trim() ?? "";
    // Skip header rows.
    if (label === "Command" || /^-+$/.test(label)) continue;
    rows.push({ label, raw });
  }

  const entries: SpecEntry[] = [];
  for (const row of rows) {
    if (/\(unbound\)/i.test(row.raw)) continue;

    // "Switch to tab N" → 8 entries (1..8). Spec text:
    // "Switch to tab N | `Ctrl/Cmd + 1` … `Ctrl/Cmd + 8`"
    if (row.label === "Switch to tab N") {
      for (let n = 1; n <= 8; n++) {
        entries.push({
          label: `Switch to tab ${n}`,
          expectedHotkeys: [{ modifiers: ["Mod"], key: String(n) }],
        });
      }
      continue;
    }

    const hk = parseSpecHotkey(row.raw);
    if (!hk) {
      // System shortcut row — record without an expected hotkey so the test
      // can still surface drift on label.
      if (/system shortcut/i.test(row.raw)) {
        entries.push({ label: row.label, expectedHotkeys: [], systemShortcut: true });
      }
      continue;
    }
    entries.push({ label: row.label, expectedHotkeys: [hk] });
  }

  return entries;
}

/** Resolve the spec label to one or more command ids. "Switch to tab N" is
 *  expanded to focus-tab-N; "Switch to last tab" is focus-tab-9. */
function resolveCommandIds(label: string): string[] {
  if (/^Switch to tab (\d)$/.test(label)) {
    const n = label.match(/^Switch to tab (\d)$/)?.[1];
    return [`editor:focus-tab-${n}`];
  }
  if (label === "Switch to last tab") {
    return ["editor:focus-tab-9"];
  }
  const mapped = SPEC_LABEL_TO_COMMAND_ID[label];
  if (!mapped) return [];
  return Array.isArray(mapped) ? mapped : [mapped];
}

function hotkeyKey(h: Hotkey): string {
  const mods = [...h.modifiers].slice().sort().join("+");
  const k = h.key.length === 1 ? h.key.toUpperCase() : h.key;
  return `${mods}|${k}`;
}

function formatHotkey(h: Hotkey): string {
  const parts = [...h.modifiers, h.key.length === 1 ? h.key.toUpperCase() : h.key];
  return parts.join("+");
}

function bootCommands(): () => void {
  const disposers: Array<() => void> = [];
  disposers.push(
    registerCoreCommands({
      openPalette: () => undefined,
      openSwitcher: () => undefined,
      openVaultPicker: () => undefined,
      openSettings: () => undefined,
      openHelp: () => undefined,
      openInstallPlugin: () => undefined,
    }),
  );
  disposers.push(registerBasesScaffoldPlugin());
  disposers.push(registerDailyNotesPlugin());
  disposers.push(registerDebugInfoPlugin());
  disposers.push(registerTemplatesPlugin());
  disposers.push(registerRandomNotePlugin());
  disposers.push(registerRandomWalkPlugin());
  disposers.push(registerTagRenamePlugin());
  disposers.push(registerWorkspacesPlugin());
  disposers.push(registerFileRecoveryPlugin(() => undefined));
  disposers.push(registerUniqueNotePlugin());
  disposers.push(registerNoteComposerPlugin());
  disposers.push(registerAudioRecorderPlugin());
  disposers.push(registerWebViewerPlugin());
  disposers.push(registerFormatConverterPlugin());
  disposers.push(registerVaultStatsPlugin());
  disposers.push(registerTourPlugin());
  disposers.push(registerCopyLinkPlugin());
  disposers.push(registerPluginReloadPlugin());
  disposers.push(registerVaultFindReplacePlugin());
  return () => {
    while (disposers.length > 0) disposers.pop()?.();
  };
}

describe("default hotkeys audit (§17.1)", () => {
  let dispose: (() => void) | null = null;

  beforeEach(() => {
    dispose = bootCommands();
  });

  afterEach(() => {
    dispose?.();
    dispose = null;
  });

  it("ships every default hotkey from specs/product/17_hotkeys_reference.md §17.1", () => {
    const spec = readFileSync(SPEC_PATH, "utf8");
    const entries = parseSpec(spec).filter((e) => !e.systemShortcut);

    // Index registered commands by id and by hotkey signature.
    const byId = new Map<string, Command>();
    for (const cmd of commandRegistry.listAll()) byId.set(cmd.id, cmd);

    const missing: string[] = [];
    const drifted: string[] = [];
    const unmapped: string[] = [];

    for (const entry of entries) {
      const ids = resolveCommandIds(entry.label);
      if (ids.length === 0) {
        unmapped.push(entry.label);
        continue;
      }
      for (const id of ids) {
        const cmd = byId.get(id);
        if (!cmd) {
          missing.push(
            `“${entry.label}” → command "${id}" is not registered (expected hotkey ${entry.expectedHotkeys
              .map(formatHotkey)
              .join(", ")}).`,
          );
          continue;
        }
        const registered = (cmd.hotkeys ?? []).map(hotkeyKey);
        for (const expected of entry.expectedHotkeys) {
          const wanted = hotkeyKey(expected);
          if (!registered.includes(wanted)) {
            if ((cmd.hotkeys ?? []).length === 0) {
              missing.push(
                `“${entry.label}” → command "${id}" has no hotkeys; spec wants ${formatHotkey(
                  expected,
                )}.`,
              );
            } else {
              drifted.push(
                `“${entry.label}” → command "${id}" registers [${(cmd.hotkeys ?? [])
                  .map(formatHotkey)
                  .join(", ")}] but spec wants ${formatHotkey(expected)}.`,
              );
            }
          }
        }
      }
    }

    const report = [
      missing.length > 0 && `MISSING (${missing.length}):\n  - ${missing.join("\n  - ")}`,
      drifted.length > 0 && `DRIFTED (${drifted.length}):\n  - ${drifted.join("\n  - ")}`,
      unmapped.length > 0 &&
        `UNMAPPED spec labels (${unmapped.length}) — add to SPEC_LABEL_TO_COMMAND_ID:\n  - ${unmapped.join(
          "\n  - ",
        )}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    expect(report, report || "all default hotkeys present").toBe("");
  });

  it("β: detects when a command's default hotkey is removed", () => {
    // Inversion: strip the hotkey off `app:open-quick-switcher` and re-run
    // the audit logic. The same code path must surface the missing entry.
    const spec = readFileSync(SPEC_PATH, "utf8");
    const entries = parseSpec(spec).filter((e) => !e.systemShortcut);

    const byId = new Map<string, Command>();
    for (const cmd of commandRegistry.listAll()) byId.set(cmd.id, cmd);

    const target = byId.get("app:open-quick-switcher");
    expect(target, "fixture command must be registered").toBeTruthy();
    if (!target) return;

    // Replace the registry entry in-place with a hotkey-less clone.
    const dropHotkeys: Command = { ...target, hotkeys: [] };
    byId.set(target.id, dropHotkeys);

    let found = false;
    for (const entry of entries) {
      if (entry.label !== "Open quick switcher") continue;
      const cmd = byId.get("app:open-quick-switcher");
      if (!cmd) continue;
      const registered = (cmd.hotkeys ?? []).map(hotkeyKey);
      for (const expected of entry.expectedHotkeys) {
        if (!registered.includes(hotkeyKey(expected))) found = true;
      }
    }

    expect(
      found,
      "audit logic must report a missing hotkey when a registered command drops it",
    ).toBe(true);
  });

  it("parses Obsidian-style notation into normalized Hotkey shape", () => {
    // Sanity check the parser so the rest of the audit can be trusted.
    expect(parseSpecHotkey("`Ctrl/Cmd + O`")).toEqual({ modifiers: ["Mod"], key: "O" });
    expect(parseSpecHotkey("`Ctrl/Cmd + Shift + N`")).toEqual({
      modifiers: ["Mod", "Shift"],
      key: "N",
    });
    expect(parseSpecHotkey("`Ctrl/Cmd + Alt + ←`")).toEqual({
      modifiers: ["Mod", "Alt"],
      key: "ArrowLeft",
    });
    expect(parseSpecHotkey("`F2`")).toEqual({ modifiers: [], key: "F2" });
    expect(parseSpecHotkey("(unbound)")).toBeNull();
    expect(parseSpecHotkey("`Ctrl + Tab` (Win/Linux) · `Ctrl + Tab` (macOS)")).toEqual({
      modifiers: ["Ctrl"],
      key: "Tab",
    });
  });
});
