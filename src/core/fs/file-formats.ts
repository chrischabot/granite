export type NativeFileKind = "markdown" | "canvas" | "base" | "image" | "audio" | "video" | "pdf";

export const NATIVE_FILE_EXTENSIONS: Record<NativeFileKind, ReadonlySet<string>> = {
  markdown: new Set(["md"]),
  canvas: new Set(["canvas"]),
  base: new Set(["base"]),
  image: new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]),
  audio: new Set(["3gp", "flac", "m4a", "mp3", "ogg", "wav"]),
  video: new Set(["mkv", "mov", "mp4", "ogv", "webm"]),
  pdf: new Set(["pdf"]),
};

export function nativeFileKindForExtension(ext: string): NativeFileKind | null {
  const normalized = ext.trim().toLowerCase().replace(/^\./, "");
  for (const [kind, extensions] of Object.entries(NATIVE_FILE_EXTENSIONS)) {
    if (extensions.has(normalized)) return kind as NativeFileKind;
  }
  return null;
}

export function mimeForNativeExtension(ext: string): string {
  switch (ext.trim().toLowerCase().replace(/^\./, "")) {
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "gif":
      return "image/gif";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "3gp":
      return "audio/3gpp";
    case "flac":
      return "audio/flac";
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    case "mkv":
      return "video/x-matroska";
    case "mov":
      return "video/quicktime";
    case "mp4":
      return "video/mp4";
    case "ogv":
      return "video/ogg";
    case "webm":
      return "video/webm";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
