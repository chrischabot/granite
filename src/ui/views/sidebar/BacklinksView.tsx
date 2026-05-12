import { stem } from "@core/fs/path";
import { metadataCache } from "@core/metadata/cache";
import { type UnlinkedFileMatch, findUnlinkedMentions } from "@core/metadata/unlinked-mentions";
import { useFileMetadata, useMetadataVersion } from "@core/metadata/useMetadata";
import { workspaceStore } from "@core/workspace/store";
import { useWorkspace } from "@core/workspace/useWorkspace";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/useI18n";

export function BacklinksView() {
  const t = useI18n();
  const { activeGroupId, groups, leaves } = useWorkspace();
  const version = useMetadataVersion();
  const [links, setLinks] = useState<Array<{ source: string; lines: number[] }>>([]);

  const activePath = (() => {
    const group = activeGroupId ? groups.get(activeGroupId) : null;
    if (!group?.activeLeafId) return null;
    const leaf = leaves.get(group.activeLeafId);
    return leaf?.state.type === "markdown" ? leaf.state.path : null;
  })();

  const meta = useFileMetadata(activePath);

  useEffect(() => {
    void version;
    if (!activePath) {
      setLinks([]);
      return;
    }
    setLinks(metadataCache.getBacklinks(activePath));
  }, [activePath, version]);

  // ---- Unlinked mentions (lazy-loaded) ----------------------------------
  const [unlinkedExpanded, setUnlinkedExpanded] = useState(false);
  const [unlinkedMatches, setUnlinkedMatches] = useState<UnlinkedFileMatch[] | null>(null);
  const [unlinkedLoading, setUnlinkedLoading] = useState(false);
  const [unlinkedError, setUnlinkedError] = useState<string | null>(null);
  const scanIdRef = useRef(0);

  // Reset cached results when the active file changes; invalidate any
  // in-flight scan via the scanId ref so a late-arriving result is ignored.
  useEffect(() => {
    void activePath;
    scanIdRef.current += 1;
    setUnlinkedMatches(null);
    setUnlinkedLoading(false);
    setUnlinkedError(null);
    setUnlinkedExpanded(false);
  }, [activePath]);

  const runUnlinkedScan = useCallback(async () => {
    if (!activePath) return;
    const needles = [stem(activePath), ...(meta?.aliases ?? [])]
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (needles.length === 0) {
      setUnlinkedMatches([]);
      return;
    }
    const myScanId = ++scanIdRef.current;
    setUnlinkedLoading(true);
    setUnlinkedError(null);
    try {
      const result = await findUnlinkedMentions(activePath, needles);
      if (myScanId !== scanIdRef.current) return;
      setUnlinkedMatches(result);
    } catch (err) {
      if (myScanId !== scanIdRef.current) return;
      setUnlinkedError(err instanceof Error ? err.message : String(err));
      setUnlinkedMatches([]);
    } finally {
      if (myScanId === scanIdRef.current) setUnlinkedLoading(false);
    }
  }, [activePath, meta]);

  // Trigger scan when the section is expanded and we don't have cached results yet.
  useEffect(() => {
    if (unlinkedExpanded && unlinkedMatches === null && !unlinkedLoading) {
      void runUnlinkedScan();
    }
  }, [unlinkedExpanded, unlinkedMatches, unlinkedLoading, runUnlinkedScan]);

  if (!activePath) {
    return <div className="workspace-sidedock-empty-state">{t("backlinks.empty.noActive")}</div>;
  }

  const totalUnlinked = unlinkedMatches?.reduce((sum, m) => sum + m.matches.length, 0) ?? 0;

  return (
    <div className="backlink-pane">
      {links.length === 0 ? (
        <div
          className="workspace-sidedock-empty-state"
          style={{ paddingBottom: "var(--size-4-3)" }}
        >
          {t("backlinks.empty.noLinks")}
        </div>
      ) : (
        <div className="search-result-container mod-global-search">
          {links.map((l) => (
            <div key={l.source} className="search-result">
              <button
                type="button"
                className="tree-item-self is-clickable search-result-file-title"
                onClick={(e) =>
                  workspaceStore.openFile(l.source, { newTab: e.metaKey || e.ctrlKey })
                }
              >
                <span className="tree-item-inner">
                  <span className="tree-item-inner-text">{stem(l.source)}</span>
                </span>
                <span className="tree-item-flair-outer">
                  <span className="tree-item-flair">{l.lines.length}</span>
                </span>
              </button>
              <div className="search-result-file-matches">
                {l.lines.map((ln) => (
                  <button
                    type="button"
                    key={ln}
                    className="search-result-file-match"
                    onClick={(e) =>
                      workspaceStore.openFile(l.source, { newTab: e.metaKey || e.ctrlKey })
                    }
                  >
                    {t("backlinks.line", { line: ln + 1 })}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="unlinked-mentions-section"
        style={{
          borderTop: "1px solid var(--background-modifier-border)",
          marginTop: "var(--size-4-2)",
        }}
      >
        <button
          type="button"
          onClick={() => setUnlinkedExpanded((v) => !v)}
          aria-expanded={unlinkedExpanded}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--size-2-2)",
            width: "100%",
            background: "transparent",
            color: "var(--text-muted)",
            fontSize: "var(--font-ui-smaller)",
            fontWeight: "var(--font-semibold)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "var(--size-4-2) var(--size-4-3)",
            border: 0,
            cursor: "var(--cursor)",
            height: "auto",
            boxShadow: "none",
            justifyContent: "space-between",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {unlinkedExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {t("backlinks.unlinked.title")}
          </span>
          {unlinkedMatches !== null && (
            <span style={{ color: "var(--text-faint)", fontWeight: "var(--font-normal)" }}>
              {totalUnlinked}
            </span>
          )}
        </button>
        {unlinkedExpanded && (
          <div style={{ padding: "0 var(--size-4-3) var(--size-4-3)" }}>
            {unlinkedLoading ? (
              <div style={{ color: "var(--text-faint)", padding: "var(--size-4-2) 0" }}>
                {t("backlinks.unlinked.scanning")}
              </div>
            ) : unlinkedError ? (
              <div className="message mod-error">{unlinkedError}</div>
            ) : unlinkedMatches === null ? null : unlinkedMatches.length === 0 ? (
              <div style={{ color: "var(--text-faint)", padding: "var(--size-4-2) 0" }}>
                {t("backlinks.unlinked.none")}
              </div>
            ) : (
              <div className="search-result-container mod-global-search">
                {unlinkedMatches.map((m) => (
                  <div key={m.source} className="search-result">
                    <button
                      type="button"
                      className="tree-item-self is-clickable search-result-file-title"
                      onClick={(e) =>
                        workspaceStore.openFile(m.source, {
                          newTab: e.metaKey || e.ctrlKey,
                        })
                      }
                    >
                      <span className="tree-item-inner">
                        <span className="tree-item-inner-text">{stem(m.source)}</span>
                      </span>
                      <span className="tree-item-flair-outer">
                        <span className="tree-item-flair">{m.matches.length}</span>
                      </span>
                    </button>
                    <div className="search-result-file-matches">
                      {m.matches.map((match) => (
                        <button
                          type="button"
                          key={`${match.line}:${match.needle}`}
                          className="search-result-file-match"
                          onClick={(e) => {
                            workspaceStore.openFile(m.source, {
                              newTab: e.metaKey || e.ctrlKey,
                            });
                            window.dispatchEvent(
                              new CustomEvent("granite:goto-line", {
                                detail: { path: m.source, line: match.line },
                              }),
                            );
                          }}
                          title={t("backlinks.matchTitle", {
                            line: match.line + 1,
                            needle: match.needle,
                          })}
                          style={{
                            display: "flex",
                            gap: "var(--size-4-2)",
                            alignItems: "baseline",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-faint)",
                              fontSize: "var(--font-ui-smaller)",
                              flexShrink: 0,
                            }}
                          >
                            {t("backlinks.lineShort", { line: match.line + 1 })}
                          </span>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {match.preview}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
