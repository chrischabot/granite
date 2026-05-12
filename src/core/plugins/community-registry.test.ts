import { describe, expect, it } from "vitest";
import {
  fetchCommunityPluginRegistry,
  getCommunityPluginInstallUrls,
  getCommunityPluginManifestUrl,
  parseCommunityPluginRegistry,
  searchCommunityPluginRegistry,
} from "./community-registry";

const registryFixture = JSON.stringify([
  {
    id: "table-editor-obsidian",
    name: "Advanced Tables",
    author: "tgrosinger",
    description: "Improved table navigation, formatting, and manipulation.",
    repo: "tgrosinger/advanced-tables-obsidian",
  },
  {
    id: "obsidian-git",
    name: "Git",
    author: "vinzent03",
    description: "Integrate Git version control with automatic backup and other advanced features.",
    repo: "vinzent03/obsidian-git",
  },
  {
    id: "calendar",
    name: "Calendar",
    author: "Liam Cain",
    description: "Explore your daily notes.",
    repo: "liamcain/obsidian-calendar-plugin",
  },
  {
    id: "bad plugin",
    name: "Bad",
    author: "Nobody",
    description: "Invalid id is ignored.",
    repo: "owner/repo",
  },
  {
    id: "bad-repo",
    name: "Bad Repo",
    author: "Nobody",
    description: "Invalid repo is ignored.",
    repo: "https://example.com/repo",
  },
]);

describe("community plugin registry", () => {
  it("parses the official Obsidian registry shape and drops unsafe entries", () => {
    const entries = parseCommunityPluginRegistry(registryFixture);

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.id)).toEqual([
      "table-editor-obsidian",
      "obsidian-git",
      "calendar",
    ]);
  });

  it("searches by name, id, author, description, and repo", () => {
    const entries = parseCommunityPluginRegistry(registryFixture);

    expect(searchCommunityPluginRegistry(entries, "backup").map((entry) => entry.id)).toEqual([
      "obsidian-git",
    ]);
    expect(searchCommunityPluginRegistry(entries, "liam").map((entry) => entry.id)).toEqual([
      "calendar",
    ]);
    expect(
      searchCommunityPluginRegistry(entries, "advanced-tables").map((entry) => entry.id),
    ).toEqual(["table-editor-obsidian"]);
  });

  it("derives manifest and release asset URLs from registry repo + manifest version", () => {
    const git = parseCommunityPluginRegistry(registryFixture).find(
      (entry) => entry.id === "obsidian-git",
    );
    expect(git).toBeDefined();
    const entry = git as NonNullable<typeof git>;

    expect(getCommunityPluginManifestUrl(entry)).toBe(
      "https://raw.githubusercontent.com/vinzent03/obsidian-git/master/manifest.json",
    );
    expect(getCommunityPluginInstallUrls(entry, "2.31.1")).toEqual({
      manifestUrl:
        "https://github.com/vinzent03/obsidian-git/releases/download/2.31.1/manifest.json",
      mainUrl: "https://github.com/vinzent03/obsidian-git/releases/download/2.31.1/main.js",
      stylesUrl: "https://github.com/vinzent03/obsidian-git/releases/download/2.31.1/styles.css",
      updateManifestUrl:
        "https://raw.githubusercontent.com/vinzent03/obsidian-git/master/manifest.json",
    });
  });

  it("fetches and parses the registry with credential-free requests", async () => {
    const calls: unknown[] = [];
    const entries = await fetchCommunityPluginRegistry({
      registryUrl: "https://example.com/community-plugins.json",
      fetchImpl: (async (...args: unknown[]) => {
        calls.push(args);
        return new Response(registryFixture, { status: 200 });
      }) as typeof fetch,
    });

    expect(entries.map((entry) => entry.name)).toEqual(["Advanced Tables", "Git", "Calendar"]);
    expect(calls).toEqual([
      ["https://example.com/community-plugins.json", { credentials: "omit" }],
    ]);
  });

  it("fails loudly when the registry cannot be fetched", async () => {
    await expect(
      fetchCommunityPluginRegistry({
        registryUrl: "https://example.com/community-plugins.json",
        fetchImpl: (async () =>
          new Response("not found", { status: 404, statusText: "Not Found" })) as typeof fetch,
      }),
    ).rejects.toThrow("HTTP 404 while fetching community plugin registry");
  });
});
