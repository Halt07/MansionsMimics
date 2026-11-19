import type { KeyboardEvent } from "react";

/**
 * Props that make a clickable element that isn't a <button> (a Card) work like one: it can be
 * reached with Tab, is announced as a button, and is pressed with Enter or Space as well as a
 * click. With `disabled` it's announced as unavailable and does nothing; `pressed` announces a
 * card that toggles (chosen or not). Spread onto the element, and add FOCUS_RING to its classes.
 *
 * A card's whole text would otherwise become the button's name, so name it by its heading
 * (`labelledBy`: that element's id) and describe it with the details that matter (`describedBy`:
 * one or more ids). Screen readers then say the name, then the description.
 */
export function asButton(
  onPress: () => void,
  { disabled = false, pressed, labelledBy, describedBy }: {
    disabled?: boolean;
    pressed?: boolean;
    labelledBy?: string;
    describedBy?: readonly (string | false | null | undefined)[];
  } = {},
) {
  const press = () => {
    if (!disabled) onPress();
  };
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-disabled": disabled || undefined,
    "aria-pressed": pressed,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy?.filter(Boolean).join(" ") || undefined,
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
