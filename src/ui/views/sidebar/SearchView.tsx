import { Effect } from "effect";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { stem } from "@core/fs/path";
import { metadataCache } from "@core/metadata/cache";
import {
  fileMatchesQuery,
  findLineMatches,
  parseQuery,
  type ParsedQuery,
} from "@core/search/query";
import { settingsStore } from "@core/settings/store";
import { workspaceStore } from "@core/workspace/store";
import type { VaultFile, VaultPath } from "@core/fs/types";

interface FileMatches {
  path: VaultPath;
  matches: Array<{ line: number; preview: string }>;
  mtimeMs: number;
}

type SortOrder = "relevance" | "name" | "modified-newest" | "modified-oldest";

const SEARCH_DEBOUNCE_MS = 300;

let externalQuery = "";
const querySubs = new Set<() => void>();

export function setSearchQuery(q: string): void {
  externalQuery = q;
  for (const cb of querySubs) cb();
}

if (typeof window !== "undefined") {
  window.addEventListener("granite:set-search-query", (e: Event) => {
    const detail = (e as CustomEvent<{ query: string }>).detail;
    if (detail && typeof detail.query === "string") setSearchQuery(detail.query);
  });
}

const queryStore = {
  subscribe(cb: () => void) {
    querySubs.add(cb);
    return () => querySubs.delete(cb);
  },
  get() {
    return externalQuery;
  },
};

function applySort(arr: FileMatches[], order: SortOrder): FileMatches[] {
  const out = [...arr];
  switch (order) {
    case "name":
      out.sort((a, b) => stem(a.path).localeCompare(stem(b.path)));
      break;
    case "modified-newest":
      out.sort((a, b) => b.mtimeMs - a.mtimeMs);
      break;
    case "modified-oldest":
      out.sort((a, b) => a.mtimeMs - b.mtimeMs);
      break;
    default:
      // relevance: by match count desc, then name
      out.sort(
        (a, b) =>
          b.matches.length - a.matches.length || stem(a.path).localeCompare(stem(b.path)),
      );
  }
  return out;
}

export function SearchView() {
  const externalValue = useSyncExternalStore(
    queryStore.subscribe,
    queryStore.get,
    queryStore.get,
  );
  const [query, setQuery] = useState(externalValue);
  const [results, setResults] = useState<FileMatches[]>([]);
  const [running, setRunning] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRef = useRef<{ cancelled: boolean } | null>(null);
  const excludedRaw = useSyncExternalStore(
    settingsStore.subscribe,
    () => settingsStore.getState().excludedFiles,
    () => settingsStore.getState().excludedFiles,
  );

  useEffect(() => {
    setQuery(externalValue);
  }, [externalValue]);

  const runSearch = useCallback(
    async (raw: string, mc: boolean, sort: SortOrder) => {
      if (raw.trim().length < 2) {
        setResults([]);
        setRunning(false);
        return;
      }
      if (cancelRef.current) cancelRef.current.cancelled = true;
      const token = { cancelled: false };
      cancelRef.current = token;
      setRunning(true);

      const parsed: ParsedQuery = parseQuery(raw);
      const patterns = parseExcludePatterns(settingsStore.getState().excludedFiles);

      try {
        const files: ReadonlyArray<VaultFile> = await run(
          Effect.gen(function* () {
            const fs = yield* FileSystem;
            return yield* fs.listAll({ extensions: ["md"] });
          }),
        );
        if (token.cancelled) return;
        const eligible =
          patterns.length === 0 ? files : files.filter((f) => !isExcluded(f.path, patterns));
        const out: FileMatches[] = [];
        const chunkSize = 16;
        for (let i = 0; i < eligible.length; i += chunkSize) {
          if (token.cancelled) return;
          const chunk = eligible.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (f) => {
              if (token.cancelled) return;
              try {
                const text = await run(
                  Effect.gen(function* () {
                    const fs = yield* FileSystem;
                    return yield* fs.readText(f.path);
                  }),
                );
                const meta = metadataCache.getMetadata(f.path);
                if (
                  !fileMatchesQuery(
                    parsed,
                    { file: f, content: text, metadata: meta },
                    { matchCase: mc },
                  )
                ) {
                  return;
                }
                const matches = findLineMatches(text, parsed, 5, { matchCase: mc });
                if (
                  matches.length > 0 ||
                  (parsed.include.length === 0 && parsed.lineTerms.length === 0)
                ) {
                  out.push({ path: f.path, matches, mtimeMs: f.mtimeMs });
                }
              } catch {
                /* ignore */
              }
            }),
          );
          if (!token.cancelled) {
            setResults(applySort(out, sort));
          }
        }
      } finally {
        if (!token.cancelled) setRunning(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => void runSearch(query, matchCase, sortOrder),
      SEARCH_DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, matchCase, sortOrder, runSearch, excludedRaw]);

  // Re-sort when only sort changes (no need to re-run search).
  useEffect(() => {
    setResults((cur) => applySort(cur, sortOrder));
  }, [sortOrder]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="search-pane">
      <div className="nav-header" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <input
          type="search"
          placeholder="Search… (tag: path: file: line: -exclude)"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          style={{ width: "100%" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--size-4-2)",
            marginTop: "var(--size-4-1)",
            fontSize: "var(--font-ui-smaller)",
            color: "var(--text-muted)",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.currentTarget.checked)}
            />
            Match case
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Sort
            <select
              className="dropdown"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.currentTarget.value as SortOrder)}
              style={{ minWidth: 0 }}
            >
              <option value="relevance">Relevance</option>
              <option value="name">Name</option>
              <option value="modified-newest">Modified (newest)</option>
              <option value="modified-oldest">Modified (oldest)</option>
            </select>
          </label>
        </div>
      </div>
      {query.trim().length === 0 ? (
        <div className="workspace-sidedock-empty-state">
          Type to search across all notes in the vault. Operators:{" "}
          <code>tag:foo</code> · <code>path:</code> · <code>file:</code> ·{" "}
          <code>line:</code> · <code>-term</code>
        </div>
      ) : query.trim().length < 2 ? (
        <div className="workspace-sidedock-empty-state">
          Keep typing… (need at least 2 characters)
        </div>
      ) : (
        <>
          <div
            style={{
              padding: "var(--size-4-1) var(--size-4-3)",
              fontSize: "var(--font-ui-smaller)",
              color: "var(--text-muted)",
            }}
          >
            {running
              ? "Searching…"
              : results.length === 0
                ? "No results."
                : `${totalMatches} match${totalMatches === 1 ? "" : "es"} in ${results.length} file${results.length === 1 ? "" : "s"}`}
          </div>
          <div className="search-result-container mod-global-search">
            {results.map((r) => (
              <div key={r.path} className="search-result">
                <div
                  className="tree-item-self is-clickable search-result-file-title"
                  onClick={(e) =>
                    workspaceStore.openFile(r.path, { newTab: e.metaKey || e.ctrlKey })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      workspaceStore.openFile(r.path);
                    }
                  }}
                >
                  <span className="tree-item-inner">
                    <span className="tree-item-inner-text">{stem(r.path)}</span>
                  </span>
                  <span className="tree-item-flair-outer">
                    <span className="tree-item-flair">{r.matches.length}</span>
                  </span>
                </div>
                <div className="search-result-file-matches">
                  {r.matches.map((m, i) => (
                    <div
                      key={i}
                      className="search-result-file-match"
                      onClick={(e) =>
                        workspaceStore.openFile(r.path, { newTab: e.metaKey || e.ctrlKey })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          workspaceStore.openFile(r.path);
                        }
                      }}
                    >
                      <span style={{ color: "var(--text-faint)", marginRight: 8 }}>
                        L{m.line + 1}
                      </span>
                      {renderHighlighted(m.preview, query, matchCase)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function renderHighlighted(line: string, query: string, matchCase: boolean): ReactNode {
  const parsed = parseQuery(query);
  const terms = [...parsed.include, ...parsed.lineTerms];
  if (terms.length === 0) return line;
  const out: ReactNode[] = [];
  const haystack = matchCase ? line : line.toLowerCase();
  let i = 0;
  while (i < line.length) {
    let bestIdx = -1;
    let bestTerm = "";
    for (const term of terms) {
      const needle = matchCase ? term : term.toLowerCase();
      const idx = haystack.indexOf(needle, i);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        bestIdx = idx;
        bestTerm = term;
      }
    }
    if (bestIdx === -1) {
      out.push(line.slice(i));
      break;
    }
    if (bestIdx > i) out.push(line.slice(i, bestIdx));
    out.push(
      <span key={`m-${bestIdx}`} style={{ background: "var(--text-highlight-bg)" }}>
        {line.slice(bestIdx, bestIdx + bestTerm.length)}
      </span>,
    );
    i = bestIdx + bestTerm.length;
  }
  return out;
}