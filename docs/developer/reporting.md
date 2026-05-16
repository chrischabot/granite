# Notices, errors, recovery, debug info

Granite ships several layers of in-app messaging that work together to keep
users informed without losing data:

1. **Notices** — short, in-app messages for the current user action.
2. **Error reporter** — a single subscription point for `react`, `window`,
   `promise`, `effect`, and `manual` errors. The `ErrorBoundary` listens to
   it.
3. **File recovery** — periodic IndexedDB snapshots of the active Markdown
   leaf, with a list/restore UI.
4. **Debug info** — a structured snapshot of app, vault, and plugin state
   that the user can paste into a bug ticket.
5. **A11y announcer** — an `aria-live` polite region that mirrors notices
   and workspace events to assistive technology.

This page documents each one and how to wire your code into it correctly.

## Notices

Notices are toast-style messages rendered by `NoticeContainer`
(`src/ui/overlay/NoticeContainer.tsx`). The store lives in
`src/core/notices/notice.ts`.

### API

```ts
import {
  noticeManager,
  notice,
  noticeError,
  noticeSuccess,
  type Notice,
} from "@core/notices/notice";

const id = noticeManager.show("Saved", {
  kind: "success",       // "info" | "success" | "warning" | "error"
  timeoutMs: 4000,       // default 4000ms; 0 = sticky
  onActivate: () => workspaceStore.openFile(somePath),
});

noticeManager.dismiss(id);
noticeManager.list();                // ReadonlyArray<Notice>
noticeManager.subscribe(() => undefined);    // store subscription
```

Convenience helpers:

```ts
notice("Indexing complete");                       // kind: "info"
noticeSuccess("Plugin installed");                 // kind: "success"
noticeError("Could not write file", 8000);         // kind: "error"
```

Every notice also fires through `a11yAnnouncer.announce(...)` with its kind
prefix (`"Error: Could not write file"`), so screen readers see what the
sighted user sees.

### Best practices

- Keep messages short. The notice surface clips long text.
- Prefer `success` and `error` for the result of an explicit user action.
  Reserve plain `info` for ambient status (e.g. background indexing).
- Use `timeoutMs: 0` only when the user must act on the notice. Sticky
  notices that nobody can see become noise.
- Use `onActivate` when "click the notice to jump to the file/log/setting"
  is a natural follow-up. The notice does not auto-dismiss when the user
  clicks it — call `noticeManager.dismiss(id)` from your handler if you
  want that.
- Notices are not a logging channel. For developer diagnostics, use
  `console.log` and/or the error reporter (`source: "manual"`).
- Notices are not modal. If the user must confirm something, use a real
  modal (`src/ui/overlay/Modal.tsx`) or `inputPrompt`.

## Error reporter

`src/core/errors/reporter.ts` is a single subscribable funnel for every
captured error. The `ErrorBoundary` at `src/ui/overlay/ErrorBoundary.tsx`
listens to it and renders the full-screen recovery surface; future surfaces
(a status-bar pill, a dev panel) can subscribe too.

### API

```ts
import {
  reportCapturedError,
  subscribeErrorReports,
  getLastErrorReport,
  normalizeError,
  type AppErrorReport,
  type AppErrorSource,   // "react" | "window" | "promise" | "effect" | "manual"
} from "@core/errors/reporter";

// Imperatively surface an error.
reportCapturedError(err, { source: "effect" });

// Listen.
const off = subscribeErrorReports((rep: AppErrorReport) => {
  console.error(rep.source, rep.error.message, rep.original);
});

// One-shot read.
const last = getLastErrorReport();

// Coerce anything to an Error.
const e = normalizeError(unknownValue);
```

`reportCapturedError(value, { source, componentStack })` returns the
normalized record:

```ts
interface AppErrorReport {
  id: number;
  error: Error;
  source: "react" | "window" | "promise" | "effect" | "manual";
  componentStack?: string;
  original: unknown;
}
```

`normalizeError` does its best to extract a useful message from arbitrary
thrown values: `Error` instances pass through; strings become `new Error(s)`;
objects with `message`, `_tag`, or a useful `toString()` are used in that
order; everything else becomes `new Error("Unknown error")`.

### How `ErrorBoundary` uses it

`src/ui/overlay/ErrorBoundary.tsx`:

- Implements `getDerivedStateFromError` and `componentDidCatch` to catch
  React render errors and call `reportCapturedError(err, { source: "react",
  componentStack })`.
- Attaches global `error` and `unhandledrejection` listeners on mount, which
  forward into `reportCapturedError` with sources `"window"` and `"promise"`.
- Subscribes to `subscribeErrorReports` so any code path that emits an
  error event (even programmatic `manual` events) renders the recovery UI.

### When to surface vs. notice vs. throw

- **Notice** — the user did a thing; something visible came of it. The user
  can carry on.
- **Surface via the reporter** — something failed that the user could not
  predict. The user may need to reload, retry, or copy debug info. Use a
  `noticeError` to tell the user, and call `reportCapturedError` so the
  error boundary / future diagnostic UIs see it.
- **Throw** — inside an Effect, throw an `FsError` (or one of the typed
  errors from the relevant service) and let `Effect.runPromise` reject. The
  caller decides whether to surface it via the reporter or recover.
- **Console** — developer noise that is not useful to users. `console.warn`
  for things plugins do wrong; `console.error` for invariants violated.

A typical wrapper that turns an Effect error into a user-visible notice
plus a reportable diagnostic:

```ts
try {
  await run(saveCurrentNote(path, content));
  noticeSuccess(t("note.saved"));
} catch (err) {
  reportCapturedError(err, { source: "effect" });
  noticeError(t("note.saveFailed", { reason: normalizeError(err).message }));
}
```

## File recovery

Granite keeps periodic snapshots of the active Markdown leaf in IndexedDB
so users can recover from accidental edits, plugin misbehavior, or external
overwrites. The implementation is in
`src/core/plugins-core/file-recovery.ts`; the UI is
`src/ui/prompts/FileRecoveryModal.tsx`.

### Storage

- IndexedDB database: `granite-recovery`, version 1.
- Object store: `snapshots`, keyed by autoincrement id, indexed by
  `by-path` and `by-mtime`.
- Settings key (`localStorage`): `granite.file-recovery.v1` —
  `{ intervalMs, retentionMs }`.

Defaults (when no settings overrides exist):

```ts
{
  intervalMs: 5 * 60 * 1000,        // snapshot at most every 5 minutes
  retentionMs: 7 * 24 * 60 * 60 * 1000,   // keep snapshots for 7 days
}
```

The plugin checks the active leaf once a minute; if it is a Markdown leaf
and at least `intervalMs` has passed since the last snapshot of that path,
it reads the on-disk content via `FileSystem.readText` and stores it.

### API

```ts
import {
  listRecoverySnapshots,
  clearRecoverySnapshots,
  restoreRecoverySnapshot,
  type RecoverySnapshot,
} from "@core/plugins-core/file-recovery";

const snaps = await listRecoverySnapshots(path);  // newest first
await restoreRecoverySnapshot(snaps[0]);          // writes back via FileSystem
await clearRecoverySnapshots(path);               // forget one file's history
await clearRecoverySnapshots();                   // forget all
```

### Commands

The plugin registers two commands:

- `file-recovery:view` — opens the FileRecoveryModal for the active leaf.
- `file-recovery:snapshot-now` — forces an immediate snapshot regardless of
  the interval.

## Debug info

`src/core/plugins-core/debug-info.ts` collects a structured snapshot
suitable for pasting into a bug ticket. The plugin registers the command
`granite:show-debug-info`, which writes the formatted text to the clipboard,
opens a sticky notice with the same text, and silently swallows
clipboard-permission errors.

### API

```ts
import {
  collectDebugInfo,
  formatDebugInfo,
  type DebugInfo,
} from "@core/plugins-core/debug-info";

const info: DebugInfo = await collectDebugInfo();
console.log(formatDebugInfo(info));
```

### Shape

```ts
interface DebugInfo {
  version: string;                       // APP_VERSION ("0.1.0-dev")
  platform: string;                      // navigator.platform
  userAgent: string;                     // navigator.userAgent
  vaultRoot: string;                     // FileSystem.rootName
  totalFiles: number;
  markdownFiles: number;
  totalBytes: number;
  workspaceGroups: number;
  workspaceLeaves: number;
  commands: number;
  plugins: ReadonlyArray<{
    id: string;
    name: string;
    version: string;
    enabled: boolean;
  }>;
  tagCount: number;
  propertyCount: number;
}
```

The Help modal links to this command; tickets should include the formatted
output.

## A11y announcer

`src/core/a11y/announcer.ts` exposes a tiny `getSnapshot` / `subscribe` /
`announce` API. The React side is `<A11yAnnouncer />` in
`src/ui/A11yAnnouncer.tsx`, which renders a single `aria-live="polite"`
region.

```ts
import { a11yAnnouncer } from "@core/a11y/announcer";

a11yAnnouncer.announce("Saved 3 changes");
```

Two callers fire automatically:

- `noticeManager.show(...)` — kind-prefixed announcement of every notice.
- `WorkspaceA11yAnnouncements` — active-tab changes.

Use `a11yAnnouncer.announce` whenever a state change happens that would
otherwise only be visible (e.g. "Indexing complete", "Vault switched",
"Search returned 12 results"). Keep messages short and meaningful — the
polite region clobbers earlier messages when a new one arrives.

## Putting it together

A small worked example — a "save and close" handler that does it right:

```ts
import { Effect } from "effect";
import { run } from "@core/effect/runtime";
import { FileSystem } from "@core/fs/FileSystem";
import { workspaceStore } from "@core/workspace/store";
import { noticeError, noticeSuccess } from "@core/notices/notice";
import { reportCapturedError, normalizeError } from "@core/errors/reporter";
import { t } from "@core/i18n";

export async function saveAndClose(leafId: string, path: string, content: string) {
  try {
    await run(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        yield* fs.writeText(path, content);
      }),
    );
    workspaceStore.closeTab(leafId);
    noticeSuccess(t("editor.saved"));
  } catch (err) {
    reportCapturedError(err, { source: "effect" });
    noticeError(
      t("editor.saveFailed", { reason: normalizeError(err).message }),
      0,
    );
  }
}
```

- The user gets a notice for every outcome.
- A11y users get the same message via the announcer.
- The error reporter sees any failure, so the boundary or future diagnostic
  surfaces can react.
- The Effect itself never escapes uncaught.

---

[← verifiers](./verifiers.md) · [Index](../README.md) · [next →](./css-and-tokens.md)
