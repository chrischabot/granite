export interface TagCount {
  readonly name: string;
  readonly count: number;
}

export interface TagNode {
  readonly segment: string;
  readonly fullName: string;
  count: number;
  readonly children: Map<string, TagNode>;
}

export function sortTagNodes(nodes: Iterable<TagNode>): TagNode[] {
  return [...nodes].sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment));
}

export function buildTagTree(entries: ReadonlyArray<TagCount>): TagNode {
  const root: TagNode = { segment: "", fullName: "", count: 0, children: new Map() };
  for (const entry of entries) {
    const parts = entry.name.split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (!seg) continue;
      let next = cur.children.get(seg);
      if (!next) {
        next = {
          segment: seg,
          fullName: parts.slice(0, i + 1).join("/"),
          count: 0,
          children: new Map(),
        };
        cur.children.set(seg, next);
      }
      cur = next;
    }
    cur.count = entry.count;
  }

  const computeTotals = (node: TagNode): number => {
    if (node.children.size === 0) return node.count;
    let total = node.count;
    for (const child of node.children.values()) total += computeTotals(child);
    node.count = total;
    return total;
  };
  computeTotals(root);
  return root;
}

export function buildFlatTags(entries: ReadonlyArray<TagCount>): TagNode {
  const root: TagNode = { segment: "", fullName: "", count: 0, children: new Map() };
  for (const entry of entries) {
    root.children.set(entry.name, {
      segment: entry.name,
      fullName: entry.name,
      count: entry.count,
      children: new Map(),
    });
  }
  root.count = entries.reduce((sum, entry) => sum + entry.count, 0);
  return root;
}

export function buildTagsModel(entries: ReadonlyArray<TagCount>, showNestedTags: boolean): TagNode {
  return showNestedTags ? buildTagTree(entries) : buildFlatTags(entries);
}
