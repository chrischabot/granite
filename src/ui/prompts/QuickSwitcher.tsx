import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { join, normalize, stem } from "@core/fs/path";
import type { VaultFile } from "@core/fs/types";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { noticeManager } from "@core/notices/notice";
import { highlightMatches } from "@core/search/fuzzy";
import { settingsStore } from "@core/settings/store";
import { listRecents, subscribeRecents } from "@core/workspace/recents";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Prompt } from "../overlay/Prompt";
import { useVault } from "../vault/VaultContext";

type ItemKind = "file" | "alias" | "create";

interface SwitcherItem {
  readonly displayName: string;
  readonly path: string;
  readonly alias: string | null;
  readonly recent: boolean;
  readonly kind: ItemKind;
}

export interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
  onActivate?: (path: string, modifiers: { newTab: boolean; create: boolean }) => void;
}

async function createNoteAt(path: string): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      if (dir) yield* fs.mkdir(dir);
      const existing = yield* fs.stat(path);
      if (!existing) yield* fs.writeText(path, "");
    }),
  );
}

export function QuickSwitcher({ open, onClose, onActivate }: QuickSwitcherProps) {
  const { activeVault } = useVault();
  const [files, setFiles] = useState<ReadonlyArray<VaultFile>>([]);
  const [loading, setLoading] = useState(false);

  useMetadataVersion();
  const recents = useSyncExternalStore(subscribeRecents, listRecents, listRecents);
  const excludedRaw = useSyncExternalStore(
    settingsStore.subscribe,
    () => settingsStore.getState().excludedFiles,
    () => settingsStore.getState().excludedFiles,
  );

  useEffect(() => {
    if (!open || !activeVault) return;
    setLoading(true);
    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.listAll({ extensions: ["md", "canvas", "base"] });
      }),
    )
      .then((list: ReadonlyArray<VaultFile>) => setFiles(list))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [open, activeVault]);

  const items = useMemo<ReadonlyArray<SwitcherItem>>(() => {
    const patterns = parseExcludePatterns(excludedRaw);
    const visibleFiles =
      patterns.length === 0 ? files : files.filter((f) => !isExcluded(f.path, patterns));
    const visibleSet = new Set(visibleFiles.map((f) => f.path));
    const recentSet = new Set(recents);
    const out: SwitcherItem[] = [];
    for (const path of recents) {
      if (visibleSet.has(path)) {
        out.push({
          displayName: stem(path),
          path,
          alias: null,
          recent: true,
          kind: "file",
        });
      }
    }
    const remaining = visibleFiles
      .filter((f) => !recentSet.has(f.path))
      .sort((a, b) => stem(a.path).localeCompare(stem(b.path)));
    for (const f of remaining) {
      out.push({
        displayName: stem(f.path),
        path: f.path,
        alias: null,
        recent: false,
        kind: "file",
      });
    }
    for (const f of visibleFiles) {
      const meta = metadataCache.getMetadata(f.path);
      if (!meta) continue;
      for (const a of meta.aliases) {
        if (!a.trim()) continue;
        out.push({ displayName: a, path: f.path, alias: a, recent: false, kind: "alias" });
      }
    }

    return out;
  }, [files, recents, excludedRaw]);

  if (!activeVault) return null;

  const defaultActivate = async (
    item: SwitcherItem,
    mods: { newTab: boolean; create: boolean },
  ) => {
    try {
      if (item.kind === "create") {
        await createNoteAt(item.path);
      }
      if (onActivate) {
        onActivate(item.path, mods);
      } else if (item.path.endsWith(".canvas")) {
        workspaceStore.openCanvas({ path: item.path, newTab: mods.newTab });
      } else if (item.path.endsWith(".base")) {
        workspaceStore.openBase({ path: item.path, newTab: mods.newTab });
      } else {
        workspaceStore.openFile(item.path, { newTab: mods.newTab });
      }
    } catch (err) {
      noticeManager.show(err instanceof Error ? err.message : "Could not open note", {
        kind: "error",
      });
    }
  };

  return (
    <Prompt<SwitcherItem>
      open={open}
      onClose={onClose}
      placeholder={loading ? "Loading vault..." : "Find or create a note..."}
      items={items}
      toSearchText={(item) => item.displayName}
      extraQueryItems={(rawQuery, baseItems) => {
        const trimmed = rawQuery.trim();
        if (!trimmed) return [];
        const exact = baseItems.some(
          (item) => item.displayName.toLowerCase() === trimmed.toLowerCase(),
        );
        if (exact) return [];
        const folder = normalize(settingsStore.getState().newNoteFolder);
        const name = trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
        const newPath = folder ? join(folder, name) : name;
        return [
          {
            displayName: `Create new note: ${trimmed}`,
            path: newPath,
            alias: null,
            recent: false,
            kind: "create",
          },
        ];
      }}
      renderItem={(item, match) => {
        const segments = highlightMatches(item.displayName, match?.indices);
        let segmentOffset = 0;
        const keyedSegments = segments.map((s) => {
          const key = `${s.matched ? "matched" : "plain"}-${segmentOffset}-${s.text}`;
          segmentOffset += s.text.length;
          return { ...s, key };
        });
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
                {item.kind === "alias" && (
                  <span
                    className="suggestion-flair"
                    style={{
                      marginInlineStart: "var(--size-4-2)",
                      fontSize: "var(--font-ui-smaller)",
                      color: "var(--text-faint)",
                      fontStyle: "italic",
                    }}
                  >
                    alias for {stem(item.path)}
                  </span>
                )}
                {item.kind === "file" && item.recent && (
                  <span
                    className="suggestion-flair"
                    style={{
                      marginInlineStart: "var(--size-4-2)",
                      fontSize: "var(--font-ui-smaller)",
                      color: "var(--text-accent)",
                    }}
                  >
                    recent
                  </span>
                )}
                {item.kind === "create" && (
                  <span
                    className="suggestion-flair"
                    style={{
                      marginInlineStart: "var(--size-4-2)",
                      fontSize: "var(--font-ui-smaller)",
                      color: "var(--text-success)",
                    }}
                  >
                    new
                  </span>
                )}
              </div>
              <div className="suggestion-note">{item.path}</div>
            </div>
          </div>
        );
      }}
      onActivate={(item, mods) => {
        void defaultActivate(item, { newTab: mods.ctrl, create: mods.shift });
        onClose();
      }}
      instructions={[
        { command: "↵", description: "to open" },
        { command: "⌘ ↵", description: "open in new tab" },
        { command: "⇧ ↵", description: "create new note" },
        { command: "esc", description: "to dismiss" },
      ]}
    />
  );
}
