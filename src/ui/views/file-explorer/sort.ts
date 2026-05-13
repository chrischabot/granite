import type { VaultEntry, VaultFile } from "@core/fs/types";
import type { FileExplorerSort } from "@core/settings/store";

export interface SortableTreeNode {
  readonly entry: VaultEntry;
  readonly children?: ReadonlyArray<SortableTreeNode>;
}

/**
 * Pairwise comparator for two vault files using the selected order. All
 * timestamp orders break ties with the file name so output is stable when
 * mtime/ctime are identical.
 */
export function compareFiles(a: VaultFile, b: VaultFile, order: FileExplorerSort): number {
  const byName = a.name.localeCompare(b.name);
  switch (order) {
    case "name-asc":
      return byName;
    case "name-desc":
      return -byName;
    case "mtime-desc":
      return b.mtimeMs - a.mtimeMs || byName;
    case "mtime-asc":
      return a.mtimeMs - b.mtimeMs || byName;
    case "ctime-desc":
      return b.ctimeMs - a.ctimeMs || byName;
    case "ctime-asc":
      return a.ctimeMs - b.ctimeMs || byName;
  }
}

/**
 * Recursively sort tree nodes. Directories always come first within each
 * level (alphabetical); files are ordered according to `order`. Directory
 * children are re-sorted with the same order.
 */
export function sortNodes<N extends SortableTreeNode>(
  nodes: ReadonlyArray<N>,
  order: FileExplorerSort,
): N[] {
  const dirs: N[] = [];
  const files: N[] = [];
  for (const n of nodes) {
    if (n.entry.type === "directory") dirs.push(n);
    else files.push(n);
  }
  dirs.sort((a, b) => a.entry.name.localeCompare(b.entry.name));
  files.sort((a, b) => compareFiles(a.entry as VaultFile, b.entry as VaultFile, order));
  const sortedDirs: N[] = dirs.map((d) =>
    d.children ? ({ ...d, children: sortNodes(d.children, order) } as N) : d,
  );
  return [...sortedDirs, ...files];
}
