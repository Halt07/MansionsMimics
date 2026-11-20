import { useEffect, useEffectEvent } from "react";

/** A hunt action on a letter key: whether it can be taken right now, and what it does. */
interface KeyAction {
  can: boolean;
  run: () => void;
}

interface HuntKeys<T> {
  /** Listening at all (during a hunt, and not with the character sheet over it). */
  enabled: boolean;
  /** The hunt's actions, by letter (lower case). Pressed when not allowed, they do nothing. */
  actions: Record<string, KeyAction>;
  /** While a numbered list is open (the move panel): its choices for keys 1–9, and Escape closes it. */
  numbered: { choices: readonly T[]; can: boolean; choose: (choice: T) => void; close: () => void } | null;
}

/**
 * The hunt's keyboard shortcuts (R, L, S, W, and 1–9 in the move panel). Keys typed into a text
 * field, held down, or pressed with Ctrl, Alt or ⌘ are left alone.
 */
export function useHuntKeys<T>({ enabled, actions, numbered }: HuntKeys<T>) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!enabled || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const key = e.key.toLowerCase();
    if (numbered && /^[1-9]$/.test(key)) {
      const choice = numbered.choices[Number(key) - 1];
      if (choice !== undefined && numbered.can) { e.preventDefault(); numbered.choose(choice); }
      return;
    }
    if (key === "escape" && numbered) { numbered.close(); return; }
    const action = actions[key];
    if (!action) return;
    e.preventDefault();
    if (action.can) action.run();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
