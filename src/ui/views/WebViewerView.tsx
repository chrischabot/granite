import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClickableIcon } from "../controls/ClickableIcon";

export interface WebViewerViewProps {
  url: string;
}

export function WebViewerView({ url }: WebViewerViewProps) {
  const [src, setSrc] = useState(url);
  const [bar, setBar] = useState(url);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync incoming URL prop changes.
  useEffect(() => {
    setSrc(url);
    setBar(url);
  }, [url]);

  const submit = useCallback(() => {
    let next = bar.trim();
    if (!next) return;
    // Add protocol when missing — assume https for clarity.
    if (!/^[a-z][a-z0-9+.-]*:/i.test(next) && !next.startsWith("//")) {
      next = `https://${next}`;
    }
    setSrc(next);
  }, [bar]);

  return (
    <div
      className="webviewer-container"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        className="webviewer-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--size-4-1)",
          padding: "var(--size-4-1) var(--size-4-3)",
          background: "var(--background-secondary)",
          borderBottom: "1px solid var(--background-modifier-border)",
        }}
      >
        <ClickableIcon
          ariaLabel="Back"
          icon={<ArrowLeft />}
          onClick={() => {
            // Iframes don't expose history navigation cross-origin; tell the
            // user via window.history when same-origin.
            try {
              iframeRef.current?.contentWindow?.history?.back();
            } catch {
              /* cross-origin: no-op */
            }
          }}
        />
        <ClickableIcon
          ariaLabel="Forward"
          icon={<ArrowRight />}
          onClick={() => {
            try {
              iframeRef.current?.contentWindow?.history?.forward();
            } catch {
              /* cross-origin: no-op */
            }
          }}
        />
        <ClickableIcon
          ariaLabel="Reload"
          icon={<RefreshCw />}
          onClick={() => setReloadKey((k) => k + 1)}
        />
        <input
          type="text"
          value={bar}
          onChange={(e) => setBar(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          style={{ flex: "1 1 auto" }}
          placeholder="Enter a URL..."
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
      <iframe
        ref={iframeRef}
        key={reloadKey}
        src={src}
        title={src}
        style={{ flex: "1 1 auto", width: "100%", border: 0, background: "white" }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}