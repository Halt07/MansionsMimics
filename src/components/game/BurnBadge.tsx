import { BURN_SUSPICION } from "./gameData";

/** Shown on a burned location or form card: the starting-suspicion penalty and how long it lasts. */
export default function BurnBadge({ huntsLeft }: { huntsLeft: number }) {
  if (huntsLeft <= 0) return null;
  return (
    <p className="text-[10px] font-cinzel text-orange-400 border border-orange-400/30 bg-orange-400/5 rounded px-1.5 py-0.5 mb-1 inline-block"
      title="You were discovered here / in this form. The survivors have spread the word.">
      🔥 Discovered · +{BURN_SUSPICION} starting suspicion · {huntsLeft} more {huntsLeft === 1 ? "hunt" : "hunts"}
    </p>
  );
}
