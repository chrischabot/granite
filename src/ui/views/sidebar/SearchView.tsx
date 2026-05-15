import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import { stem } from "@core/fs/path";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { metadataCache } from "@core/metadata/cache";
import { runChunkedFullTextSearch } from "@core/search/chunked-search";
import { getSearchIndex } from "@core/search/index-registry";
import { type ParsedQuery, findLineMatches, parseQuery } from "@core/search/query";
import { settingsStore } from "@core/settings/store";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useI18n } from "../../i18n/useI18n";

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
        (a, b) => b.matches.length - a.matches.length || stem(a.path).localeCompare(stem(b.path)),
      );
  }
  return out;
}

export function SearchView() {
  const t = useI18n();
  const externalValue = useSyncExternalStore(queryStore.subscribe, queryStore.get, queryStore.get);
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

  const runSearch = useCallback(async (raw: string, mc: boolean, sort: SortOrder) => {
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
      const index = getSearchIndex();
      // Chunked progressive driver — when the inverted index has indexed any
      // documents it pre-filters candidates by the free-text terms; otherwise
      // it falls back to scanning every eligible file (regex / property / tag
      // / line-only queries always fall back via the helper's null path).
      const usableIndex = index.size() > 0 ? index : null;
      await runChunkedFullTextSearch(
        parsed,
        eligible,
        {
          readFile: (path) =>
            run(
              Effect.gen(function* () {
                const fs = yield* FileSystem;
                return yield* fs.readText(path);
              }),
            ),
          getMetadata: (path) => metadataCache.getMetadata(path),
          onChunk: (batch) => {
            if (token.cancelled) return;
            for (const entry of batch) {
              const matches = findLineMatches(entry.content, parsed, 5, { matchCase: mc });
              if (
                matches.length > 0 ||
                (parsed.include.length === 0 && parsed.lineTerms.length === 0)
              ) {
                out.push({ path: entry.file.path, matches, mtimeMs: entry.file.mtimeMs });
              }
            }
            setResults(applySort(out, sort));
          },
        },
        usableIndex,
        { chunkSize: 128, matchOptions: { matchCase: mc }, signal: token },
      );
    } finally {
      if (!token.cancelled) setRunning(false);
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: excludedRaw is a store snapshot used to rerun the debounced search when exclusions change.
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
  const resultStatus = running
    ? t("search.status.searching")
    : results.length === 0
      ? t("search.status.noResults")
      : t("search.status.results", {
          matches: totalMatches,
          matchLabel: t(totalMatches === 1 ? "search.status.match" : "search.status.matches"),
          files: results.length,
          fileLabel: t(results.length === 1 ? "search.status.file" : "search.status.files"),
        });

  return (
    <div className="search-pane">
      <div className="nav-header" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <input
          type="search"
          placeholder={t("search.placeholder")}
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
            {t("search.matchCase")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {t("search.sort")}
            <select
              className="dropdown"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.currentTarget.value as SortOrder)}
              style={{ minWidth: 0 }}
            >
              <option value="relevance">{t("search.sort.relevance")}</option>
              <option value="name">{t("search.sort.name")}</option>
              <option value="modified-newest">{t("search.sort.modifiedNewest")}</option>
              <option value="modified-oldest">{t("search.sort.modifiedOldest")}</option>
            </select>
          </label>
        </div>
      </div>
      {query.trim().length === 0 ? (
        <div className="workspace-sidedock-empty-state">
          {t("search.empty.intro")} <code>tag:foo</code> · <code>path:</code> · <code>file:</code> ·{" "}
          <code>line:</code> · <code>-term</code>
        </div>
      ) : query.trim().length < 2 ? (
        <div className="workspace-sidedock-empty-state">{t("search.empty.short")}</div>
      ) : (
        <>
          <div
            style={{
              padding: "var(--size-4-1) var(--size-4-3)",
              fontSize: "var(--font-ui-smaller)",
              color: "var(--text-muted)",
            }}
          >
            {resultStatus}
          </div>
          <div className="search-result-container mod-global-search">
            {results.map((r) => (
              <div key={r.path} className="search-result">
                <button
                  type="button"
                  className="tree-item-self is-clickable search-result-file-title"
                  onClick={(e) =>
                    workspaceStore.openFile(r.path, { newTab: e.metaKey || e.ctrlKey })
                  }
                >
                  <span className="tree-item-inner">
                    <span className="tree-item-inner-text">{stem(r.path)}</span>
                  </span>
                  <span className="tree-item-flair-outer">
                    <span className="tree-item-flair">{r.matches.length}</span>
                  </span>
                </button>
                <div className="search-result-file-matches">
                  {r.matches.map((m) => (
                    <button
                      type="button"
                      key={`${m.line}-${m.preview}`}
                      className="search-result-file-match"
                      onClick={(e) =>
                        workspaceStore.openFile(r.path, { newTab: e.metaKey || e.ctrlKey })
                      }
                    >
                      <span style={{ color: "var(--text-faint)", marginRight: 8 }}>
                        L{m.line + 1}
                      </span>
                      {renderHighlighted(m.preview, query, matchCase)}
                    </button>
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
