import { parseBaseConfig, serializeBaseConfig } from "@core/bases/schema";
import { parseCanvas, serializeCanvas } from "@core/canvas/schema";
import { type AppServices, disposeRuntime, setAppLayer } from "@core/effect/runtime";
import { FileSystem, type FileSystemImpl } from "@core/fs/FileSystem";
import { extension } from "@core/fs/path";
import type { FsError, VaultEntry, VaultFile, VaultPath } from "@core/fs/types";
import { metadataCache } from "@core/metadata/cache";
import { parseMetadata } from "@core/metadata/parser";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const OBSIDIAN_COMPAT_FIXTURE: Readonly<Record<VaultPath, string>> = {
  ".obsidian/app.json": JSON.stringify({ legacyEditor: false, livePreview: true }, null, 2),
  ".obsidian/appearance.json": JSON.stringify({ theme: "obsidian", cssTheme: "Minimal" }, null, 2),
  ".obsidian/themes/Minimal/theme.css": "body { --background-primary: #ffffff; }\n",
  "Index.md": `---
aliases:
  - Home
tags:
  - project/alpha
cssclasses:
  - dashboard
status: active
---
# Index

See [[Projects/Alpha|Alpha project]] and ![[Board.canvas]].

> [!warning]- Risk
> Nested callout content with ==highlight== and $x^2$.

- [ ] Task with block ^task-1

Footnote ref[^note].

[^note]: Footnote body.
`,
  "Projects/Alpha.md": `---
aliases: [Alpha]
tags: [project/alpha, client]
---
# Alpha

Back to [[Index#Index]] and block [[Index#^task-1]].

\`\`\`mermaid
graph TD
  A-->B
\`\`\`
`,
  "Board.canvas": JSON.stringify(
    {
      nodes: [
        {
          id: "index",
          type: "file",
          file: "Index.md",
          x: 0,
          y: 0,
          width: 260,
          height: 160,
          color: "1",
        },
        {
          id: "alpha",
          type: "file",
          file: "Projects/Alpha.md",
          x: 360,
          y: 0,
          width: 260,
          height: 160,
        },
        {
          id: "group",
          type: "group",
          label: "Work",
          x: -40,
          y: -60,
          width: 700,
          height: 260,
          backgroundStyle: "cover",
        },
      ],
      edges: [
        {
          id: "edge",
          fromNode: "index",
          toNode: "alpha",
          fromSide: "right",
          toSide: "left",
          toEnd: "arrow",
          label: "relates",
        },
      ],
    },
    null,
    2,
  ),
  "Tasks.base": `name: Active projects
filter: tag:project/alpha
columns:
  - file.name
  - status
  - tags
sort: file.name
sortOrder: asc
view: cards
groupBy: status
summaries:
  - column: file.name
    op: count
    label: Total
formulas:
  lower_name: lower(file.name)
`,
};

function fixtureFile(path: VaultPath): string {
  const text = OBSIDIAN_COMPAT_FIXTURE[path];
  if (text === undefined) throw new Error(`Missing fixture file: ${path}`);
  return text;
}

function makeLargeObsidianFixture(noteCount = 200): Map<VaultPath, string> {
  const out = new Map<VaultPath, string>(
    Object.entries({
      ".obsidian/app.json": JSON.stringify({ legacyEditor: false, livePreview: true }, null, 2),
      ".obsidian/workspace.json": JSON.stringify(
        {
          main: { type: "split", children: [] },
          left: { type: "split", children: [] },
          right: { type: "split", children: [] },
        },
        null,
        2,
      ),
      ".obsidian/themes/Minimal/theme.css": "body { --background-primary: #ffffff; }\n",
      "Assets/diagram.png": "not-a-real-png; metadata index must ignore asset bytes",
      "Maps/Overview.canvas": JSON.stringify({ nodes: [], edges: [] }, null, 2),
      "Views/Projects.base": "name: Projects\nfilter: tag:project/large\nview: table\n",
    }),
  );

  for (let i = 0; i < noteCount; i += 1) {
    const current = i.toString().padStart(3, "0");
    const next = ((i + 1) % noteCount).toString().padStart(3, "0");
    const previous = ((i + noteCount - 1) % noteCount).toString().padStart(3, "0");
    const status = i % 3 === 0 ? "active" : i % 3 === 1 ? "waiting" : "done";
    const folder = `area/${i % 10}`;
    out.set(
      `Notes/Note ${current}.md`,
      `---
aliases:
  - Note ${current} Alias
tags:
  - project/large
  - ${folder}
status: ${status}
---
# Note ${current}

Previous: [[Notes/Note ${previous}]]
Next: [[Notes/Note ${next}|next note]]
Embed: ![[Assets/diagram.png]]

> [!note]+ Compatibility callout
> Nested content with ==highlight==, $x^2$, and #inline/${i % 5}.

- Stable block ^note-${current}
`,
    );
  }

  return out;
}

function makeFixtureFs(files: Map<VaultPath, string>, writes: VaultPath[]): FileSystemImpl {
  return {
    rootName: "obsidian-fixture",
    list: () => Effect.succeed([] as ReadonlyArray<VaultEntry>),
    listAll: (opts) => {
      const extensions = new Set(opts?.extensions ?? []);
      const out = [...files.entries()]
        .filter(([path]) => extensions.size === 0 || extensions.has(extension(path)))
        .map<VaultFile>(([path, text]) => ({
          type: "file",
          path,
          name: path.split("/").pop() ?? path,
          size: text.length,
          mtimeMs: 0,
          ctimeMs: 0,
          extension: extension(path),
        }));
      return Effect.succeed(out);
    },
    readText: (path) => {
      const text = files.get(path);
      if (text === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(text);
    },
    readBytes: (path) => {
      const text = files.get(path);
      if (text === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path } as unknown as FsError);
      }
      return Effect.succeed(new TextEncoder().encode(text));
    },
    writeText: (path, content) => {
      writes.push(path);
      files.set(path, content);
      return Effect.succeed(undefined);
    },
    writeBytes: (path, bytes) => {
      writes.push(path);
      files.set(path, new TextDecoder().decode(bytes));
      return Effect.succeed(undefined);
    },
    mkdir: () => Effect.succeed(undefined),
    rename: (from, to) => {
      const text = files.get(from);
      if (text === undefined) {
        return Effect.fail({ _tag: "FsNotFound", path: from } as unknown as FsError);
      }
      writes.push(from, to);
      files.delete(from);
      files.set(to, text);
      return Effect.succeed(undefined);
    },
    remove: (path) => {
      writes.push(path);
      files.delete(path);
      return Effect.succeed(undefined);
    },
    stat: (path) => {
      const text = files.get(path);
      if (text === undefined) return Effect.succeed(null);
      return Effect.succeed<VaultFile>({
        type: "file",
        path,
        name: path.split("/").pop() ?? path,
        size: text.length,
        mtimeMs: 0,
        ctimeMs: 0,
        extension: extension(path),
      });
    },
    watch: () => () => {
      /* no-op */
    },
  };
}

describe("Obsidian compatibility fixture", () => {
  let files: Map<VaultPath, string>;
  let writes: VaultPath[];

  beforeEach(async () => {
    await disposeRuntime();
    metadataCache.reset();
    files = new Map(Object.entries(OBSIDIAN_COMPAT_FIXTURE));
    writes = [];
    setAppLayer(
      () => Layer.succeed(FileSystem, makeFixtureFs(files, writes)) as Layer.Layer<AppServices>,
    );
  });

  afterEach(async () => {
    metadataCache.reset();
    await disposeRuntime();
  });

  it("indexes an existing Obsidian-style vault without modifying config or source files", async () => {
    await metadataCache.indexVault();

    expect(writes).toEqual([]);
    expect(files.get(".obsidian/app.json")).toBe(OBSIDIAN_COMPAT_FIXTURE[".obsidian/app.json"]);

    const index = metadataCache.getMetadata("Index.md");
    expect(index?.aliases).toEqual(["Home"]);
    expect(index?.cssClasses).toEqual(["dashboard"]);
    expect(index?.tags.map((tag) => tag.name)).toEqual(["project/alpha"]);
    expect(index?.headings.map((heading) => heading.text)).toEqual(["Index"]);
    expect(index?.blocks).toEqual([{ id: "task-1", line: 16 }]);
    expect(index?.footnotes[0]?.id).toBe("note");

    const alpha = metadataCache.getMetadata("Projects/Alpha.md");
    expect(alpha?.links.map((link) => link.target)).toEqual(["Index", "Index"]);
    expect(alpha?.links.map((link) => link.block)).toEqual([null, "task-1"]);
    expect(alpha?.tags.map((tag) => tag.name)).toEqual(["project/alpha", "client"]);

    expect(metadataCache.getAllSwitcherEntries()).toEqual(
      expect.arrayContaining([
        { path: "Index.md", displayName: "Home", alias: "Home" },
        { path: "Projects/Alpha.md", displayName: "Alpha", alias: "Alpha" },
      ]),
    );
  });

  it("round-trips fixture canvas and base files semantically", () => {
    const canvas = parseCanvas(fixtureFile("Board.canvas"));
    expect(parseCanvas(serializeCanvas(canvas))).toEqual(canvas);
    expect(canvas.nodes.map((node) => node.type).sort()).toEqual(["file", "file", "group"]);
    expect(canvas.edges[0]).toMatchObject({ fromNode: "index", toNode: "alpha", toEnd: "arrow" });

    const base = parseBaseConfig(fixtureFile("Tasks.base"));
    expect(parseBaseConfig(serializeBaseConfig(base))).toEqual(base);
    expect(base.view).toBe("cards");
    expect(base.groupBy).toBe("status");
    expect(base.summaries).toEqual([{ column: "file.name", op: "count", label: "Total" }]);
    expect(base.formulas).toEqual({ lower_name: "lower(file.name)" });
  });

  it("parses Obsidian markdown extensions without requiring an app-specific migration", () => {
    const metadata = parseMetadata(fixtureFile("Index.md"));
    expect(metadata.links).toEqual([
      {
        target: "Projects/Alpha",
        display: "Alpha project",
        heading: null,
        block: null,
        embed: false,
        line: 11,
      },
      {
        target: "Board.canvas",
        display: null,
        heading: null,
        block: null,
        embed: true,
        line: 11,
      },
    ]);
    // biome-ignore lint/complexity/useLiteralKeys: frontmatter is an index-signature map under noPropertyAccessFromIndexSignature.
    expect(metadata.frontmatter["status"]).toBe("active");
    expect(metadata.isEmpty).toBe(false);
  });

  it("indexes a generated 200-note Obsidian vault fixture without modifying source files", async () => {
    files = makeLargeObsidianFixture();
    const obsidianConfigBefore = files.get(".obsidian/app.json");
    setAppLayer(
      () => Layer.succeed(FileSystem, makeFixtureFs(files, writes)) as Layer.Layer<AppServices>,
    );

    await metadataCache.indexVault();

    expect(writes).toEqual([]);
    expect(files.get(".obsidian/app.json")).toBe(obsidianConfigBefore);

    const first = metadataCache.getMetadata("Notes/Note 000.md");
    expect(first?.aliases).toEqual(["Note 000 Alias"]);
    expect(first?.tags.map((tag) => tag.name).sort()).toEqual([
      "area/0",
      "inline/0",
      "project/large",
    ]);
    expect(first?.links.map((link) => link.target)).toEqual([
      "Notes/Note 199",
      "Notes/Note 001",
      "Assets/diagram.png",
    ]);
    expect(first?.blocks).toEqual([{ id: "note-000", line: 17 }]);

    expect(metadataCache.getAllSwitcherEntries()).toHaveLength(400);
    expect(metadataCache.getAllHeadings()).toHaveLength(200);
    expect(metadataCache.getAllBlocks()).toHaveLength(200);
    expect(metadataCache.getAllProperties()).toEqual(
      expect.arrayContaining([
        { name: "status", count: 200, samples: ["active", "waiting", "done"] },
      ]),
    );
    expect(metadataCache.getAllTags()).toEqual(
      expect.arrayContaining([{ name: "project/large", count: 200 }]),
    );
    expect(metadataCache.getBacklinks("Notes/Note 000.md")).toEqual(
      expect.arrayContaining([{ source: "Notes/Note 199.md", lines: [11] }]),
    );
  });
});
