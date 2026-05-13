import { describe, expect, it } from "vitest";
import { nativeFileKindForExtension } from "./file-formats";

describe("native file format classifier", () => {
  it("covers every accepted native extension from the storage spec", () => {
    const expected = {
      markdown: ["md"],
      canvas: ["canvas"],
      base: ["base"],
      image: ["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"],
      audio: ["3gp", "flac", "m4a", "mp3", "ogg", "wav"],
      video: ["mkv", "mov", "mp4", "ogv", "webm"],
      pdf: ["pdf"],
    } as const;

    for (const [kind, extensions] of Object.entries(expected)) {
      for (const ext of extensions) {
        expect(nativeFileKindForExtension(ext), ext).toBe(kind);
        expect(nativeFileKindForExtension(`.${ext.toUpperCase()}`), ext).toBe(kind);
      }
    }
  });

  it("does not classify unsupported extensions as native app-opened formats", () => {
    expect(nativeFileKindForExtension("zip")).toBeNull();
    expect(nativeFileKindForExtension("")).toBeNull();
  });
});
