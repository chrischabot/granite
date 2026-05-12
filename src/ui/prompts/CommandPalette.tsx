import { type Command, commandRegistry } from "@core/commands/CommandRegistry";
import { formatHotkey } from "@core/commands/hotkeys";
import { highlightMatches } from "@core/search/fuzzy";
import { Star, StarOff } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { Prompt } from "../overlay/Prompt";

const RECENT_KEY = "granite.recent-commands.v1";
const PINNED_KEY = "granite.pinned-commands.v1";
const MAX_RECENT = 8;

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveList(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [commands, setCommands] = useState<ReadonlyArray<Command>>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const t = useI18n();

  useEffect(() => {
    if (!open) return;
    setCommands(commandRegistry.list());
    setRecent(loadList(RECENT_KEY).slice(0, MAX_RECENT));
    setPinned(loadList(PINNED_KEY));
    return commandRegistry.subscribe(() => setCommands(commandRegistry.list()));
  }, [open]);

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      saveList(PINNED_KEY, next);
      return next;
    });
  };

  const orderedForEmpty = (() => {
    const map = new Map(commands.map((c) => [c.id, c]));
    const pinnedCmds = pinned.map((id) => map.get(id)).filter((c): c is Command => !!c);
    const pinnedSet = new Set(pinnedCmds.map((c) => c.id));
    const recentCmds = recent
      .map((id) => map.get(id))
      .filter((c): c is Command => !!c && !pinnedSet.has(c.id));
    const usedIds = new Set([...pinned, ...recent]);
    const others = commands.filter((c) => !usedIds.has(c.id));
    return [...pinnedCmds, ...recentCmds, ...others];
  })();

  return (
    <Prompt<Command>
      open={open}
      onClose={onClose}
      placeholder={t("commandPalette.placeholder")}
      items={commands}
      emptyQueryItems={orderedForEmpty}
      toSearchText={(c) => (c.category ? `${c.category} ${c.name}` : c.name)}
      renderItem={(cmd, match) => {
        const text = cmd.category ? `${cmd.category}: ${cmd.name}` : cmd.name;
        const segments = highlightMatches(text, match?.indices);
        let segmentOffset = 0;
        const keyedSegments = segments.map((s) => {
          const key = `${s.matched ? "matched" : "plain"}-${segmentOffset}-${s.text}`;
          segmentOffset += s.text.length;
          return { ...s, key };
        });
        const hotkey = cmd.hotkeys?.[0];
        const isPinned = pinned.includes(cmd.id);
        const pinLabel = isPinned ? t("commandPalette.unpin") : t("commandPalette.pin");
        return (
          <div className="suggestion-item-row mod-complex">
            <div className="suggestion-content">
              <div className="suggestion-title">
                {keyedSegments.map((s) =>
                  s.matched ? (
                    <span key={s.key} className="suggestion-highlight">
                      {s.text}
                    </span>
                  ) : (
                    <span key={s.key}>{s.text}</span>
                  ),
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--size-2-2)",
                flexShrink: 0,
              }}
            >
              {hotkey && <span className="suggestion-hotkey">{formatHotkey(hotkey)}</span>}
              <button
                type="button"
                aria-label={pinLabel}
                title={pinLabel}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  togglePin(cmd.id);
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "var(--cursor)",
                  padding: 2,
                  color: isPinned ? "var(--text-accent)" : "var(--text-faint)",
                  display: "inline-flex",
                  alignItems: "center",
                  height: "auto",
                  boxShadow: "none",
                }}
              >
                {isPinned ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
              </button>
            </div>
          </div>
        );
      }}
      onActivate={(cmd) => {
        const next = [cmd.id, ...recent.filter((id) => id !== cmd.id)].slice(0, MAX_RECENT);
        setRecent(next);
        saveList(RECENT_KEY, next);
        onClose();
        setTimeout(() => commandRegistry.run(cmd.id), 0);
      }}
      instructions={[
        { command: "↵", description: t("commandPalette.instruction.run") },
        { command: "★", description: t("commandPalette.instruction.pin") },
        { command: "esc", description: t("prompt.instruction.dismiss") },
      ]}
    />
  );
}
