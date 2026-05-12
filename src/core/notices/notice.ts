import { a11yAnnouncer } from "@core/a11y/announcer";

export interface Notice {
  readonly id: string;
  readonly message: string;
  readonly kind: "info" | "success" | "warning" | "error";
  readonly addedMs: number;
  /** Auto-dismiss after this many ms; 0 = sticky. */
  readonly timeoutMs: number;
  /** Optional click handler. When present, the notice is *not* dismissed on
   *  click — instead the caller's handler runs. The caller is responsible
   *  for dismissing via the returned id when appropriate. */
  readonly onActivate?: () => void;
}

let counter = 0;
let notices: Notice[] = [];
const subscribers = new Set<() => void>();

function emit() {
  for (const s of subscribers) s();
}

function makeId() {
  return `notice-${(++counter).toString(36)}-${Date.now().toString(36)}`;
}

export const noticeManager = {
  list(): ReadonlyArray<Notice> {
    return notices;
  },

  show(
    message: string,
    options: {
      kind?: Notice["kind"];
      timeoutMs?: number;
      onActivate?: () => void;
    } = {},
  ): string {
    const notice: Notice = {
      id: makeId(),
      message,
      kind: options.kind ?? "info",
      addedMs: Date.now(),
      timeoutMs: options.timeoutMs ?? 4000,
      ...(options.onActivate ? { onActivate: options.onActivate } : {}),
    };
    notices = [...notices, notice];
    const kind = notice.kind.charAt(0).toUpperCase() + notice.kind.slice(1);
    a11yAnnouncer.announce(`${kind}: ${notice.message}`);
    emit();
    if (notice.timeoutMs > 0) {
      setTimeout(() => this.dismiss(notice.id), notice.timeoutMs);
    }
    return notice.id;
  },

  dismiss(id: string): void {
    const next = notices.filter((n) => n.id !== id);
    if (next.length === notices.length) return;
    notices = next;
    emit();
  },

  subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },
};

/** Convenience helpers. */
export const notice = (message: string, timeoutMs?: number) =>
  noticeManager.show(message, {
    kind: "info",
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
export const noticeError = (message: string, timeoutMs?: number) =>
  noticeManager.show(message, {
    kind: "error",
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
export const noticeSuccess = (message: string, timeoutMs?: number) =>
  noticeManager.show(message, {
    kind: "success",
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
