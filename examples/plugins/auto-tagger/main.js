/* Granite sample plugin: auto-tagger.
 *
 * Demonstrates vault.read + vault.write, command registration, workspace
 * inspection, and basic frontmatter manipulation from a plugin. The command
 * extracts capitalized multi-word phrases from the body and merges them into
 * the frontmatter `tags` array.
 */
const disposers = [];

function activeMarkdownPath(workspace) {
  const s = workspace.getState();
  const group = s.activeGroupId ? s.groups.get(s.activeGroupId) : null;
  const leaf = group?.activeLeafId ? s.leaves.get(group.activeLeafId) : null;
  return leaf?.state?.type === "markdown" ? leaf.state.path : null;
}

function extractCandidatePhrases(text) {
  // Strip frontmatter + code fences before scanning.
  let body = text;
  if (body.startsWith("---\n")) {
    const end = body.indexOf("\n---", 4);
    if (end !== -1) body = body.slice(end + 4);
  }
  body = body.replace(/```[\s\S]*?```/g, "");
  const phrases = new Set();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
  let m;
  while ((m = re.exec(body))) {
    phrases.add(m[1].toLowerCase().replace(/\s+/g, "-"));
  }
  return [...phrases];
}

function mergeTagsIntoFrontmatter(text, newTags) {
  const fenceRE = /^---\r?\n/;
  const has = fenceRE.test(text);
  let body = text;
  let yaml = "";
  if (has) {
    const end = text.indexOf("\n---\n", 4);
    if (end !== -1) {
      yaml = text.slice(4, end);
      body = text.slice(end + 5);
    }
  }
  // Parse + merge `tags:` (very lightweight — supports list-of-strings only).
  const lines = yaml.split(/\r?\n/);
  const tagIdx = lines.findIndex((l) => /^tags\s*:/.test(l));
  let existingTags = [];
  if (tagIdx !== -1) {
    const inline = lines[tagIdx].match(/^tags\s*:\s*\[([^\]]*)\]/);
    if (inline) {
      existingTags = inline[1]
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  const merged = [...new Set([...existingTags, ...newTags])].sort();
  const tagLine = `tags: [${merged.map((t) => JSON.stringify(t)).join(", ")}]`;
  if (tagIdx !== -1) {
    lines[tagIdx] = tagLine;
  } else {
    lines.push(tagLine);
  }
  const newYaml = lines.filter((l) => l.length > 0 || lines.length === 1).join("\n");
  return `---\n${newYaml}\n---\n${body.replace(/^\n/, "")}`;
}

module.exports = {
  onLoad: (api) => {
    api.log("Auto-tagger: loaded");

    const dispose = api.commands.register({
      id: "auto-tagger:scan-active-note",
      category: "Auto-tagger",
      name: "Scan active note for tag candidates",
      callback: async () => {
        const path = activeMarkdownPath(api.workspace);
        if (!path) {
          api.notice.show("Open a markdown note first.", { kind: "warning" });
          return;
        }
        const text = await api.vault.read(path);
        const phrases = extractCandidatePhrases(text);
        if (phrases.length === 0) {
          api.notice.show("No new tag candidates found.", { kind: "info" });
          return;
        }
        const next = mergeTagsIntoFrontmatter(text, phrases);
        if (next === text) {
          api.notice.show("Tags already up to date.", { kind: "info" });
          return;
        }
        await api.vault.write(path, next);
        api.notice.show(
          `Added ${phrases.length} tag${phrases.length === 1 ? "" : "s"}: ${phrases.join(", ")}`,
          { kind: "success", timeoutMs: 6000 }
        );
      },
    });
    disposers.push(dispose);
  },

  onUnload: (api) => {
    api.log("Auto-tagger: unloading");
    for (const d of disposers.splice(0)) d();
  },
};