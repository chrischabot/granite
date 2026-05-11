import { Table } from "lucide-react";
import { Effect } from "effect";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import {
  columnLabel,
  DEFAULT_BASE,
  parseBaseConfig,
  type BaseConfig,
  type ColumnKey,
  type SortOrder,
} from "@core/bases/schema";
import { stem } from "@core/fs/path";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { fileMatchesQuery, parseQuery } from "@core/search/query";
import { settingsStore } from "@core/settings/store";
import { workspaceStore } from "@core/workspace/store";
import type { VaultFile, VaultPath } from "@core/fs/types";

export interface BasesViewProps {
  path: string | undefined;
}

type Row = {
  file: VaultFile;
  cells: Partial<Record<ColumnKey, unknown>>;
};

function formatCell(v: unknown, key: ColumnKey): React.ReactNode {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    if (key === "tags") {
      return (
        <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
          {v.map((t, i) => (
            <span
              key={i}
              className="tag"
              style={{
                background: "var(--tag-background)",
                color: "var(--tag-color)",
                padding: "0 0.5em",
                borderRadius: "var(--tag-radius)",
                fontSize: "0.85em",
              }}
            >
              #{String(t)}
            </span>
          ))}
        </span>
      );
    }
    return v.map((x) => String(x)).join(", ");
  }
  if (key === "file.modified" || key === "file.created") {
    const t = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(t) || t === 0) return "";
    return new Date(t).toLocaleString();
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function cellSortKey(v: unknown): number | string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  if (Array.isArray(v)) return v.join(", ").toLowerCase();
  return String(v).toLowerCase();
}

function computeRow(file: VaultFile, columns: ReadonlyArray<ColumnKey>): Row {
  const meta = metadataCache.getMetadata(file.path);
  const cells: Partial<Record<ColumnKey, unknown>> = {};
  for (const key of columns) {
    switch (key) {
      case "file.name":
        cells[key] = stem(file.path);
        break;
      case "file.path":
        cells[key] = file.path;
        break;
      case "file.modified":
        cells[key] = file.mtimeMs;
        break;
      case "file.created":
        cells[key] = file.ctimeMs;
        break;
      case "file.size":
        cells[key] = file.size;
        break;
      case "tags":
        cells[key] = meta ? [...new Set(meta.tags.map((t) => t.name))] : [];
        break;
      default:
        cells[key] = meta ? meta.frontmatter[key] : null;
        break;
    }
  }
  return { file, cells };
}

export function BasesView({ path }: BasesViewProps) {
  const [config, setConfig] = useState<BaseConfig>(DEFAULT_BASE);
  const [files, setFiles] = useState<ReadonlyArray<VaultFile>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The user can override the sort independently of the config.
  const [overrideSort, setOverrideSort] = useState<{
    column: ColumnKey;
    order: SortOrder;
  } | null>(null);
  useMetadataVersion();

  const reload = useCallback(async () => {
    if (!path) {
      setConfig(DEFAULT_BASE);
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const yamlText = await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return yield* fs.readText(path);
        }),
      );
      const parsedCfg = parseBaseConfig(yamlText);
      setConfig(parsedCfg);
      const allFiles = await run(
        Effect.gen(function* () {
          const fs = yield* FileSystem;
          return yield* fs.listAll({ extensions: ["md"] });
        }),
      );
      const patterns = parseExcludePatterns(settingsStore.getState().excludedFiles);
      const eligible = patterns.length
        ? allFiles.filter((f) => !isExcluded(f.path, patterns))
        : allFiles;
      // Ensure metadata is loaded for any file we'll evaluate so the filter
      // and column lookups have data to work with.
      await Promise.all(eligible.map((f) => metadataCache.ensure(f.path as VaultPath)));
      setFiles(eligible);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Re-evaluate on watcher events (cheap because the file list is small).
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return fs.watch(() => {
          if (cancelled) return;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void reload(), 300);
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
  }, [path, reload]);

  const [filtered, setFiltered] = useState<Row[]>([]);

  useEffect(() => {
    if (files.length === 0) {
      setFiltered([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const query = parseQuery(config.filter);
      const needsContent =
        query.include.length > 0 ||
        query.exclude.length > 0 ||
        query.lineTerms.length > 0;
      const metadataQuery = {
        ...query,
        include: [],
        exclude: [],
        lineTerms: [],
      };
      const rows: Row[] = [];
      for (const file of files) {
        if (cancelled) return;
        const meta = metadataCache.getMetadata(file.path);
        if (
          needsContent &&
          !fileMatchesQuery(
            metadataQuery,
            { file, content: "", metadata: meta },
            { matchCase: false },
          )
        ) {
          continue;
        }
        let content = "";
        if (needsContent) {
          try {
            content = await run(
              Effect.gen(function* () {
                const fs = yield* FileSystem;
                return yield* fs.readText(file.path);
              }),
            );
          } catch {
            continue;
          }
        }
        if (
          fileMatchesQuery(
            query,
            { file, content, metadata: meta },
            { matchCase: false },
          )
        ) {
          rows.push(computeRow(file, config.columns));
        }
      }
      if (cancelled) return;
      const sortKey = (overrideSort?.column ?? config.sort) as ColumnKey;
      const sortOrder: SortOrder = overrideSort?.order ?? config.sortOrder;
      rows.sort((a, b) => {
        const ka = cellSortKey(a.cells[sortKey]);
        const kb = cellSortKey(b.cells[sortKey]);
        if (ka < kb) return sortOrder === "asc" ? -1 : 1;
        if (ka > kb) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
      setFiltered(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [files, config, overrideSort]);

  const toggleSort = (col: ColumnKey) => {
    const currentCol = overrideSort?.column ?? config.sort;
    const currentOrder = overrideSort?.order ?? config.sortOrder;
    if (currentCol === col) {
      setOverrideSort({ column: col, order: currentOrder === "asc" ? "desc" : "asc" });
    } else {
      setOverrideSort({ column: col, order: "asc" });
    }
  };

  if (!path) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--size-4-3)",
          color: "var(--text-faint)",
          textAlign: "center",
          padding: "var(--size-4-6)",
        }}
      >
        <Table size={48} style={{ color: "var(--text-muted)", opacity: 0.6 }} />
        <div style={{ fontSize: "var(--font-ui-large)", color: "var(--text-normal)" }}>
          Bases
        </div>
        <div style={{ maxWidth: 460, fontSize: "var(--font-ui-small)" }}>
          Open a `.base` YAML file to use this view.
        </div>
      </div>
    );
  }

  return (
    <div
      className="bases-view"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "var(--size-4-3) var(--size-4-4)",
          borderBottom: "1px solid var(--background-modifier-border)",
          display: "flex",
          alignItems: "baseline",
          gap: "var(--size-4-3)",
          fontSize: "var(--font-ui-small)",
        }}
      >
        <div style={{ fontWeight: "var(--font-semibold)", color: "var(--text-normal)" }}>
          {config.name}
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          {config.filter ? <>filter: <code>{config.filter}</code></> : "no filter"}
        </div>
        <div style={{ color: "var(--text-faint)", marginInlineStart: "auto" }}>
          {filtered.length} match{filtered.length === 1 ? "" : "es"}
        </div>
      </div>
      {error && <div className="message mod-error">{error}</div>}
      {loading ? (
        <div style={{ padding: "var(--size-4-4)", color: "var(--text-faint)" }}>
          Loading base…
        </div>
      ) : (
        <div
          style={{
            flex: "1 1 auto",
            overflow: "auto",
            padding: "0 var(--size-4-3) var(--size-4-3)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--font-ui-small)",
            }}
          >
            <thead>
              <tr>
                {config.columns.map((col) => {
                  const activeCol = overrideSort?.column ?? config.sort;
                  const order = overrideSort?.order ?? config.sortOrder;
                  const isActive = col === activeCol;
                  return (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      style={{
                        textAlign: "left",
                        padding: "var(--size-2-3) var(--size-4-3)",
                        background: "var(--background-secondary)",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        position: "sticky",
                        top: 0,
                        userSelect: "none",
                        borderBottom: "1px solid var(--background-modifier-border)",
                      }}
                    >
                      {columnLabel(col)}
                      {isActive && (
                        <span style={{ marginInlineStart: 4 }}>
                          {order === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.columns.length}
                    style={{
                      padding: "var(--size-4-4)",
                      color: "var(--text-faint)",
                      textAlign: "center",
                    }}
                  >
                    No matching files.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.file.path}
                    onClick={(e) => {
                      if (
                        e.target instanceof HTMLAnchorElement ||
                        (e.target as HTMLElement).closest("a")
                      )
                        return;
                      workspaceStore.openFile(row.file.path, {
                        newTab: e.metaKey || e.ctrlKey,
                      });
                    }}
                    style={{ cursor: "var(--cursor-link)" }}
                  >
                    {config.columns.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: "var(--size-2-3) var(--size-4-3)",
                          borderBottom: "1px solid var(--background-modifier-border)",
                          color: "var(--text-normal)",
                          whiteSpace: col === "file.path" ? "nowrap" : "normal",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 360,
                        }}
                      >
                        {formatCell(row.cells[col], col)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Surface to other modules in case they want to wire a "scaffold base file"
// command without re-importing yaml directly.
export async function scaffoldBaseFile(path: string): Promise<void> {
  const cfg = DEFAULT_BASE;
  const yamlText =
    "# Granite .base file — minimal example.\n" +
    "# Filter uses the same syntax as the Search panel: tag:foo path:notes/ -draft\n" +
    `name: ${cfg.name}\n` +
    `filter: "${cfg.filter}"\n` +
    "columns:\n" +
    cfg.columns.map((c) => `  - ${c}`).join("\n") +
    "\n" +
    `sort: ${cfg.sort}\n` +
    `sortOrder: ${cfg.sortOrder}\n`;
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const existing = yield* fs.stat(path);
      if (existing) {
        throw new Error(`A file named "${path}" already exists`);
      }
      yield* fs.writeText(path, yamlText);
    }),
  );
}