import type { KeyboardEvent } from "react";

/**
 * Props that make a clickable element that isn't a <button> (a Card) work like one: it can be
 * reached with Tab, is announced as a button, and is pressed with Enter or Space as well as a
 * click. With `disabled` it's announced as unavailable and does nothing; `pressed` announces a
 * card that toggles (chosen or not). Spread onto the element, and add FOCUS_RING to its classes.
 */
export function asButton(onPress: () => void, { disabled = false, pressed }: { disabled?: boolean; pressed?: boolean } = {}) {
  const press = () => {
    if (!disabled) onPress();
  };
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-disabled": disabled || undefined,
    "aria-pressed": pressed,
    onClick: press,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        press();
      }
    },
  };
}

/** The keyboard focus ring the app's buttons use, for elements made into buttons with asButton. */
export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
