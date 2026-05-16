import { inputPrompt } from "@/ui/overlay/inputPrompt";
import { createCommandRegistrar } from "@core/commands/CommandRegistry";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { extension, stem } from "@core/fs/path";
import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";

declare global {
  interface WindowEventMap {
    "granite:get-active-selection": CustomEvent<{
      requestId: string;
    }>;
    "granite:active-selection-response": CustomEvent<{
      requestId: string;
      path: string;
      selection: string;
      from: number;
      to: number;
    }>;
    "granite:replace-selection": CustomEvent<{
      path: string;
      from: number;
      to: number;
      replacement: string;
    }>;
  }
}

interface ActiveSelection {
  path: string;
  selection: string;
  from: number;
  to: number;
}

let nextRequestId = 1;

function getActiveSelection(): Promise<ActiveSelection | null> {
  return new Promise((resolve) => {
    const requestId = `req-${nextRequestId++}`;
    let resolved = false;
    const onResponse = (e: CustomEvent<ActiveSelection & { requestId: string }>) => {
      if (e.detail.requestId !== requestId) return;
      resolved = true;
      window.removeEventListener("granite:active-selection-response", onResponse);
      resolve({
        path: e.detail.path,
        selection: e.detail.selection,
        from: e.detail.from,
        to: e.detail.to,
      });
    };
    window.addEventListener("granite:active-selection-response", onResponse);
    window.dispatchEvent(
      new CustomEvent("granite:get-active-selection", { detail: { requestId } }),
    );
    setTimeout(() => {
      if (!resolved) {
        window.removeEventListener("granite:active-selection-response", onResponse);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Rewrite every wikilink in every `.md` file across the vault whose target
 * resolves to `sourcePath` to instead point at `targetPath`. Match on:
 *  - the file stem (`Source` for `Source.md`)
 *  - the full path with or without the .md extension
 *
 * Returns the number of files that were modified.
 */
async function rewriteWikilinks(sourcePath: string, targetPath: string): Promise<number> {
  return run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const all = yield* fs.listAll({ extensions: ["md"] });
      const sourceStem = stem(sourcePath);
      const sourceNoExt = sourcePath.replace(/\.md$/i, "");
      const targetStem = stem(targetPath);
      let count = 0;

      for (const file of all) {
        if (file.path === sourcePath) continue; // skip source (will be deleted)
        const text = yield* fs.readText(file.path);
        // Match `[[target...]]` and `![[target...]]`. We only rewrite the
        // bracket's target portion, preserving any heading/block/display.
        const next = text.replace(
          /(!?)\[\[([^\]\n]+)\]\]/g,
          (full, bang: string, inner: string) => {
            // Split inner into target | rest (heading/block/display).
            const pipeIdx = inner.indexOf("|");
            const sepIdx = (() => {
              const h = inner.indexOf("#");
              if (h === -1) return pipeIdx;
              if (pipeIdx === -1) return h;
              return Math.min(h, pipeIdx);
            })();
            const targetPart = sepIdx === -1 ? inner : inner.slice(0, sepIdx);
            const restPart = sepIdx === -1 ? "" : inner.slice(sepIdx);
            const t = targetPart.trim();
            if (t === sourceStem || t === sourceNoExt || t === sourcePath) {
              return `${bang}[[${targetStem}${restPart}]]`;
            }
            return full;
          },
        );
        if (next !== text) {
          yield* fs.writeText(file.path, next);
          count += 1;
        }
      }

      return count;
    }),
  );
}

export function registerNoteComposerPlugin(): () => void {
  const { register, disposer } = createCommandRegistrar();

  register({
    id: "note-composer:extract-selection",
    category: t("plugin.noteComposer.category"),
    name: t("plugin.noteComposer.extractSelection"),
    callback: async () => {
      const sel = await getActiveSelection();
      if (!sel || !sel.selection) {
        noticeManager.show(t("plugin.noteComposer.noSelection"), { kind: "warning" });
        return;
      }
      const name = await inputPrompt({
        title: t("plugin.noteComposer.prompt.newNote"),
        defaultValue: t("plugin.noteComposer.defaultName"),
        requireValue: true,
      });
      if (!name) return;
      const filename = name.endsWith(".md") ? name : `${name}.md`;
      try {
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const existing = yield* fs.stat(filename);
            if (existing) {
              throw new Error(t("plugin.noteComposer.error.exists", { filename }));
            }
            yield* fs.writeText(filename, sel.selection);
          }),
        );
        const linkText = `[[${stem(filename)}]]`;
        window.dispatchEvent(
          new CustomEvent("granite:replace-selection", {
            detail: { path: sel.path, from: sel.from, to: sel.to, replacement: linkText },
          }),
        );
        workspaceStore.openFile(filename, { newTab: true });
        noticeManager.show(t("plugin.noteComposer.notice.extracted"), { kind: "success" });
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : t("plugin.noteComposer.error.extract"),
          { kind: "error" },
        );
      }
    },
  });

  register({
    id: "note-composer:merge-into",
    category: t("plugin.noteComposer.category"),
    name: t("plugin.noteComposer.mergeInto"),
    callback: async () => {
      const state = workspaceStore.getState();
      const groupId = state.activeGroupId;
      const group = groupId ? state.groups.get(groupId) : null;
      const leaf = group?.activeLeafId ? state.leaves.get(group.activeLeafId) : null;
      if (!leaf || leaf.state.type !== "markdown") {
        noticeManager.show(t("plugin.noteComposer.openMarkdownFirst"), { kind: "warning" });
        return;
      }
      const sourcePath = leaf.state.path;
      const target = await inputPrompt({
        title: t("plugin.noteComposer.prompt.mergeTarget", { name: stem(sourcePath) }),
        requireValue: true,
      });
      if (!target) return;
      if (extension(target) !== "md") {
        noticeManager.show(t("plugin.noteComposer.error.targetMustBeMarkdown"), {
          kind: "error",
        });
        return;
      }
      try {
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            const targetExists = yield* fs.stat(target);
            if (!targetExists) {
              throw new Error(t("plugin.noteComposer.error.targetMissing", { target }));
            }
            const sourceText = yield* fs.readText(sourcePath);
            const targetText = yield* fs.readText(target);
            const merged = `${targetText}${targetText.endsWith("\n") ? "" : "\n"}\n${sourceText}`;
            yield* fs.writeText(target, merged);
          }),
        );
        // Rewrite wikilinks before deleting the source so we can resolve
        // references correctly.
        const rewriteCount = await rewriteWikilinks(sourcePath, target);
        await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            yield* fs.remove(sourcePath);
          }),
        );
        workspaceStore.openFile(target);
        noticeManager.show(
          t("plugin.noteComposer.notice.merged", {
            name: stem(target),
            count: String(rewriteCount),
            linkLabel: t(
              rewriteCount === 1 ? "plugin.noteComposer.link" : "plugin.noteComposer.links",
            ),
          }),
          { kind: "success" },
        );
      } catch (err) {
        noticeManager.show(
          err instanceof Error ? err.message : t("plugin.noteComposer.error.merge"),
          { kind: "error" },
        );
      }
    },
  });

  return disposer;
}
