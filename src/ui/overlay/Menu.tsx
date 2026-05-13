import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  warning?: boolean;
  disabled?: boolean;
  callback: () => void;
}

export interface MenuRequest {
  x: number;
  y: number;
  items: MenuItem[];
}

let listeners: Array<(req: MenuRequest | null) => void> = [];

export function openMenu(req: MenuRequest) {
  for (const cb of listeners) cb(req);
}

export function closeMenu() {
  for (const cb of listeners) cb(null);
}

export function MenuHost() {
  const [req, setReq] = useState<MenuRequest | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handler = (next: MenuRequest | null) => {
      setReq(next);
      setActiveIndex(0);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((h) => h !== handler);
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setReq(null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % req.items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + req.items.length) % req.items.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(req.items.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const item = req.items[activeIndex];
        if (item && !item.disabled) {
          setReq(null);
          item.callback();
        }
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setReq(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [req, activeIndex]);

  useEffect(() => {
    if (!req) return;
    itemRefs.current.length = req.items.length;
    itemRefs.current[activeIndex]?.focus();
  }, [req, activeIndex]);

  if (!req) return null;

  // Clamp inside viewport.
  const x = Math.min(req.x, window.innerWidth - 240);
  const y = Math.min(req.y, window.innerHeight - 300);

  const style: CSSProperties = {
    position: "fixed",
    top: y,
    left: x,
    zIndex: 65,
    minWidth: 200,
  };

  return createPortal(
    <div ref={ref} className="menu" role="menu" style={style}>
      <div className="menu-scroll">
        {req.items.map((item, i) => (
          <button
            type="button"
            key={item.id}
            ref={(node) => {
              itemRefs.current[i] = node;
            }}
            className={`menu-item${item.warning ? " is-warning" : ""}${
              item.disabled ? " is-disabled" : ""
            }${activeIndex === i ? " selected" : ""}`}
            role="menuitem"
            aria-disabled={item.disabled}
            tabIndex={activeIndex === i ? 0 : -1}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => {
              if (item.disabled) return;
              setReq(null);
              item.callback();
            }}
          >
            {item.icon && (
              <span className="menu-item-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="menu-item-title">{item.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
