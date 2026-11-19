// ============================================================
// MANSIONS & MIMICS — Lure and stealth
// Luring adventurers into the mimic's room, the stealth checks anyone who walks in has to get
// past, and the contested rolls behind both. Pure: each returns what happened, and the turn
// writes the log and applies it. All take an optional random source so tests can pin the dice.
// Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import type { Form } from "./mimicData";
import { isPerceptionSense, type Material, type Tier, type Trait, type UtilityTag } from "./vocabulary";
import type { AdventurerTemplate, PartyMember, QualityList } from "./adventurerData";
import type { HuntLocation, RoomContextMod, RoomName } from "./locationData";
import {
  FORM_ROOM_TYPE, ROOM_FORM_IDS, effectiveFormTier, formFamily, formTier, getFormTierPenalties, getRoomContextMod,
  getRoomDistance, hasMagic, quirkLine, rollDice, wornMagic, type AppearanceLike,
} from "./gameData";

// ---------- the checks: stealth and allure ----------

/** The result of a contested roll (stealth, allure or adhesion). */
export interface CheckResult {
  success: boolean;
  mimicRoll: number;
  advRoll: number;
  suspicionChange: number;
  detectedFlaws: string[];
  narrative: string;
}

/** Anything an adventurer can like or dislike. */
export type Quality = Material | Trait | UtilityTag;

export interface AllureResult extends CheckResult {
  interestBonus: number;
  aversion: number;
  disliked: Quality[];
}

// roomContextMod: { plausibility: number, allure: number } — from getRoomContextMod()
export function stealthCheck(
  plausibility: number, patience: number, formTier: Tier, mimicTier: Tier, form: Form, adventurer: PartyMember,
  roomContextMod: Partial<RoomContextMod> = {}, appearance: AppearanceLike = {}, random: () => number = Math.random,
): CheckResult {
  // Gravecloth: undead take the mimic for one of their own
  if (adventurer.type === "Undead" && hasMagic(appearance, "Gravecloth")) {
    return {
      success: true, mimicRoll: 0, advRoll: 0, suspicionChange: 0, detectedFlaws: [],
      narrative: `${adventurer.name} passes the ${form.name} without a second glance — it smells of the grave, like one of its own.`,
    };
  }
  // Form one tier above: –2 Plausibility. (A form one tier below costs Patience instead,
  // which the caller has already applied to the `patience` passed in.)
  let basePlausi = plausibility - getFormTierPenalties(formTier, mimicTier).plausibility;
  // Apply room context plausibility modifier
  basePlausi += (roomContextMod.plausibility || 0);
  basePlausi = Math.max(1, basePlausi);

  // Patience adds bonus dice to the mimic's stealth roll (stillness aids deception)
  const patienceBonus = Math.floor((patience || 1) / 2);
  const stealthDice = basePlausi + patienceBonus + (hasMagic(appearance, "Shadowwood") ? 1 : 0);
  const hunterPenalty = adventurer.isMimicHunter && hasMagic(appearance, "Starforged Iron") ? 2 : 0;

  let flawCount = 0;
  if (plausibility <= 2) flawCount = 2;
  else if (plausibility <= 3) flawCount = 1;

  const detectedFlaws: string[] = [];
  const shuffled = [...form.flawProfiles].sort(() => random() - 0.5).slice(0, flawCount);
  shuffled.forEach((flaw) => {
    // Void Marble: acoustic flaws can't be spotted
    if (flaw.type === "acoustic" && hasMagic(appearance, "Void Marble")) return;
    // Flaw types that are also senses get the adventurer's bonus for that sense
    const affinityBonus = isPerceptionSense(flaw.type) ? adventurer.perceptionAffinity[flaw.type] : 0;
    const scentPenalty = flaw.type === "environmental" && hasMagic(appearance, "Direwolf Pelt") ? 1 : 0;
    const advRollResult = rollDice(Math.max(1, adventurer.discipline + affinityBonus - scentPenalty - hunterPenalty), random);
    const mimicRollResult = rollDice(stealthDice, random);
    if (advRollResult > mimicRollResult) detectedFlaws.push(flaw.description);
  });

  // Arcane residue: each worn magic material is an extra flaw check for magic-sensitive adventurers
  const magicalAffinity = adventurer.perceptionAffinity.magical || 0;
  if (magicalAffinity >= 2) {
    wornMagic(appearance).forEach((mat) => {
      const advRollResult = rollDice(Math.max(1, adventurer.discipline + magicalAffinity - hunterPenalty), random);
      const mimicRollResult = rollDice(stealthDice, random);
      if (advRollResult > mimicRollResult) detectedFlaws.push(`Faint arcane residue clings to it (${mat})`);
    });
  }

  const mimicRoll = rollDice(stealthDice, random);
  const advRoll = rollDice(Math.max(1, adventurer.discipline + adventurer.suspicion - hunterPenalty), random);
  const success = mimicRoll >= advRoll;
  const suspicionChange = detectedFlaws.length + (success ? 0 : 1);

  return {
    success, mimicRoll, advRoll, suspicionChange, detectedFlaws,
    narrative: success
      ? `${adventurer.name} glances at the ${form.name} and moves on.`
      : `${adventurer.name} pauses, eyes narrowing at the ${form.name}.`,
  };
}

// Which of an adventurer's liked and disliked qualities the mimic's current look matches.
// Materials: primary and secondary (including any magic ones). Traits: surface, symbolic and condition traits from the appearance,
// plus the form's built-in traits (structural/aura, e.g. a Chest is Iron-Banded). Tags: the form's utility tags.
//   liked    — each match is +1 allure die (capped by plausibility, see allureCheck)
//   disliked — each match is -1 allure die (adventurer.repelledBy)
export function calcAllureBreakdown(
  form: Pick<Form, "builtInTraits" | "utilityTags">,
  currentAppearance: AppearanceLike,
  adventurer: Pick<AdventurerTemplate, "alluringQualities" | "repelledBy">,
): { liked: Quality[]; disliked: Quality[]; interest: number; aversion: number } {
  const appearanceMats: Material[] = [
    ...(currentAppearance.primaryMaterials || []),
    ...(currentAppearance.secondaryMaterials || []),
  ];
  const appearanceTraits: Trait[] = [
    ...(currentAppearance.surfaceTraits || []),
    ...(currentAppearance.symbolicTraits || []),
    ...(currentAppearance.conditionTraits || []),
    ...(currentAppearance.scentTraits || []),
    ...(form.builtInTraits || []),
  ];
  const formTags: readonly UtilityTag[] = form.utilityTags || [];
  const matching = (qualities: QualityList = {}): Quality[] => [
    ...(qualities.materials || []).filter(mat => appearanceMats.includes(mat)),
    ...(qualities.traits || []).filter(trait => appearanceTraits.includes(trait)),
    ...(qualities.tags || []).filter(tag => formTags.includes(tag)),
  ];
  const liked = matching(adventurer.alluringQualities);
  const disliked = matching(adventurer.repelledBy);
  return { liked, disliked, interest: liked.length, aversion: disliked.length };
}

// Net interest score (likes minus dislikes) without rolling — used for targeting priority
export function calcAllureInterest(
  form: Pick<Form, "builtInTraits" | "utilityTags">,
  currentAppearance: AppearanceLike,
  adventurer: Pick<AdventurerTemplate, "alluringQualities" | "repelledBy">,
): number {
  const { interest, aversion } = calcAllureBreakdown(form, currentAppearance, adventurer);
  return interest - aversion;
}

// roomContextMod: { plausibility: number, allure: number } — from getRoomContextMod()
export function allureCheck(
  baseAllure: number, plausibility: number, form: Form, currentAppearance: AppearanceLike, adventurer: PartyMember,
  roomContextMod: Partial<RoomContextMod> = {}, random: () => number = Math.random,
): AllureResult {
  // Base mimic allure dice = baseAllure + form modifier + room context
  let allureDice = baseAllure + (form.baseAllureModifier || 0) + (roomContextMod.allure || 0);

  const { interest: interestBonus, aversion, disliked } = calcAllureBreakdown(form, currentAppearance, adventurer);

  let suspicionChange = 0;
  // Only add interest bonus if plausibility supports it; excess causes suspicion
  const usableBonus = Math.min(interestBonus, plausibility);
  if (interestBonus > plausibility) suspicionChange += 1;
  allureDice += usableBonus;
  // Each disliked quality costs a die — dislikes are never capped
  allureDice -= aversion;
  if (hasMagic(currentAppearance, "Spellweave Silk")) allureDice += 1;
  allureDice = Math.max(1, allureDice);

  // Adventurer resists with discipline + suspicion (wariness makes luring harder)
  const resistDice = adventurer.discipline + Math.ceil(adventurer.suspicion / 2);
  const mimicRoll = rollDice(allureDice, random);
  const advRoll = rollDice(resistDice, random);
  const success = mimicRoll >= advRoll;

  return {
    success, mimicRoll, advRoll, interestBonus, aversion, disliked, suspicionChange, detectedFlaws: [],
    narrative: success
      ? `${adventurer.name} is drawn toward the ${form.name}, eyes gleaming with interest.`
      : `${adventurer.name} glances at the ${form.name} but shows no interest.`,
  };
}

// ---------- the Lure ----------

export interface LureAttempt {
  /** The adventurer, as they were before the Lure. */
  member: PartyMember;
  result: AllureResult;
  /** Drawn in from another room (already in yours: just attracted where they stand). */
  drawnIn: boolean;
}

export interface LureOutcome {
  party: PartyMember[];
  /** The room's bonus or penalty to allure, for this form. */
  roomMod: RoomContextMod;
  /** One per adventurer in range who wasn't already lured, in party order. */
  attempts: LureAttempt[];
  /** Everyone who came into the mimic's room (they face stealth checks). */
  arrivals: PartyMember[];
  /** Suspicion from overdoing it: liking too much about the look to be believable. */
  suspicion: number;
}

export interface LureContext {
  location: HuntLocation;
  mimicRoom: RoomName;
  /** How many rooms away the Lure reaches (see lureRange). */
  range: number;
  form: Form;
  mimic: Pick<MimicCharacter, "baseAllure" | "currentAppearance">;
  /** Effective Plausibility: it caps how much an adventurer's liking can help. */
  plausibility: number;
}

/**
 * Lure everyone in range who isn't already lured. Each gets an allure check; those who fall
 * for it are attracted, and anyone in another room comes into the mimic's.
 */
export function resolveLure(party: readonly PartyMember[], ctx: LureContext, random: () => number = Math.random): LureOutcome {
  const roomMod = getRoomContextMod(ctx.form.id, ctx.location.id, ctx.mimicRoom);
  const attempts: LureAttempt[] = [];
  const arrivals: PartyMember[] = [];
  let suspicion = 0;
  const next = party.map(adv => {
    if (!adv.isAlive || adv.isConsumed || adv.isAttracted) return adv;
    if (getRoomDistance(ctx.location, ctx.mimicRoom, adv.location) > ctx.range) return adv;
    const result = allureCheck(ctx.mimic.baseAllure, ctx.plausibility, ctx.form, ctx.mimic.currentAppearance || {}, adv, roomMod, random);
    suspicion += result.suspicionChange;
    const drawnIn = result.success && adv.location !== ctx.mimicRoom;
    attempts.push({ member: adv, result, drawnIn });
    if (!result.success) return adv;
    const lured = { ...adv, isAttracted: true, location: ctx.mimicRoom };
    if (drawnIn) arrivals.push(lured);
    return lured;
  });
  return { party: next, roomMod, attempts, arrivals, suspicion };
}

// ---------- stealth ----------

/** Extra suspicion for a room-shaped form when the location already has a room of that kind. */
export const DUPLICATE_ROOM_SUSPICION = 2;

export interface StealthLine {
  member: PartyMember;
  /** The newcomer acts out one of its quirks on the mimic's form (sometimes). */
  quirk: string | null;
  result: CheckResult;
}

export interface StealthOutcome {
  /** The room's bonus or penalty to Plausibility, for this form. */
  roomMod: RoomContextMod;
  checks: StealthLine[];
  /** A room-shaped form (a Library, a Chapel…) in a location that already has one. */
  duplicateRoom: RoomName | null;
  /**
   * Suspicion, all told: a failed check costs 1 plus each flaw it noticed (a passed check costs
   * nothing, even if it noticed flaws), and a duplicate room costs DUPLICATE_ROOM_SUSPICION.
   */
  suspicion: number;
}

export interface StealthContext {
  location: HuntLocation;
  mimicRoom: RoomName;
  form: Form;
  mimic: Pick<MimicCharacter, "tier" | "currentAppearance">;
  /** Effective Plausibility and Patience (see effectiveStats). */
  plausibility: number;
  patience: number;
}

/** Stealth checks for everyone who just came into the mimic's room (nothing happens if nobody did). */
export function resolveStealth(arrivals: readonly PartyMember[], ctx: StealthContext, random: () => number = Math.random): StealthOutcome {
  const roomMod = getRoomContextMod(ctx.form.id, ctx.location.id, ctx.mimicRoom);
  // Nobody came in: nothing to check, and nobody to notice a second Library
  if (arrivals.length === 0) return { roomMod, checks: [], duplicateRoom: null, suspicion: 0 };
  const ownTier = formTier(ctx.mimic);
  const checks = arrivals.map(member => ({
    member,
    quirk: quirkLine(member, ctx.form.name, random),
    result: stealthCheck(ctx.plausibility, ctx.patience, effectiveFormTier(ctx.form, ownTier), ownTier, ctx.form, member, roomMod, ctx.mimic.currentAppearance, random),
  }));
  let suspicion = checks.reduce((sum, c) => sum + (c.result.success ? 0 : c.result.suspicionChange), 0);

  // A room-shaped form (Grand/Apex) where the location already has that kind of room. Variants
  // (the Atheneum, the Cathedral) count as their base room type.
  const family = formFamily(ctx.form.id);
  const roomType = ROOM_FORM_IDS.has(family) ? FORM_ROOM_TYPE[family] : undefined;
  const duplicateRoom = roomType
    ? ctx.location.rooms.find(r => r !== ctx.mimicRoom && r.toLowerCase().includes(roomType)) ?? null
    : null;
  if (duplicateRoom) suspicion += DUPLICATE_ROOM_SUSPICION;
  return { roomMod, checks, duplicateRoom, suspicion };
}
