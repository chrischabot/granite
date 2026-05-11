import { type ReactNode, forwardRef, type ButtonHTMLAttributes } from "react";

export interface ClickableIconProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  ariaLabel: string;
  active?: boolean;
  /** Add additional class names */
  modifier?: string;
}

export const ClickableIcon = forwardRef<HTMLButtonElement, ClickableIconProps>(
  function ClickableIcon(
    { icon, ariaLabel, active, modifier, className, disabled, ...rest },
    ref,
  ) {
    const classes = [
      "clickable-icon",
      modifier ?? "",
      active ? "is-active" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <button
        ref={ref}
        type="button"
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        {...rest}
      >
        <span className="svg-icon" aria-hidden="true">
          {icon}
        </span>
      </button>
    );
  },
);