import { ACHIEVEMENTS, type AchievementId, type LocationId } from "@/data/gameData";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";

/** Colors for each achievement's banner, badge and Codex entry. */
export const ACHIEVEMENT_STYLES: Record<AchievementId, { text: string; box: string }> = {
  hatboxToLegend:    { text: "text-sky-400",    box: "bg-sky-500/10 border-sky-500/40" },
  apexPeak:          { text: "text-primary",    box: "bg-primary/10 border-primary/40" },
  titanicFeast:      { text: "text-amber-400",  box: "bg-amber-500/10 border-amber-500/40" },
  downWithTheShip:   { text: "text-cyan-400",   box: "bg-cyan-500/10 border-cyan-500/40" },
  cultOfPersonality: { text: "text-yellow-200", box: "bg-yellow-200/10 border-yellow-200/40" },
  cannibal:          { text: "text-rose-400",   box: "bg-rose-500/10 border-rose-500/40" },
  connoisseur:       { text: "text-emerald-400", box: "bg-emerald-500/10 border-emerald-500/40" },
  masterOfDisguise:  { text: "text-fuchsia-400", box: "bg-fuchsia-500/10 border-fuchsia-500/40" },
  curiosityCabinet:  { text: "text-teal-300",   box: "bg-teal-400/10 border-teal-400/40" },
  festive:           { text: "text-pink-300",   box: "bg-pink-400/10 border-pink-400/40" },
  forAllSeasons:     { text: "text-lime-300",   box: "bg-lime-400/10 border-lime-400/40" },
  seasonedTraveler:  { text: "text-orange-300", box: "bg-orange-400/10 border-orange-400/40" },
  eternal:           { text: "text-indigo-300", box: "bg-indigo-400/10 border-indigo-400/40" },
  primordial:        { text: "text-red-400",    box: "bg-red-500/10 border-red-500/40" },
  rulerOfAllMimics:  { text: "text-yellow-400", box: "bg-yellow-500/10 border-yellow-500/40" },
  stitchInTime:      { text: "text-sky-300",    box: "bg-sky-400/10 border-sky-400/40" },
  closingTime:       { text: "text-emerald-300", box: "bg-emerald-400/10 border-emerald-400/40" },
};

/**
 * In-game banners: earned achievements whose bannerLocation is where the mimic is hunting.
 * Pass huntingAt as null outside a hunt (nothing shows).
 */
export function AchievementBanners({ character, huntingAt, showAll = false }: {
  character: MimicCharacter;
  huntingAt: LocationId | null;
  /** Dev preview: show every banner, earned or not (Eternal can't be earned alongside Primordial), wherever the mimic is. */
  showAll?: boolean;
}) {
  const shown = ACHIEVEMENTS.filter(a => showAll || (a.isEarned(character) && huntingAt !== null && a.bannerLocation === huntingAt));
  return (
    <>
      {shown.map(a => (
        <div key={a.id} className={`p-4 border rounded-lg text-center ${ACHIEVEMENT_STYLES[a.id].box}`}>
          <div className="text-3xl mb-1">{a.icon}</div>
          <p className={`font-cinzel text-sm font-bold ${ACHIEVEMENT_STYLES[a.id].text}`}>{a.name}</p>
          <p className="text-xs text-muted-foreground mt-1 flavor-text italic">"{a.flavor(character.name)}"</p>
        </div>
      ))}
    </>
  );
}

/** Every earned achievement, compactly, for the character sheet. */
export function AchievementList({ character }: { character: MimicCharacter }) {
  const earned = ACHIEVEMENTS.filter(a => a.isEarned(character));
  if (earned.length === 0) {
    return <p className="text-xs text-muted-foreground/70 italic">None yet. The Codex lists what to aim for.</p>;
  }
  return (
    <div className="space-y-2">
      {earned.map(a => (
        <div key={a.id} className={`flex items-start gap-2 p-2 border rounded ${ACHIEVEMENT_STYLES[a.id].box}`}>
          <span className="text-lg leading-none">{a.icon}</span>
          <div>
            <p className={`font-cinzel text-xs font-bold ${ACHIEVEMENT_STYLES[a.id].text}`}>{a.name}</p>
            <p className="text-[11px] text-muted-foreground flavor-text italic">"{a.flavor(character.name)}"</p>
          </div>
        </div>
      ))}
    </div>
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
