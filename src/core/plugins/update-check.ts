import { t } from "@core/i18n";
import { noticeManager } from "@core/notices/notice";
import { listPlugins } from "./loader";

interface ManifestRemote {
  version?: string;
  minAppVersion?: string;
}

/**
 * Compare two semver-like version strings. Returns -1, 0, or 1.
 * Splits on `.` `+` and `-` so `1.0.0-beta.2` parses sensibly. Missing
 * trailing parts are treated as zero.
 */
export function compareVersions(a: string, b: string): number {
  const aa = a.split(/[.+-]/).map((p) => Number.parseInt(p, 10) || 0);
  const bb = b.split(/[.+-]/).map((p) => Number.parseInt(p, 10) || 0);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const ai = aa[i] ?? 0;
    const bi = bb[i] ?? 0;
    if (ai !== bi) return ai < bi ? -1 : 1;
  }
  return 0;
}

export interface UpdateCheckOptions {
  /** Granite app version compared against each manifest's `minAppVersion`. */
  readonly appVersion: string;
  /** Per-plugin manifest URL provider. Plugins whose URL is null are skipped. */
  readonly manifestUrlFor?: (pluginId: string, currentVersion: string) => string | null;
  /** Optional fetch override (tests inject a fake). */
  readonly fetchImpl?: typeof fetch;
}

export interface UpdateCheckResult {
  readonly pluginId: string;
  readonly currentVersion: string;
  readonly latestVersion: string | null;
  readonly minAppVersion: string | null;
  readonly hasUpdate: boolean;
  readonly minAppVersionFailed: boolean;
}

/** Check every installed plugin against its remote manifest URL. */
export async function checkAllPluginUpdates(
  options: UpdateCheckOptions,
): Promise<ReadonlyArray<UpdateCheckResult>> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const out: UpdateCheckResult[] = [];
  for (const plugin of listPlugins()) {
    const url =
      options.manifestUrlFor?.(plugin.manifest.id, plugin.manifest.version) ??
      plugin.manifest.manifestUrl ??
      null;
    if (!url) continue;
    try {
      const r = await fetchImpl(url, { credentials: "omit" });
      if (!r.ok) continue;
      const text = await r.text();
      const remote = JSON.parse(text) as ManifestRemote;
      const latest = typeof remote.version === "string" ? remote.version : null;
      const minApp = typeof remote.minAppVersion === "string" ? remote.minAppVersion : null;
      const hasUpdate = !!latest && compareVersions(plugin.manifest.version, latest) < 0;
      const minAppVersionFailed = !!minApp && compareVersions(options.appVersion, minApp) < 0;
      out.push({
        pluginId: plugin.manifest.id,
        currentVersion: plugin.manifest.version,
        latestVersion: latest,
        minAppVersion: minApp,
        hasUpdate,
        minAppVersionFailed,
      });
    } catch {
      /* swallow individual failures */
    }
  }
  return out;
}

/** Run the update check and surface notices summarising the outcome. */
export async function showUpdateCheckNotices(options: UpdateCheckOptions): Promise<void> {
  const results = await checkAllPluginUpdates(options);
  const updates = results.filter((r) => r.hasUpdate);
  const incompat = results.filter((r) => r.minAppVersionFailed);

  for (const r of incompat) {
    noticeManager.show(
      t("plugin.update.incompatible", {
        pluginId: r.pluginId,
        minAppVersion: r.minAppVersion ?? "",
        appVersion: options.appVersion,
      }),
      { kind: "warning", timeoutMs: 0 },
    );
  }

  if (updates.length === 0) {
    if (results.length > 0) {
      noticeManager.show(t("plugin.update.allUpToDate"), { kind: "success" });
    } else {
      noticeManager.show(t("plugin.update.noRemoteManifests"), {
        kind: "info",
      });
    }
    return;
  }

  if (updates.length === 1) {
    const u = updates[0];
    if (!u) return;
    noticeManager.show(
      t("plugin.update.oneAvailable", {
        pluginId: u.pluginId,
        latestVersion: u.latestVersion ?? "",
      }),
      {
        kind: "info",
        timeoutMs: 0,
      },
    );
  } else {
    noticeManager.show(t("plugin.update.manyAvailable", { count: String(updates.length) }), {
      kind: "info",
      timeoutMs: 0,
    });
  }
}
