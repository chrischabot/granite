import { stem } from "@core/fs/path";
import type { VaultFile } from "@core/fs/types";
import { insertTemplate, listTemplates } from "@core/plugins-core/templates";
import { highlightMatches } from "@core/search/fuzzy";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { Prompt } from "../overlay/Prompt";

export function TemplatePicker() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReadonlyArray<VaultFile>>([]);
  const t = useI18n();

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
      placeholder={t("templatePicker.placeholder")}
      items={items}
      toSearchText={(f) => stem(f.path)}
      renderItem={(f, match) => {
        const segs = highlightMatches(stem(f.path), match?.indices);
        let segmentOffset = 0;
        const keyedSegments = segs.map((s) => {
          const key = `${s.matched ? "matched" : "plain"}-${segmentOffset}-${s.text}`;
          segmentOffset += s.text.length;
          return { ...s, key };
        });
        return (
          <div className="suggestion-item-row mod-complex">
            <div className="suggestion-content">
              <div className="suggestion-title">
                {keyedSegments.map((s) =>
                  s.matched ? (
                    <span key={s.key} className="suggestion-highlight">
                      {s.text}
                    </span>
                  ) : (
                    <span key={s.key}>{s.text}</span>
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
        { command: "↵", description: t("templatePicker.instruction.insert") },
        { command: "esc", description: t("prompt.instruction.dismiss") },
      ]}
    />
  );
}
