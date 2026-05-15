/**
 * Severe-vault generator. Produces deterministic, parameterised Obsidian-shaped
 * vault fixtures for perf and indexing gates.
 *
 * The generator's `manifest` is the test oracle — generator output and parser
 * output must agree byte-for-byte modulo documented bidirectional inference
 * (e.g. parser dedupes tags case-insensitively per file).
 *
 * Plain `.mjs` so both Node (test seeding) and Vite (browser fixture) can
 * import without transpilation.
 */

// --- deterministic RNG -----------------------------------------------------

/** xorshift32 — seeded, branch-light. */
function xorshift32(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9; // any non-zero
  return function next() {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s >>>= 0;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x1_0000_0000;
  };
}

function poisson(rng, mean) {
  // Knuth's algorithm — fine for small means (we use <= 10).
  if (mean <= 0) return 0;
  const L = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// --- vocabulary ------------------------------------------------------------

const WORDS = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "omicron",
  "pi",
  "rho",
  "sigma",
  "tau",
  "upsilon",
  "phi",
  "chi",
  "psi",
  "omega",
  "project",
  "draft",
  "research",
  "outline",
  "summary",
  "notes",
  "review",
  "task",
  "idea",
  "spec",
  "design",
  "decision",
  "log",
  "journal",
  "doc",
  "ref",
  "context",
  "vault",
  "graph",
  "tag",
  "link",
  "embed",
  "callout",
  "anchor",
  "block",
  "heading",
  "section",
];

const TAG_PREFIXES = [
  "project",
  "area",
  "status",
  "context",
  "type",
  "topic",
  "client",
  "lang",
  "owner",
];

const TAG_LEAVES = [
  "active",
  "waiting",
  "done",
  "draft",
  "review",
  "blocked",
  "follow-up",
  "personal",
  "work",
  "research",
  "ai",
  "ml",
  "ui",
  "infra",
  "docs",
  "perf",
];

const FOLDERS_DEEP = [
  "Archive",
  "Notes",
  "Projects",
  "Areas",
  "Resources",
  "Inbox",
  "Reviews",
  "Logs",
  "Refs",
  "Drafts",
];

const FOLDERS_MIXED = [
  "Notes",
  "Projects",
  "Projects/Active",
  "Projects/Archive",
  "Areas",
  "Resources/Books",
  "Resources/Articles",
  "Inbox",
  "Daily",
  "Daily/2025",
  "Daily/2026",
  "Templates",
];

const UNICODE_BLOCKS = [
  // Greek
  "Αλφα βητα γαμμα δελτα — λορεμ ιπσουμ.",
  // Hebrew (RTL)
  "אלף בית גימל דלת — טקסט לדוגמה.",
  // CJK
  "知識管理は静かな儀式である。",
  // Arabic
  "النص العربي للاختبار — يكتب من اليمين إلى اليسار.",
];

const CODE_SAMPLES = {
  ts: "export function add(a: number, b: number): number {\n  return a + b;\n}",
  py: "def add(a: int, b: int) -> int:\n    return a + b",
  sh: "#!/usr/bin/env bash\nset -euo pipefail\necho hello",
  mermaid: "graph TD\n  A --> B\n  B --> C",
  json: '{\n  "ok": true,\n  "count": 3\n}',
};

const CODE_LANGS = Object.keys(CODE_SAMPLES);

// --- helpers ---------------------------------------------------------------

function padded(n, width = 5) {
  return String(n).padStart(width, "0");
}

function noteFolderFor(i, count, shape, depth = 10) {
  if (shape === "flat") return "";
  if (shape === "deep") {
    // Deep nesting — bucket by index into a `depth`-deep folder chain.
    const parts = [];
    let bucket = i;
    for (let level = 0; level < depth; level += 1) {
      const folder = FOLDERS_DEEP[bucket % FOLDERS_DEEP.length];
      parts.push(`${folder}-${level}`);
      bucket = Math.floor(bucket / FOLDERS_DEEP.length);
      if (bucket === 0) break;
    }
    return parts.join("/");
  }
  // mixed: round-robin across realistic folder names.
  const folder = FOLDERS_MIXED[i % FOLDERS_MIXED.length];
  return folder;
}

function noteName(i) {
  return `Note ${padded(i)}`;
}

function notePath(i, count, shape) {
  const folder = noteFolderFor(i, count, shape);
  const name = `${noteName(i)}.md`;
  return folder ? `${folder}/${name}` : name;
}

function chooseTag(rng) {
  const prefix = TAG_PREFIXES[Math.floor(rng() * TAG_PREFIXES.length)];
  const leaf = TAG_LEAVES[Math.floor(rng() * TAG_LEAVES.length)];
  return `${prefix}/${leaf}`;
}

// --- per-note generator ----------------------------------------------------

/**
 * Generate a single Markdown file's content + per-note manifest. Both must be
 * deterministic for a given (seed, i) pair.
 */
function generateNote(i, count, opts, rng) {
  const stem = noteName(i);
  const path = notePath(i, count, opts.shape);

  // YAML frontmatter ---------------------------------------------------------
  const tagCount = Math.max(0, Math.round(opts.tagsPerNote + rng() * 2 - 1));
  const yamlTags = [];
  for (let t = 0; t < tagCount; t += 1) {
    yamlTags.push(chooseTag(rng));
  }
  const hasAlias = rng() < opts.aliasRatio;
  const aliases = hasAlias ? [`${stem} Alias`, `Alt ${padded(i)}`] : [];
  const cssClasses = i % 7 === 0 ? ["wide-callout"] : [];
  const rtl = i % 23 === 0;

  // Body ---------------------------------------------------------------------
  const lines = [];
  lines.push("---");
  // Render YAML manually so output is byte-stable across js-yaml versions.
  if (aliases.length > 0) {
    lines.push("aliases:");
    for (const a of aliases) lines.push(`  - "${a}"`);
  }
  if (yamlTags.length > 0) {
    lines.push("tags:");
    for (const t of yamlTags) lines.push(`  - ${t}`);
  }
  if (cssClasses.length > 0) {
    lines.push("cssclasses:");
    for (const c of cssClasses) lines.push(`  - ${c}`);
  }
  if (rtl) lines.push("dir: rtl");
  lines.push(`id: ${padded(i)}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${stem}`);
  lines.push("");

  // Wikilinks --------------------------------------------------------------
  const linkCount = Math.max(0, Math.round(opts.linksPerNote + rng() * 2 - 1));
  const linkTargets = [];
  for (let l = 0; l < linkCount; l += 1) {
    // Use deterministic targets so the manifest can be cross-checked.
    const targetIdx = (i + 1 + l * 7) % count;
    const targetStem = noteName(targetIdx);
    const variant = (i + l) % 4;
    let link;
    if (variant === 0) link = `[[${targetStem}]]`;
    else if (variant === 1) link = `[[${targetStem}|alias ${l}]]`;
    else if (variant === 2) link = `[[${targetStem}#Section]]`;
    else link = `[[${targetStem}^block-${padded(l, 3)}]]`;
    linkTargets.push({ target: targetStem, embed: false });
    lines.push(`See ${link}.`);
  }

  // Embeds -----------------------------------------------------------------
  const embedCount = poisson(rng, opts.embedsPerNote);
  for (let e = 0; e < embedCount; e += 1) {
    const which = (i + e) % 3;
    if (which === 0) {
      lines.push(`![[Image-${padded(e, 3)}.png]]`);
      linkTargets.push({ target: `Image-${padded(e, 3)}`, embed: true });
    } else if (which === 1) {
      const otherIdx = (i + 3 + e * 11) % count;
      const otherStem = noteName(otherIdx);
      lines.push(`![[${otherStem}]]`);
      linkTargets.push({ target: otherStem, embed: true });
    } else {
      lines.push(`![[board.canvas]]`);
      linkTargets.push({ target: "board", embed: true });
    }
  }

  // Body tags (in addition to YAML) ----------------------------------------
  const bodyTags = [];
  if (rng() < 0.5) {
    const tag = chooseTag(rng);
    lines.push(`Inline body tag: #${tag}`);
    bodyTags.push(tag);
  }

  // Section heading + block id (for [[#Section]] / [[^block]] targets) -----
  lines.push("");
  lines.push("## Section");
  lines.push("");
  lines.push("Anchor paragraph. ^block-000");
  lines.push("");

  // Callout ---------------------------------------------------------------
  if (rng() < opts.calloutRatio) {
    lines.push("> [!note] Highlighted");
    lines.push("> Nested context for the reader.");
    if (rng() < 0.4) {
      lines.push(">> [!warning] Inner");
      lines.push(">> Caution.");
    }
    lines.push("");
  }

  // Code block ------------------------------------------------------------
  if (rng() < opts.codeBlockRatio) {
    const lang = CODE_LANGS[Math.floor(rng() * CODE_LANGS.length)];
    lines.push(`\`\`\`${lang}`);
    for (const codeLine of CODE_SAMPLES[lang].split("\n")) lines.push(codeLine);
    lines.push("```");
    lines.push("");
  }

  // Math ------------------------------------------------------------------
  if (rng() < opts.mathRatio) {
    lines.push("Inline math: $x^2 + y^2 = z^2$.");
    lines.push("");
    lines.push("$$\\int_0^1 x\\,dx = \\frac{1}{2}$$");
    lines.push("");
  }

  // Unicode ---------------------------------------------------------------
  if (rng() < opts.unicodeRatio) {
    lines.push(pick(rng, UNICODE_BLOCKS));
    lines.push("");
  }

  // Filler ----------------------------------------------------------------
  const fillerWords = 8 + Math.floor(rng() * 8);
  const filler = [];
  for (let w = 0; w < fillerWords; w += 1) {
    filler.push(WORDS[Math.floor(rng() * WORDS.length)]);
  }
  lines.push(filler.join(" "));
  lines.push("");

  const content = lines.join("\n");

  // Compute per-note canonical tag set (lowercase-deduped) — this is what
  // metadataCache.aggregateTagCounts will yield. The parser also dedupes by
  // lowercase so YAML tags + body tags collapse if they alias.
  const canonical = new Set();
  const canonicalOrder = [];
  // Body tags first (parser walks body before YAML).
  for (const t of bodyTags) {
    const key = t.toLocaleLowerCase();
    if (!canonical.has(key)) {
      canonical.add(key);
      canonicalOrder.push(t);
    }
  }
  for (const t of yamlTags) {
    const key = t.toLocaleLowerCase();
    if (!canonical.has(key)) {
      canonical.add(key);
      canonicalOrder.push(t);
    }
  }

  return {
    path,
    content,
    manifest: {
      stem,
      tags: canonicalOrder, // canonical, in parser-emission order
      links: linkTargets,
      aliasCount: aliases.length,
      bytes: new TextEncoder().encode(content).byteLength,
    },
  };
}

// --- assets ---------------------------------------------------------------

function canvasFile(i) {
  // Minimal JSON Canvas with 3-5 nodes; parser doesn't read these but they
  // exercise the listAll walk and ensure non-.md assets are tolerated.
  const nodeCount = 3 + (i % 3);
  const nodes = [];
  for (let n = 0; n < nodeCount; n += 1) {
    nodes.push({
      id: `n${i}-${n}`,
      type: "text",
      text: `Card ${n}`,
      x: n * 240,
      y: i * 40,
      width: 200,
      height: 80,
    });
  }
  const edges = [];
  for (let n = 0; n < nodeCount - 1; n += 1) {
    edges.push({
      id: `e${i}-${n}`,
      fromNode: `n${i}-${n}`,
      fromSide: "right",
      toNode: `n${i}-${n + 1}`,
      toSide: "left",
    });
  }
  return JSON.stringify({ nodes, edges }, null, 2);
}

function baseFile(i) {
  // Minimal `.base` table view (Obsidian Bases format approximation).
  return [
    "filters:",
    "  and:",
    "    - file.ext == \"md\"",
    "views:",
    "  - type: table",
    `    name: View ${i}`,
    "    order:",
    "      - file.name",
    "      - file.mtime",
    "",
  ].join("\n");
}

function pngBytes() {
  // 1x1 transparent PNG — tiny but real.
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

function pdfBytes() {
  // %PDF header + minimal trailer. Not a parseable PDF — just a recognisable
  // binary blob with the right magic.
  return new TextEncoder().encode(
    "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj <</Type/Catalog>> endobj\n%%EOF\n",
  );
}

// --- public API ----------------------------------------------------------

/**
 * @typedef {Object} GenerateOptions
 * @property {number} [count=1000]
 * @property {number} [seed=1]
 * @property {"flat"|"deep"|"mixed"} [shape="mixed"]
 * @property {number} [linksPerNote=5]
 * @property {number} [tagsPerNote=3]
 * @property {number} [aliasRatio=0.1]
 * @property {number} [embedsPerNote=0.5]
 * @property {number} [calloutRatio=0.3]
 * @property {number} [codeBlockRatio=0.2]
 * @property {number} [mathRatio=0.1]
 * @property {number} [unicodeRatio=0.15]
 * @property {string[]} [excludedFolders]
 * @property {number} [assetCount=50]
 * @property {boolean} [bugDropOneInFiveWikilinks=false] -- β-test hook: drops 1/5
 *   wikilinks in the EMITTED markdown but keeps them in the manifest. Used by
 *   the unit test to assert that introducing a bug fails the manifest-oracle.
 */

const DEFAULTS = {
  count: 1000,
  seed: 1,
  shape: "mixed",
  linksPerNote: 5,
  tagsPerNote: 3,
  aliasRatio: 0.1,
  embedsPerNote: 0.5,
  calloutRatio: 0.3,
  codeBlockRatio: 0.2,
  mathRatio: 0.1,
  unicodeRatio: 0.15,
  excludedFolders: [".obsidian", "node_modules", ".trash"],
  assetCount: 50,
  bugDropOneInFiveWikilinks: false,
};

/**
 * Generate a severe vault. Returns the materialised file plan (paths +
 * contents), a `writeTo(fs, root)` writer, and the manifest oracle.
 */
export function generateSevereVault(userOpts = {}) {
  const opts = { ...DEFAULTS, ...userOpts };
  const rng = xorshift32(opts.seed);

  /** @type {Array<{path: string; content?: string; bytes?: Uint8Array; kind: "note"|"asset"}>} */
  const files = [];
  /** @type {Map<string, { tags: string[]; links: { target: string; embed: boolean }[]; bytes: number }>} */
  const perFile = new Map();
  const tagDistribution = new Map();
  let totalEdges = 0;
  let totalTagEmissions = 0;
  let totalBytes = 0;

  for (let i = 0; i < opts.count; i += 1) {
    const note = generateNote(i, opts.count, opts, rng);

    let emitted = note.content;
    if (opts.bugDropOneInFiveWikilinks) {
      // β-test hook: drop every 5th `[[…]]` wikilink from the emitted text.
      // The manifest is left intact, so parser output must disagree.
      let n = -1;
      emitted = emitted.replace(/(?<!!)\[\[[^\]\n]+\]\]/g, (match) => {
        n += 1;
        return n % 5 === 0 ? "" : match;
      });
    }

    files.push({ path: note.path, content: emitted, kind: "note" });
    perFile.set(note.path, {
      tags: note.manifest.tags,
      links: note.manifest.links,
      bytes: note.manifest.bytes,
    });
    totalEdges += note.manifest.links.length;
    totalBytes += note.manifest.bytes;
    totalTagEmissions += note.manifest.tags.length;
    for (const t of note.manifest.tags) {
      const key = t.toLocaleLowerCase();
      const existing = tagDistribution.get(key);
      if (existing) existing.count += 1;
      else tagDistribution.set(key, { name: t, count: 1 });
    }
  }

  // Assets — non-markdown content, distributed deterministically.
  for (let a = 0; a < opts.assetCount; a += 1) {
    const variant = a % 4;
    if (variant === 0) {
      files.push({ path: `Assets/Image-${padded(a, 3)}.png`, bytes: pngBytes(), kind: "asset" });
      totalBytes += pngBytes().byteLength;
    } else if (variant === 1) {
      const pdf = pdfBytes();
      files.push({ path: `Assets/Doc-${padded(a, 3)}.pdf`, bytes: pdf, kind: "asset" });
      totalBytes += pdf.byteLength;
    } else if (variant === 2) {
      const content = canvasFile(a);
      files.push({ path: `Canvases/board-${padded(a, 3)}.canvas`, content, kind: "asset" });
      totalBytes += new TextEncoder().encode(content).byteLength;
    } else {
      const content = baseFile(a);
      files.push({ path: `Bases/view-${padded(a, 3)}.base`, content, kind: "asset" });
      totalBytes += new TextEncoder().encode(content).byteLength;
    }
  }

  // Excluded folders — drop deterministic poison notes inside them. These MUST
  // NOT be indexed by metadataCache once the user's excludedFiles setting is
  // populated with these folder names.
  for (const ex of opts.excludedFolders) {
    files.push({
      path: `${ex}/poison.md`,
      content: "---\n---\n# Poison\nShould never be indexed. #poison",
      kind: "asset",
    });
  }

  const manifest = {
    totalBytes,
    files: opts.count,
    edges: totalEdges,
    tagEmissions: totalTagEmissions,
    tagDistribution: [...tagDistribution.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    ),
    perFile,
    excludedFolders: [...opts.excludedFolders],
    assetCount: opts.assetCount,
    paths: files.filter((f) => f.kind === "note").map((f) => f.path),
  };

  return {
    files,
    manifest,
    /**
     * Write the generated vault to a FileSystemImpl-compatible target.
     * `fs` must expose Effect-flavoured writeText/writeBytes, OR a plain
     * `writeText(path, content): Promise<void>` shim — we detect both.
     */
    async writeTo(fs) {
      // Detect Effect shape — writeText returns an Effect with `_op` (Effect
      // internals) or returns a Promise. We support either via dynamic call.
      const isEffectfulShim =
        typeof fs.writeText === "function" && typeof fs.writeBytes === "function";
      if (!isEffectfulShim) throw new Error("writeTo: fs is missing writeText/writeBytes");
      for (const file of files) {
        if (file.content !== undefined) {
          await maybeAwait(fs.writeText(file.path, file.content));
        } else if (file.bytes !== undefined) {
          await maybeAwait(fs.writeBytes(file.path, file.bytes));
        }
      }
    },
  };
}

async function maybeAwait(maybeEffect) {
  if (maybeEffect && typeof maybeEffect.then === "function") {
    return maybeEffect;
  }
  // Effect — defer to a runtime-provided runner. The caller is expected to
  // wrap an Effect adapter with a Promise shim before calling writeTo. We
  // do not import `effect` here to keep this module dependency-free.
  if (maybeEffect && typeof maybeEffect === "object" && "pipe" in maybeEffect) {
    throw new Error(
      "writeTo: expected a Promise-returning fs shim. Wrap your Effect FileSystem with a Promise adapter before calling writeTo().",
    );
  }
  return maybeEffect;
}

// Re-export the RNG and per-note generator for advanced consumers / tests.
export { xorshift32, generateNote };
