import { type CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SHOW_DELAY_MS = 500;

interface TooltipState {
  text: string;
  x: number;
  y: number;
  placement: "top" | "bottom" | "left" | "right";
}

export function TooltipHost() {
  const [state, setState] = useState<TooltipState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[aria-label], [data-tooltip]",
      );
      if (!target) return;
      // Skip targets that already have a real tooltip (e.g. native title) and
      // never tooltip on input fields or contenteditable.
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        return;
      const text = target.getAttribute("data-tooltip") ?? target.getAttribute("aria-label") ?? "";
      if (!text) return;
      // Honor the "no-tooltip" CSS variable opt-out.
      const noTip = getComputedStyle(target).getPropertyValue("--no-tooltip").trim();
      if (noTip === "true") return;

      targetRef.current = target;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (targetRef.current !== target) return;
        const rect = target.getBoundingClientRect();
        const placement: TooltipState["placement"] =
          rect.top < 80
            ? "bottom"
            : rect.left < 80
              ? "right"
              : rect.right > window.innerWidth - 80
                ? "left"
                : "top";
        const x =
          placement === "left"
            ? rect.left - 8
            : placement === "right"
              ? rect.right + 8
              : rect.left + rect.width / 2;
        const y =
          placement === "top"
            ? rect.top - 8
            : placement === "bottom"
              ? rect.bottom + 8
              : rect.top + rect.height / 2;
        setState({ text, x, y, placement });
      }, SHOW_DELAY_MS);
    };
    const onOut = (e: MouseEvent) => {
      if (targetRef.current && !targetRef.current.contains(e.relatedTarget as Node | null)) {
        targetRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        setState(null);
      }
    };

    // Detach the tooltip if the anchor element is removed from the DOM (e.g.
    // when navigating to a different leaf). Without this, React swaps the
    // toolbar out from under us, no mouseout ever fires, and the tooltip is
    // stranded mid-air with stale text.
    const dropIfOrphaned = () => {
      const tgt = targetRef.current;
      if (tgt && !tgt.isConnected) {
        targetRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        setState(null);
      }
    };
    const mo = new MutationObserver(dropIfOrphaned);
    mo.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      mo.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!state) return null;

  const style: CSSProperties = {
    position: "fixed",
    zIndex: 70,
    pointerEvents: "none",
    transform:
      state.placement === "top"
        ? "translate(-50%, -100%)"
        : state.placement === "bottom"
          ? "translate(-50%, 0)"
          : state.placement === "left"
            ? "translate(-100%, -50%)"
            : "translate(0, -50%)",
    left: state.x,
    top: state.y,
  };

  return createPortal(
    <div className={`tooltip mod-${state.placement}`} role="tooltip" style={style}>
      {state.text}
    </div>,
    document.body,
  );
}
