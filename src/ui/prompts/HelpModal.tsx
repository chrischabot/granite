import { useI18n } from "../i18n/useI18n";
import { Modal } from "../overlay/Modal";

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface Section {
  titleKey: string;
  items: Array<{ keysKey: string; whatKey: string }>;
}

const SECTIONS: Section[] = [
  {
    titleKey: "help.section.workspace",
    items: [
      { keysKey: "help.keys.commandPalette", whatKey: "help.workspace.commandPalette" },
      { keysKey: "help.keys.quickSwitcher", whatKey: "help.workspace.quickSwitcher" },
      { keysKey: "help.keys.settings", whatKey: "help.workspace.settings" },
      { keysKey: "help.keys.find", whatKey: "help.workspace.find" },
      { keysKey: "help.keys.save", whatKey: "help.workspace.save" },
    ],
  },
  {
    titleKey: "help.section.editor",
    items: [
      { keysKey: "help.keys.wikilinkAutocomplete", whatKey: "help.editor.wikilinkAutocomplete" },
      { keysKey: "help.keys.headingSearch", whatKey: "help.editor.headingSearch" },
      { keysKey: "help.keys.tagAutocomplete", whatKey: "help.editor.tagAutocomplete" },
      { keysKey: "help.keys.slashCommands", whatKey: "help.editor.slashCommands" },
      { keysKey: "help.keys.openLink", whatKey: "help.editor.openLink" },
      { keysKey: "help.keys.openLinkNewTab", whatKey: "help.editor.openLinkNewTab" },
    ],
  },
  {
    titleKey: "help.section.tabs",
    items: [
      { keysKey: "help.keys.dragTab", whatKey: "help.tabs.drag" },
      { keysKey: "help.keys.middleClickTab", whatKey: "help.tabs.middleClick" },
      { keysKey: "help.keys.rightClickTab", whatKey: "help.tabs.rightClick" },
    ],
  },
  {
    titleKey: "help.section.markdown",
    items: [
      { keysKey: "help.keys.highlight", whatKey: "help.markdown.highlight" },
      { keysKey: "help.keys.headingLink", whatKey: "help.markdown.headingLink" },
      { keysKey: "help.keys.blockLink", whatKey: "help.markdown.blockLink" },
      { keysKey: "help.keys.math", whatKey: "help.markdown.math" },
      { keysKey: "help.keys.mermaid", whatKey: "help.markdown.mermaid" },
      { keysKey: "help.keys.query", whatKey: "help.markdown.query" },
      { keysKey: "help.keys.backlinks", whatKey: "help.markdown.backlinks" },
      { keysKey: "help.keys.callout", whatKey: "help.markdown.callout" },
    ],
  },
  {
    titleKey: "help.section.fileExplorer",
    items: [
      { keysKey: "help.keys.rename", whatKey: "help.fileExplorer.rename" },
      { keysKey: "help.keys.delete", whatKey: "help.fileExplorer.delete" },
      { keysKey: "help.keys.select", whatKey: "help.fileExplorer.select" },
      { keysKey: "help.keys.move", whatKey: "help.fileExplorer.move" },
    ],
  },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  const t = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t("help.title")} modifier="mod-narrow">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--size-4-4)",
          fontSize: "var(--font-ui-small)",
        }}
      >
        {SECTIONS.map((section) => (
          <section key={section.titleKey}>
            <h3
              style={{
                fontSize: "var(--font-ui-medium)",
                margin: "0 0 var(--size-4-2)",
                color: "var(--text-normal)",
              }}
            >
              {t(section.titleKey)}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(160px, 200px) 1fr",
                columnGap: "var(--size-4-4)",
                rowGap: "var(--size-2-3)",
              }}
            >
              {section.items.map((it) => (
                <div key={it.keysKey} style={{ display: "contents" }}>
                  <kbd
                    style={{
                      fontFamily: "var(--font-monospace)",
                      fontSize: "var(--font-ui-smaller)",
                      background: "var(--background-secondary)",
                      color: "var(--text-normal)",
                      padding: "1px 6px",
                      borderRadius: "var(--radius-s)",
                      whiteSpace: "nowrap",
                      alignSelf: "start",
                      lineHeight: 1.6,
                    }}
                  >
                    {t(it.keysKey)}
                  </kbd>
                  <span style={{ color: "var(--text-muted)", alignSelf: "center" }}>
                    {t(it.whatKey)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div style={{ color: "var(--text-faint)", marginTop: "var(--size-4-2)" }}>
          {t("help.footer")}
        </div>
      </div>
    </Modal>
  );
}
