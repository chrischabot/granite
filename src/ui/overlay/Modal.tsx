import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Modifier classes (e.g. "mod-sidebar-layout", "mod-narrow") */
  modifier?: string;
  /** Whether clicking the backdrop closes the modal. Default true. */
  dismissOnBackdropClick?: boolean;
  /** Whether Esc closes the modal. Default true. */
  dismissOnEsc?: boolean;
  /** Render a × close button in the top-right. Default true. */
  showCloseButton?: boolean;
  children: ReactNode;
  /** Slot for the footer button container. */
  footer?: ReactNode;
}

export function Modal(props: ModalProps) {
  const {
    open,
    onClose,
    title,
    modifier,
    dismissOnBackdropClick = true,
    dismissOnEsc = true,
    showCloseButton = true,
    children,
    footer,
  } = props;

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previousActive.current = document.activeElement as HTMLElement | null;
    const el = modalRef.current;
    if (!el) return;
    // Move focus into the modal (focus the first focusable, or the modal itself).
    const first = el.querySelector<HTMLElement>(
      "input, button, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    (first ?? el).focus();
    return () => {
      previousActive.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      // Focus trap.
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          "input, button, select, textarea, [tabindex]:not([tabindex='-1'])",
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismissOnEsc, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-container">
      <div
        className="modal-bg"
        onClick={dismissOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        className={`modal ${modifier ?? ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            type="button"
            className="modal-close-button"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {title && (
          <div className="modal-header">
            <div className="modal-title" id={titleId}>
              {title}
            </div>
          </div>
        )}
        <div className="modal-content">{children}</div>
        {footer && <div className="modal-button-container">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}