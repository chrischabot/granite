import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import type { NativeFileKind } from "@core/fs/file-formats";
import { mimeForNativeExtension } from "@core/fs/file-formats";
import { extension } from "@core/fs/path";
import type { VaultPath } from "@core/fs/types";
import { Effect } from "effect";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/useI18n";

export function AssetView({ path, kind }: { path: VaultPath; kind: NativeFileKind }) {
  const t = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    void run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        return yield* fs.readBytes(path);
      }),
    )
      .then((bytes) => {
        if (cancelled) return;
        const blob = new Blob([bytes as unknown as BlobPart], {
          type: mimeForNativeExtension(extension(path)),
        });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (error) return <div className="empty-state">{error}</div>;
  if (!url) return <div className="empty-state">{t("asset.loading")}</div>;

  if (kind === "image") {
    return (
      <div className="asset-view mod-image">
        <img src={url} alt={path} />
      </div>
    );
  }
  if (kind === "audio") {
    return (
      <div className="asset-view mod-audio">
        {/* biome-ignore lint/a11y/useMediaCaption: Vault audio files do not necessarily ship caption tracks. */}
        <audio src={url} controls />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className="asset-view mod-video">
        {/* biome-ignore lint/a11y/useMediaCaption: Vault video files do not necessarily ship caption tracks. */}
        <video src={url} controls />
      </div>
    );
  }
  return (
    <div className="asset-view mod-pdf">
      <iframe src={url} title={path} />
    </div>
  );
}
