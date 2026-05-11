import { Effect } from "effect";
import { useEffect, useState } from "react";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { noticeManager } from "@core/notices/notice";
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
}

const SAFE_ID_RE = /^[a-z0-9_-]+$/i;

/** Fetch + validate a plugin from a manifest.json URL. Returns the fetched
 *  manifest + main.js text ready to write to disk. Throws on any failure. */
async function fetchPlugin(url: string): Promise<FetchedPlugin> {
  const manifestResp = await fetch(url, { credentials: "omit" });
  if (!manifestResp.ok) {
    throw new Error(`HTTP ${manifestResp.status} while fetching manifest`);
  }
  const manifestText = await manifestResp.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestText);
  } catch {
    throw new Error("Manifest is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Manifest must be a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  const id = typeof obj["id"] === "string" ? obj["id"] : null;
  const name = typeof obj["name"] === "string" ? obj["name"] : null;
  const version = typeof obj["version"] === "string" ? obj["version"] : null;
  if (!id || !name || !version) {
    throw new Error("Manifest must include `id`, `name`, and `version` strings");
  }
  if (!SAFE_ID_RE.test(id)) {
    throw new Error(
      "Plugin `id` may only contain letters, digits, dashes, or underscores",
    );
  }
  const mainName =
    typeof obj["main"] === "string" && obj["main"].trim() ? obj["main"].trim() : "main.js";
  if (mainName.includes("/") || mainName.includes("\\")) {
    throw new Error("Plugin `main` must be a flat filename (no slashes)");
  }
  // Compute sibling URL for main.js.
  const baseUrl = url.replace(/[^/?#]+([?#].*)?$/, "");
  if (!baseUrl) {
    throw new Error("Could not derive base URL from manifest URL");
  }
  const mainUrl = `${baseUrl}${mainName}`;
  const mainResp = await fetch(mainUrl, { credentials: "omit" });
  if (!mainResp.ok) {
    throw new Error(`HTTP ${mainResp.status} while fetching ${mainName}`);
  }
  const mainText = await mainResp.text();
  return {
    manifestText,
    manifest: {
      id,
      name,
      version,
      ...(typeof obj["description"] === "string" ? { description: obj["description"] } : {}),
      ...(typeof obj["author"] === "string" ? { author: obj["author"] } : {}),
      ...(typeof obj["main"] === "string" ? { main: obj["main"] } : {}),
    },
    mainName,
    mainText,
  };
}

async function writePluginToVault(fetched: FetchedPlugin): Promise<void> {
  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      const dir = `.granite/plugins/${fetched.manifest.id}`;
      yield* fs.mkdir(dir);
      yield* fs.writeText(`${dir}/manifest.json`, fetched.manifestText);
      yield* fs.writeText(`${dir}/${fetched.mainName}`, fetched.mainText);
    }),
  );
}

export function InstallPluginModal({ open, onClose }: InstallPluginModalProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "fetching" | "writing" | "done" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<FetchedPlugin | null>(null);

  // Reset state when the modal opens / closes.
  useEffect(() => {
    if (open) {
      setUrl("");
      setStatus("idle");
      setErrorMessage(null);
      setPreview(null);
    }
  }, [open]);

  const onFetch = async () => {
    const u = url.trim();
    if (!u) return;
    setStatus("fetching");
    setErrorMessage(null);
    setPreview(null);
    try {
      const fetched = await fetchPlugin(u);
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
      noticeManager.show(
        `Installed "${preview.manifest.name}". Enable it from Settings → Plugins.`,
        { kind: "success" },
      );
      onClose();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const fetching = status === "fetching";
  const writing = status === "writing";
  const busy = fetching || writing;

  return (
    <Modal open={open} onClose={onClose} title="Install plugin from URL" modifier="mod-narrow">
      <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: "var(--font-ui-small)" }}>
        Paste the URL to a plugin's <code>manifest.json</code>. Granite will fetch
        it and the sibling <code>main.js</code>, then write both into{" "}
        <code>.granite/plugins/&lt;id&gt;</code> in the current vault. Restricted
        mode keeps the plugin disabled until you enable it in Settings.
      </p>
      <p style={{ color: "var(--text-faint)", fontSize: "var(--font-ui-smaller)" }}>
        Tip: <code>raw.githubusercontent.com</code> URLs work because they ship
        CORS headers. Most personal websites do not.
      </p>
      <div style={{ display: "flex", gap: "var(--size-4-2)", marginTop: "var(--size-4-3)" }}>
        <input
          type="text"
          placeholder="https://raw.githubusercontent.com/.../manifest.json"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          style={{ flex: "1 1 auto" }}
          autoFocus
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void onFetch();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void onFetch()}
          disabled={busy || !url.trim()}
        >
          {fetching ? "Fetching…" : "Fetch"}
        </button>
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
            {preview.manifest.author && <> · by {preview.manifest.author}</>}
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
            {(preview.mainText.length / 1024).toFixed(1)} KB of plugin code will be
            written to <code>.granite/plugins/{preview.manifest.id}/</code>
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
          Cancel
        </button>
        <button
          type="button"
          className="mod-cta"
          onClick={() => void onInstall()}
          disabled={busy || !preview}
        >
          {writing ? "Installing…" : "Install"}
        </button>
      </div>
    </Modal>
  );
}