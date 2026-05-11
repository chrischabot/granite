import { describe, it, expect } from "vitest";
import {
  defaultExtensionFor,
  extensionFromHint,
  isSupportedAttachmentMime,
} from "./attach";

describe("defaultExtensionFor", () => {
  it("maps image/png → png", () => {
    expect(defaultExtensionFor("image/png")).toBe("png");
  });

  it("maps both image/jpeg and image/jpg → jpg", () => {
    expect(defaultExtensionFor("image/jpeg")).toBe("jpg");
    expect(defaultExtensionFor("image/jpg")).toBe("jpg");
  });

  it("maps audio/mpeg → mp3 and video/mp4 → mp4", () => {
    expect(defaultExtensionFor("audio/mpeg")).toBe("mp3");
    expect(defaultExtensionFor("video/mp4")).toBe("mp4");
  });

  it("maps application/pdf → pdf", () => {
    expect(defaultExtensionFor("application/pdf")).toBe("pdf");
  });

  it("falls back to bin for unknown MIME", () => {
    expect(defaultExtensionFor("application/x-thing")).toBe("bin");
    expect(defaultExtensionFor("")).toBe("bin");
  });

  it("is case-insensitive", () => {
    expect(defaultExtensionFor("IMAGE/PNG")).toBe("png");
  });
});

describe("extensionFromHint", () => {
  it("uses the hint's extension when present", () => {
    expect(extensionFromHint("photo.JPG", "image/png")).toBe("jpg");
    expect(extensionFromHint("clip.webp", "image/png")).toBe("webp");
  });

  it("falls back to the MIME default when hint has no extension", () => {
    expect(extensionFromHint("noext", "image/png")).toBe("png");
    expect(extensionFromHint(undefined, "audio/wav")).toBe("wav");
    expect(extensionFromHint("", "video/webm")).toBe("webm");
  });
});

describe("isSupportedAttachmentMime", () => {
  it("accepts image/audio/video/pdf MIME types", () => {
    expect(isSupportedAttachmentMime("image/png")).toBe(true);
    expect(isSupportedAttachmentMime("audio/mpeg")).toBe(true);
    expect(isSupportedAttachmentMime("video/mp4")).toBe(true);
    expect(isSupportedAttachmentMime("application/pdf")).toBe(true);
  });

  it("rejects text and unknown MIME types", () => {
    expect(isSupportedAttachmentMime("text/plain")).toBe(false);
    expect(isSupportedAttachmentMime("application/octet-stream")).toBe(false);
    expect(isSupportedAttachmentMime("")).toBe(false);
  });
});