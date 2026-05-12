import { a11yAnnouncer } from "@core/a11y/announcer";
import { X } from "lucide-react";
import { Children, type ReactNode, isValidElement, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/useI18n";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Accessible label used when the title is not plain text. */
  ariaLabel?: string;
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

function textFromNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join(" ");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return Children.toArray(node).map(textFromNode).join(" ");
}

export function Modal(props: ModalProps) {
  const {
    open,
    onClose,
    title,
    ariaLabel,
    modifier,
    dismissOnBackdropClick = true,
    dismissOnEsc = true,
    showCloseButton = true,
    children,
    footer,
  } = props;

  const modalRef = useRef<HTMLDialogElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const t = useI18n();
  const label = (ariaLabel ?? textFromNode(title).trim()) || t("modal.dialog");

  useEffect(() => {
    if (!open) return;
    a11yAnnouncer.announce(t("modal.opened", { label }));
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
  }, [open, label, t]);

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
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
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
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard users can dismiss via Esc or the close button; this backdrop is not focusable. */}
      <div
        className="modal-bg"
        onClick={dismissOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />
      <dialog
        ref={modalRef}
        className={`modal ${modifier ?? ""}`.trim()}
        open
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            type="button"
            className="modal-close-button"
            aria-label={t("modal.close")}
            onClick={onClose}
          >
            <X size={14} aria-hidden="true" />
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
      </dialog>
    </div>,
    document.body,
  );
}
