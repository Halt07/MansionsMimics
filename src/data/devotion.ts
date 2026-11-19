// ============================================================
// MANSIONS & MIMICS — Devotion (The Hollow Reliquary)
// A devoted adventurer left as the last one standing converts: it recognises the mimic as the
// shrine's lost god, brings it OFFERING_COUNT small creatures from the location and leaves,
// ending the hunt. Who's ready, the offerings, and the ceremony, worked out in full when it
// begins (the game screen plays it out a line at a time: see useDevotionCeremony). Its own
// module because the ceremony is a turn (./hunt), which ./events can't build on.
// Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { stillInHunt, type PartyMember } from "./adventurerData";
import type { HuntLocation, LocationCreature } from "./locationData";
import type { GameEventType } from "./vocabulary";
import { TIER_CONFIG } from "./mimicData";
import { Turn, type Hunt, type LogLine, type TurnOptions, type TurnResult } from "./hunt";
import { CULT_CONVERSIONS } from "./stats";
import { DOUBTING_SCHOLAR, SCHOLAR_NOTES_LINE } from "./easterEggs";
import { the } from "./text";

export const OFFERING_COUNT: readonly [number, number] = [4, 5];

/** The devoted adventurer ready to convert: the only party member left, or null. */
export function findDevotee(party: readonly PartyMember[]): PartyMember | null {
  const remaining = party.filter(stillInHunt);
  if (party.length < 2 || remaining.length !== 1) return null;
  return remaining[0].behavior === "devotion" ? remaining[0] : null;
}

/** The small creatures a convert brings as offerings. */
export function rollOfferings(location: HuntLocation, random: () => number = Math.random): LocationCreature[] {
  const pool = location.locationCreatures;
  if (pool.length === 0) return [];
  const [min, max] = OFFERING_COUNT;
  const count = min + Math.floor(random() * (max - min + 1));
  return Array.from({ length: count }, () => pool[Math.floor(random() * pool.length)]);
}

export interface DevotionStep {
  log: LogLine[];
  /** AP from an offering accepted in this step. */
  ap: number;
}

export interface Devotion {
  /** The hunt and character the moment the pilgrim kneels: converted, and counted. */
  start: TurnResult;
  /** The ceremony, one step at a time. */
  steps: DevotionStep[];
  /** Saved when the ceremony ends: the offerings' AP. */
  changes: Partial<MimicCharacter>;
  /** The offerings bring enough AP to evolve. */
  evolve: boolean;
}

/**
 * Once a devoted pilgrim is the last one left, it recognises the mimic as the shrine's lost god,
 * brings offerings and leaves, ending the hunt. Null if nobody is ready to convert. Check after
 * every action that leaves the hunt going (and when coming back to it from the upgrade screen).
 */
export function devotion(hunt: Hunt, character: MimicCharacter, opts: TurnOptions = {}): Devotion | null {
  if (hunt.ending) return null;
  const devotee = findDevotee(hunt.party);
  if (!devotee) return null;
  const t = new Turn(hunt, character, opts);
  const offerings = rollOfferings(hunt.location, t.random);
  const apGained = offerings.reduce((sum, c) => sum + c.ap, 0);
  const zealot = devotee.convertedName ?? devotee.name;
  t.patchMember(devotee.id, () => ({ name: zealot, isAlive: false, isAttracted: false, isConverted: true }));
  // Counted straight away, so leaving mid-ceremony can't lose it
  const conversions = character.conversions + 1;
  t.update({ conversions });
  const start = t.finish();

  const line = (type: GameEventType, message: string): DevotionStep => ({ log: [{ type, message }], ap: 0 });
  const total = character.assimilationPoints + apGained;
  const evolve = total >= TIER_CONFIG[character.tier].apToEvolve;
  const steps: DevotionStep[] = [
    line("evolve", `${devotee.name} stares at the empty places where their companions stood… then falls to their knees before you. "It is real. It has come back."`),
    ...(zealot !== devotee.name ? [line("evolve", `${devotee.name} is now ${the(zealot)}.`)] : []),
    line("info", `${the(zealot, true)} hurries out, and returns with offerings, laying them before you one by one.`),
    ...offerings.map(c => ({ log: [{ type: "consume" as const, message: `You accept the ${c.name}. +${c.ap} AP.` }], ap: c.ap })),
    line("system", `🕯 ${the(zealot, true)} backs out of the shrine, never once turning away from you. The hunt is over. (+${apGained} AP in offerings)`),
    // Easter egg: the skeptic's treatise gets an ending
    ...(hunt.party.some(a => a.name === DOUBTING_SCHOLAR) ? [line("info", SCHOLAR_NOTES_LINE)] : []),
    {
      log: [
        ...(conversions === CULT_CONVERSIONS
          ? [{ type: "evolve" as const, message: `🕯️ Cult of Personality! ${CULT_CONVERSIONS} souls now worship you. The faithful are growing in number.` }]
          : []),
        ...(evolve ? [{ type: "evolve" as const, message: `Your assimilation has reached the threshold! You may evolve!` }] : []),
      ],
      ap: 0,
    },
  ];
  return { start, steps, changes: { assimilationPoints: total, lastFedAt: t.now.toISOString() }, evolve };
}
