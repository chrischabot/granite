import { BookOpen, Cloud, Edit3 } from "lucide-react";
import { Effect } from "effect";
import { useEffect, useState } from "react";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { useVault } from "../vault/VaultContext";

function countWords(text: string): number {
  let body = text;
  if (body.startsWith("---\n")) {
    const end = body.indexOf("\n---", 4);
    if (end !== -1) body = body.slice(end + 4);
  }
  body = body.replace(/```[\s\S]*?```/g, "");
  try {
    const matches = body.match(/[\p{L}\p{N}]+/gu);
    return matches ? matches.length : 0;
  } catch {
    const matches = body.match(/[A-Za-z0-9]+/g);
    return matches ? matches.length : 0;
  }
}

export function StatusBar() {
  const { activeVault } = useVault();
  const { groups, leaves, activeGroupId } = useWorkspace();
  const [wordCount, setWordCount] = useState<number | null>(null);

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
    const next = activeMode === "reading" ? "source" : "reading";
    workspaceStore.setMode(activeLeafId, next);
  };

  return (
    <div className="status-bar">
      <div className="status-bar-item mod-clickable" role="button" tabIndex={0}>
        <span className="status-bar-item-icon">
          <Cloud width="13" height="13" />
        </span>
        <span className="status-bar-item-segment">Local-only</span>
      </div>
      {wordCount !== null && (
        <div className="status-bar-item">
          <span className="status-bar-item-segment">
            {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
      )}
      {activeMode && (
        <div
          className="status-bar-item mod-clickable"
          role="button"
          tabIndex={0}
          aria-label="Toggle editing / reading mode"
          title="Click to toggle editing / reading mode"
          onClick={cycleMode}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              cycleMode();
            }
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
            {activeMode === "reading" ? "Read" : "Edit"}
          </span>
        </div>
      )}
    </div>
  );
}