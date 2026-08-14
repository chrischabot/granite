export interface PortalStats {
  readonly wiki_pages: number;
  readonly wiki_sources: number;
  readonly activity_events: number;
  readonly activity_runs: number;
  readonly published_summaries: number;
  readonly latest_publication: string | null;
}

export interface WikiPageSummary {
  readonly id: string;
  readonly title: string;
  readonly source: string | null;
  readonly version: number;
  readonly updated_at: string;
  readonly snippet: string | null;
}

export interface SourceCard {
  readonly id: string;
  readonly title: string | null;
  readonly url: string | null;
  readonly source_type: string | null;
  readonly provider: string | null;
  readonly summary: string | null;
  readonly retrieved_at: string | null;
}

export interface WikiPageDetail extends WikiPageSummary {
  readonly body: string;
  readonly content_sha256: string;
  readonly created_at: string;
  readonly source_cards: ReadonlyArray<SourceCard>;
  readonly versions: ReadonlyArray<{
    readonly version: number;
    readonly content_sha256: string;
    readonly created_at: string;
    readonly author: string | null;
  }>;
}

export interface ActivityRunSummary {
  readonly task_id: string;
  readonly status: string;
  readonly attempts: number;
  readonly created_at: string;
  readonly done_at: string | null;
  readonly model: string | null;
  readonly harness: string | null;
  readonly prompt_version: string | null;
  readonly event_id: string | null;
  readonly event_type: string | null;
  readonly title: string | null;
  readonly occurred_at: string | null;
  readonly wiki_page_id: string | null;
}

export interface ActivityRunDetail {
  readonly run: ActivityRunSummary & Record<string, unknown>;
  readonly source: Record<string, unknown> | null;
  readonly event: Record<string, unknown> | null;
  readonly summary: Record<string, unknown> | null;
  readonly observations: ReadonlyArray<Record<string, unknown>>;
  readonly audit: ReadonlyArray<Record<string, unknown>>;
  readonly prompt: {
    readonly version: string;
    readonly system: string;
    readonly user: string;
    readonly invocation: ReadonlyArray<string>;
  };
  readonly evidence_packet: unknown;
  readonly model_output: unknown;
  readonly transcript: {
    readonly available: boolean;
    readonly note: string;
  };
}

interface ListResponse<T> {
  readonly items: ReadonlyArray<T>;
  readonly next_cursor: string | null;
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
    credentials: "same-origin",
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const portalApi = {
  session: (signal?: AbortSignal) =>
    requestJson<{ email: string; authenticated: true }>("/api/session", signal),
  stats: (signal?: AbortSignal) => requestJson<PortalStats>("/api/stats", signal),
  pages: (input: { query?: string; source?: string; cursor?: string; limit?: number }, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (input.query) params.set("q", input.query);
    if (input.source) params.set("source", input.source);
    if (input.cursor) params.set("cursor", input.cursor);
    params.set("limit", String(input.limit ?? 50));
    return requestJson<ListResponse<WikiPageSummary>>(`/api/wiki?${params}`, signal);
  },
  page: (id: string, signal?: AbortSignal) =>
    requestJson<WikiPageDetail>(`/api/wiki/${encodeURIComponent(id)}`, signal),
  runs: (input: { query?: string; status?: string; cursor?: string; limit?: number }, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (input.query) params.set("q", input.query);
    if (input.status) params.set("status", input.status);
    if (input.cursor) params.set("cursor", input.cursor);
    params.set("limit", String(input.limit ?? 50));
    return requestJson<ListResponse<ActivityRunSummary>>(`/api/activity/runs?${params}`, signal);
  },
  run: (id: string, signal?: AbortSignal) =>
    requestJson<ActivityRunDetail>(`/api/activity/runs/${encodeURIComponent(id)}`, signal),
};
