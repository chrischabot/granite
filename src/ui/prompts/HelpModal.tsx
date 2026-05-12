import { useI18n } from "../i18n/useI18n";
import { Modal } from "../overlay/Modal";

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface Section {
  titleKey: string;
  items: Array<{ keys: string; whatKey: string }>;
}

const SECTIONS: Section[] = [
  {
    titleKey: "help.section.workspace",
    items: [
      { keys: "⌘P / Ctrl P", whatKey: "help.workspace.commandPalette" },
      { keys: "⌘O / Ctrl O", whatKey: "help.workspace.quickSwitcher" },
      { keys: "⌘, / Ctrl ,", whatKey: "help.workspace.settings" },
      { keys: "⌘F / Ctrl F", whatKey: "help.workspace.find" },
      { keys: "⌘S / Ctrl S", whatKey: "help.workspace.save" },
    ],
  },
  {
    titleKey: "help.section.editor",
    items: [
      { keys: "[[", whatKey: "help.editor.wikilinkAutocomplete" },
      { keys: "[[##", whatKey: "help.editor.headingSearch" },
      { keys: "# at line start", whatKey: "help.editor.tagAutocomplete" },
      { keys: "/ at line start", whatKey: "help.editor.slashCommands" },
      { keys: "Cmd / Ctrl click", whatKey: "help.editor.openLink" },
      { keys: "Cmd / Ctrl Shift click", whatKey: "help.editor.openLinkNewTab" },
    ],
  },
  {
    titleKey: "help.section.tabs",
    items: [
      { keys: "Drag a tab", whatKey: "help.tabs.drag" },
      { keys: "Middle-click tab", whatKey: "help.tabs.middleClick" },
      { keys: "Right-click tab", whatKey: "help.tabs.rightClick" },
    ],
  },
  {
    titleKey: "help.section.markdown",
    items: [
      { keys: "==text==", whatKey: "help.markdown.highlight" },
      { keys: "[[Note#Heading]]", whatKey: "help.markdown.headingLink" },
      { keys: "[[Note#^block-id]]", whatKey: "help.markdown.blockLink" },
      { keys: "$x^2$ / $$…$$", whatKey: "help.markdown.math" },
      { keys: "```mermaid", whatKey: "help.markdown.mermaid" },
      { keys: "```query", whatKey: "help.markdown.query" },
      { keys: "```backlinks", whatKey: "help.markdown.backlinks" },
      { keys: "> [!info]", whatKey: "help.markdown.callout" },
    ],
  },
  {
    titleKey: "help.section.fileExplorer",
    items: [
      { keys: "F2", whatKey: "help.fileExplorer.rename" },
      { keys: "Cmd / Ctrl Delete", whatKey: "help.fileExplorer.delete" },
      { keys: "Click + Shift / Ctrl", whatKey: "help.fileExplorer.select" },
      { keys: "Drag file onto a folder", whatKey: "help.fileExplorer.move" },
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
                <div key={it.keys} style={{ display: "contents" }}>
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
                    {it.keys}
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
