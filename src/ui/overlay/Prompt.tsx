import { type FuzzyMatch, createFuzzyIndex, rankFuzzyIndex } from "@core/search/fuzzy";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/useI18n";

export interface PromptInstruction {
  /** Symbol shown in bold at the start of the hint, e.g. "↵". */
  command: ReactNode;
  /** Description shown after the symbol. */
  description: ReactNode;
}

export interface PromptProps<T> {
  open: boolean;
  onClose: () => void;
  placeholder: string;
  items: ReadonlyArray<T>;
  /** Plain-text representation used for fuzzy ranking. */
  toSearchText: (item: T) => string;
  /** Render a single result row. `match.indices` are the matched character positions. */
  renderItem: (item: T, match: FuzzyMatch | null) => ReactNode;
  /** Called when the user activates a result via Enter or click. */
  onActivate: (item: T, modifiers: { shift: boolean; ctrl: boolean; alt: boolean }) => void;
  /** Optional empty-query results (e.g. recent files). When omitted, all items are shown. */
  emptyQueryItems?: ReadonlyArray<T>;
  /** Optional bottom-strip instructions. */
  instructions?: ReadonlyArray<PromptInstruction>;
  /** Optional callback fired whenever the typed query changes. */
  onQueryChange?: (query: string) => void;
  /** Optional synthetic rows appended after fuzzy matches for the current query. */
  extraQueryItems?: (query: string, baseItems: ReadonlyArray<T>) => ReadonlyArray<T>;
}

export function Prompt<T>(props: PromptProps<T>) {
  const {
    open,
    onClose,
    placeholder,
    items,
    toSearchText,
    renderItem,
    onActivate,
    emptyQueryItems,
    instructions,
    onQueryChange,
    extraQueryItems,
  } = props;

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const t = useI18n();
  const fuzzyIndex = useMemo(() => createFuzzyIndex(items, toSearchText), [items, toSearchText]);

  const ranked = useMemo<ReadonlyArray<{ item: T; match: FuzzyMatch | null }>>(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return (emptyQueryItems ?? items).map((item) => ({ item, match: null }));
    }
    const matches = rankFuzzyIndex(fuzzyIndex, trimmed).map((r) => ({
      item: r.item,
      match: { score: r.score, indices: r.indices },
    }));
    const synthetic = extraQueryItems?.(trimmed, items) ?? [];
    if (synthetic.length === 0) return matches;
    return [
      ...matches,
      ...synthetic.map((item) => ({
        item,
        match: null,
      })),
    ];
  }, [items, query, emptyQueryItems, fuzzyIndex, extraQueryItems]);

  // Reset selection when the result list changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: query changes define the list reset boundary.
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Reset query and refocus on open.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Keep selected row in view.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row-index="${selected}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const move = useCallback(
    (delta: number) => {
      if (ranked.length === 0) return;
      setSelected((s) => Math.max(0, Math.min(ranked.length - 1, s + delta)));
    },
    [ranked.length],
  );

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      move(10);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      move(-10);
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelected(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelected(Math.max(0, ranked.length - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = ranked[selected];
      if (r) {
        onActivate(r.item, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey });
      }
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="modal-container">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the input handles Escape; backdrop is pointer-only and hidden from assistive tech. */}
      <div className="modal-bg" onClick={onClose} aria-hidden="true" />
      {/* biome-ignore lint/a11y/useSemanticElements: prompt follows the app's modal div structure and ARIA contract. */}
      <div className="prompt" role="dialog" aria-modal="true">
        <div className="prompt-input-container">
          <input
            ref={inputRef}
            className="prompt-input"
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              const next = e.currentTarget.value;
              setQuery(next);
              onQueryChange?.(next);
            }}
            onKeyDown={onKey}
            aria-controls={listId}
            aria-activedescendant={`${listId}-row-${selected}`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
          />
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: custom virtual listbox with controlled active descendant. */}
        <div ref={listRef} id={listId} className="prompt-results" role="listbox" tabIndex={-1}>
          {ranked.length === 0 ? (
            <div className="suggestion-empty">{t("prompt.noMatches")}</div>
          ) : (
            ranked.map(({ item, match }, i) => (
              <div
                key={toSearchText(item)}
                className={`suggestion-item${i === selected ? " is-selected" : ""}`}
                {...{ role: "option" }}
                aria-selected={i === selected}
                tabIndex={-1}
                data-row-index={i}
                id={`${listId}-row-${i}`}
                onMouseEnter={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onActivate(item, {
                      shift: e.shiftKey,
                      ctrl: e.ctrlKey || e.metaKey,
                      alt: e.altKey,
                    });
                  }
                }}
                onClick={(e) =>
                  onActivate(item, {
                    shift: e.shiftKey,
                    ctrl: e.ctrlKey || e.metaKey,
                    alt: e.altKey,
                  })
                }
              >
                {renderItem(item, match)}
              </div>
            ))
          )}
        </div>
        {instructions && instructions.length > 0 && (
          <div className="prompt-instructions">
            {instructions.map((ins) => (
              <span key={String(ins.command)} className="prompt-instruction">
                <span className="prompt-instruction-command">{ins.command}</span>
                {ins.description}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
