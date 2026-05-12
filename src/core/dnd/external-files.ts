import { join, normalize } from "@core/fs/path";
import type { VaultEntry, VaultPath } from "@core/fs/types";

export interface ExternalFileLike {
  readonly name: string;
  readonly type?: string;
  readonly path?: string;
  readonly webkitRelativePath?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface DropModifierState {
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
}

export interface ImportExternalFileDeps {
  mkdir(path: VaultPath): Promise<void>;
  stat(path: VaultPath): Promise<VaultEntry | null>;
  writeBytes(path: VaultPath, bytes: Uint8Array): Promise<void>;
}

const ILLEGAL_FILENAME_CHARS = new Set(["<", ">", ":", '"', "\\", "|", "?", "*"]);

export function shouldDropExternalFileAsLink(
  modifiers: DropModifierState,
  platform = globalThis.navigator?.platform ?? "",
): boolean {
  const isMac = /Mac|iPhone|iPad|iPod/i.test(platform);
  return isMac ? modifiers.altKey : modifiers.ctrlKey;
}

export function externalHostPath(file: ExternalFileLike): string | null {
  const path = file.path?.trim() || file.webkitRelativePath?.trim() || "";
  return path.length > 0 ? path : null;
}

function encodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function filePathToFileUrl(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const windowsDrive = normalized.match(/^([a-zA-Z]):\/(.*)$/);
  if (windowsDrive) {
    return `file:///${windowsDrive[1]}:/${encodePathSegments(windowsDrive[2] ?? "")}`;
  }
  const unc = normalized.match(/^\/\/([^/]+)\/(.*)$/);
  if (unc) {
    return `file://${encodeURIComponent(unc[1] ?? "")}/${encodePathSegments(unc[2] ?? "")}`;
  }
  if (normalized.startsWith("/")) return `file:///${encodePathSegments(normalized.slice(1))}`;
  return `file://${encodePathSegments(normalized)}`;
}

export function markdownFileUrlLink(file: ExternalFileLike): string | null {
  const path = externalHostPath(file);
  if (!path) return null;
  const label = sanitizeDroppedFileName(file.name) || "file";
  return `[${label}](${filePathToFileUrl(path)})`;
}

export function sanitizeDroppedFileName(name: string): string {
  const sanitized = [...name.trim()]
    .map((char) => (ILLEGAL_FILENAME_CHARS.has(char) || char.charCodeAt(0) < 32 ? "_" : char))
    .join("");
  return sanitized.length > 0 ? sanitized : "dropped-file";
}

export async function uniqueImportedPath(
  fileName: string,
  targetFolder: VaultPath,
  exists: (path: VaultPath) => Promise<boolean>,
): Promise<VaultPath> {
  const safeName = sanitizeDroppedFileName(fileName);
  const dot = safeName.lastIndexOf(".");
  const stem = dot > 0 ? safeName.slice(0, dot) : safeName;
  const ext = dot > 0 ? safeName.slice(dot) : "";
  const folder = normalize(targetFolder);

  for (let i = 0; i < 64; i++) {
    const candidateName = i === 0 ? safeName : `${stem}-${i}${ext}`;
    const candidate = (folder ? join(folder, candidateName) : candidateName) as VaultPath;
    if (!(await exists(candidate))) return candidate;
  }

  return (
    folder ? join(folder, `${stem}-${Date.now()}${ext}`) : `${stem}-${Date.now()}${ext}`
  ) as VaultPath;
}

export async function importExternalFileToVault(
  file: ExternalFileLike,
  targetFolder: VaultPath,
  deps: ImportExternalFileDeps,
): Promise<VaultPath> {
  const folder = normalize(targetFolder);
  const target = await uniqueImportedPath(
    file.name,
    folder,
    async (path) => (await deps.stat(path)) !== null,
  );
  if (folder) await deps.mkdir(folder);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await deps.writeBytes(target, bytes);
  return target;
}
