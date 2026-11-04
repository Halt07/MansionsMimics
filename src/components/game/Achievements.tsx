import { ACHIEVEMENTS, type AchievementId } from "./gameData";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";

/** Colors for each achievement's banner, badge and Codex entry. */
export const ACHIEVEMENT_STYLES: Record<AchievementId, { text: string; box: string }> = {
  hatboxToLegend:    { text: "text-sky-400",    box: "bg-sky-500/10 border-sky-500/40" },
  apexPeak:          { text: "text-primary",    box: "bg-primary/10 border-primary/40" },
  titanicFeast:      { text: "text-amber-400",  box: "bg-amber-500/10 border-amber-500/40" },
  cultOfPersonality: { text: "text-yellow-200", box: "bg-yellow-200/10 border-yellow-200/40" },
  cannibal:          { text: "text-rose-400",   box: "bg-rose-500/10 border-rose-500/40" },
};

/** A banner for each achievement the mimic has earned. */
export function AchievementBanners({ character }: { character: MimicCharacter }) {
  return (
    <>
      {ACHIEVEMENTS.filter(a => a.isEarned(character)).map(a => (
        <div key={a.id} className={`p-4 border rounded-lg text-center ${ACHIEVEMENT_STYLES[a.id].box}`}>
          <div className="text-3xl mb-1">{a.icon}</div>
          <p className={`font-cinzel text-sm font-bold ${ACHIEVEMENT_STYLES[a.id].text}`}>{a.name}</p>
          <p className="text-xs text-muted-foreground mt-1 flavor-text italic">"{a.flavor(character.name)}"</p>
        </div>
      ))}
    </>
  );
}

/** Small icons for each achievement the mimic has earned (e.g. on the Home screen). */
export function AchievementBadges({ character }: { character: MimicCharacter }) {
  return (
    <>
      {ACHIEVEMENTS.filter(a => a.isEarned(character)).map(a => (
        <span key={a.id} title={a.name}>{a.icon}</span>
      ))}
    </>
  );
}
