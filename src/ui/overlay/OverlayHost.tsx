import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Slot = "modal" | "menu" | "notice" | "tooltip";
interface OverlayEntry {
  readonly id: number;
  readonly node: ReactNode;
}

type SlotState = Record<Slot, OverlayEntry[]>;

const initialSlots: SlotState = { modal: [], menu: [], notice: [], tooltip: [] };

const subscribers = new Set<(state: SlotState) => void>();
let state: SlotState = initialSlots;
let nextOverlayId = 0;

function notify(updater: (s: SlotState) => SlotState) {
  state = updater(state);
  for (const cb of subscribers) cb(state);
}

/** Imperatively push a node into a slot. Returns a disposer. */
export function mountOverlay(slot: Slot, node: ReactNode): () => void {
  const entry = { id: ++nextOverlayId, node };
  notify((s) => ({ ...s, [slot]: [...s[slot], entry] }));
  return () => {
    notify((s) => ({ ...s, [slot]: s[slot].filter((n) => n.id !== entry.id) }));
  };
}

/** Component that renders all overlay slots. Mount once at the app root. */
export function OverlayHost() {
  const [snapshot, setSnapshot] = useState(state);

  useEffect(() => {
    subscribers.add(setSnapshot);
    return () => {
      subscribers.delete(setSnapshot);
    };
  }, []);

  return createPortal(
    <>
      {snapshot.modal.map((entry) => (
        <div key={entry.id} className="overlay-slot overlay-modal">
          {entry.node}
        </div>
      ))}
      {snapshot.menu.map((entry) => (
        <div key={entry.id} className="overlay-slot overlay-menu">
          {entry.node}
        </div>
      ))}
      {snapshot.notice.length > 0 && (
        <div className="notice-container">
          {snapshot.notice.map((entry) => (
            <div key={entry.id} className="notice">
              {entry.node}
            </div>
          ))}
        </div>
      )}
      {snapshot.tooltip.map((entry) => (
        <div key={entry.id}>{entry.node}</div>
      ))}
    </>,
    document.body,
  );
}
