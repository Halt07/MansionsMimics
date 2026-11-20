import { useEffect, useEffectEvent, useState } from "react";
import { db } from "@/api/db";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { welcomeBack } from "@/data/gameData";

/** A mimic just opened: as it is now (after welcomeBack), and the notices to show. */
export interface OpenedMimic {
  character: MimicCharacter;
  massDecayNotice: string | null;
  seasonNotice: string | null;
  /** A branch tier taken while it was away (losing Sovereign is on the decay notice instead). */
  branchNotice: string | null;
}

/**
 * Loads the mimic to play (by id), catching it up on what happened while it was away (mass
 * lost unfed, seasonal forms past their season; see welcomeBack) and saving that. `onOpened` is
 * told once it's ready, with the notices to show. `character` stays null if there's no such
 * mimic, or loading failed (then `loadError` says why).
 */
export function useLoadedMimic(characterId: string | null, onOpened: (opened: OpenedMimic) => void) {
  const [character, setCharacter] = useState<MimicCharacter | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Nothing to load without an id
  const [loading, setLoading] = useState(!!characterId);
  const opened = useEffectEvent(onOpened);

  useEffect(() => {
    if (!characterId) return;
    db.entities.MimicCharacter.filter({ id: characterId }).then(res => {
      const found = res[0];
      if (!found) return;
      const back = welcomeBack(found);
      if (Object.keys(back.changes).length > 0) {
        db.entities.MimicCharacter.update(found.id, back.changes)
          .catch(err => console.error("Failed to save what changed while the mimic was away:", err));
      }
      setCharacter(back.character);
      opened(back);
    }).catch(err => {
      console.error("Failed to load character:", err);
      setLoadError(err instanceof Error ? err.message : String(err));
    }).finally(() => setLoading(false));
  }, [characterId]);

  return { character, setCharacter, loading, loadError };
}
