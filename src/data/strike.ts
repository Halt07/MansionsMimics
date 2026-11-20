// ============================================================
// MANSIONS & MIMICS — Strike
// What happens when the mimic strikes. Three kinds: a revealed rival mimic (a straight
// contest of dice), a partial bite (Minor mimics, and anyone biting a giant too big to
// swallow), or swallowing the target whole. Pure: each returns what happened, and Game writes
// the log and applies it. Every function takes an optional random source so tests can pin
// the dice. Re-exported from ./gameData.
// ============================================================
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import { ADVENTURER_MATERIALS, ADVENTURER_TRAITS, getApReward, stillInHunt, type PartyMember } from "./adventurerData";
import { getAdjacentRooms, getRoomDistance, hasMagic, rollDice, shuffle } from "./core";
import { RIVAL_STATS, pickTreasurePrize, rivalEscapeRoom, type RivalMimic, type TreasurePrize } from "./events";
import type { HuntLocation, RoomName } from "./locationData";
import { calcAllureInterest, type CheckResult } from "./lure";
import type { Form } from "./mimicData";
import { TITANIC_FEAST_GIANTS, isTitanicFeastComplete } from "./stats";
import type { Material, TeachableTrait } from "./vocabulary";

// ---------- the checks: adhesion, escaping, AP, witnesses ----------

/**
 * Suspicion added when a party member is consumed whole while others remain in the hunt.
 * A disappearance alone is +1; anyone still in the room may have seen it happen (+2), and a crowd
 * of 3 or more witnesses raises the alarm further (+3).
 */
export function consumeSuspicion(witnesses: number): number {
  if (witnesses >= 3) return 3;
  if (witnesses >= 1) return 2;
  return 1;
}

/** Extra dice an Elusive adventurer rolls when resisting a Strike (or bite). */
export const ELUSIVE_EXTRA_DICE = 1;

/** Dice an adventurer resists a Strike (or bite) with: its Discipline, plus any Elusive dice. */
export function strikeResistDice(adventurer: Pick<PartyMember, "discipline" | "behavior">): number {
  return adventurer.discipline + (adventurer.behavior === "elusive" ? ELUSIVE_EXTRA_DICE : 0);
}

/** Where an adventurer that slipped a Strike runs to: a room next to it, never the mimic's. */
export function escapeRoom(
  location: HuntLocation, fromRoom: RoomName, mimicRoom: RoomName | null, random: () => number = Math.random,
): RoomName {
  const adjacent = getAdjacentRooms(location, fromRoom).filter(r => r !== mimicRoom);
  const options = adjacent.length > 0 ? adjacent : location.rooms.filter(r => r !== mimicRoom && r !== fromRoom);
  return options.length > 0 ? options[Math.floor(random() * options.length)] : fromRoom;
}

export function adhesionCheck(adhesion: number, form: Form, adventurer: PartyMember, random: () => number = Math.random): CheckResult {
  // Stuck in the tar: nowhere to go
  if (adventurer.tarStuck !== undefined) {
    return { success: true, mimicRoll: 0, advRoll: 0, suspicionChange: 0, detectedFlaws: [], narrative: `The ${form.name} closes on ${adventurer.name}, held fast in the tar. There's nowhere to go.` };
  }
  const mimicRoll = rollDice(adhesion, random);
  const advRoll = rollDice(strikeResistDice(adventurer), random);
  const success = mimicRoll >= advRoll;
  return {
    success, mimicRoll, advRoll, suspicionChange: 0, detectedFlaws: [],
    narrative: success
      ? `The ${form.name} snaps shut! ${adventurer.name} is caught!`
      : `${adventurer.name} recoils just in time, evading your grasp!`,
  };
}

// ---------- partial bites ----------
// Minor mimics are too small to swallow anyone whole, and Apex mimics can't swallow
// a giant until they reach its wholeMealMass. Both bite pieces off instead.
export const BITE_MATERIAL_CHANCE = 0.35; // chance a held bite teaches one of the target's loot materials

export function needsPartialBites(
  character: Pick<MimicCharacter, "tier" | "mass">, target: Pick<PartyMember, "wholeMealMass">,
): boolean {
  if (character.tier === "Minor") return true;
  return !!target.wholeMealMass && (character.mass ?? 0) < target.wholeMealMass;
}

/** AP for one held bite: 1 for ordinary prey, 2–3 for a giant. */
export function getBiteAp(target: Pick<PartyMember, "group">, random: () => number = Math.random): number {
  return target.group === "giantKin" ? 2 + Math.floor(random() * 2) : 1;
}

/** Maybe learn a real material from a bite. Returns a material name or null. */
export function rollBiteMaterial(target: Pick<PartyMember, "lootMaterials">, random: () => number = Math.random): Material | null {
  const mats = target.lootMaterials || [];
  if (mats.length === 0 || random() >= BITE_MATERIAL_CHANCE) return null;
  return mats[Math.floor(random() * mats.length)];
}

// ---------- who gets struck ----------

/** Dice the mimic strikes with: its effective Adhesion, plus one for Bonesteel. */
export function strikeDice(adhesion: number, appearance: Partial<Appearance> | null | undefined): number {
  return adhesion + (hasMagic(appearance ?? undefined, "Bonesteel") ? 1 : 0);
}

/**
 * Who a Strike can reach: anyone lured. Under the fireworks (`skyward`), anyone in the mimic's
 * room too, since they're all staring at the sky; and anyone stuck in the tar in the mimic's room.
 */
export function strikeCandidates(party: readonly PartyMember[], mimicRoom: RoomName | null, skyward: boolean): PartyMember[] {
  return party.filter(a => stillInHunt(a) &&
    (a.isAttracted || ((skyward || a.tarStuck !== undefined) && a.location === mimicRoom)));
}

/** The one struck: the nearest candidate, and among the nearest, whoever likes the mimic's look most. */
export function pickStrikeTarget(
  candidates: readonly PartyMember[], location: HuntLocation, mimicRoom: RoomName | null,
  form: Form, appearance: Partial<Appearance> | null | undefined,
): PartyMember | null {
  const scored = candidates.map(adv => ({
    adv,
    dist: mimicRoom ? getRoomDistance(location, mimicRoom, adv.location) : 0,
    interest: calcAllureInterest(form, appearance || {}, adv),
  }));
  scored.sort((a, b) => a.dist - b.dist || b.interest - a.interest);
  return scored[0]?.adv ?? null;
}

export interface Witnesses {
  /** Anyone else still in the hunt. If not, eating the target ends it, and nobody's left to worry. */
  othersRemain: boolean;
  /** Others in the mimic's room. */
  inRoom: number;
  /** Of those, how many see it: none if they're all watching fireworks. */
  witnesses: number;
}

export function strikeWitnesses(
  party: readonly PartyMember[], target: PartyMember, mimicRoom: RoomName | null, skyward: boolean,
): Witnesses {
  const others = party.filter(a => a.id !== target.id && stillInHunt(a));
  const inRoom = others.filter(a => a.location === mimicRoom).length;
  return { othersRemain: others.length > 0, inRoom, witnesses: skyward ? 0 : inRoom };
}

// ---------- a rival mimic ----------

export type RivalStrike =
  | { devoured: true; ap: number }
  /** It slipped away and hid again, in this room. */
  | { devoured: false; hidesIn: RoomName };

/** Strike a revealed rival: the mimic's dice against the rival's. A tie goes to the mimic. */
export function resolveRivalStrike(
  rival: RivalMimic, dice: number, location: HuntLocation, rivals: readonly RivalMimic[], mimicRoom: RoomName,
  random: () => number = Math.random,
): RivalStrike {
  const stats = RIVAL_STATS[rival.kind];
  if (rollDice(dice, random) >= rollDice(stats.dice, random)) return { devoured: true, ap: stats.ap };
  return { devoured: false, hidesIn: rivalEscapeRoom(location, rivals, rival, mimicRoom, random) };
}

// ---------- a partial bite ----------

/** Extra AP when a bite wears the target down and it collapses. */
export const COLLAPSE_BONUS_AP = 2;
/** Chance a worn-down target (Discipline 3+) runs instead of collapsing, after a bite. */
export const BITE_FLEE_CHANCE = 0.5;
/** Chance a worn-down target runs after wrenching free of a bite. */
export const WRENCH_FLEE_CHANCE = 0.6;

/**
 * How a bite leaves the target. "continues": still in the hunt (wary). "collapses": eaten.
 * "flees": gone from the hunt. "bolts": an elusive target runs to another room. "trapped": it
 * tries to flee, but the location is snowed in, so it bolts to another room instead.
 */
export type BiteEnding = "continues" | "collapses" | "flees" | "bolts" | "trapped";

export interface BiteOutcome {
  /** The jaws closed on something (the adhesion check). */
  latched: boolean;
  /** …and held on long enough to tear a piece off (Patience against the target's Discipline + 1). */
  held: boolean;
  /** The body part bitten (flavor). */
  part: string;
  /** What tore loose (flavor), when it held. */
  scrap: string | null;
  /** Hits the target has taken, counting this one if it latched. */
  hits: number;
  /** Most hits it can take (its constitution). */
  maxHits: number;
  /** AP from the bite itself, plus the collapse bonus if it collapsed. */
  ap: number;
  /** A material the mimic didn't know, learned from the bite. */
  material: Material | null;
  ending: BiteEnding;
  /** Suspicion for the whole party, all told. */
  suspicion: number;
  /** Of that, what the bite itself drew (it's always noticed: 2, or 3 with a crowd watching). */
  crySuspicion: number;
  /** The bite's cry turned every head in the room (3+ witnesses). */
  loudCry: boolean;
  /** Suspicion the target itself gains (if it's still in the hunt). */
  targetSuspicion: number;
}

const BODY_PARTS = ["hand", "forearm", "boot", "calf", "pant leg", "cloak edge", "shirt sleeve"];
const GIANT_PARTS = ["ankle", "bootlace, thick as rope", "cloak hem", "calloused toe", "belt edge", "trailing sleeve"];

export interface BiteContext {
  /** Strike dice (see strikeDice). */
  dice: number;
  /** The mimic's effective Patience: holding on. */
  patience: number;
  form: Form;
  knownMaterials: readonly Material[];
  /** Nobody can leave (the Snowbound Lodge). */
  snowbound: boolean;
  witnesses: Witnesses;
}

/** Take a bite out of `target`. */
export function resolveBite(target: PartyMember, ctx: BiteContext, random: () => number = Math.random): BiteOutcome {
  const giant = target.group === "giantKin";
  const parts = giant ? GIANT_PARTS : BODY_PARTS;
  const latched = adhesionCheck(ctx.dice, ctx.form, target, random).success;
  const part = parts[Math.floor(random() * parts.length)];
  const before = target.hitsTaken || 0;
  const maxHits = target.constitution || 3;
  const base = { part, maxHits, scrap: null, ap: 0, material: null, loudCry: false, crySuspicion: 0 };

  // Missed entirely
  if (!latched) {
    return { ...base, latched, held: false, hits: before, ending: "continues", suspicion: 2, targetSuspicion: 2 };
  }

  const hits = before + 1;
  const wornDown = hits >= maxHits;
  const held = rollDice(ctx.patience, random) >= rollDice(target.discipline + 1, random);

  // Latched, but it wrenched free before anything tore loose
  if (!held) {
    const ending: BiteEnding = !wornDown ? "continues"
      : target.behavior === "elusive" ? "bolts"
      : ctx.snowbound ? "trapped"
      : random() < WRENCH_FLEE_CHANCE ? "flees" : "continues";
    return { ...base, latched, held, hits, ending, suspicion: 3, targetSuspicion: 4 };
  }

  // Held: a piece tears off, and maybe a material comes with it
  const loot = target.partialLoot?.length ? target.partialLoot : ["scrap of cloth"];
  const scrap = loot[Math.floor(random() * loot.length)];
  const biteAp = getBiteAp(target, random);
  const rolled = rollBiteMaterial(target, random);
  const material = rolled && !ctx.knownMaterials.includes(rolled) ? rolled : null;
  const runs = wornDown && target.discipline >= 3 && random() < BITE_FLEE_CHANCE;
  const ending: BiteEnding = !wornDown ? "continues"
    : !runs ? "collapses"
    : target.behavior === "elusive" ? "bolts"
    : ctx.snowbound ? "trapped"
    : "flees";
  // Finishing off the last of the party ends the hunt, so nobody's left to notice
  const lastMeal = ending === "collapses" && !ctx.witnesses.othersRemain;
  const cry = lastMeal ? 0 : Math.max(2, consumeSuspicion(ctx.witnesses.witnesses));
  return {
    ...base, latched, held, scrap, hits, material, ending,
    ap: biteAp + (ending === "collapses" ? COLLAPSE_BONUS_AP : 0),
    loudCry: cry > 2,
    crySuspicion: cry,
    suspicion: cry + (ending === "flees" ? 3 : 0),
    targetSuspicion: ending === "bolts" ? 2 : ending === "trapped" ? 3 : 2,
  };
}

// ---------- swallowed whole ----------

export interface Learning {
  /** Everything this meal teaches, known or not (and the treasure's prize). */
  materials: Material[];
  traits: TeachableTrait[];
  /** Of those, what the mimic didn't know before (not counting the prize). */
  newMaterials: Material[];
  newTraits: TeachableTrait[];
  /** Treasure carried (the Captain's strongbox, a star fragment) guarantees one new thing, if it has any left. */
  prize: TreasurePrize | null;
}

/**
 * What swallowing `target` teaches. Assimilation is imperfect: some of its materials (at least
 * one, if it has any) and usually one of its traits, sometimes all of them.
 */
export function rollLearning(
  target: PartyMember, known: Pick<MimicCharacter, "learnedMaterials" | "learnedTraits">, random: () => number = Math.random,
): Learning {
  const allMaterials = target.lootMaterials || ADVENTURER_MATERIALS[target.type] || [];
  const allTraits = target.lootTraits || ADVENTURER_TRAITS[target.type] || [];
  const shuffledMats = shuffle(allMaterials, random);
  const shuffledTraits = shuffle(allTraits, random);
  const materials = shuffledMats.slice(0, Math.max(1, Math.floor(random() * (shuffledMats.length + 1))));
  const traits = shuffledTraits.length > 0 ? shuffledTraits.slice(0, random() < 0.6 ? 1 : shuffledTraits.length) : [];
  const newMaterials = materials.filter(m => !known.learnedMaterials.includes(m));
  const newTraits = traits.filter(t => !known.learnedTraits.includes(t));
  const prize = target.treasure
    ? pickTreasurePrize(target.treasure, [...known.learnedMaterials, ...materials], [...known.learnedTraits, ...traits], random)
    : null;
  if (prize?.kind === "material") materials.push(prize.name);
  if (prize?.kind === "trait") traits.push(prize.name);
  return { materials, traits, newMaterials, newTraits, prize };
}

export type SwallowOutcome =
  | {
      swallowed: false;
      /** The adhesion check's line (they recoiled). */
      narrative: string;
      /** They saw the lunge: 4 suspicion, 3 with Dragonhide. */
      suspicion: number;
      /** An elusive target bolts to another room; anyone else just stays, warier. */
      bolts: boolean;
    }
  | {
      swallowed: true;
      narrative: string;
      /** The target's own AP… */
      ap: number;
      /** …and its treasure's, on top. */
      treasureAp: number;
      learning: Learning;
      /** Party-wide suspicion: someone's gone missing (0 if they were the last). */
      suspicion: number;
      /** Down With the Ship: the Ship's Captain, swallowed whole for the first time. */
      sankWithShip: boolean;
      /** The Cloud Kingdom giants swallowed whole so far (this one added if it's one of them). */
      giantsConsumedWhole: string[];
      /** This meal added a giant toward the Titanic Feast, without finishing it. */
      feastProgress: boolean;
      /** This meal completed the Titanic Feast. */
      feastComplete: boolean;
    };

export interface SwallowContext {
  dice: number;
  form: Form;
  witnesses: Witnesses;
}

/** Swallow `target` whole (or lunge and miss). */
export function resolveSwallow(
  target: PartyMember,
  character: Pick<MimicCharacter, "currentAppearance" | "learnedMaterials" | "learnedTraits" | "downWithTheShipReached" | "giantsConsumedWhole" | "titanicFeastReached">,
  ctx: SwallowContext, random: () => number = Math.random,
): SwallowOutcome {
  const check = adhesionCheck(ctx.dice, ctx.form, target, random);
  if (!check.success) {
    return {
      swallowed: false, narrative: check.narrative,
      suspicion: hasMagic(character.currentAppearance, "Dragonhide") ? 3 : 4,
      bolts: target.behavior === "elusive",
    };
  }
  const feastGiant = !target.isCompanion && TITANIC_FEAST_GIANTS.includes(target.name);
  const added = feastGiant && !character.giantsConsumedWhole.includes(target.name);
  const giantsConsumedWhole = added ? [...character.giantsConsumedWhole, target.name] : character.giantsConsumedWhole;
  const feastComplete = !character.titanicFeastReached && isTitanicFeastComplete(giantsConsumedWhole);
  return {
    swallowed: true, narrative: check.narrative,
    ap: getApReward(target),
    treasureAp: target.treasure?.ap ?? 0,
    learning: rollLearning(target, character, random),
    suspicion: ctx.witnesses.othersRemain ? consumeSuspicion(ctx.witnesses.witnesses) : 0,
    sankWithShip: target.name === "Ship's Captain" && !character.downWithTheShipReached,
    giantsConsumedWhole,
    feastProgress: added && !feastComplete,
    feastComplete,
  };
}
