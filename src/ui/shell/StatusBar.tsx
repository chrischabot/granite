import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { listStatusBarItems, subscribeStatusBarItems } from "@core/plugins/host-registries";
import { useSettings } from "@core/settings/useSettings";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { Effect } from "effect";
import { BookOpen, Cloud, Edit3 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "../i18n/useI18n";
import { useVault } from "../vault/VaultContext";

const CJK_CHAR_RE =
  /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/gu;
const LATIN_WORD_RE = /[\p{L}\p{N}_]+(?:['\u2019][\p{L}\p{N}_]+)*/gu;

function countWords(text: string): number {
  let body = text;
  if (body.startsWith("---\n")) {
    const end = body.indexOf("\n---", 4);
    if (end !== -1) body = body.slice(end + 4);
  }
  body = body.replace(/```[\s\S]*?```/g, "");
  const cjkMatches = body.match(CJK_CHAR_RE) ?? [];
  const remainder = body.replace(CJK_CHAR_RE, " ");
  const wordMatches = remainder.match(LATIN_WORD_RE) ?? [];
  return cjkMatches.length + wordMatches.length;
}

export function StatusBar() {
  const t = useI18n();
  const { activeVault } = useVault();
  const { groups, leaves, activeGroupId } = useWorkspace();
  const settings = useSettings();
  const [wordCount, setWordCount] = useState<number | null>(null);
  const pluginItems = useSyncExternalStore(
    subscribeStatusBarItems,
    listStatusBarItems,
    listStatusBarItems,
  );

  const group = activeGroupId ? groups.get(activeGroupId) : null;
  const activeLeafId = group?.activeLeafId ?? null;
  const activeLeaf = activeLeafId ? leaves.get(activeLeafId) : null;
  const markdownState =
    activeLeaf && activeLeaf.state.type === "markdown" ? activeLeaf.state : null;
  const activePath = markdownState ? markdownState.path : null;
  const activeMode = markdownState ? markdownState.mode : null;

  useEffect(() => {
    if (!activePath || !activeVault) {
      setWordCount(null);
      return;
    }
    let cancelled = false;

    const refresh = async () => {
      try {
        const text = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.readText(activePath);
          }),
        );
        if (!cancelled) setWordCount(countWords(text));
      } catch {
        if (!cancelled) setWordCount(null);
      }
    };

    void refresh();

    let unsub: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return fs.watch((event) => {
          if (cancelled) return;
          if ("path" in event && event.path === activePath) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => void refresh(), 250);
          }
        });
      }),
    ).then((d) => {
      if (cancelled) d();
      else unsub = d;
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsub?.();
    };
  }, [activePath, activeVault]);

  const cycleMode = () => {
    if (!activeLeafId || !activeMode) return;
    // Match Obsidian's status-bar toggle: read ↔ edit. The editor's preferred
    // "edit" mode is whichever the user chose in Settings → defaultEditingMode
    // (defaults to live-preview), so toggling out of reading lands on the
    // user's normal editing surface rather than always raw source.
    const next = activeMode === "reading" ? settings.defaultEditingMode : "reading";
    workspaceStore.setMode(activeLeafId, next);
  };

  return (
    <div className="status-bar">
      <div className="status-bar-item">
        <span className="status-bar-item-icon">
          <Cloud width="13" height="13" />
        </span>
        <span className="status-bar-item-segment">{t("status.localOnly")}</span>
      </div>
      {wordCount !== null && (
        <div className="status-bar-item">
          <span className="status-bar-item-segment">
            {wordCount.toLocaleString()} {t(wordCount === 1 ? "status.word" : "status.words")}
          </span>
        </div>
      )}
      {activeMode && (
        <button
          type="button"
          className="status-bar-item mod-clickable"
          aria-label={t("status.toggleMode")}
          title={t("status.toggleModeTitle")}
          onClick={cycleMode}
          style={{
            background: "transparent",
            border: 0,
            color: "inherit",
            font: "inherit",
          }}
        >
          <span className="status-bar-item-icon">
            {activeMode === "reading" ? (
              <BookOpen width="13" height="13" />
            ) : (
              <Edit3 width="13" height="13" />
            )}
          </span>
          <span className="status-bar-item-segment">
            {t(activeMode === "reading" ? "status.mode.read" : "status.mode.edit")}
          </span>
        </button>
      )}
      {pluginItems.map((item) => (
        <div
          key={item.id}
          className={`status-bar-item${item.onClick ? " mod-clickable" : ""}`}
          role={item.onClick ? "button" : undefined}
          tabIndex={item.onClick ? 0 : undefined}
          title={item.tooltip ?? undefined}
          onClick={item.onClick ? () => item.onClick?.() : undefined}
          onKeyDown={
            item.onClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    item.onClick?.();
                  }
                }
              : undefined
          }
        >
          <span className="status-bar-item-segment">{item.text}</span>
        </div>
      ))}
    </div>
  );
}
