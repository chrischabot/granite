import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { join, normalize } from "@core/fs/path";
import { settingsStore } from "@core/settings/store";

const PAD2 = (n: number) => n.toString().padStart(2, "0");

function timestampPart(): string {
  const d = new Date();
  return (
    d.getFullYear().toString() +
    PAD2(d.getMonth() + 1) +
    PAD2(d.getDate()) +
    PAD2(d.getHours()) +
    PAD2(d.getMinutes()) +
    PAD2(d.getSeconds())
  );
}

/** Map a MIME type to a sensible file extension. Pure helper exposed for tests. */
export function defaultExtensionFor(mime: string): string {
  const m = mime.toLowerCase();
  if (m.startsWith("image/png")) return "png";
  if (m.startsWith("image/jpeg") || m.startsWith("image/jpg")) return "jpg";
  if (m.startsWith("image/gif")) return "gif";
  if (m.startsWith("image/webp")) return "webp";
  if (m.startsWith("image/avif")) return "avif";
  if (m.startsWith("image/svg")) return "svg";
  if (m.startsWith("audio/wav")) return "wav";
  if (m.startsWith("audio/mpeg")) return "mp3";
  if (m.startsWith("audio/ogg")) return "ogg";
  if (m.startsWith("video/mp4")) return "mp4";
  if (m.startsWith("video/webm")) return "webm";
  if (m === "application/pdf") return "pdf";
  return "bin";
}

/** Extract the extension from a filename hint, falling back to the MIME default. */
export function extensionFromHint(hint: string | undefined, mime: string): string {
  const m = hint?.match(/\.([a-zA-Z0-9]{1,8})$/);
  return m ? m[1]!.toLowerCase() : defaultExtensionFor(mime);
}

/**
 * Save a binary attachment to the configured attachments folder. Performs an
 * explicit `fs.stat` check before writing and retries with `-N` suffixes
 * until an unused path is found. Returns the vault-relative path of the
 * saved file. The file name is derived from a timestamp + 4-char random
 * suffix; the existing extension on `nameHint` (if any) wins, otherwise the
 * MIME type drives the extension.
 */
export async function saveAttachment(
  bytes: Uint8Array,
  mime: string,
  nameHint?: string,
): Promise<string> {
  const folder = normalize(settingsStore.getState().attachmentsFolder);
  const ext = extensionFromHint(nameHint, mime);
  const buf = new Uint8Array(2);
  crypto.getRandomValues(buf);
  const suffix = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
  const baseName = `paste-${timestampPart()}-${suffix}`;

  // Find an unused name. Stat each candidate; if missing, use it. Cap the
  // retry loop to keep this bounded in pathological collision scenarios.
  let chosen: string | null = null;
  for (let i = 0; i < 64; i++) {
    const candidateName = i === 0 ? `${baseName}.${ext}` : `${baseName}-${i}.${ext}`;
    const candidatePath = folder ? join(folder, candidateName) : candidateName;
    const taken = await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const stat = yield* fs.stat(candidatePath);
        return stat !== null;
      }),
    ).catch(() => false);
    if (!taken) {
      chosen = candidatePath;
      break;
    }
  }
  if (!chosen) {
    // 64 collisions is genuinely surprising; fall back to a wholly-new random
    // suffix rather than overwriting.
    crypto.getRandomValues(buf);
    const altSuffix = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
    const altName = `paste-${timestampPart()}-${altSuffix}-${Date.now()}.${ext}`;
    chosen = folder ? join(folder, altName) : altName;
  }

  await run(
    Effect.gen(function* () {
      const fs = yield* FileSystem;
      if (folder) yield* fs.mkdir(folder);
      yield* fs.writeBytes(chosen!, bytes);
    }),
  );
  return chosen;
}

/** Decide if a MIME type is supported as an inline attachment we know how to render. */
export function isSupportedAttachmentMime(mime: string): boolean {
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("audio/")) return true;
  if (mime.startsWith("video/")) return true;
  if (mime === "application/pdf") return true;
  return false;
}