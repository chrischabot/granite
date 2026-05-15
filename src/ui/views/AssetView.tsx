import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import type { NativeFileKind } from "@core/fs/file-formats";
import { mimeForNativeExtension } from "@core/fs/file-formats";
import { extension } from "@core/fs/path";
import type { VaultPath } from "@core/fs/types";
import { Effect } from "effect";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { AudioView } from "./asset/AudioView";
import { ImageView } from "./asset/ImageView";
import { PdfView } from "./asset/PdfView";
import { VideoView } from "./asset/VideoView";

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

  switch (kind) {
    case "image":
      return <ImageView path={path} url={url} />;
    case "audio":
      return <AudioView url={url} />;
    case "video":
      return <VideoView url={url} />;
    case "pdf":
      return <PdfView url={url} title={path} />;
    default:
      // Markdown/canvas/base have dedicated views; never routed through AssetView.
      return <div className="empty-state">{path}</div>;
  }
}
