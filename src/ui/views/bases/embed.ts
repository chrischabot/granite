import { type ColumnKey, parseBaseConfig } from "@core/bases/schema";
import { type SummaryResult, computeSummaries, groupRowsBy } from "@core/bases/summary";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { isExcluded, parseExcludePatterns } from "@core/fs/exclude";
import type { VaultFile, VaultPath } from "@core/fs/types";
import { t } from "@core/i18n";
import { metadataCache } from "@core/metadata/cache";
import { fileMatchesQuery, parseQuery } from "@core/search/query";
import { settingsStore } from "@core/settings/store";
import { workspaceStore } from "@core/workspace/store";
import { Effect } from "effect";
import {
  type Row,
  computeRow,
  formatCellValue,
  localizedColumnLabel,
  makeThisContext,
  sortRows,
} from "./shared";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSummaryValue(v: number | null): string {
  if (v === null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/**
 * Render a ` ```base ` fenced block into the provided container. Returns a
 * disposer for the row click handlers (call before replacing the container's
 * innerHTML to avoid leaked listeners).
 */
export async function renderBasesEmbed(
  wrap: HTMLElement,
  yamlText: string,
  embeddingPath: string | null,
): Promise<() => void> {
  const config = parseBaseConfig(yamlText);

  // Header strip — name + filter summary on top.
  const headerHtml = `<div class="bases-fence-header">
    <span class="bases-fence-name">${escapeHtml(config.name.trim() || t("bases.defaultName"))}</span>
    ${
      config.filter
        ? ` · <span class="bases-fence-filter">${escapeHtml(
            t("reading.embed.filterSummary", { filter: config.filter }),
          )}</span>`
        : ""
    }
  </div><div class="bases-fence-body">${escapeHtml(t("bases.embed.loading"))}</div>`;
  wrap.innerHTML = headerHtml;
  const body = wrap.querySelector(".bases-fence-body");
  if (!body) return () => {};

  let files: ReadonlyArray<VaultFile> = [];
  try {
    files = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.listAll({ extensions: ["md"] });
      }),
    );
  } catch (err) {
    body.innerHTML = `<div class="message mod-error">${escapeHtml(
      err instanceof Error ? err.message : String(err),
    )}</div>`;
    return () => {};
  }

  const patterns = parseExcludePatterns(settingsStore.getState().excludedFiles);
  const eligible =
    patterns.length === 0 ? files : files.filter((f) => !isExcluded(f.path, patterns));

  // Hydrate metadata for the candidate set so the filter can resolve.
  await Promise.all(eligible.map((f) => metadataCache.ensure(f.path as VaultPath)));

  // Drop content-needing operators — the embed never reads file bodies.
  const query = parseQuery(config.filter);
  const metadataOnly = {
    ...query,
    include: [],
    exclude: [],
    lineTerms: [],
    regexes: [],
    negatedRegexes: [],
  };
  const matched = eligible.filter((file) => {
    const meta = metadataCache.getMetadata(file.path);
    return fileMatchesQuery(
      metadataOnly,
      { file, content: "", metadata: meta },
      { matchCase: false },
    );
  });

  // Build `this` context from the embedding file when supplied.
  let thisContext = null;
  if (embeddingPath) {
    const embeddingFile = eligible.find((f) => f.path === embeddingPath);
    if (embeddingFile) thisContext = makeThisContext(embeddingFile);
  }

  const rows = matched.map((f) => computeRow(f, config, thisContext));
  const sorted: ReadonlyArray<Row> = sortRows(rows, config.sort, config.sortOrder);

  const displayCols: ColumnKey[] = [...config.columns];
  for (const k of Object.keys(config.formulas)) {
    if (!displayCols.includes(k)) displayCols.push(k);
  }
  const colLabel = (c: ColumnKey) => localizedColumnLabel(c, config.formulas, t);

  const grouped = config.groupBy
    ? groupRowsBy(sorted, config.groupBy, (row, c) => row.cells[c])
    : null;

  const summaries: ReadonlyArray<SummaryResult> =
    config.summaries.length > 0
      ? computeSummaries(config.summaries, sorted, (row, col) => row.cells[col])
      : [];

  const renderRowHtml = (row: Row) => {
    let cells = "";
    for (const c of displayCols) {
      const v = formatCellValue(row.cells[c], c);
      cells += `<td>${escapeHtml(v)}</td>`;
    }
    return `<tr data-path="${escapeHtml(row.file.path)}">${cells}</tr>`;
  };

  const groupHeadingHtml = (label: string, count: number) =>
    `<tr class="bases-fence-group"><td colspan="${displayCols.length}">${escapeHtml(label)} · ${count}</td></tr>`;

  let html = `<table class="bases-fence-table"><thead><tr>`;
  for (const c of displayCols) html += `<th>${escapeHtml(colLabel(c))}</th>`;
  html += "</tr></thead><tbody>";
  if (sorted.length === 0) {
    html += `<tr><td colspan="${displayCols.length}" class="bases-fence-empty">${escapeHtml(
      t("bases.empty.noMatchingFiles"),
    )}</td></tr>`;
  } else if (grouped) {
    for (const [key, rs] of grouped.entries()) {
      html += groupHeadingHtml(key, rs.length);
      for (const row of rs) html += renderRowHtml(row);
    }
  } else {
    for (const row of sorted) html += renderRowHtml(row);
  }
  html += "</tbody>";
  if (summaries.length > 0) {
    html += `<tfoot><tr><td colspan="${displayCols.length}" class="bases-fence-summary">`;
    html += summaries
      .map(
        (s) =>
          `<span><strong>${escapeHtml(s.label)}:</strong> ${escapeHtml(formatSummaryValue(s.value))}</span>`,
      )
      .join(" · ");
    html += "</td></tr></tfoot>";
  }
  html += "</table>";
  body.innerHTML = html;

  // Wire row clicks to open the underlying file.
  const handlers: Array<{ el: HTMLElement; fn: (e: MouseEvent) => void }> = [];
  for (const tr of body.querySelectorAll<HTMLElement>("tr[data-path]")) {
    tr.style.cursor = "var(--cursor-link)";
    const fn = (e: MouseEvent) => {
      const path = tr.getAttribute("data-path");
      if (!path) return;
      workspaceStore.openFile(path, {
        newTab: e.metaKey || e.ctrlKey,
      });
    };
    tr.addEventListener("click", fn);
    handlers.push({ el: tr, fn });
  }
  return () => {
    for (const h of handlers) h.el.removeEventListener("click", h.fn);
  };
}
