import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { parseWikilink } from "@core/markdown/renderer";
import { metadataCache } from "@core/metadata/cache";

/** Dispatched as a no-op transaction when the metadata cache emits so the
 *  ViewPlugin's `update` hook gets a chance to rebuild its decorations. */
const metadataChangeEffect = StateEffect.define<number>();

const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g;

const unresolvedMark = Decoration.mark({ class: "cm-unresolved-link" });

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  WIKILINK_RE.lastIndex = 0;
  while (true) {
    const m = WIKILINK_RE.exec(text);
    if (!m) break;
    // Skip embeds (`![[image.png]]`): the metadata cache doesn't track
    // attachments, so they'd always show as unresolved otherwise.
    if (m[1] === "!") continue;
    const inner = m[2];
    if (!inner) continue;
    const parts = parseWikilink(inner);
    if (!parts.target) continue;
    const targetPath = parts.target.endsWith(".md") ? parts.target : `${parts.target}.md`;
    if (metadataCache.getMetadata(targetPath)) continue;
    const start = m.index;
    const end = start + m[0].length;
    builder.add(start, end, unresolvedMark);
  }
  return builder.finish();
}

export const unresolvedWikilinkExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private unsub: () => void;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
      this.unsub = metadataCache.subscribe(() => {
        // Dispatching a transaction with our effect schedules a re-decoration
        // via the update path below.
        view.dispatch({ effects: metadataChangeEffect.of(Date.now()) });
      });
    }
    update(update: ViewUpdate) {
      let metadataChanged = false;
      for (const tr of update.transactions) {
        for (const e of tr.effects) {
          if (e.is(metadataChangeEffect)) {
            metadataChanged = true;
            break;
          }
        }
        if (metadataChanged) break;
      }
      if (update.docChanged || update.viewportChanged || metadataChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
    destroy() {
      this.unsub();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
