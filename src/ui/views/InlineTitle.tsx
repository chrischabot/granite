import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { dirname, isInvalidName, join, stem } from "@core/fs/path";
import { rewriteWikilinksOnRename } from "@core/links/rewrite";
import { workspaceStore } from "@core/workspace/store";
import { noticeManager } from "@core/notices/notice";
import type { VaultPath } from "@core/fs/types";

export interface InlineTitleProps {
  path: VaultPath;
}

export function InlineTitle({ path }: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(stem(path));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external path changes.
  useEffect(() => {
    setValue(stem(path));
  }, [path]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    setEditing(false);
    const next = value.trim();
    if (!next || next === stem(path)) {
      setValue(stem(path));
      return;
    }
    if (isInvalidName(next)) {
      noticeManager.show("That name contains invalid characters.", { kind: "error" });
      setValue(stem(path));
      return;
    }
    const dir = dirname(path);
    const newPath: VaultPath = (dir ? join(dir, `${next}.md`) : `${next}.md`) as VaultPath;
    if (newPath === path) return;
    try {
      await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          const existing = yield* fs.stat(newPath);
          if (existing) throw new Error(`A file named "${newPath}" already exists`);
          yield* fs.rename(path, newPath);
        }),
      );
      workspaceStore.openFile(newPath);
      try {
        const { filesUpdated, linksRewritten } = await rewriteWikilinksOnRename(
          path,
          newPath,
        );
        if (linksRewritten > 0) {
          noticeManager.show(
            `Renamed and updated ${linksRewritten} wikilink${linksRewritten === 1 ? "" : "s"} in ${filesUpdated} file${filesUpdated === 1 ? "" : "s"}.`,
            { kind: "success" },
          );
        }
      } catch {
        noticeManager.show(
          "Renamed, but could not update outgoing wikilinks. Run a vault-wide search to fix them.",
          { kind: "warning" },
        );
      }
    } catch (err) {
      noticeManager.show(
        err instanceof Error ? err.message : "Could not rename file",
        { kind: "error" },
      );
      setValue(stem(path));
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="inline-title"
        type="text"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          } else if (e.key === "Escape") {
            setValue(stem(path));
            setEditing(false);
          }
        }}
        style={{
          background: "transparent",
          border: 0,
          padding: 0,
          font: "inherit",
          color: "inherit",
          width: "100%",
          outline: "none",
          fontSize: "1.618em",
          fontWeight: "var(--h1-weight, 700)",
          letterSpacing: "-0.015em",
        }}
      />
    );
  }

  return (
    <h1
      className="inline-title"
      onDoubleClick={() => setEditing(true)}
      style={{
        margin: "0 0 0.5em 0",
        cursor: "text",
        fontSize: "1.618em",
        lineHeight: 1.2,
        letterSpacing: "-0.015em",
      }}
      title="Double-click to rename"
    >
      {value}
    </h1>
  );
}