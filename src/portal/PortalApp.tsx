import { renderMarkdown } from "@core/markdown/renderer";
import {
  Activity,
  BookOpen,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ActivityRunDetail,
  type ActivityRunSummary,
  type PortalStats,
  type WikiPageDetail,
  type WikiPageSummary,
  portalApi,
} from "./api";

type Mode = "wiki" | "activity";

function displayDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function relativeDate(value: string | null): string {
  if (!value) return "not finished";
  const delta = Date.now() - Date.parse(value);
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function statusClass(status: string): string {
  return `portal-status portal-status-${status.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;
}

function JsonBlock({ value }: { readonly value: unknown }) {
  return <pre className="portal-json">{JSON.stringify(value, null, 2)}</pre>;
}

function StatCard({ label, value, icon }: { readonly label: string; readonly value: string; readonly icon: React.ReactNode }) {
  return (
    <div className="portal-stat-card">
      <div className="portal-stat-icon">{icon}</div>
      <div><strong>{value}</strong><span>{label}</span></div>
    </div>
  );
}

function WikiReader({ page }: { readonly page: WikiPageDetail }) {
  const html = useMemo(() => renderMarkdown(page.body), [page.body]);
  return (
    <article className="portal-reader">
      <header className="portal-reader-header">
        <div className="portal-eyebrow"><FileText size={13} /> {page.source ?? "wiki"}</div>
        <h1>{page.title}</h1>
        <div className="portal-reader-meta">
          <span>Version {page.version}</span><span>Updated {displayDate(page.updated_at)}</span>
          <span className="portal-hash">sha256 {page.content_sha256.slice(0, 12)}</span>
        </div>
      </header>
      <div className="markdown-preview-view portal-markdown">
        <div className="markdown-preview-sizer">
          <div className="markdown-rendered" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      <section className="portal-lineage">
        <h2>Provenance</h2>
        <p>{page.source_cards.length} source card{page.source_cards.length === 1 ? "" : "s"} bind this version.</p>
        {page.source_cards.map((card) => (
          <div className="portal-lineage-card" key={card.id}>
            <div><strong>{card.title ?? card.id}</strong><span>{card.provider ?? card.source_type ?? "source"}</span></div>
            {card.url ? <a href={card.url} target="_blank" rel="noreferrer">Source <ExternalLink size={12} /></a> : null}
            {card.summary ? <p>{card.summary}</p> : null}
          </div>
        ))}
      </section>
    </article>
  );
}

function RunInspector({ detail, onOpenPage }: { readonly detail: ActivityRunDetail; readonly onOpenPage: (id: string) => void }) {
  const run = detail.run;
  const pageId = typeof run.wiki_page_id === "string" ? run.wiki_page_id : null;
  return (
    <article className="portal-reader portal-run-reader">
      <header className="portal-reader-header">
        <div className="portal-eyebrow"><Sparkles size={13} /> Muse Glimmer through Pi</div>
        <h1>{typeof run.title === "string" ? run.title : run.task_id}</h1>
        <div className="portal-reader-meta">
          <span className={statusClass(String(run.status))}>{String(run.status)}</span>
          <span>{String(run.model ?? "unknown model")}</span><span>{String(run.harness ?? "pi")}</span>
          <span>{displayDate(typeof run.done_at === "string" ? run.done_at : null)}</span>
        </div>
        {pageId ? <button className="mod-cta portal-open-output" onClick={() => onOpenPage(pageId)}>Open published output <ChevronRight size={14} /></button> : null}
      </header>

      <section className="portal-process-strip" aria-label="Run process">
        <div className="is-complete"><span>1</span><strong>Evidence frozen</strong></div>
        <ChevronRight size={16} /><div className="is-complete"><span>2</span><strong>Pi invoked Muse</strong></div>
        <ChevronRight size={16} /><div className="is-complete"><span>3</span><strong>Schema validated</strong></div>
        <ChevronRight size={16} /><div className={pageId ? "is-complete" : ""}><span>4</span><strong>Wiki published</strong></div>
      </section>

      <details open className="portal-inspector-section">
        <summary><TerminalSquare size={15} /> Prompt</summary>
        <div className="portal-detail-body">
          <div className="portal-field"><span>Prompt version</span><code>{detail.prompt.version}</code></div>
          <div className="portal-field"><span>Invocation</span><code>{detail.prompt.invocation.join(" ")}</code></div>
          <h3>System prompt</h3><pre className="portal-prompt">{detail.prompt.system}</pre>
          <h3>User prompt</h3><pre className="portal-prompt">{detail.prompt.user}</pre>
        </div>
      </details>
      <details className="portal-inspector-section">
        <summary><Database size={15} /> Frozen evidence packet</summary>
        <div className="portal-detail-body"><JsonBlock value={detail.evidence_packet} /></div>
      </details>
      <details open className="portal-inspector-section">
        <summary><Sparkles size={15} /> Model output</summary>
        <div className="portal-detail-body"><JsonBlock value={detail.model_output} /></div>
      </details>
      <details className="portal-inspector-section">
        <summary><ShieldCheck size={15} /> Validation, lineage, and publication</summary>
        <div className="portal-detail-body">
          <h3>Accepted summary</h3><JsonBlock value={detail.summary} />
          <h3>Event</h3><JsonBlock value={detail.event} />
          <h3>Source</h3><JsonBlock value={detail.source} />
          <h3>Provider observations</h3><JsonBlock value={detail.observations} />
          <h3>Audit trail</h3><JsonBlock value={detail.audit} />
        </div>
      </details>
      <aside className="portal-trace-gap"><strong>Full process transcript</strong><span>{detail.transcript.note}</span></aside>
    </article>
  );
}

export function PortalApp() {
  const [mode, setMode] = useState<Mode>(() => new URLSearchParams(location.search).has("run") ? "activity" : "wiki");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [email, setEmail] = useState("");
  const [pages, setPages] = useState<ReadonlyArray<WikiPageSummary>>([]);
  const [runs, setRuns] = useState<ReadonlyArray<ActivityRunSummary>>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPageDetail | null>(null);
  const [selectedRun, setSelectedRun] = useState<ActivityRunDetail | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadStats = useCallback(async (signal?: AbortSignal) => {
    const [nextStats, session] = await Promise.all([portalApi.stats(signal), portalApi.session(signal)]);
    setStats(nextStats); setEmail(session.email);
  }, []);

  const openPage = useCallback(async (id: string) => {
    setBusy(true); setError(null);
    try {
      const page = await portalApi.page(id);
      setSelectedPage(page); setSelectedRun(null); setMode("wiki");
      history.replaceState(null, "", `?page=${encodeURIComponent(id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }, []);

  const openRun = useCallback(async (id: string) => {
    setBusy(true); setError(null);
    try {
      const run = await portalApi.run(id);
      setSelectedRun(run); setSelectedPage(null); setMode("activity");
      history.replaceState(null, "", `?run=${encodeURIComponent(id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadStats(controller.signal).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
    const params = new URLSearchParams(location.search);
    const pageId = params.get("page"); const runId = params.get("run");
    if (pageId) void openPage(pageId);
    else if (runId) void openRun(runId);
    return () => controller.abort();
  }, [loadStats, openPage, openRun]);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(null);
    const task = mode === "wiki"
      ? portalApi.pages({ query: debouncedQuery, limit: 75 }, controller.signal).then((r) => setPages(r.items))
      : portalApi.runs({ query: debouncedQuery, limit: 75 }, controller.signal).then((r) => setRuns(r.items));
    void task.catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [mode, debouncedQuery, reloadNonce]);

  const selectMode = (next: Mode) => {
    setMode(next); setQuery(""); setSelectedPage(null); setSelectedRun(null); setError(null);
    history.replaceState(null, "", next === "activity" ? "?view=activity" : location.pathname);
  };

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-brand"><div className="portal-mark">G</div><div><strong>Granite</strong><span>Arcwell intelligence</span></div></div>
        <div className="portal-topbar-meta"><ShieldCheck size={14} /><span>{email || "Cloudflare Access"}</span><span className="portal-live-dot" />Live corpus</div>
      </header>
      <aside className="portal-nav">
        <nav>
          <button className={mode === "wiki" ? "is-active" : ""} onClick={() => selectMode("wiki")}><BookOpen size={17} /><span>Wiki</span><small>{stats?.wiki_pages.toLocaleString() ?? "…"}</small></button>
          <button className={mode === "activity" ? "is-active" : ""} onClick={() => selectMode("activity")}><Activity size={17} /><span>Glimmer runs</span><small>{stats?.activity_runs.toLocaleString() ?? "…"}</small></button>
        </nav>
        <div className="portal-nav-note"><ShieldCheck size={16} /><p><strong>Read-only by design</strong>Wiki pages, evidence lineage, prompts and accepted outputs. Private raw patches remain sealed.</p></div>
      </aside>
      <main className="portal-main">
        <section className="portal-dashboard">
          <div><span className="portal-kicker">{mode === "wiki" ? "Knowledge corpus" : "Activity intelligence"}</span><h1>{mode === "wiki" ? "Understand what Arcwell knows." : "See exactly what Glimmer did."}</h1></div>
          <div className="portal-stats">
            <StatCard label="wiki pages" value={(stats?.wiki_pages ?? 0).toLocaleString()} icon={<BookOpen size={17} />} />
            <StatCard label="published summaries" value={(stats?.published_summaries ?? 0).toLocaleString()} icon={<Sparkles size={17} />} />
            <StatCard label="activity events" value={(stats?.activity_events ?? 0).toLocaleString()} icon={<Activity size={17} />} />
          </div>
        </section>
        <section className="portal-browser">
          <aside className="portal-list-pane">
            <div className="portal-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "wiki" ? "Search all wiki content…" : "Search runs and changes…"} /><button aria-label="Refresh" onClick={() => setReloadNonce((value) => value + 1)}><RefreshCw size={14} /></button></div>
            <div className="portal-list-heading"><span>{mode === "wiki" ? "Pages" : "Runs"}</span><small>{mode === "wiki" ? pages.length : runs.length} shown</small></div>
            <div className="portal-list">
              {mode === "wiki" ? pages.map((page) => (
                <button key={page.id} className={selectedPage?.id === page.id ? "is-selected" : ""} onClick={() => void openPage(page.id)}>
                  <div><strong>{page.title}</strong><span>{page.source ?? "wiki"}</span></div><small><Clock3 size={11} /> {relativeDate(page.updated_at)}</small>
                  {page.snippet ? <p>{page.snippet}</p> : null}
                </button>
              )) : runs.map((run) => (
                <button key={run.task_id} className={selectedRun?.run.task_id === run.task_id ? "is-selected" : ""} onClick={() => void openRun(run.task_id)}>
                  <div><strong>{run.title ?? run.task_id}</strong><span className={statusClass(run.status)}>{run.status}</span></div><small><Clock3 size={11} /> {relativeDate(run.done_at ?? run.created_at)}</small>
                  <p>{run.model ?? "Muse Glimmer"} · {run.event_type ?? "activity"}</p>
                </button>
              ))}
              {!busy && (mode === "wiki" ? pages.length === 0 : runs.length === 0) ? <div className="portal-empty-list">No matching records.</div> : null}
            </div>
          </aside>
          <section className="portal-content-pane">
            {error ? <div className="portal-error"><strong>Couldn’t load this view</strong><span>{error}</span></div> : null}
            {busy && !selectedPage && !selectedRun ? <div className="portal-loading"><RefreshCw className="is-spinning" /><span>Reading Arcwell…</span></div> : null}
            {selectedPage ? <WikiReader page={selectedPage} /> : null}
            {selectedRun ? <RunInspector detail={selectedRun} onOpenPage={(id) => void openPage(id)} /> : null}
            {!busy && !selectedPage && !selectedRun && !error ? (
              <div className="portal-welcome"><div>{mode === "wiki" ? <BookOpen size={28} /> : <TerminalSquare size={28} />}</div><h2>{mode === "wiki" ? "Choose a page to read" : "Choose a run to inspect"}</h2><p>{mode === "wiki" ? "Search across every active Arcwell wiki page, then inspect its exact current body and source lineage." : "Open any Pi + Muse task to see its frozen evidence, exact prompt, structured output, validation state, and published page."}</p></div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}
