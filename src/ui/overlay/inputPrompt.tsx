import { type FormEvent, useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { mountOverlay } from "./OverlayHost";

export interface InputPromptOptions {
  /** Modal heading. */
  readonly title: string;
  /** Optional sub-line shown above the input. */
  readonly message?: string;
  /** Initial value of the input. */
  readonly defaultValue?: string;
  /** Input placeholder text. */
  readonly placeholder?: string;
  /** Submit-button label. Defaults to "OK". */
  readonly okLabel?: string;
  /** Cancel-button label. Defaults to "Cancel". */
  readonly cancelLabel?: string;
  /** Optional validator. Return a non-empty string to display an error and block submit. */
  readonly validate?: (value: string) => string | null;
  /** If true, an empty input is rejected. Default false. */
  readonly requireValue?: boolean;
}

interface InputPromptInternalProps extends InputPromptOptions {
  readonly onResolve: (value: string | null) => void;
}

function InputPromptModal({
  title,
  message,
  defaultValue = "",
  placeholder,
  okLabel = "OK",
  cancelLabel = "Cancel",
  validate,
  requireValue,
  onResolve,
}: InputPromptInternalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value;
    if (requireValue && trimmed.trim().length === 0) {
      setError("Please enter a value.");
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    onResolve(trimmed);
  };

  return (
    <Modal
      open
      onClose={() => onResolve(null)}
      title={title}
      modifier="mod-narrow"
      footer={
        <>
          <button type="button" onClick={() => onResolve(null)}>
            {cancelLabel}
          </button>
          <button type="button" className="mod-cta" onClick={() => submit()}>
            {okLabel}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        {message ? <p className="modal-description">{message}</p> : null}
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.currentTarget.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "input-prompt-error" : undefined}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: "100%",
            padding: "0.4em 0.6em",
            border: "1px solid var(--background-modifier-border)",
            background: "var(--background-modifier-form-field)",
            color: "var(--text-normal)",
            borderRadius: "var(--radius-s, 4px)",
            fontSize: "inherit",
          }}
        />
        {error ? (
          <p
            id="input-prompt-error"
            role="alert"
            style={{ color: "var(--text-error)", marginTop: "0.4em" }}
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

/**
 * Promise-based replacement for `window.prompt`. Mounts a styled in-app modal
 * via the OverlayHost slot system and resolves with the entered string when
 * the user presses OK/Enter, or with `null` on cancel/Esc/backdrop click.
 *
 * Callers should `await` the result and check for `null` (matching prompt()'s
 * cancel semantics).
 */
export function inputPrompt(options: InputPromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let dispose: (() => void) | null = null;
    const handle = (value: string | null) => {
      dispose?.();
      resolve(value);
    };
    dispose = mountOverlay("modal", <InputPromptModal {...options} onResolve={handle} />);
  });
}
