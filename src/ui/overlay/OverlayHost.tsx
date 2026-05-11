import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Slot = "modal" | "menu" | "notice" | "tooltip";

type SlotState = Record<Slot, ReactNode[]>;

const initialSlots: SlotState = { modal: [], menu: [], notice: [], tooltip: [] };

const subscribers = new Set<(state: SlotState) => void>();
let state: SlotState = initialSlots;

function notify(updater: (s: SlotState) => SlotState) {
  state = updater(state);
  for (const cb of subscribers) cb(state);
}

/** Imperatively push a node into a slot. Returns a disposer. */
export function mountOverlay(slot: Slot, node: ReactNode): () => void {
  notify((s) => ({ ...s, [slot]: [...s[slot], node] }));
  return () => {
    notify((s) => ({ ...s, [slot]: s[slot].filter((n) => n !== node) }));
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
      {snapshot.modal.map((n, i) => (
        <div key={`modal-${i}`} className="overlay-slot overlay-modal">
          {n}
        </div>
      ))}
      {snapshot.menu.map((n, i) => (
        <div key={`menu-${i}`} className="overlay-slot overlay-menu">
          {n}
        </div>
      ))}
      {snapshot.notice.length > 0 && (
        <div className="notice-container">
          {snapshot.notice.map((n, i) => (
            <div key={`notice-${i}`} className="notice">
              {n}
            </div>
          ))}
        </div>
      )}
      {snapshot.tooltip.map((n, i) => (
        <div key={`tooltip-${i}`}>{n}</div>
      ))}
    </>,
    document.body,
  );
}