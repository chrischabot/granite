/**
 * Module-singleton inverted index, wired into the metadata cache so that
 * `metadataCache.indexVault()` populates it in the same pass it reads files.
 *
 * Importing this module has the side-effect of registering the index callback.
 * Consumers can `getSearchIndex()` to do indexed full-text queries.
 */

import { setSearchIndexCallback } from "@core/metadata/cache";
import { type InvertedIndex, createInvertedIndex } from "./inverted-index";

const index: InvertedIndex = createInvertedIndex();

setSearchIndexCallback((path, content) => {
  if (content === null) {
    index.remove(path);
  } else {
    index.update(path, content);
  }
});

export function getSearchIndex(): InvertedIndex {
  return index;
}
