// ============================================================
// MANSIONS & MIMICS — Game rules
// The core rules of a hunt: rooms, dice, which forms a mimic can take, magic, the stealth,
// allure and adhesion checks, bites, burns, where the party moves, and how adventurers react.
// The rest lives alongside it:
//   ./events     location events (rivals, the Sinking Ship, Devotion, the seasonal twists)
//   ./stats      effective stats, mass decay, achievements and lifetime stats
//   ./codex      what the Codex knows (adventurers met and eaten, hunting grounds found)
//   ./mealPrep   setting up a hunt (the party, companions, small creatures, sickness)
//   ./strike     what happens when the mimic strikes (rivals, bites, swallowing whole)
// The data lives in ./vocabulary, ./mimicData, ./adventurerData and ./locationData. This module
// re-exports all of it, so callers can keep importing everything from gameData.
// ============================================================
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import {
  ALL_MATERIALS, ALL_STARTING_TRAITS, MATERIALS, TIER_ORDER, isPerceptionSense,
  type GameEventType, type MagicMaterial, type Material, type Tier, type Trait, type UtilityTag,
} from "./vocabulary";
import {
  ALL_FORMS, MASTER_FORMS, SEASONAL_FORMS, TIER_CONFIG, type Form, type FormId, type SeasonalForm,
} from "./mimicData";
import { AP_REWARDS, BEHAVIORS, type AdventurerTemplate, type BehaviorId, type BehaviorInfo,
  type PartyMember, type QualityList,
} from "./adventurerData";
import {
  LOCATIONS, ROOM_FORM_MODIFIERS, type HuntLocation, type LocationCreature, type LocationId, type RoomModifier,
  type RoomContextMod, type RoomName,
} from "./locationData";
import { HOLIDAYS, isInSeason, seasonStart, today } from "./holidays";
import { answersDoor, claimStar, nextHouse, rivalInRoom, type RivalMimic } from "./events";

export * from "./vocabulary";
export * from "./mimicData";
export * from "./adventurerData";
export * from "./locationData";
export * from "./roomLayouts";
export * from "./huntReportData";
export * from "./holidays";
export * from "./events";
export * from "./stats";
export * from "./codex";
export * from "./mealPrep";
export * from "./strike";

// ============================================================
// ROOM HELPERS
// ============================================================
// Get room context modifier for a form in a specific room
export function getRoomContextMod(formId: FormId, locationId: LocationId, roomName: RoomName): RoomContextMod {
  const locationMods = ROOM_FORM_MODIFIERS[locationId] as Partial<Record<RoomName, Partial<Record<FormId, RoomModifier>>>> | undefined;
  const roomMods = locationMods?.[roomName];
  if (!roomMods) return { plausibility: 0, allure: 0 };
  const mod = roomMods[formId] ?? roomMods[formFamily(formId)];
  if (!mod) return { plausibility: 0, allure: 0 };
  return { plausibility: mod.plausibility || 0, allure: mod.allure || 0, note: mod.note };
}

// BFS distance between two rooms using a location's roomGraph
export function getRoomDistance(location: HuntLocation, roomA: RoomName, roomB: RoomName): number {
  if (roomA === roomB) return 0;
  const graph = location.roomGraph;
  if (!graph) return 1;
  const visited = new Set<RoomName>([roomA]);
  const queue: [RoomName, number][] = [[roomA, 0]];
  while (queue.length) {
    const [current, dist] = queue.shift()!;
    for (const neighbor of (graph[current] || [])) {
      if (neighbor === roomB) return dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  return 99; // unreachable
}

// Get adjacent rooms (distance 1) from a given room
export function getAdjacentRooms(location: HuntLocation, room: RoomName): readonly RoomName[] {
  return (location.roomGraph?.[room] || []);
}

// ============================================================
// SMALL CREATURES WANDERING
// Each turn a creature may wander to an adjacent room. Honeyamber (a magic material) makes
// them wander more often, and half of those moves step toward the mimic's room.
// ============================================================
export const CREATURE_WANDER_CHANCE = 0.4;
export const HONEYAMBER_WANDER_CHANCE = 0.5;
/** Of the moves a creature makes under Honeyamber, how many head toward the mimic. */
export const HONEYAMBER_LURE_CHANCE = 0.5;

/**
 * Where a small creature ends up this turn. Under Honeyamber, a move that heads for the mimic
 * steps one room closer, or stays put if it's already in the mimic's room; any other move is
 * to a random adjacent room (so a creature can still wander away from the mimic).
 */
export function wanderCreature(
  location: HuntLocation, from: RoomName, mimicRoom: RoomName | null, honeyamber: boolean, rand: () => number = Math.random,
): RoomName {
  if (rand() >= (honeyamber ? HONEYAMBER_WANDER_CHANCE : CREATURE_WANDER_CHANCE)) return from;
  const adjacent = getAdjacentRooms(location, from);
  const candidates = adjacent.length > 0 ? adjacent : location.rooms;
  if (honeyamber && mimicRoom && rand() < HONEYAMBER_LURE_CHANCE) {
    if (from === mimicRoom) return from;
    const here = getRoomDistance(location, from, mimicRoom);
    const closer = candidates.filter(r => getRoomDistance(location, r, mimicRoom) < here);
    if (closer.length) return closer[Math.floor(rand() * closer.length)];
  }
  return candidates[Math.floor(rand() * candidates.length)];
}

// ============================================================
// DICE ENGINE
// ============================================================
export function rollDice(numDice: number, random: () => number = Math.random): number {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(random() * 6) + 1;
  }
  return total;
}

/** Chance (0–1) that the sum of `numDice` d6 is at least `target`. */
export function diceSuccessChance(numDice: number, target: number): number {
  // Distribution of sums, built up one die at a time.
  let ways = [1]; // ways[s] = number of ways to roll a sum of s
  for (let i = 0; i < numDice; i++) {
    const next = new Array<number>(ways.length + 6).fill(0);
    ways.forEach((w, s) => { for (let face = 1; face <= 6; face++) next[s + face] += w; });
    ways = next;
  }
  const hits = ways.reduce((acc, w, s) => (s >= target ? acc + w : acc), 0);
  return hits / 6 ** numDice;
}

/** The highest target that `numDice` d6 still reach with at least `minChance` probability. */
export function maxTargetForChance(numDice: number, minChance: number): number {
  let target = numDice; // the minimum roll always succeeds
  while (target < numDice * 6 && diceSuccessChance(numDice, target + 1) >= minChance) target++;
  return target;
}

export function rollDiceVerbose(numDice: number): { total: number; rolls: number[] } {
  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * 6) + 1);
  }
  return { total: rolls.reduce((a, b) => a + b, 0), rolls };
}

// ============================================================
// HELPER: Get valid forms for a mimic
// Forms from the tier below, the current tier and the tier above are available
// (with plausibility penalties for the adjacent tiers — see stealthCheck).
// A form's minimum mass only gates it when it is higher than its own tier's starting
// mass (e.g. Giant forms, Chapel, Castle Gate, Lighthouse). Otherwise every form in the
// tier above would be unreachable, since a mimic is always below that tier's starting mass.
// The upper bound of baseMassRange is display/flavor only.
// ============================================================
export function isFormMassGated(form: Form): boolean {
  return form.baseMassRange[0] > TIER_CONFIG[form.tier].massRange[0];
}

/**
 * The tier a mimic's forms are judged against. Thimblewood shrinks it one tier (never below
 * Minor): every form-range and form-penalty rule then treats the mimic as that smaller size.
 */
export function formTier(character: { tier: Tier; currentAppearance?: AppearanceLike }): Tier {
  const idx = TIER_ORDER.indexOf(character.tier);
  return hasMagic(character.currentAppearance, "Thimblewood") ? TIER_ORDER[Math.max(0, idx - 1)] : character.tier;
}

/**
 * Which of a mimic's forms it may still carry at this size (tier, mass, variant unlocks, the
 * one-form-above limit, and seasonal forms only in season on `date`), in their current order.
 * Used after a tier-up or a Thimblewood change.
 */
export function formsStillAllowed<T extends { formId: string }>(
  forms: readonly T[], tier: Tier, mass: number, knowledge: FormKnowledge, date?: Date,
): T[] {
  const valid = getValidForms(tier, mass, knowledge, date);
  const kept: T[] = [];
  const keptForms: Form[] = [];
  for (const ref of forms) {
    const form = valid.find(f => f.id === ref.formId);
    if (form && canAddForm(keptForms, form, tier)) {
      kept.push(ref);
      keptForms.push(form);
    }
  }
  return kept;
}

// Only one of a mimic's forms may come from the tier above its own.
export const MAX_FORMS_ABOVE_TIER = 1;

/** The parts of a form that decide which tier it counts as. */
type TieredForm = Pick<Form, "tier" | "holidayTiers">;

/**
 * The tier a form counts as for a mimic of `mimicTier`: a seasonal form open to that tier
 * counts as the mimic's own (no penalty, never "above"); any other form, its own tier.
 */
export function effectiveFormTier(form: TieredForm, mimicTier: Tier): Tier {
  return form.holidayTiers?.includes(mimicTier) ? mimicTier : form.tier;
}

export function isFormAboveTier(form: TieredForm, mimicTier: Tier): boolean {
  return TIER_ORDER.indexOf(effectiveFormTier(form, mimicTier)) === TIER_ORDER.indexOf(mimicTier) + 1;
}

/** Whether `form` may be added to `selectedForms` without breaking the one-form-above rule. */
export function canAddForm(selectedForms: readonly TieredForm[], form: TieredForm, mimicTier: Tier): boolean {
  if (!isFormAboveTier(form, mimicTier)) return true;
  return selectedForms.filter(f => isFormAboveTier(f, mimicTier)).length < MAX_FORMS_ABOVE_TIER;
}

// ============================================================
// VARIANT FORMS
// A variant (e.g. Grimoire, a variant of Book) is available whenever its base form is,
// once the mimic knows any one of its unlockedBy materials or traits. It shares its
// base form's burn and room modifiers; "forms used" counts it separately.
// ============================================================
// Only ordinary forms: seasonal variants (e.g. the Harvest Feast Table) are unlocked by the
// date, not by learning (and Curiosity Cabinet can't wait for November).
export const VARIANT_FORMS: readonly Form[] = TIER_ORDER.flatMap(t => MASTER_FORMS[t]).filter(f => f.variantOf);

export function isVariantForm(form: Pick<Form, "variantOf">): boolean {
  return !!form.variantOf;
}

/** The base form of a variant (or the form itself): what burns and room modifiers are keyed by. */
export function formFamily(formId: FormId): FormId {
  return (ALL_FORMS.find(f => f.id === formId)?.variantOf as FormId | undefined) ?? formId;
}

/** What a mimic knows, for unlocking variant forms. */
export type FormKnowledge = Pick<MimicCharacter, "learnedMaterials" | "learnedTraits">;

/** Whether the mimic knows any of the materials or traits that unlock this variant. */
export function isVariantUnlocked(form: Pick<Form, "unlockedBy">, knowledge: FormKnowledge): boolean {
  return (form.unlockedBy ?? []).some(x =>
    (ALL_MATERIALS as readonly string[]).includes(x)
      ? knowledge.learnedMaterials.includes(x as Material)
      : knowsTrait(knowledge, x as Trait));
}

/** Ordinary forms whose tier and mass rules allow them, ignoring variant unlocks. */
function formsInRange(tierStr: Tier, massVal: number): Form[] {
  const currentTierIndex = TIER_ORDER.indexOf(tierStr);
  if (currentTierIndex === -1) return [];
  const forms: Form[] = [];
  TIER_ORDER.forEach((tier, tierIndex) => {
    if (Math.abs(tierIndex - currentTierIndex) > 1) return;
    MASTER_FORMS[tier].forEach((form) => {
      if (isFormMassGated(form) && massVal < form.baseMassRange[0]) return;
      forms.push(form);
    });
  });
  return forms;
}

// ============================================================
// SEASONAL FORMS
// Offered only while their holiday is in season (./holidays), and only to the tiers in
// holidayTiers, where they count as the mimic's own tier. When the season ends, the mimic
// loses the form (see expiredSeasonalForms); it's offered again next year.
// ============================================================
/** Seasonal forms open to a mimic of this tier on `date` (none without a date). */
export function getSeasonalForms(tierStr: Tier, date?: Date): SeasonalForm[] {
  if (!date) return [];
  return SEASONAL_FORMS.filter(f => f.holidayTiers.includes(tierStr) && isInSeason(f.holiday, date));
}

/** The seasonal forms among `forms` whose season is over on `date`: the mimic loses these. */
export function expiredSeasonalForms<T extends { formId: string }>(forms: readonly T[], date: Date): SeasonalForm[] {
  return forms.flatMap(ref => {
    const form = SEASONAL_FORMS.find(f => f.id === ref.formId);
    return form && !isInSeason(form.holiday, date) ? [form] : [];
  });
}

/**
 * Takes away seasonal forms whose season is over, keeping the active form selected if it stays.
 * Null when nothing has expired. `message` is the notice to show the player.
 */
export function dropExpiredSeasonalForms<T extends { formId: string }>(
  forms: readonly T[], activeFormIndex: number, date: Date,
): { forms: T[]; activeFormIndex: number; lost: SeasonalForm[]; message: string } | null {
  const lost = expiredSeasonalForms(forms, date);
  if (lost.length === 0) return null;
  const activeId = forms[activeFormIndex]?.formId;
  const kept = forms.filter(f => !lost.some(l => l.id === f.formId));
  const lines = [...new Set(lost.map(f => f.holiday))].map(h => {
    const names = lost.filter(f => f.holiday === h).map(f => f.name);
    const shapes = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)} shapes slip` : `${names[0]} shape slips`;
    return `${HOLIDAYS[h].icon} ${HOLIDAYS[h].name} is over. Your ${shapes} away until next ${seasonStart(h)}.`;
  });
  return {
    forms: kept,
    activeFormIndex: Math.max(0, kept.findIndex(f => f.formId === activeId)),
    lost,
    message: lines.join(" ") + (kept.length === 0 ? " Choose new forms before you hunt." : ""),
  };
}

/**
 * Forms a mimic can choose. Base forms by tier and mass; variant forms only when `knowledge`
 * is given and unlocks them (omit it, e.g. at character creation, for base forms only); seasonal
 * forms only when `date` is given and they're in season.
 */
export function getValidForms(tierStr: Tier, massVal: number, knowledge?: FormKnowledge, date?: Date): Form[] {
  return [
    ...formsInRange(tierStr, massVal).filter(f =>
      !isVariantForm(f) || (knowledge !== undefined && isVariantUnlocked(f, knowledge))),
    ...getSeasonalForms(tierStr, date),
  ];
}

/** Variants whose base form is in range but which the mimic hasn't unlocked yet (shown locked). */
export function getLockedVariants(tierStr: Tier, massVal: number, knowledge: FormKnowledge): Form[] {
  return formsInRange(tierStr, massVal).filter(f => isVariantForm(f) && !isVariantUnlocked(f, knowledge));
}

/** Any appearance-shaped object; fields may be missing (e.g. partially built looks). */
export type AppearanceLike = Partial<Appearance>;

/** All materials currently worn in the appearance (primary and secondary slots). */
function wornMaterials(appearance: AppearanceLike | undefined): Material[] {
  return [
    ...(appearance?.primaryMaterials || []),
    ...(appearance?.secondaryMaterials || []),
  ];
}

export function isMagicMaterial(material: Material): material is MagicMaterial {
  return (MATERIALS.magic as readonly Material[]).includes(material);
}

/** How many magic materials the appearance wears (checked against APPEARANCE_LIMITS[tier].magicalMaterials). */
export function countMagicMaterials(appearance: AppearanceLike | undefined): number {
  return wornMaterials(appearance).filter(isMagicMaterial).length;
}

/** True if the appearance is wearing this magic material in any slot. */
export function hasMagic(appearance: AppearanceLike | undefined, material: MagicMaterial): boolean {
  return wornMaterials(appearance).includes(material);
}

/** The magic materials (with effects) worn in the appearance. */
export function wornMagic(appearance: AppearanceLike | undefined): MagicMaterial[] {
  return [...new Set(wornMaterials(appearance).filter(isMagicMaterial))];
}

// ============================================================
// FORM TIER PENALTIES
// Tier above: less mass stretched into a larger form, so the disguise is never quite
//   perfect (–2 Plausibility on stealth checks).
// Tier below: more mass crammed into a smaller form, so the mimic is restless
//   (–1 Patience, applied to everything Patience affects).
// ============================================================
export function getFormTierPenalties(formTier: Tier, mimicTier: Tier): { plausibility: number; patience: number } {
  const delta = TIER_ORDER.indexOf(formTier) - TIER_ORDER.indexOf(mimicTier);
  return {
    plausibility: delta === 1 ? 2 : 0,
    patience: delta === -1 ? 1 : 0,
  };
}

/** Whether a mimic knows a trait: every mimic knows the starting traits; the rest must be learned. */
export function knowsTrait(character: Pick<MimicCharacter, "learnedTraits">, trait: Trait): boolean {
  return (ALL_STARTING_TRAITS as readonly Trait[]).includes(trait) || character.learnedTraits.includes(trait);
}

// ============================================================
// COMBAT ENGINE
// ============================================================
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

// Hunt Action Timeframe
export const ACTION_LIMIT = 50;
export const ACTION_WARNING = 20;

// roomContextMod: { plausibility: number, allure: number } — from getRoomContextMod()
export function stealthCheck(
  plausibility: number, patience: number, formTier: Tier, mimicTier: Tier, form: Form, adventurer: PartyMember,
  roomContextMod: Partial<RoomContextMod> = {}, appearance: AppearanceLike = {},
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
  const shuffled = [...form.flawProfiles].sort(() => Math.random() - 0.5).slice(0, flawCount);
  shuffled.forEach((flaw) => {
    // Void Marble: acoustic flaws can't be spotted
    if (flaw.type === "acoustic" && hasMagic(appearance, "Void Marble")) return;
    // Flaw types that are also senses get the adventurer's bonus for that sense
    const affinityBonus = isPerceptionSense(flaw.type) ? adventurer.perceptionAffinity[flaw.type] : 0;
    const scentPenalty = flaw.type === "environmental" && hasMagic(appearance, "Direwolf Pelt") ? 1 : 0;
    const advRollResult = rollDice(Math.max(1, adventurer.discipline + affinityBonus - scentPenalty - hunterPenalty));
    const mimicRollResult = rollDice(stealthDice);
    if (advRollResult > mimicRollResult) detectedFlaws.push(flaw.description);
  });

  // Arcane residue: each worn magic material is an extra flaw check for magic-sensitive adventurers
  const magicalAffinity = adventurer.perceptionAffinity.magical || 0;
  if (magicalAffinity >= 2) {
    wornMagic(appearance).forEach((mat) => {
      const advRollResult = rollDice(Math.max(1, adventurer.discipline + magicalAffinity - hunterPenalty));
      const mimicRollResult = rollDice(stealthDice);
      if (advRollResult > mimicRollResult) detectedFlaws.push(`Faint arcane residue clings to it (${mat})`);
    });
  }

  const mimicRoll = rollDice(stealthDice);
  const advRoll = rollDice(Math.max(1, adventurer.discipline + adventurer.suspicion - hunterPenalty));
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
  roomContextMod: Partial<RoomContextMod> = {},
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
  const mimicRoll = rollDice(allureDice);
  const advRoll = rollDice(resistDice);
  const success = mimicRoll >= advRoll;

  return {
    success, mimicRoll, advRoll, interestBonus, aversion, disliked, suspicionChange, detectedFlaws: [],
    narrative: success
      ? `${adventurer.name} is drawn toward the ${form.name}, eyes gleaming with interest.`
      : `${adventurer.name} glances at the ${form.name} but shows no interest.`,
  };
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

// AP for fully consuming an adventurer. Giant-kin use the Giant reward regardless of
// their class type (a Half-Giant Mercenary is type "Warrior" but is worth far more).
export function getApReward(adventurer: Pick<PartyMember, "group" | "type" | "apReward">): number {
  if (adventurer.apReward !== undefined) return adventurer.apReward;
  if (adventurer.group === "giantKin") return AP_REWARDS.Giant;
  return AP_REWARDS[adventurer.type] || 3;
}

// ============================================================
// PARTIAL BITES
// Minor mimics are too small to swallow anyone whole, and Apex mimics can't swallow
// a giant until they reach its wholeMealMass. Both bite pieces off instead.
// ============================================================
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

// ============================================================
// BURNS
// Being discovered burns the location and the form you were caught in. For the next
// BURN_HUNTS hunts, each adds BURN_SUSPICION to starting suspicion (they stack): the
// survivors have warned others about this place and this shape.
// ============================================================
export const BURN_HUNTS = 2;
export const BURN_SUSPICION = 2;

export interface Burns {
  burnedLocations: { id: LocationId; huntsLeft: number }[];
  burnedForms: { formId: FormId; huntsLeft: number }[];
}

/** Burns after being discovered at `locationId` in `formId` (resets them if already burned). */
export function burnAfterDiscovery(burns: Burns, locationId: LocationId, formId: FormId | null): Burns {
  return {
    burnedLocations: [
      ...burns.burnedLocations.filter(b => b.id !== locationId),
      { id: locationId, huntsLeft: BURN_HUNTS },
    ],
    // A variant burns with its base form: the survivors describe the shape, not the details
    burnedForms: formId
      ? [...burns.burnedForms.filter(b => b.formId !== formFamily(formId)), { formId: formFamily(formId), huntsLeft: BURN_HUNTS }]
      : burns.burnedForms,
  };
}

/** Hunts left on a location's or form's burn (0 if not burned). */
export function locationBurn(burns: Burns, locationId: LocationId): number {
  return burns.burnedLocations.find(b => b.id === locationId)?.huntsLeft ?? 0;
}
export function formBurn(burns: Burns, formId: FormId): number {
  return burns.burnedForms.find(b => b.formId === formFamily(formId))?.huntsLeft ?? 0;
}

/** Extra starting suspicion for a hunt at this location in this form. */
export function burnSuspicion(burns: Burns, locationId: LocationId, formId: FormId | null): number {
  return (locationBurn(burns, locationId) > 0 ? BURN_SUSPICION : 0) +
    (formId && formBurn(burns, formId) > 0 ? BURN_SUSPICION : 0);
}

/** Burns after a hunt starts: each one has one fewer hunt left, and spent ones are dropped. */
export function tickBurns(burns: Burns): Burns {
  const tick = <T extends { huntsLeft: number }>(list: T[]): T[] =>
    list.map(b => ({ ...b, huntsLeft: b.huntsLeft - 1 })).filter(b => b.huntsLeft > 0);
  return { burnedLocations: tick(burns.burnedLocations), burnedForms: tick(burns.burnedForms) };
}

// ============================================================
// LOCATION AVAILABILITY & RARE LOCATIONS
// After every hunt there's a RARE_LOCATION_CHANCE that one rare location the mimic
// qualifies for opens. It stays on the map for RARE_LOCATION_HUNTS hunts (or until
// visited), and only one can be open at a time.
// ============================================================
export const RARE_LOCATION_CHANCE = 0.15;
export const RARE_LOCATION_HUNTS = 2;

/** The rare location currently open for a mimic, and how many more hunts it stays. */
export interface RareLocationState {
  id: LocationId;
  huntsLeft: number;
}

/** Whether the mimic's tier and mass meet a location's requirements (ignores rarity). */
export function meetsLocationRequirements(location: HuntLocation, tier: Tier, mass: number): boolean {
  if (TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(location.minTier)) return false;
  if (location.minMass && mass < location.minMass) return false;
  return true;
}

/** Whether a location appears on the hunting-ground screen right now. Seasonal ones are open to every tier, in season. */
export function isLocationAvailable(
  location: HuntLocation, tier: Tier, mass: number, rareLocation: RareLocationState | null | undefined,
  date: Date = today(),
): boolean {
  if (location.holiday) return isInSeason(location.holiday, date);
  if (location.rare && rareLocation?.id !== location.id) return false;
  return meetsLocationRequirements(location, tier, mass);
}

/**
 * The rare-location state after a hunt at `huntedAt`. Visiting the open rare location
 * closes it; hunting elsewhere uses up one of its hunts. If nothing was open before this
 * hunt, there's a RARE_LOCATION_CHANCE that a qualifying rare location opens.
 */
export function advanceRareLocation(
  current: RareLocationState | null | undefined, huntedAt: LocationId, tier: Tier, mass: number,
  random: () => number = Math.random,
): { state: RareLocationState | null; opened: HuntLocation | null } {
  if (current) {
    const huntsLeft = current.huntsLeft - 1;
    const state = current.id === huntedAt || huntsLeft <= 0 ? null : { ...current, huntsLeft };
    return { state, opened: null };
  }
  if (random() >= RARE_LOCATION_CHANCE) return { state: null, opened: null };
  const candidates = LOCATIONS.filter(l => l.rare && meetsLocationRequirements(l, tier, mass));
  if (candidates.length === 0) return { state: null, opened: null };
  const opened = candidates[Math.floor(random() * candidates.length)];
  return { state: { id: opened.id, huntsLeft: RARE_LOCATION_HUNTS }, opened };
}

// ============================================================
// PARTY MOVEMENT
// Where everyone goes when the mimic Waits. Each adventurer still in the hunt usually wanders
// to a neighboring room (half the time they stay put), unless the location says otherwise: a
// fallen star draws everyone toward it, and a door-to-door procession walks the loop. Walking
// into a hidden rival's room is the end of them. Pure: Game logs and applies the result.
// ============================================================
/** Chance an adventurer stays where it is on a Wait (when nothing is drawing it anywhere). */
export const STAY_CHANCE = 0.5;

/** What happened to one adventurer this turn: a step from one room to another, or into a rival. */
export interface PartyStep {
  member: PartyMember;
  from: RoomName;
  to: RoomName;
  /** Walked into a hidden rival mimic's room and vanished (that rival's id). */
  vanishedInto?: string;
}

export interface MoveResult {
  party: PartyMember[];
  /** Everyone who moved this turn, in party order. */
  steps: PartyStep[];
  /** Who walked into the mimic's room (they need stealth checks). */
  arrivals: PartyMember[];
  /** Picked up the star fragment this turn (it's gone from the room). */
  claimedStar: PartyMember | null;
  /** Door to door: whoever reached the mimic's house knocked. Answered = the mimic's shape had sweets. */
  knock: { callers: PartyMember[]; answered: boolean } | null;
}

export interface MoveContext {
  mimicRoom: RoomName | null;
  rivals: readonly RivalMimic[];
  /** Where a fallen star fragment lies (Stargazers' Hill), if anywhere. */
  starFragment?: RoomName | null;
  /** The mimic's shape, for answering the door. */
  form?: Pick<Form, "id" | "variantOf"> | null;
}

/** Where one adventurer heads this turn (or null to stay put without taking a step). */
function destination(
  adv: PartyMember, location: HuntLocation, star: RoomName | null, random: () => number,
): RoomName | null {
  if (!adv.isAlive || adv.isConsumed || isStationary(adv)) return null;
  if (star) return adv.location === star ? null : stepToward(location, adv.location, star);
  if (location.procession) return nextHouse(location, adv.location, random);
  if (random() < STAY_CHANCE) return null;
  const next = getAdjacentRooms(location, adv.location);
  const options = next.length > 0 ? next : location.rooms;
  return options[Math.floor(random() * options.length)];
}

/** Everyone takes their turn: wanders, heads for the star, or walks to the next house. */
export function moveParty(
  party: readonly PartyMember[], location: HuntLocation, ctx: MoveContext, random: () => number = Math.random,
): MoveResult {
  const star = location.starfall ? ctx.starFragment ?? null : null;
  const steps: PartyStep[] = [];
  const arrivals: PartyMember[] = [];
  const moved = party.map(adv => {
    const to = destination(adv, location, star, random);
    if (to === null) return adv;
    if (to !== adv.location) {
      const lurker = rivalInRoom(ctx.rivals, to);
      if (lurker) {
        const gone = { ...adv, isAlive: false, isConsumed: false, isDisappeared: true, location: to };
        steps.push({ member: gone, from: adv.location, to, vanishedInto: lurker.id });
        return gone;
      }
    }
    // Taking a step (even back to the same room) breaks whatever had them attracted
    const next = { ...adv, location: to, isAttracted: false };
    if (to !== adv.location) {
      steps.push({ member: next, from: adv.location, to });
      if (to === ctx.mimicRoom) arrivals.push(next);
    }
    return next;
  });

  // Whoever reaches the fragment first pockets it
  const claimed = star ? claimStar(moved, star) : { party: moved, claimedBy: null };

  // Knock knock: only houses on the loop get knocked on (not the village green)
  const onLoop = !!ctx.mimicRoom && !!(location.procession?.order as readonly string[] | undefined)?.includes(ctx.mimicRoom);
  let result = claimed.party;
  let knock: MoveResult["knock"] = null;
  if (onLoop && arrivals.length > 0) {
    const answered = answersDoor(location, ctx.form);
    knock = { callers: arrivals, answered };
    if (answered) {
      const callers = new Set(arrivals.map(a => a.id));
      result = result.map(a => callers.has(a.id) && a.isAlive ? { ...a, isAttracted: true } : a);
    }
  }
  return { party: result, steps, arrivals, claimedStar: claimed.claimedBy, knock };
}

/** The log line when someone walks into a hidden rival's room and doesn't come out. */
export const VANISHING_LINES: readonly ((name: string, room: RoomName) => string)[] = [
  (n, r) => `${n} heads toward the ${r}... and does not emerge.`,
  (n, r) => `A muffled sound comes from the ${r}. ${n} never reappears.`,
  (n, r) => `${n} rounds the corner into the ${r}. Silence follows.`,
  (n, r) => `You hear ${n}'s footsteps enter the ${r} — then stop abruptly.`,
  (n, r) => `Something in the ${r} has ${n}'s attention. They do not return.`,
];

/**
 * The small creatures' turn: each may wander (toward the mimic, sometimes, with Honeyamber; see
 * wanderCreature), but never out of the rooms it keeps to. Returns them, and which ones just
 * crept into the mimic's room.
 */
export function moveCreatures<C extends Pick<LocationCreature, "rooms"> & { location: RoomName; isConsumed: boolean }>(
  creatures: readonly C[], location: HuntLocation, mimicRoom: RoomName | null, honeyamber: boolean, random: () => number = Math.random,
): { creatures: C[]; arrivals: C[] } {
  const arrivals: C[] = [];
  const moved = creatures.map(c => {
    if (c.isConsumed) return c;
    const room = wanderCreature(location, c.location, mimicRoom, honeyamber, random);
    if (room === c.location || (c.rooms && !c.rooms.includes(room))) return c;
    const next = { ...c, location: room };
    if (room === mimicRoom) arrivals.push(next);
    return next;
  });
  return { creatures: moved, arrivals };
}

// ============================================================
// EASTER EGGS
// ============================================================
/** Chance that a rival mimic, when found, turns out to be wearing your shape. */
export const RIVAL_SAME_SHAPE_CHANCE = 0.2;
export const RIVAL_SAME_SHAPE_LINE = "It's wearing your shape. You both pretend not to notice.";

/**
 * Remarks on particular names, shown as a toast when the mimic is created and as a
 * subtitle on its character sheet. Names match ignoring case and extra spaces; `line`
 * gets the name as the player typed it.
 */
const NAME_REMARKS: readonly { names: readonly string[]; line: (name: string) => string }[] = [
  { names: ["hatbox"], line: () => "Hatbox the mimic, eh? You'll be a legend in no time." },
  { names: ["mimic"], line: () => "Mimic… how original." },
  {
    names: ["puny", "mini", "tiny", "teeny", "teeny-tiny", "itty-bitty", "wee", "little", "smol", "petite", "pip", "squeak"],
    line: (n) => `${n}, how cute!`,
  },
  { names: ["rex", "rover", "buddy", "lucky"], line: (n) => `${n}? You're a mimic, not a dog.` },
  // Too honest for a disguise
  { names: ["jaws", "chomper", "teeth", "fangs"], line: () => "A little on the nose for something that's meant to look harmless." },
  { names: ["trap", "bait"], line: () => "Well, at least you're honest." },
  { names: ["not a mimic", "definitely a chest", "just a chair"], line: () => "Very convincing. No notes." },
  { names: ["hungry", "starving"], line: () => "Aren't we all." },
  // Named after the furniture
  { names: ["chest", "box", "trunk"], line: (n) => `A ${n.toLowerCase()} named ${n}. Subtle.` },
  { names: ["chair", "barrel", "crate"], line: () => "Bold, naming yourself after your best disguise." },
  // Aggressively ordinary
  { names: ["bob", "steve", "gary", "dave"], line: () => "A perfectly ordinary name for a perfectly ordinary chest. Nothing to see here." },
  // Wishful thinking
  { names: ["treasure", "loot", "gold"], line: () => "Truth in advertising — just not the way they think." },
  { names: ["snack", "lunch", "dinner"], line: () => "Planning the menu already?" },
  { names: ["hero", "adventurer"], line: () => "The best disguise yet." },
  // Nods to the game
  { names: ["elder"], line: () => "Ambitious. The Elder Mimic may have something to say about that." },
  { names: ["captain"], line: () => "The captain never abandons ship. Neither, it seems, do you." },
  { names: ["gargoyle"], line: () => "Wrong monster. Though in time, you might pass for one." },
  { names: ["thimble"], line: () => "Shrinking already? You'll want some Thimblewood for that." },
  { names: ["pandora"], line: () => "Some boxes should stay closed." },
  { names: ["luggage"], line: () => "It has hundreds of little legs, and it will follow you anywhere." },
  { names: ["wardrobe"], line: () => "Is that a forest in there?." },
  { names: ["spareoom", "sparoom", "spareum", "sparum"], line: () => "Definitely not in Narnia." },
];

/** A remark on the mimic's name — or null for an unremarkable name. */
export function nameFlavor(rawName: string): string | null {
  const name = rawName.trim().replace(/\s+/g, " ");
  const key = name.toLowerCase();
  return NAME_REMARKS.find(r => r.names.includes(key))?.line(name) ?? null;
}

/** Devouring the Elder Mimic with the Missing Porter's Sister in the hunt: what became of her brother. */
export const PORTER_SISTER = "Missing Porter's Sister";
export const PORTER_TOKEN_LINE = "Deep inside the Elder, something small and tin: a porter's token.";

/** A conversion at the Reliquary with the Doubting Scholar in the party. */
export const DOUBTING_SCHOLAR = "Doubting Scholar";
export const SCHOLAR_NOTES_LINE = "The Doubting Scholar's notes are found later, the last page reading only: it was real.";

/** Any small creature that's a cat (Cat, Estate Cat, Temple Cat, Ship's Cat, Giant's Cat…). */
export function isCat(creature: { name: string }): boolean {
  return /\bCat$/.test(creature.name);
}
/** Emoji for small creatures, matched on a word in the name. The first match wins. */
const CREATURE_EMOJI: readonly [RegExp, string][] = [
  [/\bZombie Cat\b/, "🐈‍⬛"],
  [/\bCat\b/, "🐈"],
  [/\bMouse\b/, "🐁"],
  [/\bRat\b/, "🐀"],
  [/\bBat\b/, "🦇"],
  [/\b(Crow|Gull|Parrot|Pigeon)\b/, "🐦"],
  [/\bDove\b/, "🕊️"],
  [/\bEagle\b/, "🦅"],
  [/\bGosling\b/, "🪿"],
  [/\bBeetle\b/, "🪲"],
  [/\bSpider\b/, "🕷️"],
  [/\b(Eel|Adder)\b/, "🐍"],
  [/\bWill-o'-Wisp\b/, "🔥"],
  [/\bSprite\b/, "🧚"],
  [/\bSkeleton\b/, "💀"],
  [/\bZombie\b/, "🧟"],
  [/\bHand\b/, "✋"],
  [/\b(Imp|Familiar)\b/, "😈"],
  [/\bHomunculus\b/, "🧸"],
  [/\bShade\b/, "👻"],
  [/\b(Hound|Dog)\b/, "🐕"],
  [/\bBoar\b/, "🐗"],
  [/\bFox\b/, "🦊"],
  [/\bFrog\b/, "🐸"],
  [/\b(Rabbit|Hare)\b/, "🐇"],
  [/\bReindeer\b/, "🦌"],
  [/\bOwl\b/, "🦉"],
  [/\bHedgehog\b/, "🦔"],
  [/\bGoose\b/, "🪿"],
  [/\bToad\b/, "🐸"],
  [/\bPig\b/, "🐖"],
  [/\bSquirrel\b/, "🐿️"],
  [/\bMoth\b/, "🦋"],
  [/\bOtter\b/, "🦦"],
  [/\b(Weasel|Ermine)\b/, "🦡"], // no weasel emoji; the badger is family
  [/\bCrab\b/, "🦀"],
  [/\bLamb\b/, "🐑"],
  [/\bWarhorse\b/, "🐎"],
  [/\bElemental\b/, "🌩️"],
];
/** Fallback when no word in the name matches. */
export const CREATURE_EMOJI_FALLBACK = "🐾";

/** The emoji shown for a small creature in the hunt. */
export function creatureEmoji(name: string): string {
  return CREATURE_EMOJI.find(([pattern]) => pattern.test(name))?.[1] ?? CREATURE_EMOJI_FALLBACK;
}

/** Shown once per cat per hunt when one is in the mimic's room. Nobody listens to the cat. */
export const CAT_KNOWS_LINE = "The cat stares directly at you. It knows.";

/** Consecutive Waits with nobody entering the mimic's room before it's taken for furniture. */
export const STILLNESS_TURNS = 15;
export const STILLNESS_LINE = "You've held still so long that a spider has strung a web across you.";

/** How often an adventurer entering the mimic's room acts out one of its quirks in the log. */
export const QUIRK_LINE_CHANCE = 0.3;

/** The adventurer's applied quirk, filled in for this form — or null if it has none or the roll misses. */
export function quirkLine(
  adventurer: Pick<PartyMember, "name" | "appliedQuirk">, formName: string, random: () => number = Math.random,
): string | null {
  if (!adventurer.appliedQuirk || random() >= QUIRK_LINE_CHANCE) return null;
  return adventurer.appliedQuirk.replaceAll("{name}", adventurer.name).replaceAll("{form}", formName);
}

// ============================================================
// BEHAVIOR REACTIONS (the behaviors themselves are listed in ./adventurerData)
// ============================================================
/** Mimic actions that behaviors can react to. */
export type BehaviorTrigger = "relocate" | "strike" | "formChange" | "feed";

/** Changes to one party member. suspicionDelta is added to their current suspicion. */
export interface PartyMemberPatch {
  location?: RoomName;
  isAttracted?: boolean;
  suspicionDelta?: number;
}

export interface BehaviorReactions {
  patches: Record<string, PartyMemberPatch>;
  /** Party-wide suspicion to add. */
  suspicion: number;
  events: { type: GameEventType; text: string }[];
  /** Adventurers who moved into the mimic's room (they need stealth checks). */
  arrivals: PartyMember[];
}

export interface BehaviorContext {
  party: readonly PartyMember[];
  location: HuntLocation | null | undefined;
  mimicRoom: RoomName | null | undefined;
  fromRoom?: RoomName | null;
  excludeIds?: readonly string[];
  /** Lets magic materials suppress behaviors. */
  appearance?: AppearanceLike;
}

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

/** Hidden behaviors are never revealed to the player (e.g. in the Codex). */
export function isHiddenBehavior(id: BehaviorId): boolean {
  const info: BehaviorInfo = BEHAVIORS[id];
  return !!info.hidden;
}

/** Adventurers with this behavior never wander on their own. */
export function isStationary(adventurer: Pick<PartyMember, "behavior">): boolean {
  return adventurer.behavior === "stoneWatch";
}

const isActive = (adv: PartyMember): boolean => adv.isAlive && !adv.isConsumed && !adv.fled;

/** The adjacent room that brings `fromRoom` closest to `targetRoom` (or fromRoom if already there). */
export function stepToward(location: HuntLocation, fromRoom: RoomName, targetRoom: RoomName): RoomName {
  if (fromRoom === targetRoom) return fromRoom;
  const options = getAdjacentRooms(location, fromRoom);
  if (options.length === 0) return fromRoom;
  return options.reduce((best, room) =>
    getRoomDistance(location, room, targetRoom) < getRoomDistance(location, best, targetRoom) ? room : best
  );
}

/**
 * Work out how party members with behaviors react to a mimic action.
 * Pure: returns changes for the caller to apply.
 *
 * See BehaviorContext and BehaviorReactions for the shapes.
 */
export function getBehaviorReactions(
  trigger: BehaviorTrigger,
  { party, location, mimicRoom, fromRoom, excludeIds = [], appearance = {} }: BehaviorContext,
): BehaviorReactions {
  const result: BehaviorReactions = { patches: {}, suspicion: 0, events: [], arrivals: [] };
  if (!location || !mimicRoom) return result;
  const dist = (a: RoomName, b: RoomName) => getRoomDistance(location, a, b);

  party.forEach((adv) => {
    if (!adv.behavior || !isActive(adv) || excludeIds.includes(adv.id)) return;

    switch (adv.behavior) {
      case "keenHearing": {
        if (trigger !== "relocate" && trigger !== "strike") return;
        if (hasMagic(appearance, "Void Marble")) return;
        if (dist(adv.location, mimicRoom) > 2) return;
        result.patches[adv.id] = { suspicionDelta: 1 };
        result.suspicion += 1;
        result.events.push({ type: "alert", text: `${adv.name}'s head snaps toward the sound from the ${mimicRoom}. (+1 suspicion)` });
        return;
      }
      case "shapeSense": {
        if (trigger !== "formChange") return;
        if (hasMagic(appearance, "Feywood")) return;
        if (dist(adv.location, mimicRoom) > 2) return;
        result.patches[adv.id] = { suspicionDelta: 2 };
        result.suspicion += 2;
        result.events.push({ type: "alert", text: `${adv.name} shivers — something nearby just changed its shape. (+2 suspicion)` });
        return;
      }
      case "stoneWatch": {
        if (trigger !== "relocate" || !fromRoom) return;
        const saw = dist(adv.location, fromRoom) <= 1 || dist(adv.location, mimicRoom) <= 1;
        if (!saw) return;
        result.patches[adv.id] = { suspicionDelta: 1 };
        result.suspicion += 2;
        result.events.push({ type: "alert", text: `${adv.name}'s stone eyes track the change — something in the ${fromRoom} is no longer where it was. (+2 suspicion)` });
        return;
      }
      case "carrionScent":
      case "bloodScent": {
        if (trigger !== "feed") return;
        if (adv.behavior === "bloodScent" && hasMagic(appearance, "Direwolf Pelt")) return;
        const newRoom = stepToward(location, adv.location, mimicRoom);
        const arrived = newRoom === mimicRoom;
        const moved = newRoom !== adv.location;
        if (adv.behavior === "carrionScent") {
          result.patches[adv.id] = { location: newRoom, isAttracted: arrived };
          result.events.push({
            type: arrived ? "allure" : "info",
            text: arrived
              ? `${adv.name} catches the scent of the kill and shambles into the ${mimicRoom}, drawn to the meal.`
              : `${adv.name} catches the scent of the kill and shambles toward the ${newRoom}.`,
          });
        } else {
          result.patches[adv.id] = { location: newRoom, suspicionDelta: 1 };
          result.events.push({
            type: "alert",
            text: moved
              ? `${adv.name} smells blood and stalks into the ${newRoom}, hackles raised.`
              : `${adv.name} smells blood. Its hackles rise.`,
          });
        }
        if (arrived && moved) result.arrivals.push({ ...adv, location: newRoom });
        return;
      }
      case "elusive":
        // Handled when a Strike is resolved (extra resist die; bolts to another room instead of fleeing)
        return;
      case "devotion":
        // Doesn't react to individual actions; the game checks findDevotee() whenever the party changes
        return;
      default: {
        // Compile-time check that every behavior is handled above
        const unhandled: never = adv.behavior;
        return unhandled;
      }
    }
  });

  return result;
}
