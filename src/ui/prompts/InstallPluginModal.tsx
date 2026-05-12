import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { noticeManager } from "@core/notices/notice";
import {
  type CommunityPluginRegistryEntry,
  fetchCommunityPluginRegistry,
  getCommunityPluginInstallUrls,
  getCommunityPluginManifestUrl,
  searchCommunityPluginRegistry,
} from "@core/plugins/community-registry";
import { Effect } from "effect";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { Modal } from "../overlay/Modal";

export interface InstallPluginModalProps {
  open: boolean;
  onClose: () => void;
}

interface FetchedPlugin {
  manifestText: string;
  manifest: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    main?: string;
  };
  mainName: string;
  mainText: string;
  stylesText?: string;
}

interface PluginManifestJson {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  description?: unknown;
  author?: unknown;
  main?: unknown;
  manifestUrl?: unknown;
}

const SAFE_ID_RE = /^[a-z0-9_-]+$/i;
type Translate = (key: string, params?: Record<string, string | number>) => string;

function parseManifest(manifestText: string, t: Translate): FetchedPlugin["manifest"] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch {
    throw new Error(t("installPlugin.error.invalidJson"));
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(t("installPlugin.error.manifestObject"));
  }
  const obj = parsed as PluginManifestJson;
  const id = typeof obj.id === "string" ? obj.id : null;
  const name = typeof obj.name === "string" ? obj.name : null;
  const version = typeof obj.version === "string" ? obj.version : null;
  if (!id || !name || !version) {
    throw new Error(t("installPlugin.error.requiredFields"));
  }
  if (!SAFE_ID_RE.test(id)) {
    throw new Error(t("installPlugin.error.invalidId"));
  }
  return {
    id,
    name,
    version,
    ...(typeof obj.description === "string" ? { description: obj.description } : {}),
    ...(typeof obj.author === "string" ? { author: obj.author } : {}),
    ...(typeof obj.main === "string" ? { main: obj.main } : {}),
  };
}

function siblingUrl(url: string, filename: string, t: Translate): string {
  const baseUrl = url.replace(/[^/?#]+([?#].*)?$/, "");
  if (!baseUrl) {
    throw new Error(t("installPlugin.error.baseUrl"));
  }
  return `${baseUrl}${filename}`;
}

function addManifestUrl(manifestText: string, manifestUrl: string): string {
  const parsed = JSON.parse(manifestText) as PluginManifestJson;
  if (parsed.manifestUrl === manifestUrl) return manifestText;
  return `${JSON.stringify({ ...parsed, manifestUrl }, null, 2)}\n`;
}

async function fetchText(url: string, label: string, t: Translate): Promise<string> {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(t("installPlugin.error.http", { status: response.status, label }));
  }
  return response.text();
}

async function fetchOptionalText(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) return undefined;
    return response.text();
  } catch {
    return undefined;
  }
}

async function fetchPluginAssets(options: {
  readonly manifestUrl: string;
  readonly mainUrl?: string;
  readonly stylesUrl?: string;
  readonly updateManifestUrl?: string;
  readonly t: Translate;
}): Promise<FetchedPlugin> {
  const rawManifestText = await fetchText(
    options.manifestUrl,
    options.t("installPlugin.asset.manifest"),
    options.t,
  );
  const manifest = parseManifest(rawManifestText, options.t);
  const mainName =
    typeof manifest.main === "string" && manifest.main.trim() ? manifest.main.trim() : "main.js";
  if (mainName.includes("/") || mainName.includes("\\")) {
    throw new Error(options.t("installPlugin.error.invalidMain"));
  }
  const mainText = await fetchText(
    options.mainUrl ?? siblingUrl(options.manifestUrl, mainName, options.t),
    mainName,
    options.t,
  );
  const stylesText = await fetchOptionalText(
    options.stylesUrl ?? siblingUrl(options.manifestUrl, "styles.css", options.t),
  );
  return {
    manifestText: options.updateManifestUrl
      ? addManifestUrl(rawManifestText, options.updateManifestUrl)
      : rawManifestText,
    manifest,
    mainName,
    mainText,
    ...(stylesText ? { stylesText } : {}),
  };
}

/** Fetch + validate a plugin from a manifest.json URL. Returns the fetched
 *  manifest + main.js text ready to write to disk. Throws on any failure. */
async function fetchPlugin(url: string, t: Translate): Promise<FetchedPlugin> {
  return fetchPluginAssets({ manifestUrl: url, t });
}

async function fetchPluginFromRegistry(
  entry: CommunityPluginRegistryEntry,
  t: Translate,
): Promise<FetchedPlugin> {
  const updateManifestUrl = getCommunityPluginManifestUrl(entry);
  const latestManifestText = await fetchText(
    updateManifestUrl,
    t("installPlugin.asset.communityManifest"),
    t,
  );
  const latestManifest = parseManifest(latestManifestText, t);
  if (latestManifest.id !== entry.id) {
    throw new Error(
      t("installPlugin.error.registryMismatch", {
        entryId: entry.id,
        manifestId: latestManifest.id,
      }),
    );
  }
  const urls = getCommunityPluginInstallUrls(entry, latestManifest.version);
  return fetchPluginAssets({
    manifestUrl: urls.manifestUrl,
    mainUrl: urls.mainUrl,
    stylesUrl: urls.stylesUrl,
    updateManifestUrl: urls.updateManifestUrl,
    t,
  });
}

async function writePluginToVault(fetched: FetchedPlugin): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const dir = `.granite/plugins/${fetched.manifest.id}`;
      yield* fs.mkdir(dir);
      yield* fs.writeText(`${dir}/manifest.json`, fetched.manifestText);
      yield* fs.writeText(`${dir}/${fetched.mainName}`, fetched.mainText);
      if (fetched.stylesText) {
        yield* fs.writeText(`${dir}/styles.css`, fetched.stylesText);
      }
    }),
  );
}

export function InstallPluginModal({ open, onClose }: InstallPluginModalProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "fetching" | "writing" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<FetchedPlugin | null>(null);
  const [registry, setRegistry] = useState<CommunityPluginRegistryEntry[]>([]);
  const [registryQuery, setRegistryQuery] = useState("");
  const [registryStatus, setRegistryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [registryError, setRegistryError] = useState<string | null>(null);
  const t = useI18n();
  const registryResults = useMemo(
    () => searchCommunityPluginRegistry(registry, registryQuery, 12),
    [registry, registryQuery],
  );

  // Reset state when the modal opens / closes.
  useEffect(() => {
    if (open) {
      setUrl("");
      setStatus("idle");
      setErrorMessage(null);
      setPreview(null);
      setRegistryQuery("");
      setRegistryError(null);
      setRegistryStatus("loading");
      void fetchCommunityPluginRegistry()
        .then((entries) => {
          setRegistry(entries);
          setRegistryStatus("idle");
        })
        .catch((err) => {
          setRegistry([]);
          setRegistryStatus("error");
          setRegistryError(err instanceof Error ? err.message : String(err));
        });
    }
  }, [open]);

  const onFetch = async () => {
    const u = url.trim();
    if (!u) return;
    setStatus("fetching");
    setErrorMessage(null);
    setPreview(null);
    try {
      const fetched = await fetchPlugin(u, t);
      setPreview(fetched);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const onInstall = async () => {
    if (!preview) return;
    setStatus("writing");
    setErrorMessage(null);
    try {
      await writePluginToVault(preview);
      setStatus("done");
      noticeManager.show(t("installPlugin.notice.installed", { name: preview.manifest.name }), {
        kind: "success",
      });
      onClose();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const onFetchRegistryPlugin = async (entry: CommunityPluginRegistryEntry) => {
    setStatus("fetching");
    setErrorMessage(null);
    setPreview(null);
    setUrl(getCommunityPluginManifestUrl(entry));
    try {
      const fetched = await fetchPluginFromRegistry(entry, t);
      setPreview(fetched);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const fetching = status === "fetching";
  const writing = status === "writing";
  const busy = fetching || writing;

  return (
    <Modal open={open} onClose={onClose} title={t("installPlugin.title")} modifier="mod-narrow">
      <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: "var(--font-ui-small)" }}>
        {t("installPlugin.description.beforeManifest")} <code>manifest.json</code>{" "}
        {t("installPlugin.description.afterManifest")} <code>.granite/plugins/&lt;id&gt;</code>{" "}
        {t("installPlugin.description.afterPath")}
      </p>
      <div style={{ marginTop: "var(--size-4-3)" }}>
        <input
          type="search"
          placeholder={t("installPlugin.searchPlaceholder")}
          value={registryQuery}
          onChange={(e) => setRegistryQuery(e.currentTarget.value)}
          style={{ width: "100%" }}
          disabled={busy || registryStatus === "loading"}
        />
        {registryStatus === "loading" && (
          <div style={{ color: "var(--text-faint)", marginTop: "var(--size-4-2)" }}>
            {t("installPlugin.registry.loading")}
          </div>
        )}
        {registryError && (
          <div className="message mod-error" style={{ marginTop: "var(--size-4-2)" }}>
            {registryError}
          </div>
        )}
        {registryResults.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: "var(--size-4-2)",
              marginTop: "var(--size-4-2)",
              maxHeight: 260,
              overflowY: "auto",
            }}
          >
            {registryResults.map((entry) => (
              <button
                type="button"
                key={entry.id}
                onClick={() => void onFetchRegistryPlugin(entry)}
                disabled={busy}
                style={{
                  display: "block",
                  textAlign: "left",
                  height: "auto",
                  padding: "var(--size-4-2)",
                  whiteSpace: "normal",
                }}
              >
                <span style={{ display: "block", fontWeight: "var(--font-semibold)" }}>
                  {entry.name}
                  <span style={{ color: "var(--text-faint)", fontWeight: "var(--font-normal)" }}>
                    {" "}
                    · {entry.author}
                  </span>
                </span>
                <span
                  style={{
                    display: "block",
                    color: "var(--text-muted)",
                    fontSize: "var(--font-ui-small)",
                    marginTop: "var(--size-2-1)",
                  }}
                >
                  {entry.description}
                </span>
                <code
                  style={{
                    display: "block",
                    color: "var(--text-faint)",
                    fontSize: "var(--font-ui-smaller)",
                    marginTop: "var(--size-2-1)",
                  }}
                >
                  {entry.id}
                </code>
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--background-modifier-border)",
          marginTop: "var(--size-4-4)",
          paddingTop: "var(--size-4-3)",
        }}
      >
        <div style={{ color: "var(--text-faint)", fontSize: "var(--font-ui-smaller)" }}>
          {t("installPlugin.manualUrl")}
        </div>
        <div style={{ display: "flex", gap: "var(--size-4-2)", marginTop: "var(--size-4-3)" }}>
          <input
            type="text"
            placeholder="https://raw.githubusercontent.com/.../manifest.json"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            style={{ flex: "1 1 auto" }}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onFetch();
              }
            }}
          />
          <button type="button" onClick={() => void onFetch()} disabled={busy || !url.trim()}>
            {fetching ? t("installPlugin.fetching") : t("installPlugin.fetch")}
          </button>
        </div>
      </div>
      {errorMessage && (
        <div className="message mod-error" style={{ marginTop: "var(--size-4-2)" }}>
          {errorMessage}
        </div>
      )}
      {preview && (
        <div
          style={{
            marginTop: "var(--size-4-3)",
            padding: "var(--size-4-3)",
            background: "var(--background-primary-alt)",
            border: "1px solid var(--background-modifier-border)",
            borderRadius: "var(--radius-m)",
          }}
        >
          <div
            style={{
              fontSize: "var(--font-ui-medium)",
              fontWeight: "var(--font-semibold)",
              color: "var(--text-normal)",
            }}
          >
            {preview.manifest.name}{" "}
            <span style={{ color: "var(--text-faint)", fontWeight: "var(--font-normal)" }}>
              v{preview.manifest.version}
            </span>
          </div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "var(--font-ui-small)",
              marginTop: "var(--size-2-2)",
            }}
          >
            <code>{preview.manifest.id}</code>
            {preview.manifest.author && (
              <> · {t("installPlugin.byAuthor", { author: preview.manifest.author })}</>
            )}
          </div>
          {preview.manifest.description && (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "var(--font-ui-small)",
                marginTop: "var(--size-4-2)",
              }}
            >
              {preview.manifest.description}
            </div>
          )}
          <div
            style={{
              color: "var(--text-faint)",
              fontSize: "var(--font-ui-smaller)",
              marginTop: "var(--size-4-2)",
            }}
          >
            {t("installPlugin.codeSize", {
              kb: (preview.mainText.length / 1024).toFixed(1),
            })}{" "}
            <code>.granite/plugins/{preview.manifest.id}/</code>
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: "var(--size-4-2)",
          marginTop: "var(--size-4-4)",
          justifyContent: "flex-end",
        }}
      >
        <button type="button" onClick={onClose} disabled={busy}>
          {t("installPlugin.cancel")}
        </button>
        <button
          type="button"
          className="mod-cta"
          onClick={() => void onInstall()}
          disabled={busy || !preview}
        >
          {writing ? t("installPlugin.installing") : t("installPlugin.install")}
        </button>
      </div>
    </Modal>
  );
}
