import {
  type BaseConfig,
  type ColumnKey,
  DEFAULT_BASE,
  type SortOrder,
  parseBaseConfig,
} from "@core/bases/schema";
import { type SummaryResult, computeSummaries, groupRowsBy } from "@core/bases/summary";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { t as translate } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { useMetadataVersion } from "@core/metadata/useMetadata";
import { fileMatchesQuery, parseQuery } from "@core/search/query";
import { settingsStore } from "@core/settings/store";
import { Effect } from "effect";
import { Table } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { BasesCardsView } from "./bases/BasesCardsView";
import { BasesListView } from "./bases/BasesListView";
import { BasesMapView } from "./bases/BasesMapView";
import { BasesTableView } from "./bases/BasesTableView";
import { type Row, computeRow, sortRows } from "./bases/shared";

export interface BasesViewProps {
  path: string | undefined;
}

export function BasesView({ path }: BasesViewProps) {
  const t = useI18n();
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

  useEffect(() => {
    void path;
    setOverrideSort(null);
  }, [path]);

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
        query.lineTerms.length > 0 ||
        query.regexes.length > 0 ||
        query.negatedRegexes.length > 0;
      const metadataQuery = {
        ...query,
        include: [],
        exclude: [],
        lineTerms: [],
        regexes: [],
        negatedRegexes: [],
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
        if (fileMatchesQuery(query, { file, content, metadata: meta }, { matchCase: false })) {
          rows.push(computeRow(file, config));
        }
      }
      if (cancelled) return;
      const sortCol = (overrideSort?.column ?? config.sort) as ColumnKey;
      const sortOrder: SortOrder = overrideSort?.order ?? config.sortOrder;
      setFiltered(sortRows(rows, sortCol, sortOrder));
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

  // The user's columns plus any formula columns the config defines that
  // aren't already listed. This way computed columns surface in every view.
  const displayColumns: ReadonlyArray<ColumnKey> = useMemo(() => {
    const out = [...config.columns];
    for (const k of Object.keys(config.formulas)) {
      if (!out.includes(k)) out.push(k);
    }
    return out;
  }, [config.columns, config.formulas]);

  const grouped: Map<string, ReadonlyArray<Row>> | null = useMemo(() => {
    if (!config.groupBy) return null;
    const key = config.groupBy;
    const groups = groupRowsBy(filtered, key, (row, c) => row.cells[c]);
    return groups;
  }, [filtered, config.groupBy]);

  const summaries: ReadonlyArray<SummaryResult> = useMemo(() => {
    if (config.summaries.length === 0) return [];
    return computeSummaries(config.summaries, filtered, (row, col) => row.cells[col]);
  }, [filtered, config.summaries]);

  const sortColumn = (overrideSort?.column ?? config.sort) as ColumnKey;
  const sortOrder = overrideSort?.order ?? config.sortOrder;

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
          {t("bases.title")}
        </div>
        <div style={{ maxWidth: 460, fontSize: "var(--font-ui-small)" }}>
          {t("bases.empty.noPath")}
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
          {config.filter ? (
            <>
              {t("bases.filterLabel")}: <code>{config.filter}</code>
            </>
          ) : (
            t("bases.noFilter")
          )}
        </div>
        <div style={{ color: "var(--text-faint)", marginInlineStart: "auto" }}>
          {t("bases.matchCount", {
            count: String(filtered.length),
            matchLabel: t(filtered.length === 1 ? "bases.match" : "bases.matches"),
          })}
          {config.view !== "table" && <> · {config.view}</>}
          {config.groupBy && <> · {t("bases.groupedBy", { group: String(config.groupBy) })}</>}
        </div>
      </div>
      {error && <div className="message mod-error">{error}</div>}
      {loading ? (
        <div style={{ padding: "var(--size-4-4)", color: "var(--text-faint)" }}>
          {t("bases.loading")}
        </div>
      ) : config.view === "list" ? (
        <BasesListView
          config={config}
          rows={filtered}
          grouped={grouped}
          summaries={summaries}
          displayColumns={displayColumns}
        />
      ) : config.view === "cards" ? (
        <BasesCardsView
          config={config}
          rows={filtered}
          grouped={grouped}
          summaries={summaries}
          displayColumns={displayColumns}
        />
      ) : config.view === "map" ? (
        <BasesMapView config={config} rows={filtered} grouped={grouped} summaries={summaries} />
      ) : (
        <BasesTableView
          config={config}
          rows={filtered}
          grouped={grouped}
          summaries={summaries}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
          onToggleSort={toggleSort}
          displayColumns={displayColumns}
        />
      )}
    </div>
  );
}

// Surface to other modules in case they want to wire a "scaffold base file"
// command without re-importing yaml directly.
export async function scaffoldBaseFile(path: string): Promise<void> {
  const cfg = DEFAULT_BASE;
  const yamlText = `# Granite .base file — minimal example.
# Filter uses the same syntax as the Search panel: tag:foo path:notes/ -draft
name: ${cfg.name}
filter: "${cfg.filter}"
columns:
${cfg.columns.map((c) => `  - ${c}`).join("\n")}
sort: ${cfg.sort}
sortOrder: ${cfg.sortOrder}
view: ${cfg.view}
mapLatitude: ${cfg.mapLatitude}
mapLongitude: ${cfg.mapLongitude}
`;
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const existing = yield* fs.stat(path);
      if (existing) {
        throw new Error(translate("bases.error.exists", { path }));
      }
      yield* fs.writeText(path, yamlText);
    }),
  );
}
