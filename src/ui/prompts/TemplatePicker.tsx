import { useEffect, useState } from "react";
import { Prompt } from "../overlay/Prompt";
import { highlightMatches } from "@core/search/fuzzy";
import { stem } from "@core/fs/path";
import { insertTemplate, listTemplates } from "@core/plugins-core/templates";
import type { VaultFile } from "@core/fs/types";

export function TemplatePicker() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReadonlyArray<VaultFile>>([]);

  useEffect(() => {
    const onOpen = () => {
      void listTemplates().then((list) => {
        setItems(list);
        setOpen(true);
      });
    };
    window.addEventListener("granite:open-template-picker", onOpen);
    return () => window.removeEventListener("granite:open-template-picker", onOpen);
  }, []);

  return (
    <Prompt<VaultFile>
      open={open}
      onClose={() => setOpen(false)}
      placeholder="Pick a template…"
      items={items}
      toSearchText={(f) => stem(f.path)}
      renderItem={(f, match) => {
        const segs = highlightMatches(stem(f.path), match?.indices);
        return (
          <div className="suggestion-item-row mod-complex">
            <div className="suggestion-content">
              <div className="suggestion-title">
                {segs.map((s, i) =>
                  s.matched ? (
                    <span key={i} className="suggestion-highlight">
                      {s.text}
                    </span>
                  ) : (
                    <span key={i}>{s.text}</span>
                  ),
                )}
              </div>
              <div className="suggestion-note">{f.path}</div>
            </div>
          </div>
        );
      }}
      onActivate={(f) => {
        setOpen(false);
        setTimeout(() => void insertTemplate(f.path), 0);
      }}
      instructions={[
        { command: "↵", description: "to insert" },
        { command: "esc", description: "to dismiss" },
      ]}
    />
  );
}