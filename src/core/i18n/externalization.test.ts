import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SEARCH_VIEW_FORBIDDEN_PATTERNS = [
  /placeholder="Search… \(tag: path: file: line: -exclude\)"/,
  />\s*Match case\s*</,
  />\s*Sort\s*</,
  />\s*Relevance\s*</,
  />\s*Modified \(newest\)\s*</,
  />\s*Modified \(oldest\)\s*</,
  />\s*Keep typing… \(need at least 2 characters\)\s*</,
  /"Searching…"/,
  /"No results\."/,
];

const TAGS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*No tags found\.\s*</,
  />\s*Show nested tags\s*</,
  /label: `Filter search by #/,
  /label: `Rename #/,
  /aria-label=\{`\$\{isCollapsed \? "Expand" : "Collapse"\}/,
];

const OUTGOING_LINKS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its outgoing links\.\s*</,
  />\s*No outgoing links in this note\.\s*</,
  />\s*L\{l\.line \+ 1\}\s*</,
];

const BACKLINKS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its backlinks\.\s*</,
  />\s*No backlinks found\.\s*</,
  />\s*Line \{ln \+ 1\}\s*</,
  />\s*Unlinked mentions\s*</,
  />\s*Scanning vault…\s*</,
  />\s*No unlinked mentions found\.\s*</,
  /title=\{`Line \$\{match\.line \+ 1\} — matched/,
  />\s*L\{match\.line \+ 1\}\s*</,
];

const RECENTS_VIEW_FORBIDDEN_PATTERNS = [
  />\s*No recent files yet\. Open a note to start the list\.\s*</,
  /aria-label="Remove from recents"/,
];

const FOOTNOTES_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its footnotes\.\s*</,
  />\s*No footnotes in this note\.\s*</,
  /"No definition for this footnote reference"/,
  /reference\$\{fn\.references\.length === 1 \? "" : "s"\}/,
  />\s*missing\s*</,
];

const OUTLINE_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its outline\.\s*</,
  />\s*No headings in this note\.\s*</,
  /placeholder="Filter headings…"/,
  />\s*No headings match filter\.\s*</,
];

const SIDEBAR_REGISTRY_FORBIDDEN_PATTERNS = [
  /label: "Files"/,
  /label: "Search"/,
  /label: "Bookmarks"/,
  /label: "Tags"/,
  /label: "Backlinks"/,
  /label: "Outgoing links"/,
  /label: "Outline"/,
  /label: "Recent files"/,
  /label: "Local graph"/,
  /label: "File properties"/,
  /label: "All properties \(vault\)"/,
  /label: "Footnotes"/,
];

const SIDEBAR_SHELL_FORBIDDEN_PATTERNS = [
  /ariaLabel=\{t\.label\}/,
  /Open \$\{activeTab\?\.label \?\? group\.active\} in central area/,
  /Split \$\{activeTab\?\.label \?\? group\.active\} sidebar group/,
  /Close \$\{activeTab\?\.label \?\? group\.active\} sidebar group/,
];

const LOCAL_GRAPH_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Open a note to see its local graph\.\s*</,
  /"No links yet"/,
  /`\$\{count\} neighbor\$\{count === 1 \? "" : "s"\}`/,
];

const SIDEBAR_LEAF_VIEW_FORBIDDEN_PATTERNS = [/>\s*Sidebar view is no longer available\.\s*</];

const PROPERTIES_VIEW_FORBIDDEN_PATTERNS = [
  /"Could not update property"/,
  /"Could not remove property"/,
  /prompt\("New property name:"\)/,
  />\s*Open a note to see its properties\.\s*</,
  />\s*No properties on this note\. Click\s*</,
  />\s*Add property\s*</,
  /placeholder="comma, separated, values"/,
  /aria-label=\{`Remove property \$\{propKey\}`\}/,
];

const ALL_PROPERTIES_VIEW_FORBIDDEN_PATTERNS = [
  />\s*No properties found across vault\.\s*</,
  /`Override set to "\$\{override\}"\. Reset to clear\.`/,
  /`Inferred type: \$\{effective\}`/,
  /`\(inferred: \$\{p\.inferredType\}\)`/,
  /`\$\{p\.count\} note\$\{p\.count === 1 \? "" : "s"\} use this property`/,
];

const RIBBON_FORBIDDEN_PATTERNS = [
  /label: "Open quick switcher"/,
  /label: "Open command palette"/,
  /label: "Open graph view"/,
  /label: "Create new canvas"/,
  /label: "Create new base"/,
  /label: "Open today's daily note"/,
  /label: "Manage workspace layouts"/,
  /label: "Insert template"/,
  /label: "Create new unique note"/,
  /label: "Open random note"/,
  /label: "Start\/stop recording"/,
  /label: "Manage vaults"/,
  /label: "Open help"/,
  /label: "Open settings"/,
];

const STATUS_BAR_FORBIDDEN_PATTERNS = [
  />\s*Local-only\s*</,
  /\? "word" : "words"/,
  /aria-label="Toggle editing \/ reading mode"/,
  /title="Click to toggle editing \/ reading mode"/,
  /\? "Read" : "Edit"/,
];

const VAULT_PROFILE_FORBIDDEN_PATTERNS = [
  /aria-label="Switch vault"/,
  /\?\? "No vault"/,
  /ariaLabel="Open settings"/,
];

const FILE_EXPLORER_FORBIDDEN_PATTERNS = [
  /prompt\("New note name:", "Untitled\.md"\)/,
  /prompt\("New folder name:", "Untitled"\)/,
  /"Invalid filename\."/,
  /`A file named "\$\{fullPath\}" already exists`/,
  /`A file named "\$\{newPath\}" already exists`/,
  /Delete "\$\{stem\(path\)\}" using/,
  /Delete \$\{paths\.length\} selected file/,
  /"Moved to vault trash\."/,
  /"Moved to system trash\."/,
  /"Deleted\."/,
  /Deleted with \$\{failures\} failure\(s\)\./,
  /Moved and updated \$\{linksRewritten\}/,
  /Imported \$\{imported\} file/,
  /label: "Reveal contents"/,
  /label: "Delete folder"/,
  /label: "Open in current tab"/,
  /label: "Open in new tab"/,
  /label: "Rename"/,
  /label: "Delete"/,
  /item\("name-asc", "Name \(A → Z\)"\)/,
  /item\("name-desc", "Name \(Z → A\)"\)/,
  /item\("mtime-desc", "Modified \(newest first\)"\)/,
  /item\("mtime-asc", "Modified \(oldest first\)"\)/,
  /item\("ctime-desc", "Created \(newest first\)"\)/,
  /item\("ctime-asc", "Created \(oldest first\)"\)/,
  /ariaLabel="New note"/,
  /ariaLabel="New folder"/,
  /ariaLabel="Sort order"/,
  />\s*No vault open\. Open a folder to begin\.\s*</,
  />\s*Loading…\s*</,
  />\s*Empty vault\. Create a note to start\.\s*</,
  />\s*All files in this vault are excluded by your filters\.\s*</,
];

const PROMPT_FORBIDDEN_PATTERNS = [/No matches\./];

const QUICK_SWITCHER_FORBIDDEN_PATTERNS = [
  /"Could not open note"/,
  /"Loading vault\.\.\."/,
  /"Find or create a note\.\.\."/,
  /`Create new note: \$\{trimmed\}`/,
  />\s*alias for\s*\{/,
  />\s*recent\s*</,
  />\s*new\s*</,
  /description: "to open"/,
  /description: "open in new tab"/,
  /description: "create new note"/,
  /description: "to dismiss"/,
];

const COMMAND_PALETTE_FORBIDDEN_PATTERNS = [
  /placeholder="Type a command\.\.\."/,
  /"Unpin command"/,
  /"Pin command"/,
  /description: "to run"/,
  /description: "pin \/ unpin"/,
  /description: "to dismiss"/,
];

const TEMPLATE_PICKER_FORBIDDEN_PATTERNS = [
  /placeholder="Pick a template…"/,
  /description: "to insert"/,
  /description: "to dismiss"/,
];

const MODAL_FORBIDDEN_PATTERNS = [
  /\|\| "Dialog"/,
  /`Opened dialog: \$\{label\}`/,
  /aria-label="Close"/,
];

const VAULT_PICKER_FORBIDDEN_PATTERNS = [
  /prompt\("Name for the in-browser vault\?", "My vault"\)/,
  /title="Manage vaults"/,
  /Granite stores notes as plain Markdown files/,
  />\s*Recent vaults\s*</,
  /\? "On disk" : "In-browser"/,
  />\s*Active\s*</,
  />\s*Open\s*</,
  /`Open \$\{v\.name\} in new window`/,
  /`Remove \$\{v\.name\}`/,
  />\s*New vault\s*</,
  /"Pick a folder on your computer"/,
  /"Folder picking requires a Chromium browser"/,
  />\s*Pick a folder\.\.\.\s*</,
  /title="Create an in-browser vault using Origin Private Filesystem"/,
  />\s*In-browser vault\s*</,
];

const VAULT_CONTEXT_FORBIDDEN_PATTERNS = [
  /Could not bootstrap pop-out/,
  /Reopen "\$\{recent\.name\}"\? Click here to grant folder access\./,
  /"Could not reopen vault"/,
  /Plugin loader failed/,
  /Vault \$\{id\} not in registry/,
  /"Folder handle was lost; please re-pick the folder"/,
  /"Read\/write permission was denied for this folder"/,
];

const FS_HANDLE_ADAPTER_FORBIDDEN_PATTERNS = [
  /File System Access API is not available in this browser/,
  /Read\/write permission not granted for this folder/,
  /Origin Private File System is not available in this browser/,
  /reason: "Empty path"/,
  /reason: "Directory rename not yet implemented"/,
];

const FS_TRASH_FORBIDDEN_PATTERNS = [
  /Could not find an available vault trash path/,
  /System trash is not available from the browser File System Access adapter/,
  /Choose Vault trash or Permanent deletion/,
];

const HELP_MODAL_FORBIDDEN_PATTERNS = [
  /title: "Workspace"/,
  /what: "Open the command palette"/,
  /title: "Editor"/,
  /what: "Open the wikilink autocomplete"/,
  /title: "Tabs & windows"/,
  /what: "Tab actions \(split, pop out, pin, …\)"/,
  /title: "Markdown extras"/,
  /what: "Embedded live search results"/,
  /title: "File explorer"/,
  /what: "Rename the selected file"/,
  /keys: "Cmd \/ Ctrl click"/,
  /keys: "Cmd \/ Ctrl Shift click"/,
  /keys: "Drag a tab"/,
  /keys: "Middle-click tab"/,
  /keys: "Right-click tab"/,
  /keys: "Cmd \/ Ctrl Delete"/,
  /keys: "Click \+ Shift \/ Ctrl"/,
  /keys: "Drag file onto a folder"/,
  /title="Granite cheat-sheet"/,
  /More commands live in the command palette/,
];

const BOOKMARKS_VIEW_FORBIDDEN_PATTERNS = [
  /const DEFAULT_GROUP = "Bookmarks"/,
  /noticeManager\.show\("This note has no headings to bookmark\."/,
  /"No block IDs in this note\. Use the 'Insert block id' command first\."/,
  /`Pick a heading:\\n/,
  /`Pick a block id:\\n/,
  /prompt\("Search query to bookmark:", ""\)/,
  /prompt\("New bookmark group name:", ""\)/,
  /ariaLabel="Add bookmark…"/,
  />\s*Bookmark current note\s*</,
  />\s*Bookmark current heading…\s*</,
  />\s*Bookmark a block id…\s*</,
  />\s*Bookmark a search query…\s*</,
  />\s*New group…\s*</,
  /title="New bookmarks land in this group"/,
  />\s*No bookmarks yet\.\s*</,
  /aria-label="Remove bookmark"/,
];

const GRAPH_VIEW_FORBIDDEN_PATTERNS = [
  /"No notes match the current filter\."/,
  /"Vault has no markdown files yet — create some notes to populate the graph\."/,
  /aria-label="Vault graph"/,
  />Vault graph</,
  /nodes · \{edges\.length\} links · drag to pan, scroll to zoom/,
  /"Hide graph controls"/,
  /"Show graph controls"/,
  />\s*Graph controls\s*</,
  /aria-label="Close controls"/,
  /<ControlBlock title="Filter">/,
  /placeholder="tag:project -draft"/,
  /Search syntax:/,
  /<ControlBlock title="Local graph">/,
  />\s*Show only neighbors of the active file\s*</,
  /label="Hops"/,
  /<ControlBlock title="Color by">/,
  />Neutral</,
  />Tag \(dominant\)</,
  />Top-level folder</,
  />Groups \(below\)</,
  /<ControlBlock title="Groups">/,
  /No groups yet\. Click/,
  /placeholder="Name"/,
  /placeholder="tag:work"/,
  /`Remove group \$\{g\.name\}`/,
  /name: "New group"/,
  />\s*Add group\s*</,
  /<ControlBlock title="Display">/,
  /label="Node size"/,
  /label="Link thickness"/,
  /label="Label size"/,
  /label="Label threshold"/,
  /<ControlBlock title="Forces">/,
  /label="Repulsion"/,
  /label="Edge attraction"/,
  /label="Link distance"/,
  /label="Center gravity"/,
  />\s*Reset display & forces\s*</,
];

const FILE_RECOVERY_MODAL_FORBIDDEN_PATTERNS = [
  /"Could not load snapshots"/,
  /"Snapshot copied\."/,
  /"Snapshot restored\."/,
  /confirm\("Clear all recovery snapshots\?"\)/,
  /"Recovery snapshots cleared\."/,
  /title="File recovery"/,
  /aria-label="Recovery snapshots"/,
  />\s*Filename\s*</,
  /"Filter files"/,
  />\s*Loading snapshots…\s*</,
  />\s*No snapshots found\.\s*</,
  /\{snapshot\.content\.length\} bytes/,
  />\s*Clear\s*</,
  />\s*Show changes\s*</,
  />\s*Copy\s*</,
  />\s*Restore\s*</,
];

const INSTALL_PLUGIN_MODAL_FORBIDDEN_PATTERNS = [
  /"Manifest is not valid JSON"/,
  /"Manifest must be a JSON object"/,
  /"Manifest must include `id`, `name`, and `version` strings"/,
  /"Plugin `id` may only contain letters, digits, dashes, or underscores"/,
  /"Could not derive base URL from manifest URL"/,
  /`HTTP \$\{response\.status\} while fetching \$\{label\}`/,
  /"Plugin `main` must be a flat filename \(no slashes\)"/,
  /`Registry entry "\$\{entry\.id\}" points to manifest id "\$\{latestManifest\.id\}"`/,
  /`Installed "\$\{preview\.manifest\.name\}"\. Enable it from Settings → Plugins\.`/,
  /title="Install community plugin"/,
  /Browse the official Obsidian community registry/,
  /placeholder="Search community plugins"/,
  />\s*Loading community registry…\s*</,
  />\s*Manual manifest URL\s*</,
  /placeholder="https:\/\/raw\.githubusercontent\.com\/\.\.\.\/manifest\.json"/,
  />\s*\{fetching \? "Fetching…" : "Fetch"\}\s*</,
  /by \{preview\.manifest\.author\}/,
  /KB of plugin code will be written to/,
  />\s*Cancel\s*</,
  />\s*\{writing \? "Installing…" : "Install"\}\s*</,
];

const COMMUNITY_PLUGIN_REGISTRY_FORBIDDEN_PATTERNS = [
  /"Community plugin registry is not valid JSON"/,
  /"Community plugin registry must be a JSON array"/,
  /`HTTP \$\{response\.status\} while fetching community plugin registry`/,
];

const SETTINGS_MODAL_FORBIDDEN_PATTERNS = [
  /ariaLabel="Settings"/,
  /placeholder="Search settings"/,
  />\s*Options\s*</,
  />\s*Plugin options\s*</,
  />\s*No settings match your search\.\s*</,
  />\s*Base color scheme\s*</,
  /"Choose between light, dark, or follow the operating system\."/,
  />\s*Adapt to system\s*</,
  />\s*Accent color\s*</,
  />\s*High contrast\s*</,
  />\s*Translucent window\s*</,
  />\s*Themes\s*</,
  /"No themes found in \.granite\/themes\/\."/,
  /theme\$\{themes\.length === 1 \? "" : "s"\} available/,
  />\s*None \(default Granite theme\)\s*</,
  />\s*CSS snippets\s*</,
  />\s*No snippets found\.\s*</,
  />\s*Default view mode for new tabs\s*</,
  />\s*Editing \(source\)\s*</,
  />\s*Reading view\s*</,
  />\s*Show line numbers\s*</,
  />\s*Readable line length\s*</,
  />\s*Auto-pair brackets\s*</,
  />\s*Spellcheck\s*</,
  />\s*Live preview\s*</,
  />\s*Editor key bindings\s*</,
  />\s*Standard\s*</,
  />\s*Files & links\s*</,
  />\s*Default folder for new notes\s*</,
  /placeholder="\(vault root\)"/,
  /placeholder="attachments"/,
  />\s*Confirm file deletion\s*</,
  />\s*Deleted files\s*</,
  />\s*System trash\s*</,
  />\s*Vault trash \(\.trash\)\s*</,
  />\s*Permanently delete\s*</,
  />\s*Excluded files\s*</,
  /placeholder=\{"archive\\n\*\.tmp\\nprivate\/\*\*"\}/,
  />\s*Hotkeys\s*</,
  />\s*Plugins\s*</,
  />\s*Install plugin from URL…\s*</,
  />\s*Check for updates\s*</,
  />\s*No plugins found\.\s*</,
  />\s*Daily notes\s*</,
  /placeholder="YYYY-MM-DD"/,
  />\s*Template folder location\s*</,
  /placeholder="\(no folder set\)"/,
  /placeholder="HH:mm"/,
  />\s*Time format\s*</,
  /`Error rendering tab: \$\{err instanceof Error \? err\.message : String\(err\)\}`/,
  />\s*Press a key…\s*</,
  />\s*Add\s*</,
  />\s*Remove\s*</,
  />\s*Reset\s*</,
];

const SETTINGS_FILTER_FORBIDDEN_PATTERNS = [
  /title: "Appearance"/,
  /title: "Editor"/,
  /title: "Files & links"/,
  /title: "Hotkeys"/,
  /title: "Plugins"/,
  /title: "Daily notes"/,
  /title: "Templates"/,
];

const WORKSPACE_CHROME_FORBIDDEN_PATTERNS = [
  /ariaLabel="Navigate back"/,
  /ariaLabel="Navigate forward"/,
  /ariaLabel="New tab"/,
  /ariaLabel=\{stacked \? "Unstack tabs" : "Stack tabs vertically"\}/,
  /ariaLabel="Close this tab group"/,
  /label: "Close"/,
  /label: "Close other tabs"/,
  /label: "Close tabs to the right"/,
  /label: "Split right"/,
  /label: "Split down"/,
  /label: "Open in new window"/,
  /label: isPinned \? "Unpin tab" : "Pin tab"/,
  /aria-label="Unpin tab"/,
  /aria-label="Close tab"/,
  /ariaLabel=\{isReading \? "Edit this note" : "Read this note"\}/,
  />\s*Welcome to Granite\s*</,
  /A local-first, Markdown-native, linked-thinking knowledge base/,
  /title=\{\s*canPickFolder\s*\?\s*"Pick a folder on your computer"/,
  /prompt\("Name for the in-browser vault\?", "My vault"\)/,
  /title="Create a vault stored inside the browser"/,
  />\s*Pick a folder…\s*</,
  />\s*In-browser vault\s*</,
  />\s*Already have a vault\?\s*</,
  />\s*Open the vault switcher\s*</,
  />\s*No file open\s*</,
  />\s*Click a file in the sidebar, press\s*</,
  />\s*for the command palette\.\s*</,
  /`Active tab: \$\{leafTitle\(activeLeaf\)\}`/,
  /leafTitle\(activeLeaf\)/,
];

const WORKSPACE_LEAF_TITLE_FORBIDDEN_PATTERNS = [
  /export function leafTitle/,
  /return "Files"/,
  /return "Settings"/,
  /return "Web viewer"/,
  /return "File"/,
  /return "Asset"/,
  /return "Graph view"/,
  /return "Canvas"/,
  /return "Base"/,
  /return "New tab"/,
  /"Untitled"/,
];

const ASSET_VIEW_FORBIDDEN_PATTERNS = [/>\s*Loading file…\s*</, /"Loading file…"/];

const MARKDOWN_VIEW_FORBIDDEN_PATTERNS = [
  /"Could not read this file\. Save is disabled to prevent overwrite\."/,
  /"Could not save attachment"/,
  /"Dropped file paths are not available from this host\."/,
  /"Some dropped file paths were not available from this host\."/,
  />\{readError \?\? "Could not read this file\."\}<\//,
  /\? "Saving…"/,
  /\? "Saved"/,
  /\? "Editing…"/,
  /\? "Save failed"/,
  /`alias for \$\{targetStem\}`/,
];

const WEB_VIEWER_FORBIDDEN_PATTERNS = [
  /ariaLabel="Back"/,
  /ariaLabel="Forward"/,
  /ariaLabel="Reload"/,
  /placeholder="Enter a URL\.\.\."/,
];

const READING_VIEW_FORBIDDEN_PATTERNS = [
  /openButton\.textContent = "Open"/,
  /`Open \$\{stem\(cleanPath\)\} canvas`/,
  /const kindLabel = "Base"/,
  /node\$\{n === 1 \? "" : "s"\}/,
  /edge\$\{ec === 1 \? "" : "s"\}/,
  /`Filter: \$\{filter\}`/,
  /column\$\{config\.columns\.length === 1 \? "" : "s"\}/,
  /Circular embed — already on screen\./,
  /File not found: \$\{escapeAttr\(targetPath\)\}/,
  /title="Open \$\{escapeAttr\(stem\(targetPath\)\)\}"/,
  />Base</,
  />Loading…</,
  />No results\.</,
  />Running…</,
  />Backlinks</,
  />No backlinks yet\.</,
  /"Query failed"/,
  /reference\$\{l\.lines\.length === 1 \? "" : "s"\}/,
  />Properties · \{entries\.length\}</,
];

const CANVAS_VIEW_FORBIDDEN_PATTERNS = [
  /"Could not save canvas"/,
  /prompt\("Text for the new node:", ""\)/,
  />\s*Open or create a `\.canvas` file to use this view\.\s*</,
  />\s*Loading canvas…\s*</,
  /aria-label="Add text node"/,
  /title="Add text node"/,
  /aria-label=\{snapToGrid \? "Disable snap to grid" : "Enable snap to grid"\}/,
  /data-tooltip=\{snapToGrid \? "Disable snap to grid" : "Enable snap to grid"\}/,
  /aria-label="Zoom in"/,
  /aria-label="Zoom out"/,
  /aria-label="Fit to content"/,
  /title="Fit to content"/,
  /aria-label="Node color"/,
  /\? "No color" : `Color \$\{c\}`/,
  /\? "Clear color" : `Set color \$\{c\}`/,
  /aria-label="Delete selected"/,
  /title="Delete selected"/,
  /node\s*\{canvas\.nodes\.length === 1 \? "" : "s"\}/,
  /`Drag to connect \(\$\{s\.side\}\)`/,
  /title="Drag to resize"/,
  /"\(no file\)"/,
  />\s*Double-click to open the file in a new tab\.\s*</,
  />\s*Link\s*</,
];

const BASES_VIEW_FORBIDDEN_PATTERNS = [
  />\s*Bases\s*</,
  />\s*Open a `\.base` YAML file to use this view\.\s*</,
  />\s*Loading base…\s*</,
  />\s*No matching files\.\s*</,
  />\s*Map coordinates from\s*</,
  /aria-label="Map view"/,
  /aria-label=\{`Open \$\{stem\(point\.row\.file\.path\)\}`\}/,
  />\s*No rows have valid latitude and longitude values\.\s*</,
  />Loading…</,
  /class="bases-fence-empty">No matching files\./,
  /schemaColumnLabel/,
  /columnLabel as builtInColumnLabel/,
  /export function columnLabel\(key: ColumnKey\)/,
  /filter: <code>/,
  /"no filter"/,
  /match\{filtered\.length === 1 \? "" : "es"\}/,
  /grouped by \{config\.groupBy\}/,
  /`A file named "\$\{path\}" already exists`/,
  /name: "Untitled base"/,
  /\{config\.name\}/,
  /\$\{escapeHtml\(config\.name\)\}/,
];

const INLINE_AND_OVERLAY_FORBIDDEN_PATTERNS = [
  /"That name contains invalid characters\."/,
  /"Could not rename file"/,
  /`A file named "\$\{newPath\}" already exists`/,
  /Renamed and updated \$\{linksRewritten\}/,
  /Renamed, but could not update outgoing wikilinks/,
  /title="Double-click to rename"/,
  /"Unknown error"/,
  /Granite hit an error/,
  />\s*Component stack\s*</,
  />\s*Reload Granite\s*</,
  />\s*Dismiss and continue\s*</,
  /Your vault contents are stored as plain Markdown/,
  />\s*File not found in vault\.\s*</,
  />\s*Loading…\s*</,
  /aria-label="Dismiss"/,
];

const COMMAND_BOOTSTRAP_FORBIDDEN_PATTERNS = [
  /name: "Open command palette"/,
  /name: "Open quick switcher"/,
  /name: "Open vault switcher"/,
  /name: "Open settings"/,
  /category: "Help"/,
  /name: "Show keyboard cheat-sheet"/,
  /category: "Plugins"/,
  /name: "Install plugin from URL…"/,
  /name: "Check for plugin updates"/,
  /category: "Appearance"/,
  /name: "Toggle light\/dark theme"/,
  /category: "Editor"/,
  /name: "Split right"/,
  /name: "Split down"/,
  /name: "Close current tab group"/,
  /name: "Close active tab"/,
  /category: "Tabs"/,
  /name: "Switch to next tab in group"/,
  /name: "Switch to previous tab in group"/,
  /name: "Insert block id and copy link"/,
  /name: `Focus tab \$\{n\}`/,
  /name: "Toggle pin on active tab"/,
  /name: "Reveal active file in explorer"/,
  /category: "Graph"/,
  /name: "Open graph view"/,
  /category: "File"/,
  /name: "Print active note…"/,
  /category: "Canvas"/,
  /name: "Create new canvas"/,
];

const CORE_PLUGIN_SMALL_FORBIDDEN_PATTERNS = [
  /category: "Bases"/,
  /name: "Create new base…"/,
  /prompt\("New base name:", "Untitled\.base"\)/,
  /`Created \$\{filename\}`/,
  /"Could not create base"/,
  /category: "Web viewer"/,
  /name: "Open web viewer…"/,
  /prompt\("Open URL in a web viewer:", "https:\/\/"\)/,
  /"That's not a valid URL\."/,
  /category: "Random note"/,
  /name: "Open random note"/,
  /"Vault has no notes yet\."/,
  /"Could not open random note"/,
  /category: "Random walk"/,
  /name: "Walk to a random linked note"/,
  /"No outgoing links — picking a random vault note instead\."/,
  /"Vault is empty\."/,
];

const CORE_PLUGIN_MORE_FORBIDDEN_PATTERNS = [
  /`Copied: \$\{text\}`/,
  /"Clipboard write failed"/,
  /category: "Links"/,
  /name: "Copy wikilink to active note"/,
  /name: "Copy markdown link to active note"/,
  /name: "Copy vault path of active note"/,
  /name: "Reload all enabled plugins"/,
  /"No plugins are currently enabled\."/,
  /Reloaded \$\{enabled\.length\} plugin/,
  /category: "Help"/,
  /name: "Open Granite tour"/,
  /"Created Welcome to Granite\.md\."/,
  /"Could not open tour"/,
  /const TOUR_PATH = "Welcome to Granite\.md"/,
  /const TOUR_BODY = `/,
  /# Welcome to Granite/,
  /That's the tour — happy linking!/,
  /requires Granite ≥/,
  /"All plugins are up to date\."/,
  /"No plugins have remote manifest URLs configured\."/,
  /has a new version available/,
  /plugins have new versions available/,
];

const FORMAT_CONVERTER_FORBIDDEN_PATTERNS = [
  /category: "Format"/,
  /name: "Convert wikilinks to markdown links \(active note\)"/,
  /"No wikilinks to convert\."/,
  /Converted \$\{count\} wikilink/,
  /"Could not convert wikilinks"/,
  /name: "Migrate legacy property keys across vault"/,
  /"No legacy property keys found\."/,
  /Migrated \$\{result\.keysMigrated\} legacy propert/,
  /"Could not migrate legacy properties"/,
  /name: "Copy current note as HTML"/,
  /"Rendered HTML copied to clipboard\."/,
  /"Could not copy HTML"/,
];

const NOTE_COMPOSER_FORBIDDEN_PATTERNS = [
  /category: "Note composer"/,
  /name: "Extract current selection to new note"/,
  /"No text selected\."/,
  /prompt\("New note name:", "Extract\.md"\)/,
  /A file named/,
  /"Selection extracted\."/,
  /"Extract failed"/,
  /name: "Merge current file into another file…"/,
  /"Open a markdown note first\."/,
  /Merge "\$\{stem\(sourcePath\)\}" into which file/,
  /"Target must be a \.md file\."/,
  /Target file/,
  /Merged into/,
  /"Merge failed"/,
];

const CORE_PLUGIN_UTILITY_FORBIDDEN_PATTERNS = [
  /category: "Unique note"/,
  /name: "Create new unique note"/,
  /"Could not create unique note"/,
  /category: "Daily notes"/,
  /name: "Open today's daily note"/,
  /name: "Open yesterday's daily note"/,
  /name: "Open tomorrow's daily note"/,
  /"Sunday"/,
  /"January"/,
  /category: "Vault"/,
  /name: "Show vault statistics"/,
  /Files: \$\{files\.length\.toLocaleString\(\)\}/,
  /Words: \$\{totalWords\.toLocaleString\(\)\}/,
  /Internal links: \$\{totalLinks\.toLocaleString\(\)\}/,
  /Vault statistics/,
  /"Could not compute vault statistics"/,
  /category: "Audio recorder"/,
  /name: "Start\/stop recording"/,
  /"Recording is already in progress\."/,
  /"Microphone permission denied"/,
  /"Recording… click here to stop\."/,
  /Saved recording to/,
  /"Could not save recording"/,
  /"No recording in progress\."/,
];

const CORE_PLUGIN_VAULT_EDIT_FORBIDDEN_PATTERNS = [
  /name: "Find and replace across vault…"/,
  /prompt\("Find what\?", ""\)/,
  /Replace "\$\{find\}" with:/,
  /"Match case\? OK = yes, Cancel = no"/,
  /"Treat the find string as a regular expression\?"/,
  /"Find & replace failed during scan"/,
  /No matches across/,
  /Replace \$\{totalCount\} occurrence/,
  /This cannot be undone/,
  /Replaced \$\{replaceCount\} occurrence/,
  /Find & replace failed mid-write/,
  /category: "Tags"/,
  /name: "Rename a tag across the vault"/,
  /"No tags found in vault\."/,
  /Rename which tag\?/,
  /"That tag name is invalid\."/,
  /Rename #\$\{oldTag\} to:/,
  /"That destination tag name is invalid\."/,
  /No occurrences of #\$\{oldTag\} found/,
  /Renamed #\$\{oldTag\}/,
  /"Tag rename failed"/,
];

const CORE_PLUGIN_TEMPLATE_WORKSPACE_FORBIDDEN_PATTERNS = [
  /category: "Templates"/,
  /name: "Insert template"/,
  /"No templates found\. Set a template folder under Settings → Templates\."/,
  /name: "Insert current date"/,
  /name: "Insert current time"/,
  /"January"/,
  /category: "Workspaces"/,
  /name: "Save workspace layout…"/,
  /prompt\("Save layout as:", ""\)/,
  /Saved layout/,
  /name: "Load workspace layout…"/,
  /"No saved layouts\."/,
  /Load which layout\?/,
  /Loaded layout/,
  /Could not load layout/,
  /name: "Delete workspace layout…"/,
  /Delete which layout\?/,
  /Deleted layout/,
];

const CORE_PLUGIN_FILE_RECOVERY_FORBIDDEN_PATTERNS = [
  /category: "File recovery"/,
  /name: "View recovery snapshots for current file"/,
  /"Open a markdown note first\."/,
  /"No snapshots yet for this file\."/,
  /Restore which snapshot\?/,
  /Enter number to view contents/,
  /Restore this snapshot\? Current contents will be overwritten/,
  /--- Preview ---/,
  /"Snapshot restored\."/,
  /"Restore failed"/,
  /name: "Take a snapshot of the current file now"/,
];

const PLUGIN_LOADER_FORBIDDEN_PATTERNS = [
  /Plugin loader: no active vault when building plugin API/,
  /Plugin "\$\{entry\.manifest\.name\}": could not read/,
  /Plugin "\$\{entry\.manifest\.name\}" failed to load/,
];

describe("UI string externalization audit", () => {
  it("keeps audited UI surfaces routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/SearchView.tsx`, "utf8");
    const violations = SEARCH_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "search.placeholder",
      "search.matchCase",
      "search.sort",
      "search.status.results",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Tags view labels and menu text routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/TagsView.tsx`, "utf8");
    const violations = TAGS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "tags.empty",
      "tags.showNested",
      "tags.expand",
      "tags.menu.filter",
      "tags.menu.rename",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Outgoing Links view labels routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/OutgoingLinksView.tsx`,
      "utf8",
    );
    const violations = OUTGOING_LINKS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "outgoing.empty.noActive",
      "outgoing.empty.noLinks",
      "outgoing.lineShort",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Backlinks view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/BacklinksView.tsx`, "utf8");
    const violations = BACKLINKS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "backlinks.empty.noActive",
      "backlinks.empty.noLinks",
      "backlinks.unlinked.title",
      "backlinks.unlinked.scanning",
      "backlinks.unlinked.none",
      "backlinks.line",
      "backlinks.lineShort",
      "backlinks.matchTitle",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Recents view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/RecentsView.tsx`, "utf8");
    const violations = RECENTS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of ["recents.empty", "recents.remove"]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Footnotes view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/FootnotesView.tsx`, "utf8");
    const violations = FOOTNOTES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "footnotes.empty.noActive",
      "footnotes.empty.noFootnotes",
      "footnotes.noDefinitionTitle",
      "footnotes.referenceTitle",
      "footnotes.missing",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Outline view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/OutlineView.tsx`, "utf8");
    const violations = OUTLINE_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "outline.empty.noActive",
      "outline.empty.noHeadings",
      "outline.filterPlaceholder",
      "outline.empty.noFilterMatch",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps sidebar tab registry labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/registry.tsx`, "utf8");
    const violations = SIDEBAR_REGISTRY_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "sidebar.tab.files",
      "sidebar.tab.search",
      "sidebar.tab.bookmarks",
      "sidebar.tab.tags",
      "sidebar.tab.backlinks",
      "sidebar.tab.outgoing",
      "sidebar.tab.outline",
      "sidebar.tab.recents",
      "sidebar.tab.localGraph",
      "sidebar.tab.fileProperties",
      "sidebar.tab.allProperties",
      "sidebar.tab.footnotes",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps sidebar shell action labels routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/ui/shell/LeftSidebar.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/shell/RightSidebar.tsx`, "utf8"),
    ];
    const violations = sources.flatMap((source) =>
      SIDEBAR_SHELL_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source)),
    );
    for (const source of sources) {
      for (const requiredKey of [
        "sidebar.openInCenter",
        "sidebar.splitGroup",
        "sidebar.closeGroup",
      ]) {
        expect(source).toContain(requiredKey);
      }
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Local Graph view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/LocalGraphView.tsx`, "utf8");
    const violations = LOCAL_GRAPH_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "localGraph.empty.noActive",
      "localGraph.empty.noLinks",
      "localGraph.neighbor",
      "localGraph.neighbors",
      "localGraph.openNote",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps unavailable sidebar leaf fallback routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/SidebarLeafView.tsx`,
      "utf8",
    );
    const violations = SIDEBAR_LEAF_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    expect(source).toContain("sidebar.unavailable");

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Properties view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/sidebar/PropertiesView.tsx`, "utf8");
    const violations = PROPERTIES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "properties.error.update",
      "properties.error.remove",
      "properties.addPrompt",
      "properties.empty.noActive",
      "properties.empty.noProperties",
      "properties.addLabel",
      "properties.addAction",
      "properties.listPlaceholder",
      "properties.remove",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps All Properties view labels routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/AllPropertiesView.tsx`,
      "utf8",
    );
    const violations = ALL_PROPERTIES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "allProperties.empty",
      "allProperties.overrideTitle",
      "allProperties.inferredTitle",
      "allProperties.inferredOption",
      "allProperties.usageTitle",
      "properties.note",
      "properties.notes",
      "propertyType.",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Ribbon labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/shell/Ribbon.tsx`, "utf8");
    const violations = RIBBON_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "ribbon.quickSwitcher",
      "ribbon.commandPalette",
      "ribbon.graph",
      "ribbon.canvas",
      "ribbon.base",
      "ribbon.daily",
      "ribbon.workspaces",
      "ribbon.template",
      "ribbon.unique",
      "ribbon.random",
      "ribbon.record",
      "ribbon.vaults",
      "ribbon.help",
      "ribbon.settings",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Status Bar labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/shell/StatusBar.tsx`, "utf8");
    const violations = STATUS_BAR_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "status.localOnly",
      "status.word",
      "status.words",
      "status.toggleMode",
      "status.toggleModeTitle",
      "status.mode.read",
      "status.mode.edit",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps Vault Profile labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/shell/VaultProfile.tsx`, "utf8");
    const violations = VAULT_PROFILE_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of ["vaultProfile.switch", "vaultProfile.noVault", "ribbon.settings"]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps File Explorer labels routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/ui/views/file-explorer/FileExplorerView.tsx`,
      "utf8",
    );
    const violations = FILE_EXPLORER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "fileExplorer.prompt.newNote",
      "fileExplorer.prompt.newFolder",
      "fileExplorer.error.invalidFilename",
      "fileExplorer.error.exists",
      "fileExplorer.confirm.deleteOne",
      "fileExplorer.confirm.deleteMany",
      "fileExplorer.notice.movedVault",
      "fileExplorer.notice.movedSystem",
      "fileExplorer.notice.deleted",
      "fileExplorer.notice.bulkSuccess",
      "fileExplorer.notice.deletedWithFailures",
      "fileExplorer.notice.movedAndUpdated",
      "fileExplorer.notice.imported",
      "fileExplorer.menu.revealContents",
      "fileExplorer.menu.deleteFolder",
      "fileExplorer.menu.openCurrent",
      "fileExplorer.menu.openNew",
      "fileExplorer.menu.rename",
      "fileExplorer.menu.delete",
      "fileExplorer.sort.nameAsc",
      "fileExplorer.sort.createdOldest",
      "fileExplorer.action.newNote",
      "fileExplorer.action.newFolder",
      "fileExplorer.action.sortOrder",
      "fileExplorer.empty.noVault",
      "fileExplorer.empty.loading",
      "fileExplorer.empty.emptyVault",
      "fileExplorer.empty.allExcluded",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps prompt overlay and picker labels routed through i18n keys", () => {
    const promptSource = readFileSync(`${process.cwd()}/src/ui/overlay/Prompt.tsx`, "utf8");
    const quickSwitcherSource = readFileSync(
      `${process.cwd()}/src/ui/prompts/QuickSwitcher.tsx`,
      "utf8",
    );
    const commandPaletteSource = readFileSync(
      `${process.cwd()}/src/ui/prompts/CommandPalette.tsx`,
      "utf8",
    );
    const templatePickerSource = readFileSync(
      `${process.cwd()}/src/ui/prompts/TemplatePicker.tsx`,
      "utf8",
    );
    const violations = [
      ...PROMPT_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(promptSource)),
      ...QUICK_SWITCHER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(quickSwitcherSource)),
      ...COMMAND_PALETTE_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(commandPaletteSource)),
      ...TEMPLATE_PICKER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(templatePickerSource)),
    ];

    for (const requiredKey of ["prompt.noMatches", "prompt.instruction.dismiss"]) {
      expect(
        promptSource + quickSwitcherSource + commandPaletteSource + templatePickerSource,
      ).toContain(requiredKey);
    }
    for (const requiredKey of [
      "quickSwitcher.placeholder",
      "quickSwitcher.loading",
      "quickSwitcher.error.open",
      "quickSwitcher.createDisplay",
      "quickSwitcher.aliasFor",
      "quickSwitcher.flair.recent",
      "quickSwitcher.flair.new",
      "quickSwitcher.instruction.open",
      "quickSwitcher.instruction.openNewTab",
      "quickSwitcher.instruction.create",
    ]) {
      expect(quickSwitcherSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "commandPalette.placeholder",
      "commandPalette.pin",
      "commandPalette.unpin",
      "commandPalette.instruction.run",
      "commandPalette.instruction.pin",
    ]) {
      expect(commandPaletteSource).toContain(requiredKey);
    }
    for (const requiredKey of ["templatePicker.placeholder", "templatePicker.instruction.insert"]) {
      expect(templatePickerSource).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps modal, vault picker/context, help, and bookmark labels routed through i18n keys", () => {
    const modalSource = readFileSync(`${process.cwd()}/src/ui/overlay/Modal.tsx`, "utf8");
    const vaultPickerSource = readFileSync(
      `${process.cwd()}/src/ui/prompts/VaultPicker.tsx`,
      "utf8",
    );
    const vaultContextSource = readFileSync(
      `${process.cwd()}/src/ui/vault/VaultContext.tsx`,
      "utf8",
    );
    const handleAdapterSource = readFileSync(
      `${process.cwd()}/src/core/fs/handle-adapter.ts`,
      "utf8",
    );
    const trashSource = readFileSync(`${process.cwd()}/src/core/fs/trash.ts`, "utf8");
    const helpSource = readFileSync(`${process.cwd()}/src/ui/prompts/HelpModal.tsx`, "utf8");
    const bookmarksSource = readFileSync(
      `${process.cwd()}/src/ui/views/sidebar/BookmarksView.tsx`,
      "utf8",
    );
    const violations = [
      ...MODAL_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(modalSource)),
      ...VAULT_PICKER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(vaultPickerSource)),
      ...VAULT_CONTEXT_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(vaultContextSource)),
      ...FS_HANDLE_ADAPTER_FORBIDDEN_PATTERNS.filter((pattern) =>
        pattern.test(handleAdapterSource),
      ),
      ...FS_TRASH_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(trashSource)),
      ...HELP_MODAL_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(helpSource)),
      ...BOOKMARKS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(bookmarksSource)),
    ];

    for (const requiredKey of ["modal.dialog", "modal.opened", "modal.close"]) {
      expect(modalSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "vaultPicker.title",
      "vaultPicker.description",
      "vaultPicker.prompt.opfsName",
      "vaultPicker.recent",
      "vaultPicker.openNewWindow",
      "vaultPicker.pickFolder",
      "vaultPicker.opfs",
    ]) {
      expect(vaultPickerSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "vaultContext.error.bootstrapPopout",
      "vaultContext.reopenGrant",
      "vaultContext.error.reopen",
      "vaultContext.error.pluginLoader",
      "vaultContext.error.notInRegistry",
      "vaultContext.error.fsaUnavailable",
      "vaultContext.error.lostHandle",
      "vaultContext.error.opfsUnavailable",
      "vaultContext.error.permissionDenied",
    ]) {
      expect(vaultContextSource).toContain(requiredKey);
    }
    for (const requiredKey of ["fs.error.emptyPath", "fs.error.directoryRenameUnsupported"]) {
      expect(handleAdapterSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "fs.trash.error.vaultPathUnavailable",
      "fs.trash.error.systemUnavailable",
    ]) {
      expect(trashSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "help.title",
      "help.keys.commandPalette",
      "help.keys.tagAutocomplete",
      "help.keys.dragTab",
      "help.keys.move",
      "help.section.workspace",
      "help.workspace.commandPalette",
      "help.section.markdown",
      "help.fileExplorer.rename",
      "help.footer",
    ]) {
      expect(helpSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "bookmarks.defaultGroup",
      "bookmarks.add",
      "bookmarks.notice.noHeadings",
      "bookmarks.prompt.pickHeading",
      "bookmarks.menu.currentNote",
      "bookmarks.activeGroupTitle",
      "bookmarks.empty",
      "bookmarks.remove",
    ]) {
      expect(bookmarksSource).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Graph view labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/GraphView.tsx`, "utf8");
    const violations = GRAPH_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));
    for (const requiredKey of [
      "graph.empty.filtered",
      "graph.empty.noNotes",
      "graph.aria",
      "graph.stats",
      "graph.controls.hide",
      "graph.controls.title",
      "graph.controls.filter",
      "graph.filterPlaceholder",
      "graph.controls.localGraph",
      "graph.controls.colorBy",
      "graph.color.neutral",
      "graph.controls.groups",
      "graph.groups.remove",
      "graph.groups.queryPlaceholder",
      "graph.groups.add",
      "graph.controls.display",
      "graph.display.nodeSize",
      "graph.controls.forces",
      "graph.forces.repulsion",
      "graph.reset",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps File Recovery modal labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/prompts/FileRecoveryModal.tsx`, "utf8");
    const violations = FILE_RECOVERY_MODAL_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );
    for (const requiredKey of [
      "fileRecovery.error.load",
      "fileRecovery.notice.copied",
      "fileRecovery.notice.restored",
      "fileRecovery.confirm.clear",
      "fileRecovery.notice.cleared",
      "fileRecovery.title",
      "fileRecovery.snapshots",
      "fileRecovery.filename",
      "fileRecovery.filterPlaceholder",
      "fileRecovery.loading",
      "fileRecovery.empty",
      "fileRecovery.bytes",
      "fileRecovery.clear",
      "fileRecovery.showChanges",
      "fileRecovery.copy",
      "fileRecovery.restore",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Install Plugin modal labels and surfaced errors routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/prompts/InstallPluginModal.tsx`, "utf8");
    const registrySource = readFileSync(
      `${process.cwd()}/src/core/plugins/community-registry.ts`,
      "utf8",
    );
    const violations = INSTALL_PLUGIN_MODAL_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    ).concat(
      COMMUNITY_PLUGIN_REGISTRY_FORBIDDEN_PATTERNS.filter((pattern) =>
        pattern.test(registrySource),
      ),
    );
    for (const requiredKey of [
      "installPlugin.error.invalidJson",
      "installPlugin.error.manifestObject",
      "installPlugin.error.requiredFields",
      "installPlugin.error.invalidId",
      "installPlugin.error.baseUrl",
      "installPlugin.error.http",
      "installPlugin.error.invalidMain",
      "installPlugin.error.registryMismatch",
      "installPlugin.asset.manifest",
      "installPlugin.asset.communityManifest",
      "installPlugin.notice.installed",
      "installPlugin.title",
      "installPlugin.description.beforeManifest",
      "installPlugin.searchPlaceholder",
      "installPlugin.registry.loading",
      "installPlugin.manualUrl",
      "installPlugin.manualUrlPlaceholder",
      "installPlugin.fetching",
      "installPlugin.fetch",
      "installPlugin.byAuthor",
      "installPlugin.codeSize",
      "installPlugin.cancel",
      "installPlugin.installing",
      "installPlugin.install",
    ]) {
      expect(source).toContain(requiredKey);
    }
    for (const requiredKey of [
      "plugin.communityRegistry.error.invalidJson",
      "plugin.communityRegistry.error.array",
      "plugin.communityRegistry.error.http",
    ]) {
      expect(registrySource).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Settings modal labels and built-in section titles routed through i18n keys", () => {
    const modalSource = readFileSync(`${process.cwd()}/src/ui/prompts/SettingsModal.tsx`, "utf8");
    const filterSource = readFileSync(`${process.cwd()}/src/ui/prompts/settings-filter.ts`, "utf8");
    const violations = SETTINGS_MODAL_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(modalSource),
    ).concat(SETTINGS_FILTER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(filterSource)));
    for (const requiredKey of [
      "settings.title",
      "settings.searchPlaceholder",
      "settings.group.options",
      "settings.group.pluginOptions",
      "settings.empty.noMatch",
      "settings.appearance.baseScheme",
      "settings.appearance.themeCount",
      "settings.appearance.defaultTheme",
      "settings.editor.defaultView",
      "settings.editor.view.source",
      "settings.files.newNoteFolder",
      "settings.files.attachmentsPlaceholder",
      "settings.files.excludedFilesPlaceholder",
      "settings.files.trash.system",
      "settings.hotkeys.pressKey",
      "settings.about.version",
      "settings.about.license",
      "settings.about.credits",
      "settings.plugins.installFromUrl",
      "settings.dailyNotes.dateFormat",
      "settings.dailyNotes.dateFormatPlaceholder",
      "settings.templates.folderLocation",
      "settings.templates.dateFormatPlaceholder",
      "settings.templates.timeFormatPlaceholder",
      "settings.pluginTab.renderError",
    ]) {
      expect(modalSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "settings.appearance",
      "settings.editor",
      "settings.files",
      "settings.hotkeys",
      "settings.about",
      "settings.plugins",
      "settings.dailyNotes",
      "settings.templates",
    ]) {
      expect(filterSource).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps workspace chrome, tab actions, leaf titles, and empty states routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/ui/shell/Titlebar.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/workspace/TabStrip.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/workspace/Tab.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/workspace/Leaf.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/A11yAnnouncer.tsx`, "utf8"),
    ];
    const leafTitleSource = readFileSync(`${process.cwd()}/src/ui/workspace/leaf-title.ts`, "utf8");
    const workspaceTypesSource = readFileSync(
      `${process.cwd()}/src/core/workspace/types.ts`,
      "utf8",
    );
    const chromeSource = sources.join("\n");
    const violations = WORKSPACE_CHROME_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(chromeSource),
    ).concat(
      WORKSPACE_LEAF_TITLE_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(leafTitleSource)),
      WORKSPACE_LEAF_TITLE_FORBIDDEN_PATTERNS.filter((pattern) =>
        pattern.test(workspaceTypesSource),
      ),
    );

    for (const requiredKey of [
      "titlebar.navigateBack",
      "titlebar.navigateForward",
      "workspace.tab.list",
      "workspace.tab.new",
      "workspace.tab.stack",
      "workspace.tab.closeGroup",
      "workspace.menu.close",
      "workspace.menu.closeOthers",
      "workspace.menu.closeRight",
      "workspace.menu.splitRight",
      "workspace.menu.openNewWindow",
      "workspace.menu.unpin",
      "workspace.tab.close",
      "workspace.action.editNote",
      "workspace.action.readNote",
      "workspace.announce.activeTab",
      "workspace.empty.createBrowserVaultTitle",
      "workspace.empty.openHint.beforeQuickSwitcher",
      "app.welcome.title",
      "app.welcome.openSwitcher",
      "app.empty.noFile",
    ]) {
      expect(chromeSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "workspace.leaf.untitled",
      "workspace.leaf.files",
      "workspace.leaf.settings",
      "workspace.leaf.webViewer",
      "workspace.leaf.asset",
      "workspace.leaf.graph",
      "workspace.leaf.canvas",
      "workspace.leaf.base",
      "workspace.leaf.newTab",
      "sidebar.tab.localGraph",
    ]) {
      expect(leafTitleSource).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps native asset view loading text routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/AssetView.tsx`, "utf8");
    const violations = ASSET_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));

    expect(source).toContain("asset.loading");
    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Markdown source view and Web Viewer labels routed through i18n keys", () => {
    const markdownSource = readFileSync(`${process.cwd()}/src/ui/views/MarkdownView.tsx`, "utf8");
    const webViewerSource = readFileSync(`${process.cwd()}/src/ui/views/WebViewerView.tsx`, "utf8");
    const violations = [
      ...MARKDOWN_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(markdownSource)),
      ...WEB_VIEWER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(webViewerSource)),
    ];

    for (const requiredKey of [
      "markdown.error.readSaveDisabled",
      "markdown.error.read",
      "markdown.error.attachment",
      "markdown.drop.pathsUnavailable",
      "markdown.drop.somePathsUnavailable",
      "markdown.status.saving",
      "markdown.status.saved",
      "markdown.status.editing",
      "markdown.status.saveFailed",
      "markdown.autocomplete.aliasFor",
    ]) {
      expect(markdownSource).toContain(requiredKey);
    }
    for (const requiredKey of [
      "webViewer.back",
      "webViewer.forward",
      "webViewer.reload",
      "webViewer.urlPlaceholder",
    ]) {
      expect(webViewerSource).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Reading view imperative labels and embed copy routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/ReadingView.tsx`, "utf8");
    const violations = READING_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));

    for (const requiredKey of [
      "reading.loading",
      "reading.embed.open",
      "reading.embed.openCanvas",
      "reading.embed.openNote",
      "reading.embed.base",
      "reading.embed.canvasSummary",
      "reading.embed.filterSummary",
      "reading.embed.columnSummary",
      "reading.embed.circular",
      "reading.embed.fileNotFound",
      "reading.query.header",
      "reading.query.running",
      "reading.query.noResults",
      "reading.query.failed",
      "reading.backlinks.title",
      "reading.backlinks.empty",
      "reading.backlinks.references",
      "reading.properties.count",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Canvas view toolbar, status, and node labels routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/views/CanvasView.tsx`, "utf8");
    const violations = CANVAS_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));

    for (const requiredKey of [
      "canvas.error.save",
      "canvas.prompt.newTextNode",
      "canvas.empty.noPath",
      "canvas.loading",
      "canvas.action.addText",
      "canvas.action.enableSnap",
      "canvas.action.disableSnap",
      "canvas.action.zoomIn",
      "canvas.action.zoomOut",
      "canvas.action.fit",
      "canvas.action.deleteSelected",
      "canvas.color.nodeColor",
      "canvas.color.clear",
      "canvas.color.set",
      "canvas.stats",
      "canvas.anchor.dragToConnect",
      "canvas.node.resize",
      "canvas.file.noFile",
      "canvas.file.openHint",
      "canvas.link.label",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Bases view chrome, table/list/card/map labels, and embeds routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/ui/views/BasesView.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/views/bases/BasesTableView.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/views/bases/BasesListView.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/views/bases/BasesCardsView.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/views/bases/BasesMapView.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/views/bases/embed.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/views/bases/shared.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/bases/schema.ts`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = BASES_VIEW_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));

    for (const requiredKey of [
      "bases.title",
      "bases.defaultName",
      "bases.empty.noPath",
      "bases.filterLabel",
      "bases.noFilter",
      "bases.matchCount",
      "bases.groupedBy",
      "bases.loading",
      "bases.error.exists",
      "bases.embed.loading",
      "bases.empty.noMatchingFiles",
      "bases.column.name",
      "bases.map.aria",
      "bases.map.open",
      "bases.map.empty",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Inline Title, error boundary, hover preview, and notice labels routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/ui/views/InlineTitle.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/overlay/ErrorBoundary.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/overlay/HoverPopover.tsx`, "utf8"),
      readFileSync(`${process.cwd()}/src/ui/overlay/NoticeContainer.tsx`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = INLINE_AND_OVERLAY_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "inlineTitle.error.invalidName",
      "inlineTitle.error.exists",
      "inlineTitle.error.rename",
      "inlineTitle.notice.renamedAndRewritten",
      "inlineTitle.notice.renameRewriteFailed",
      "inlineTitle.renameTitle",
      "errorBoundary.unknown",
      "errorBoundary.title",
      "errorBoundary.componentStack",
      "errorBoundary.reload",
      "errorBoundary.dismiss",
      "errorBoundary.vaultSafe",
      "hoverPopover.fileNotFound",
      "hoverPopover.loading",
      "notice.dismiss",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps built-in command registrations routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/ui/commands/CommandsBootstrap.tsx`, "utf8");
    const violations = COMMAND_BOOTSTRAP_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "command.openCommandPalette",
      "command.openQuickSwitcher",
      "command.openVaultSwitcher",
      "command.openSettings",
      "command.category.help",
      "command.showKeyboardCheatSheet",
      "command.category.plugins",
      "command.installPluginFromUrl",
      "command.checkPluginUpdates",
      "command.category.appearance",
      "command.toggleLightDarkTheme",
      "command.category.editor",
      "command.splitRight",
      "command.closeActiveTab",
      "command.category.tabs",
      "command.switchNextTab",
      "command.insertBlockId",
      "command.focusTab",
      "command.openGraphView",
      "command.printActiveNote",
      "command.createNewCanvas",
    ]) {
      expect(source).toContain(requiredKey);
    }
    expect(source).toContain("subscribeI18n");
    expect(source).toContain("getLocale");

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps small core plugin command labels, prompts, and notices routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/core/plugins-core/bases-scaffold.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/web-viewer.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/random-note.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/random-walk.ts`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = CORE_PLUGIN_SMALL_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.bases.category",
      "plugin.bases.create",
      "plugin.bases.prompt.name",
      "plugin.bases.defaultName",
      "plugin.bases.notice.created",
      "plugin.bases.error.create",
      "plugin.webViewer.category",
      "plugin.webViewer.open",
      "plugin.webViewer.prompt.url",
      "plugin.webViewer.error.invalidUrl",
      "plugin.randomNote.category",
      "plugin.randomNote.open",
      "plugin.randomNote.empty",
      "plugin.randomNote.error.open",
      "plugin.randomWalk.category",
      "plugin.randomWalk.next",
      "plugin.randomWalk.noOutgoing",
      "plugin.randomWalk.empty",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps link, reload, tour, and plugin update notices routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/core/plugins-core/copy-link.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/plugin-reload.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/tour.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins/update-check.ts`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = CORE_PLUGIN_MORE_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.copyLink.category",
      "plugin.copyLink.wikilink",
      "plugin.copyLink.markdown",
      "plugin.copyLink.path",
      "plugin.copyLink.notice.copied",
      "plugin.copyLink.error.clipboard",
      "plugin.reload.category",
      "plugin.reload.all",
      "plugin.reload.empty",
      "plugin.reload.notice.reloaded",
      "plugin.tour.category",
      "plugin.tour.open",
      "plugin.tour.path",
      "plugin.tour.body",
      "plugin.tour.notice.created",
      "plugin.tour.error.open",
      "plugin.update.incompatible",
      "plugin.update.allUpToDate",
      "plugin.update.noRemoteManifests",
      "plugin.update.oneAvailable",
      "plugin.update.manyAvailable",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Format Converter command labels and notices routed through i18n keys", () => {
    const source = readFileSync(
      `${process.cwd()}/src/core/plugins-core/format-converter.ts`,
      "utf8",
    );
    const violations = FORMAT_CONVERTER_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.format.category",
      "plugin.format.wikilinksToMarkdown",
      "plugin.format.noWikilinks",
      "plugin.format.converted",
      "plugin.format.error.convert",
      "plugin.format.migrateLegacyProperties",
      "plugin.format.noLegacyProperties",
      "plugin.format.migratedProperties",
      "plugin.format.error.migrate",
      "plugin.format.copyAsHtml",
      "plugin.format.copiedHtml",
      "plugin.format.error.copyHtml",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Note Composer command labels, prompts, and notices routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/core/plugins-core/note-composer.ts`, "utf8");
    const violations = NOTE_COMPOSER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));

    for (const requiredKey of [
      "plugin.noteComposer.category",
      "plugin.noteComposer.extractSelection",
      "plugin.noteComposer.noSelection",
      "plugin.noteComposer.prompt.newNote",
      "plugin.noteComposer.defaultName",
      "plugin.noteComposer.error.exists",
      "plugin.noteComposer.notice.extracted",
      "plugin.noteComposer.error.extract",
      "plugin.noteComposer.mergeInto",
      "plugin.noteComposer.openMarkdownFirst",
      "plugin.noteComposer.prompt.mergeTarget",
      "plugin.noteComposer.error.targetMustBeMarkdown",
      "plugin.noteComposer.error.targetMissing",
      "plugin.noteComposer.notice.merged",
      "plugin.noteComposer.error.merge",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps utility core plugin labels and notices routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/core/plugins-core/unique-note.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/daily-notes.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/vault-stats.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/audio-recorder.ts`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = CORE_PLUGIN_UTILITY_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.uniqueNote.category",
      "plugin.uniqueNote.create",
      "plugin.uniqueNote.error.create",
      "plugin.dailyNotes.category",
      "plugin.dailyNotes.openToday",
      "plugin.dailyNotes.openYesterday",
      "plugin.dailyNotes.openTomorrow",
      "formatMomentDate",
      "plugin.vaultStats.category",
      "plugin.vaultStats.show",
      "plugin.vaultStats.title",
      "plugin.vaultStats.files",
      "plugin.vaultStats.words",
      "plugin.vaultStats.internalLinks",
      "plugin.vaultStats.error.compute",
      "plugin.audioRecorder.category",
      "plugin.audioRecorder.toggle",
      "plugin.audioRecorder.alreadyRecording",
      "plugin.audioRecorder.error.microphone",
      "plugin.audioRecorder.recording",
      "plugin.audioRecorder.saved",
      "plugin.audioRecorder.error.save",
      "plugin.audioRecorder.noneRecording",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps vault editing plugin prompts and notices routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/core/plugins-core/vault-find-replace.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/tag-rename.ts`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = CORE_PLUGIN_VAULT_EDIT_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.findReplace.category",
      "plugin.findReplace.name",
      "plugin.findReplace.prompt.find",
      "plugin.findReplace.prompt.replace",
      "plugin.findReplace.confirm.matchCase",
      "plugin.findReplace.confirm.regex",
      "plugin.findReplace.error.scan",
      "plugin.findReplace.noMatches",
      "plugin.findReplace.confirm.write",
      "plugin.findReplace.replaced",
      "plugin.findReplace.error.writeWithMessage",
      "plugin.findReplace.error.write",
      "plugin.tagRename.category",
      "plugin.tagRename.name",
      "plugin.tagRename.noTags",
      "plugin.tagRename.prompt.from",
      "plugin.tagRename.error.invalidSource",
      "plugin.tagRename.prompt.to",
      "plugin.tagRename.error.invalidDestination",
      "plugin.tagRename.noOccurrences",
      "plugin.tagRename.renamed",
      "plugin.tagRename.error.rename",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps Templates and Workspaces plugin labels and prompts routed through i18n keys", () => {
    const sources = [
      readFileSync(`${process.cwd()}/src/core/plugins-core/templates.ts`, "utf8"),
      readFileSync(`${process.cwd()}/src/core/plugins-core/workspaces.ts`, "utf8"),
    ];
    const source = sources.join("\n");
    const violations = CORE_PLUGIN_TEMPLATE_WORKSPACE_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.templates.category",
      "plugin.templates.insert",
      "plugin.templates.empty",
      "plugin.templates.insertDate",
      "plugin.templates.insertTime",
      "formatMomentDate",
      "plugin.workspaces.category",
      "plugin.workspaces.save",
      "plugin.workspaces.prompt.save",
      "plugin.workspaces.saved",
      "plugin.workspaces.load",
      "plugin.workspaces.empty",
      "plugin.workspaces.prompt.load",
      "plugin.workspaces.loaded",
      "plugin.workspaces.error.load",
      "plugin.workspaces.delete",
      "plugin.workspaces.prompt.delete",
      "plugin.workspaces.deleted",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps File Recovery plugin command fallback text routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/core/plugins-core/file-recovery.ts`, "utf8");
    const violations = CORE_PLUGIN_FILE_RECOVERY_FORBIDDEN_PATTERNS.filter((pattern) =>
      pattern.test(source),
    );

    for (const requiredKey of [
      "plugin.fileRecovery.category",
      "plugin.fileRecovery.view",
      "plugin.fileRecovery.openMarkdownFirst",
      "plugin.fileRecovery.noSnapshots",
      "plugin.fileRecovery.prompt.restore",
      "plugin.fileRecovery.confirm.restore",
      "fileRecovery.notice.restored",
      "plugin.fileRecovery.error.restore",
      "plugin.fileRecovery.snapshotNow",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });

  it("keeps plugin loader failure notices routed through i18n keys", () => {
    const source = readFileSync(`${process.cwd()}/src/core/plugins/loader.ts`, "utf8");
    const violations = PLUGIN_LOADER_FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(source));

    for (const requiredKey of [
      "plugin.loader.error.readMain",
      "plugin.loader.error.load",
      "plugin.loader.error.noActiveVault",
    ]) {
      expect(source).toContain(requiredKey);
    }

    expect(violations.map(String), violations.map(String).join("\n")).toEqual([]);
  });
});
