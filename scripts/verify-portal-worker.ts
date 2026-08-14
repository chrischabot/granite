import assert from "node:assert/strict";
import worker from "../worker/index.ts";

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

const keys = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
publicJwk.kid = "portal-test-key";
publicJwk.alg = "RS256";
publicJwk.use = "sig";

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  if (String(input) === "https://granite-test.cloudflareaccess.com/cdn-cgi/access/certs") {
    return Response.json({ keys: [publicJwk] });
  }
  throw new Error(`unexpected fetch: ${String(input)}`);
}) as typeof fetch;

async function token(email = "chabotc@gmail.com"): Promise<string> {
  const header = base64Url(JSON.stringify({ alg: "RS256", kid: "portal-test-key", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    aud: ["portal-audience"],
    iss: "https://granite-test.cloudflareaccess.com",
    email,
    exp: Math.floor(Date.now() / 1000) + 300,
  }));
  const signed = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, signed);
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

const page = {
  id: "activity-history-openai-codex-2026-02-11-to-2026-08-12",
  title: "OpenAI Codex activity history",
  source: "activity-intelligence",
  version: 1,
  updated_at: "2026-08-12T00:00:00.000Z",
  created_at: "2026-08-12T00:00:00.000Z",
  content_sha256: "a".repeat(64),
  r2_key: "versions/history/1.md",
};
const task = {
  task_id: "activity:evt-1:abc:activity-v1",
  status: "done",
  attempts: 1,
  max_attempts: 3,
  created_at: "2026-08-12T00:00:00.000Z",
  done_at: "2026-08-12T00:01:00.000Z",
  last_error: null,
  leased_by: "activity-drain:test",
  requires_capability: "local.muse_glimmer",
  payload_json: JSON.stringify({ event_id: "evt-1", prompt_version: "activity-v1", evidence_packet: { evidence: [{ id: "release-body" }] } }),
  result_json: JSON.stringify({ headline: "Codex changed" }),
};
const summary = {
  id: "summary-1",
  event_id: "evt-1",
  task_id: task.task_id,
  model: "muse-glimmer-30B-kquant-dynamic",
  harness: "pi",
  prompt_version: "activity-v1",
  summary_json: JSON.stringify({ headline: "Codex changed" }),
  quality_json: "{}",
  wiki_page_id: page.id,
};
const event = { id: "evt-1", source_id: "source-1", event_type: "github_release", title: "Codex 1.0", occurred_at: "2026-08-11T00:00:00.000Z", actor_json: "{}", evidence_manifest_json: "{}" };

class Statement {
  #args: unknown[] = [];
  constructor(readonly sql: string) {}
  bind(...args: unknown[]) { this.#args = args; return this; }
  async first() {
    if (this.sql.includes("SELECT\n      (SELECT count")) return { wiki_pages: 9141, wiki_sources: 12, activity_events: 57, activity_runs: 57, published_summaries: 57, latest_publication: "2026-08-13T00:00:00.000Z" };
    if (this.sql.includes("FROM wiki_pages WHERE id=?")) return page;
    if (this.sql.includes("FROM mind_tasks WHERE id=?")) return task;
    if (this.sql.includes("FROM activity_events WHERE id=?")) return event;
    if (this.sql.includes("FROM activity_summaries WHERE task_id=?")) return summary;
    if (this.sql.includes("FROM activity_sources WHERE id=?")) return { id: "source-1", kind: "github", locator: "openai/codex", scope: "ecosystem", cursor_json: "{}", config_json: "{}" };
    return null;
  }
  async all() {
    if (this.sql.includes("FROM wiki_pages WHERE status='active'")) return { results: [{ ...page, snippet: null }] };
    if (this.sql.includes("FROM wiki_page_source_cards")) return { results: [{ id: "src-1", title: "Codex release", url: "https://github.com/openai/codex", provider: "github" }] };
    if (this.sql.includes("FROM wiki_page_versions")) return { results: [{ version: 1, content_sha256: page.content_sha256, created_at: page.created_at, author: "activity-intelligence" }] };
    if (this.sql.includes("FROM mind_tasks mt")) return { results: [{ ...task, model: summary.model, harness: summary.harness, prompt_version: summary.prompt_version, event_id: event.id, event_type: event.event_type, title: event.title, occurred_at: event.occurred_at, wiki_page_id: page.id }] };
    if (this.sql.includes("FROM activity_observations")) return { results: [{ id: "obs-1", event_id: event.id, observation_kind: "github_release" }] };
    if (this.sql.includes("FROM audit_log")) return { results: [{ id: "audit-1", action: "activity_summary_accept", subject: summary.id, meta: "{}" }] };
    return { results: [] };
  }
}

const env = {
  DB: { prepare: (sql: string) => new Statement(sql) },
  WIKI: { get: async (key: string) => key === page.r2_key ? { text: async () => "# OpenAI Codex\n\nSix months of changes." } : null },
  ASSETS: { fetch: async () => new Response("asset") },
  ACCESS_TEAM_DOMAIN: "granite-test.cloudflareaccess.com",
  ACCESS_AUD: "portal-audience",
  ACCESS_ALLOWED_EMAILS: "chabotc@gmail.com",
};

const auth = { "cf-access-jwt-assertion": await token() };
const call = (path: string, init: RequestInit = {}) => worker.fetch(new Request(`https://wiki.chabot.dev${path}`, { ...init, headers: { ...auth, ...(init.headers ?? {}) } }), env as never);

try {
  const unauthenticated = await worker.fetch(new Request("https://wiki.chabot.dev/api/session"), env as never);
  assert.equal(unauthenticated.status, 403);

  const wrongIdentity = await worker.fetch(new Request("https://wiki.chabot.dev/api/session", { headers: { "cf-access-jwt-assertion": await token("attacker@example.com") } }), env as never);
  assert.equal(wrongIdentity.status, 403);

  const session = await call("/api/session");
  assert.equal(session.status, 200);
  assert.equal((await session.json()).email, "chabotc@gmail.com");

  const stats = await call("/api/stats");
  assert.equal((await stats.json()).wiki_pages, 9141);

  const pages = await call("/api/wiki?limit=2");
  assert.equal((await pages.json()).items[0].id, page.id);

  const detail = await call(`/api/wiki/${page.id}`);
  const detailJson = await detail.json();
  assert.match(detailJson.body, /Six months/);
  assert.equal(detailJson.source_cards.length, 1);

  const runs = await call("/api/activity/runs?limit=2");
  assert.equal((await runs.json()).items[0].task_id, task.task_id);

  const run = await call(`/api/activity/runs/${encodeURIComponent(task.task_id)}`);
  const runJson = await run.json();
  assert.match(runJson.prompt.system, /evidence-bound engineering change analyst/);
  assert.equal(runJson.model_output.headline, "Codex changed");
  assert.equal(runJson.transcript.available, false);

  const mutation = await call("/api/wiki", { method: "POST" });
  assert.equal(mutation.status, 405);
  console.log("Granite portal worker verification: 9 checks passed");
} finally {
  globalThis.fetch = originalFetch;
}
