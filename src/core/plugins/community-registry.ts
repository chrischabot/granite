import { t } from "@core/i18n";

export const DEFAULT_COMMUNITY_PLUGIN_REGISTRY_URL =
  "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";

export interface CommunityPluginRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly author: string;
  readonly description: string;
  readonly repo: string;
}

export interface CommunityPluginInstallUrls {
  readonly manifestUrl: string;
  readonly mainUrl: string;
  readonly stylesUrl: string;
  readonly updateManifestUrl: string;
}

interface CommunityPluginRegistryJsonEntry {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly author?: unknown;
  readonly description?: unknown;
  readonly repo?: unknown;
}

const SAFE_ID_RE = /^[a-z0-9_-]+$/i;
const SAFE_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseCommunityPluginRegistry(jsonText: string): CommunityPluginRegistryEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(t("plugin.communityRegistry.error.invalidJson"));
  }
  if (!Array.isArray(parsed)) {
    throw new Error(t("plugin.communityRegistry.error.array"));
  }

  const entries: CommunityPluginRegistryEntry[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const obj = raw as CommunityPluginRegistryJsonEntry;
    const id = nonEmptyString(obj.id);
    const name = nonEmptyString(obj.name);
    const author = nonEmptyString(obj.author);
    const description = nonEmptyString(obj.description);
    const repo = nonEmptyString(obj.repo);
    if (!id || !name || !author || !description || !repo) continue;
    if (!SAFE_ID_RE.test(id) || !SAFE_REPO_RE.test(repo)) continue;
    entries.push({ id, name, author, description, repo });
  }
  return entries;
}

export async function fetchCommunityPluginRegistry(options?: {
  readonly registryUrl?: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<CommunityPluginRegistryEntry[]> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const url = options?.registryUrl ?? DEFAULT_COMMUNITY_PLUGIN_REGISTRY_URL;
  const response = await fetchImpl(url, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(
      t("plugin.communityRegistry.error.http", {
        status: response.status,
      }),
    );
  }
  return parseCommunityPluginRegistry(await response.text());
}

export function searchCommunityPluginRegistry(
  entries: ReadonlyArray<CommunityPluginRegistryEntry>,
  query: string,
  limit = 50,
): CommunityPluginRegistryEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  const haystack = needle
    ? entries.filter((entry) =>
        [entry.name, entry.id, entry.author, entry.description, entry.repo]
          .join("\n")
          .toLocaleLowerCase()
          .includes(needle),
      )
    : entries;
  return haystack.slice(0, Math.max(0, limit));
}

export function getCommunityPluginManifestUrl(entry: CommunityPluginRegistryEntry): string {
  return `https://raw.githubusercontent.com/${entry.repo}/master/manifest.json`;
}

export function getCommunityPluginInstallUrls(
  entry: CommunityPluginRegistryEntry,
  version: string,
): CommunityPluginInstallUrls {
  const tag = encodeURIComponent(version.trim());
  const releaseBase = `https://github.com/${entry.repo}/releases/download/${tag}`;
  return {
    manifestUrl: `${releaseBase}/manifest.json`,
    mainUrl: `${releaseBase}/main.js`,
    stylesUrl: `${releaseBase}/styles.css`,
    updateManifestUrl: getCommunityPluginManifestUrl(entry),
  };
}
