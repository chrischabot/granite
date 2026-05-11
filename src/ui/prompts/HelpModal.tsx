import { Modal } from "../overlay/Modal";

export interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface Section {
  title: string;
  items: Array<{ keys: string; what: string }>;
}

const SECTIONS: Section[] = [
  {
    title: "Workspace",
    items: [
      { keys: "⌘P / Ctrl P", what: "Open the command palette" },
      { keys: "⌘O / Ctrl O", what: "Open the quick switcher" },
      { keys: "⌘, / Ctrl ,", what: "Open settings" },
      { keys: "⌘F / Ctrl F", what: "Find in the active note" },
      { keys: "⌘S / Ctrl S", what: "Save the active note" },
    ],
  },
  {
    title: "Editor",
    items: [
      { keys: "[[", what: "Open the wikilink autocomplete" },
      { keys: "[[##", what: "Cross-vault heading search" },
      { keys: "# at line start", what: "Tag autocomplete" },
      { keys: "/ at line start", what: "Slash command palette" },
      { keys: "Cmd / Ctrl click", what: "Open the wikilink under cursor" },
      { keys: "Cmd / Ctrl Shift click", what: "Open the wikilink in a new tab" },
    ],
  },
  {
    title: "Tabs & windows",
    items: [
      { keys: "Drag a tab", what: "Reorder, or drop onto a group" },
      { keys: "Middle-click tab", what: "Close that tab" },
      { keys: "Right-click tab", what: "Tab actions (split, pop out, pin, …)" },
    ],
  },
  {
    title: "Markdown extras",
    items: [
      { keys: "==text==", what: "Highlight" },
      { keys: "[[Note#Heading]]", what: "Link to a heading" },
      { keys: "[[Note#^block-id]]", what: "Link to a block ID" },
      { keys: "$x^2$ / $$…$$", what: "Inline / block math (KaTeX)" },
      { keys: "```mermaid", what: "Mermaid diagram fence" },
      { keys: "```query", what: "Embedded live search results" },
      { keys: "```backlinks", what: "Embedded backlinks list" },
      { keys: "> [!info]", what: "Callout (note/tip/warning/danger/…)" },
    ],
  },
  {
    title: "File explorer",
    items: [
      { keys: "F2", what: "Rename the selected file" },
      { keys: "Cmd / Ctrl Delete", what: "Delete the selected file(s)" },
      { keys: "Click + Shift / Ctrl", what: "Range / toggle selection" },
      { keys: "Drag file onto a folder", what: "Move (wikilinks rewrite themselves)" },
    ],
  },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Granite cheat-sheet" modifier="mod-narrow">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--size-4-4)",
          fontSize: "var(--font-ui-small)",
        }}
      >
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h3
              style={{
                fontSize: "var(--font-ui-medium)",
                margin: "0 0 var(--size-4-2)",
                color: "var(--text-normal)",
              }}
            >
              {section.title}
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
                    {it.what}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div style={{ color: "var(--text-faint)", marginTop: "var(--size-4-2)" }}>
          More commands live in the command palette (⌘P / Ctrl P). The full settings
          modal (⌘, / Ctrl ,) exposes hotkey overrides, plugin toggles, theme picker,
          and CSS snippet management.
        </div>
      </div>
    </Modal>
  );
}