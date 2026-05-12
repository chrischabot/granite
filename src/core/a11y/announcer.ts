export interface A11yAnnouncement {
  readonly id: number;
  readonly message: string;
}

let current: A11yAnnouncement = { id: 0, message: "" };
const subscribers = new Set<() => void>();

function emit(): void {
  for (const subscriber of subscribers) subscriber();
}

export const a11yAnnouncer = {
  getSnapshot(): A11yAnnouncement {
    return current;
  },

  getServerSnapshot(): A11yAnnouncement {
    return current;
  },

  subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },

  announce(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) return;
    current = { id: current.id + 1, message: trimmed };
    emit();
  },

  reset(): void {
    current = { id: 0, message: "" };
    emit();
  },
};
