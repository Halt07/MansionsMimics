import { useEffect, useRef, useState } from "react";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { devotion, type Devotion, type Hunt, type LogLine, type TurnResult } from "@/data/gameData";

/** How long each line of a Devotion ceremony waits before the next. */
export const CEREMONY_STEP_MS = 2000;

interface CeremonyHandlers {
  /** The pilgrim kneels: the hunt and character as the ceremony begins (the convert already counted). */
  onBegin: (start: TurnResult) => void;
  /** One line of it, and the mimic's AP once an offering in it has been accepted (null when there was none). */
  onStep: (log: readonly LogLine[], apNow: number | null) => void;
  /** It's over: what's left to save, and whether there's now enough AP to evolve. */
  onEnd: (ceremony: Devotion) => void;
}

/**
 * A Devotion ceremony (the Hollow Reliquary), played out on screen: `start` checks whether a
 * devoted pilgrim is the last one left (see devotion() in src/data/events.ts) and, if so, plays
 * the ceremony one line at a time, `stepMs` apart, through the handlers. `running` is true until
 * it ends; the hunt's actions and the end-of-hunt panel wait for it. Leaving the page stops it.
 */
export function useDevotionCeremony(handlers: CeremonyHandlers, stepMs: number = CEREMONY_STEP_MS) {
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Begin the ceremony if a pilgrim is ready. Returns whether one began. */
  const start = (hunt: Hunt, character: MimicCharacter): boolean => {
    const ceremony = devotion(hunt, character);
    if (!ceremony) return false;
    handlers.onBegin(ceremony.start);
    setRunning(true);
    // The mimic's AP after each step, so each offering can be saved as it's accepted
    let ap = ceremony.start.character.assimilationPoints;
    const apAfter = ceremony.steps.map(step => (ap += step.ap));
    const last = ceremony.steps.length - 1;
    timers.current = ceremony.steps.map((step, i) => setTimeout(() => {
      handlers.onStep(step.log, step.ap ? apAfter[i] : null);
      if (i !== last) return;
      setRunning(false);
      handlers.onEnd(ceremony);
    }, i * stepMs));
    return true;
  };

  return { running, start };
}
