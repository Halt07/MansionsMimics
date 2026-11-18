// ============================================================
// MANSIONS & MIMICS — Game rules
// The functions that run the game: dice, form availability, magic, checks, AP,
// bites, spawning, behaviors, bounty hunts and sickness, plus anything not covered
// by the data files. The data lives in ./mimicData, ./adventurerData and
// ./locationData; this module re-exports all of it (and ./vocabulary) so callers
// can keep importing everything from gameData.
// ============================================================
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import {
  ALL_MATERIALS, ALL_STARTING_TRAITS, LEARNABLE_TRAITS, MATERIALS, TIER_ORDER, isPerceptionSense, type CombatStat,
  type GameEventType, type MagicMaterial, type Material,
  type LearnableTrait, type PerceptionSense, type TeachableTrait, type Tier, type Trait, type UtilityTag,
} from "./vocabulary";
import {
  ALL_FORMS, MASTER_FORMS, SEASONAL_FORMS, SICKNESSES, TIER_CONFIG, type Form, type FormId, type SeasonalForm, type Sickness,
} from "./mimicData";
import {
  ADVENTURER_TEMPLATES, AP_REWARDS, BEHAVIORS, type Treasure, type AdventurerGroupId, type AdventurerTemplate, type BehaviorId, type BehaviorInfo, type CompanionOption,
  type PartyMember, type QualityList,
} from "./adventurerData";
import {
  LOCATIONS, ROOM_FORM_MODIFIERS, type HuntLocation, type LocationCreature, type LocationId, type RoomModifier,
  type RoomContextMod, type RoomName,
} from "./locationData";
import { HOLIDAYS, isInSeason, seasonStart, today, type HolidayId } from "./holidays";

export * from "./vocabulary";
export * from "./mimicData";
export * from "./adventurerData";
export * from "./locationData";
export * from "./roomLayouts";
export * from "./huntReportData";
export * from "./holidays";

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
export function rollDice(numDice: number): number {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * 6) + 1;
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

// ============================================================
// EFFECTIVE STATS
// What a mimic's stats are worth right now, after everything weighing on them: being small for
// its tier, a sickness, and wearing a form from the tier above or below.
// ============================================================
/** The most any combat stat can be raised to. */
export const STAT_CAP = 6;

/** The form the mimic is wearing, if any. */
export function getActiveForm(character: Pick<MimicCharacter, "forms" | "activeFormIndex"> | null | undefined): Form | null {
  const ref = character?.forms[character.activeFormIndex];
  return ref ? ALL_FORMS.find(f => f.id === ref.formId) ?? null : null;
}

/**
 * Plausibility lost for being small for its tier (usually from mass decay): 1 below the tier's
 * minimum mass, 2 below the minimum of the tier under it as well.
 */
export function massPenalty(character: Pick<MimicCharacter, "tier" | "mass">): number {
  const tierIdx = TIER_ORDER.indexOf(character.tier);
  const tierMin = TIER_CONFIG[character.tier].massRange[0];
  const tierBelowMin = tierIdx > 0 ? TIER_CONFIG[TIER_ORDER[tierIdx - 1]].massRange[0] : 0;
  if (character.mass < tierBelowMin) return 2;
  if (character.mass < tierMin) return 1;
  return 0;
}

/** How many rooms away a Lure reaches: 1, or 2 with high base Allure (5+), plus 1 for Aether Crystal. */
export function lureRange(character: Pick<MimicCharacter, "baseAllure" | "currentAppearance"> | null | undefined): number {
  return ((character?.baseAllure ?? 2) >= 5 ? 2 : 1) + (hasMagic(character?.currentAppearance, "Aether Crystal") ? 1 : 0);
}

export interface EffectiveStats {
  /** For stealth and allure checks (at least 1). Stealth checks take the form-tier penalty off themselves. */
  plausibility: number;
  /** For strikes and bites (at least 1). */
  adhesion: number;
  /** For waiting and holding on (at least 1), form-tier penalty included. */
  patience: number;
  /** Each penalty on its own, for showing where the points went. */
  penalties: {
    mass: number;
    sickness: { plausibility: number; adhesion: number; patience: number };
    formTier: { plausibility: number; patience: number };
  };
}

export function effectiveStats(
  character: Pick<MimicCharacter, "tier" | "mass" | "plausibility" | "adhesion" | "patience" | "currentAppearance">,
  sickness: Pick<Sickness, "penalties"> | null | undefined,
  form: Form | null | undefined,
): EffectiveStats {
  const mass = massPenalty(character);
  const sick = {
    plausibility: sickness?.penalties.plausibility ?? 0,
    adhesion: sickness?.penalties.adhesion ?? 0,
    patience: sickness?.penalties.patience ?? 0,
  };
  const ownTier = formTier(character);
  const formTierPenalty = form ? getFormTierPenalties(effectiveFormTier(form, ownTier), ownTier) : { plausibility: 0, patience: 0 };
  return {
    plausibility: Math.max(1, character.plausibility - mass - sick.plausibility),
    adhesion: Math.max(1, character.adhesion - sick.adhesion),
    patience: Math.max(1, character.patience - sick.patience - formTierPenalty.patience),
    penalties: { mass, sickness: sick, formTier: formTierPenalty },
  };
}

// ============================================================
// COMPANIONS
// ============================================================
const COMPANION_PERCEPTION: Readonly<Record<PerceptionSense, number>> = {
  material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0,
};

/** Picks one companion option, honoring each option's `weight`. */
export function pickCompanionOption(options: readonly CompanionOption[]): CompanionOption {
  const total = options.reduce((sum, o) => sum + (o.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.weight ?? 1;
    if (r < 0) return o;
  }
  return options[options.length - 1];
}

/** Builds the party member for an adventurer's companion. */
export function createCompanion(
  owner: Pick<AdventurerTemplate, "name">, option: CompanionOption, id: string, room: RoomName,
): PartyMember {
  return {
    name: owner.name + option.nameSuffix,
    type: option.type,
    group: option.group,
    discipline: option.discipline,
    baseSuspicion: 1,
    suspicion: 1,
    constitution: option.constitution,
    interactionStyle: option.interactionStyle ?? "touch",
    quirks: [option.description],
    alluringQualities: { materials: [], traits: [], tags: [] },
    perceptionAffinity: option.perceptionAffinity ?? COMPANION_PERCEPTION,
    lootMaterials: option.lootMaterials ?? [],
    lootTraits: option.lootTraits ?? [],
    partialLoot: option.partialLoot ?? ["scruff of fur", "a claw", "patch of hide"],
    wholeMealMass: option.wholeMealMass,
    behavior: option.behavior && Math.random() < (option.behaviorChance ?? 1) ? option.behavior : undefined,
    apReward: option.ap,
    id,
    isAlive: true,
    isConsumed: false,
    isAttracted: false,
    isCompanion: true,
    location: room,
  };
}

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

// ============================================================
// COMBAT ENGINE
// ============================================================
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

export function adhesionCheck(adhesion: number, form: Form, adventurer: PartyMember): CheckResult {
  const mimicRoll = rollDice(adhesion);
  const advRoll = rollDice(strikeResistDice(adventurer));
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
export function getBiteAp(target: Pick<PartyMember, "group">): number {
  return target.group === "giantKin" ? 2 + Math.floor(Math.random() * 2) : 1;
}

/** Maybe learn a real material from a bite. Returns a material name or null. */
export function rollBiteMaterial(target: Pick<PartyMember, "lootMaterials">): Material | null {
  const mats = target.lootMaterials || [];
  if (mats.length === 0 || Math.random() >= BITE_MATERIAL_CHANCE) return null;
  return mats[Math.floor(Math.random() * mats.length)];
}

// ============================================================
// CODEX DISCOVERY
// The Codex only describes adventurers you've met, and only reveals what they like and
// dislike once you've eaten one. Discoveries are pooled across all of your mimics.
// ============================================================
export type DiscoveryLevel = "unknown" | "met" | "eaten";

export interface Discoveries {
  met: ReadonlySet<string>;
  eaten: ReadonlySet<string>;
}

/** Everything any of these mimics has met or eaten (eating counts as meeting). */
export function pooledDiscoveries(
  characters: readonly Pick<MimicCharacter, "adventurersMet" | "adventurersEaten">[],
): Discoveries {
  const eaten = new Set(characters.flatMap(c => c.adventurersEaten));
  const met = new Set([...characters.flatMap(c => c.adventurersMet), ...eaten]);
  return { met, eaten };
}

export function discoveryLevel(discoveries: Discoveries, name: string): DiscoveryLevel {
  if (discoveries.eaten.has(name)) return "eaten";
  if (discoveries.met.has(name)) return "met";
  return "unknown";
}

/** Whether a mimic knows a trait: every mimic knows the starting traits; the rest must be learned. */
export function knowsTrait(character: Pick<MimicCharacter, "learnedTraits">, trait: Trait): boolean {
  return (ALL_STARTING_TRAITS as readonly Trait[]).includes(trait) || character.learnedTraits.includes(trait);
}

/** Adds a form to the list of forms a mimic has hunted in. */
export function withFormUsed(list: readonly FormId[], formId: FormId | null | undefined): FormId[] {
  return formId && !list.includes(formId) ? [...list, formId] : [...list];
}

/** Adds template names to a discovery list (ignoring companions and anything that isn't a template). */
/** Costumed members count under their costume name, which isn't a template: pass `unmask(member)` to record who they really are. */
export function withDiscovered(list: readonly string[], members: readonly Pick<PartyMember, "name" | "isCompanion" | "costume">[]): string[] {
  const templateNames = new Set(ADVENTURER_TEMPLATES.map(t => t.name));
  // Someone still in costume tells you nothing (a "Werewolf" costume isn't necessarily a Werewolf)
  const added = members.filter(m => !m.isCompanion && !m.costume && templateNames.has(m.name)).map(m => m.name);
  return [...new Set([...list, ...added])];
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
// CODEX: LOCATIONS
// The Codex groups hunting grounds and only tells you about the ones you've found.
// ============================================================
export type LocationGroupId = "common" | "advanced" | "giant" | "adept" | "rare" | "seasonal";

export const LOCATION_GROUPS: readonly { id: LocationGroupId; label: string; description: string }[] = [
  { id: "common", label: "Common", description: "Hunting grounds every mimic knows from its first meal." },
  { id: "advanced", label: "Advanced", description: "Grounds that open up as a mimic grows in tier and mass." },
  { id: "giant", label: "Giant", description: "Where the giants live. Only the largest mimics are taken seriously there." },
  { id: "adept", label: "Adept", description: "Grounds for mimics that have outgrown even the giants' doorways." },
  { id: "rare", label: "Rare", description: "Places that open only now and then, for a hunt or two." },
  { id: "seasonal", label: "Seasonal", description: "Places that open to mimics of every size, but only while their holiday lasts." },
];

/** Where a location's requirements fall in unlock order: tier first, then mass. */
const unlockRank = (l: HuntLocation) => TIER_ORDER.indexOf(l.minTier) * 1000 + (l.minMass ?? 0);
/** The first giant-realm location to unlock: Advanced grounds unlock before it, Adept ones after. */
const firstGiantRank = Math.min(...LOCATIONS.filter(l => l.isGiantRealm).map(unlockRank));

/** Which Codex group a location belongs to. */
export function locationGroup(location: HuntLocation): LocationGroupId {
  if (location.holiday) return "seasonal";
  if (location.rare) return "rare";
  if (location.isGiantRealm) return "giant";
  if (location.minTier === TIER_ORDER[0] && !location.minMass) return "common";
  return unlockRank(location) > firstGiantRank ? "adept" : "advanced";
}

/**
 * What the Codex knows about a location, pooled over `characters` (one mimic, or all of them):
 * "unknown" shows only "???"; "known" shows its name and details but not its rooms; "visited"
 * shows everything, map included. Common grounds are always known. Advanced, Giant and Adept
 * grounds become known once a mimic qualifies for them; Rare grounds only once one has hunted
 * there; Seasonal grounds while their holiday is on.
 */
export type LocationKnowledge = "unknown" | "known" | "visited";

export function locationHunts(
  location: HuntLocation, characters: readonly Pick<MimicCharacter, "locationHuntCounts">[],
): number {
  return characters.reduce((sum, c) => sum + (c.locationHuntCounts?.[location.id] ?? 0), 0);
}

export function locationKnowledge(
  location: HuntLocation, characters: readonly Pick<MimicCharacter, "tier" | "mass" | "locationHuntCounts">[],
  date: Date = today(),
): LocationKnowledge {
  if (locationHunts(location, characters) > 0) return "visited";
  if (location.holiday) return isInSeason(location.holiday, date) ? "known" : "unknown";
  const group = locationGroup(location);
  if (group === "common") return "known";
  if (group === "rare") return "unknown";
  return characters.some(c => meetsLocationRequirements(location, c.tier, c.mass)) ? "known" : "unknown";
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
// DOOR TO DOOR (Spell or Sweet Street)
// The party goes around the loop of houses, one house per Wait, in costume. See `procession`
// and `costumes` on the location.
// ============================================================
export const COSTUMES = [
  "Dracula", "Bugbear", "Bedsheet Ghost", "Pumpkin-Head", "Witch", "Mummy", "Skeleton", "Werewolf",
  "Headless Horseman", "Goblin King", "Black Cat", "Lich", "Banshee", "Swamp Hag", "Plague Doctor", "Gorgon",
] as const;

/**
 * The party in costume: each one gets a different costume, which becomes the only name anyone
 * sees. Anyone whose name is already a costume (a real Werewolf) wears that, which is to say
 * nothing at all, and nobody else wears that costume.
 */
export function dressParty(party: readonly PartyMember[], random: () => number = Math.random): PartyMember[] {
  const isCostume = (name: string) => (COSTUMES as readonly string[]).includes(name);
  const taken = new Set(party.map(a => a.name).filter(isCostume));
  const pool = [...COSTUMES].filter(c => !taken.has(c)).sort(() => random() - 0.5);
  let next = 0;
  return party.map(a => {
    if (isCostume(a.name)) return { ...a, costume: a.name, trueName: a.name };
    const i = next++;
    const costume = pool[i % pool.length] + (i >= pool.length ? ` ${Math.floor(i / pool.length) + 1}` : "");
    return { ...a, name: costume, costume, trueName: a.name };
  });
}

/** No costume at all: the real thing (its costume and its true name are the same). */
export function isTheRealThing(member: Pick<PartyMember, "costume" | "trueName">): boolean {
  return !!member.costume && member.costume === member.trueName;
}

/**
 * Maybe add a real monster to the party (with the location's `realMonsters.chance`): one the
 * mimic's tier and mass allow, at a random house. Returns the party unchanged otherwise.
 */
export function addRealMonster(
  party: readonly PartyMember[], location: HuntLocation, tier: Tier, mass: number, random: () => number = Math.random,
): PartyMember[] {
  const real = location.realMonsters;
  if (!real || random() >= real.chance) return [...party];
  const tierIdx = TIER_ORDER.indexOf(tier);
  const options = ADVENTURER_TEMPLATES.filter(t => real.names.includes(t.name) &&
    (!t.minTier || TIER_ORDER.indexOf(t.minTier) <= tierIdx) && (!t.minMass || mass >= t.minMass));
  if (options.length === 0) return [...party];
  const t = options[Math.floor(random() * options.length)];
  const room = location.rooms[Math.floor(random() * location.rooms.length)];
  return [...party, {
    ...t, id: `real_${t.name.replace(/\W+/g, "_")}_${party.length}`, suspicion: t.baseSuspicion,
    isAlive: true, isConsumed: false, isAttracted: false, location: room,
  }];
}

/** Who they really are (for the Codex and the reveal), costume or not. */
export function unmask<T extends Pick<PartyMember, "name" | "trueName" | "costume">>(member: T): T {
  return member.trueName ? { ...member, name: member.trueName, costume: undefined } : member;
}

/** The house after `room` in the loop. Off the loop (on the green), a neighboring house to rejoin it at. */
export function nextHouse(location: HuntLocation, room: RoomName, random: () => number = Math.random): RoomName {
  const order = location.procession?.order as readonly RoomName[] | undefined;
  if (!order) return room;
  const i = order.indexOf(room);
  if (i >= 0) return order[(i + 1) % order.length];
  const back = getAdjacentRooms(location, room).filter(r => order.includes(r));
  return back.length > 0 ? back[Math.floor(random() * back.length)] : room;
}

/** How many houses until someone at `from` reaches `to`, going around the loop. */
export function housesAway(location: HuntLocation, from: RoomName, to: RoomName): number {
  const order = location.procession?.order as readonly RoomName[] | undefined;
  if (!order) return getRoomDistance(location, from, to);
  const a = order.indexOf(from), b = order.indexOf(to);
  return a < 0 || b < 0 ? Infinity : (b - a + order.length) % order.length;
}

/** Starting houses: two or three of the party together, the rest spread around the loop, nobody at `avoid`. */
export function placeProcession(
  party: readonly PartyMember[], location: HuntLocation, avoid: RoomName | null, random: () => number = Math.random,
): PartyMember[] {
  const order = (location.procession?.order ?? location.rooms) as readonly RoomName[];
  const free = [...order.filter(r => r !== avoid)].sort(() => random() - 0.5);
  const groupSize = Math.min(party.length, random() < 0.5 ? 2 : 3);
  const [groupHouse, ...others] = free;
  return party.map((a, i) => ({
    ...a,
    location: i < groupSize ? groupHouse : others.length > 0 ? others[(i - groupSize) % others.length] : groupHouse,
  }));
}

/** Whether the mimic's shape answers the door with a sweet (a variant counts as its base form). */
export function answersDoor(location: HuntLocation, form: Pick<Form, "id" | "variantOf"> | null | undefined): boolean {
  const sweets = location.procession?.sweets as readonly string[] | undefined;
  if (!sweets || !form) return false;
  return sweets.includes(form.id) || (!!form.variantOf && sweets.includes(form.variantOf));
}

export const PRANKS = [
  "Eggs appear out of thin air and splatter against the shutters.",
  "A roll of paper floats up off the porch and wraps the house like a mummy.",
  "Every candle in the window flares green, then goes out.",
  "The doorknob turns into a toad, croaks once, and turns back.",
  "The shutters start flapping like wings and won't stop.",
  "The garden gnomes all turn to face the door.",
  "The chimney coughs out a cloud of purple smoke shaped like a skull.",
  "The house's shadow detaches and wanders off down the lane.",
] as const;

// ============================================================
// MASS DECAY
// A mimic that goes unfed loses 1 mass per MASS_DECAY_DAYS days (never below 1). The time
// that's been charged for moves lastFedAt forward, so loading the mimic again doesn't charge
// the same days twice.
// ============================================================
export const MASS_DECAY_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function massDecay(
  mass: number, lastFedAt: string | null | undefined, now: Date = new Date(),
): { massLost: number; mass: number; lastFedAt: string; daysAway: number } | null {
  if (!lastFedAt || mass <= 1) return null;
  const fed = new Date(lastFedAt).getTime();
  const daysAway = (now.getTime() - fed) / DAY_MS;
  const massLost = Math.min(Math.floor(daysAway / MASS_DECAY_DAYS), mass - 1);
  if (massLost <= 0) return null;
  return {
    massLost,
    mass: mass - massLost,
    lastFedAt: new Date(fed + massLost * MASS_DECAY_DAYS * DAY_MS).toISOString(),
    daysAway: Math.floor(daysAway),
  };
}

// ============================================================
// FIREWORKS (The Founders' Fair)
// Every `fireworks.every` turns a volley goes up over a random room. For the turn after, everyone
// there and next door is looking up, so a meal in those rooms has no witnesses. The catch: the
// crew comes looking for rockets, and a mimic shaped like a crate in the launch room gets
// rummaged, found empty and thrown out into a neighboring room.
// ============================================================

/** For twists on a beat (a volley every 3 turns, a star every 4): turns until the next one, after `turn` turns. */
export function turnsUntil(every: number, turn: number): number {
  return every - (turn % every);
}

/** Whether a volley goes up at the end of this turn (turns count from 1). */
export function fireworksDue(location: HuntLocation, turn: number): boolean {
  return !!location.fireworks && turn > 0 && turn % location.fireworks.every === 0;
}

/** The rooms watching a volley over `room`: that room and the ones next to it. */
export function distractedRooms(location: HuntLocation, room: RoomName): RoomName[] {
  return [room, ...getAdjacentRooms(location, room)];
}

/** Suspicion for being rummaged as this form in the launch room (a variant counts as its base), or null if it's left alone. */
export function fireworksRummage(location: HuntLocation, form: Pick<Form, "id" | "variantOf"> | null | undefined): number | null {
  const crates = location.fireworks?.crates;
  if (!crates || !form) return null;
  const base = form.variantOf as FormId | undefined;
  return crates[form.id] ?? (base ? crates[base] : undefined) ?? null;
}

/** Where a rummaged mimic gets thrown: a neighboring room with nobody in it if there is one. */
export function tossRoom(
  location: HuntLocation, from: RoomName, occupied: readonly RoomName[], random: () => number = Math.random,
): RoomName {
  const next = getAdjacentRooms(location, from);
  const empty = next.filter(r => !occupied.includes(r));
  const pool = empty.length > 0 ? empty : next;
  return pool.length > 0 ? pool[Math.floor(random() * pool.length)] : from;
}

// ============================================================
// STARFALL (Stargazers' Hill)
// Every `starfall.every` turns a star fragment lands in a random room (if none is still lying
// about). On each Wait the party heads one room closer to it instead of wandering, and the first
// to reach it pockets it: eat them whole and the fragment comes too. Get to it first and you can
// swallow it yourself.
// ============================================================
export const STAR_FRAGMENT: Treasure = {
  ap: 2, description: "a still-warm star fragment", noun: "star fragment",
  materials: ["Starforged Iron"], traits: ["Faint Glow"],
};

/** Whether a fragment lands at the end of this turn (turns count from 1). */
export function starfallDue(location: HuntLocation, turn: number): boolean {
  return !!location.starfall && turn > 0 && turn % location.starfall.every === 0;
}

/** Whoever is in the fragment's room picks it up (the first one listed), carrying it as treasure. */
export function claimStar(party: readonly PartyMember[], star: RoomName): { party: PartyMember[]; claimedBy: PartyMember | null } {
  const claimer = party.find(a => isStillHunting(a) && a.location === star && !a.treasure);
  if (!claimer) return { party: [...party], claimedBy: null };
  const claimedBy = { ...claimer, treasure: STAR_FRAGMENT };
  return { party: party.map(a => a.id === claimer.id ? claimedBy : a), claimedBy };
}

// ============================================================
// SNOWBOUND (The Snowbound Lodge)
// Nobody can leave, and the cold freezes the party one by one. Each adventurer starts with
// warmth set by its constitution, so the frail go first. Every turn costs 1 warmth; entering
// the hearth room gives 1 back (up to their starting warmth) and entering a cold room costs 1
// more. Staying put changes nothing beyond the turn's 1. At 0 they freeze solid: out of the
// hunt, but still there to be eaten, for less.
// ============================================================
export const WARMTH_PER_CONSTITUTION = 4;
/** Extra starting warmth, 0 to this, so equally sturdy adventurers don't freeze on the same turn. */
export const WARMTH_JITTER = 2;
/** At this warmth or below an adventurer is close to freezing (the log says so, once). */
export const FROST_WARNING = 3;

export function startingWarmth(constitution: number, random: () => number = Math.random): number {
  return constitution * WARMTH_PER_CONSTITUTION + Math.floor(random() * (WARMTH_JITTER + 1));
}

/** The party with starting warmth, for a snowbound location (unchanged anywhere else). */
export function withWarmth(party: readonly PartyMember[], location: HuntLocation, random: () => number = Math.random): PartyMember[] {
  if (!location.snowbound) return [...party];
  return party.map(a => {
    const warmth = startingWarmth(a.constitution || 3, random);
    return { ...a, warmth, maxWarmth: warmth, warmthRoom: a.location };
  });
}

export interface FrostResult {
  party: PartyMember[];
  /** Froze solid this turn. */
  frozen: PartyMember[];
  /** Dropped to FROST_WARNING this turn. */
  numb: PartyMember[];
}

/** One turn of cold at a snowbound location. */
export function chillParty(party: readonly PartyMember[], location: HuntLocation): FrostResult {
  const frozen: PartyMember[] = [];
  const numb: PartyMember[] = [];
  const snow = location.snowbound;
  if (!snow) return { party: [...party], frozen, numb };
  const next = party.map(a => {
    if (!isStillHunting(a) || a.warmth === undefined) return a;
    const max = a.maxWarmth ?? a.warmth;
    let warmth = a.warmth;
    if (a.location !== a.warmthRoom) {
      if (a.location === snow.hearth) warmth = Math.min(max, warmth + 1);
      if (snow.cold.includes(a.location)) warmth -= 1;
    }
    warmth -= 1;
    if (warmth <= 0) {
      const ice = { ...a, warmth: 0, warmthRoom: a.location, isAlive: false, isAttracted: false, isFrozen: true };
      frozen.push(ice);
      return ice;
    }
    const updated = { ...a, warmth, warmthRoom: a.location };
    if (warmth <= FROST_WARNING && a.warmth > FROST_WARNING) numb.push(updated);
    return updated;
  });
  return { party: next, frozen, numb };
}

/** What a frozen adventurer is worth: half the usual, rounded up. */
export function frozenMealAp(member: Pick<PartyMember, "group" | "type" | "apReward">): number {
  return Math.max(1, Math.ceil(getApReward(member) / 2));
}

/** Frozen adventurers nobody has eaten yet. */
export function uneatenFrozen(party: readonly PartyMember[]): PartyMember[] {
  return party.filter(a => a.isFrozen && !a.isConsumed);
}

// ============================================================
// DEVOTION (The Hollow Reliquary)
// A devoted adventurer left as the last one standing converts: it brings the mimic
// OFFERING_COUNT small creatures from the location and leaves, ending the hunt.
// ============================================================
export const OFFERING_COUNT: readonly [number, number] = [4, 5];

const isStillHunting = (a: PartyMember): boolean =>
  a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared && !a.isConverted;

/** The devoted adventurer ready to convert: the only party member left, or null. */
export function findDevotee(party: readonly PartyMember[]): PartyMember | null {
  const remaining = party.filter(isStillHunting);
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

// ============================================================
// RIVAL MIMICS
// A lone rival can lurk in an ordinary hunt; the Mimic Nest holds several, one of
// them the Elder. Rivals hide in separate rooms, eat adventurers who wander in, and
// are exposed when the mimic moves into their room.
// ============================================================
export type RivalKind = "lone" | "nest" | "elder";

export interface RivalMimic {
  id: string;
  kind: RivalKind;
  room: RoomName;
  revealed: boolean;
  consumed: boolean;
  /** It has eaten someone, so the player knows it's out there. */
  clueGiven: boolean;
}

/** Dice a rival resists a Strike with, the AP it's worth, and what the log calls it. */
export const RIVAL_STATS: Record<RivalKind, { dice: number; ap: number; name: string }> = {
  lone:  { dice: 3, ap: 12, name: "rival mimic" },
  nest:  { dice: 3, ap: 6,  name: "nest mimic" },
  elder: { dice: 5, ap: 18, name: "Elder Mimic" },
};

/** The kinds of rival in a nest: the Elder plus 2–3 younger mimics (per the location's range). */
export function rollNestKinds(location: HuntLocation, random: () => number = Math.random): RivalKind[] {
  if (!location.rivalNest) return [];
  const [min, max] = location.rivalNest;
  const count = min + Math.floor(random() * (max - min + 1));
  return ["elder", ...Array.from({ length: count - 1 }, (): RivalKind => "nest")];
}

/** Hides rivals in separate rooms, never the mimic's starting room. */
export function placeRivals(
  location: HuntLocation, startRoom: RoomName, kinds: readonly RivalKind[], random: () => number = Math.random,
): RivalMimic[] {
  const rooms = location.rooms.filter(r => r !== startRoom);
  for (let i = rooms.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rooms[i], rooms[j]] = [rooms[j], rooms[i]];
  }
  return kinds.slice(0, rooms.length).map((kind, i) => ({
    id: `rival_${i}`, kind, room: rooms[i], revealed: false, consumed: false, clueGiven: false,
  }));
}

/** Where a rival that slipped a Strike hides next: away from the mimic and the other rivals. */
export function rivalEscapeRoom(
  location: HuntLocation, rivals: readonly RivalMimic[], escapee: RivalMimic, mimicRoom: RoomName,
  random: () => number = Math.random,
): RoomName {
  const taken = new Set(rivals.filter(r => r.id !== escapee.id && !r.consumed).map(r => r.room));
  const free = location.rooms.filter(r => r !== mimicRoom && !taken.has(r));
  const options = free.length > 0 ? free : location.rooms.filter(r => r !== mimicRoom);
  return options.length > 0 ? options[Math.floor(random() * options.length)] : escapee.room;
}

/** The uneaten rival hiding in a room, if any. */
export function rivalInRoom(rivals: readonly RivalMimic[], room: RoomName | null | undefined): RivalMimic | undefined {
  return rivals.find(r => !r.consumed && r.room === room);
}

/** Whether a nest hunt has been won (its Elder devoured). */
export function isNestCleared(rivals: readonly RivalMimic[]): boolean {
  return rivals.some(r => r.kind === "elder" && r.consumed);
}

// ============================================================
// TREASURE
// ============================================================
export type TreasurePrize = { kind: "material"; name: Material } | { kind: "trait"; name: TeachableTrait };

/** One random prize from the treasure that the mimic doesn't already know, or null if it knows them all. */
export function pickTreasurePrize(
  treasure: Pick<Treasure, "materials" | "traits">, knownMaterials: readonly Material[], knownTraits: readonly Trait[],
  random: () => number = Math.random,
): TreasurePrize | null {
  const options: TreasurePrize[] = [
    ...treasure.materials.filter(name => !knownMaterials.includes(name)).map(name => ({ kind: "material" as const, name })),
    ...treasure.traits.filter(name => !knownTraits.includes(name)).map(name => ({ kind: "trait" as const, name })),
  ];
  return options.length > 0 ? options[Math.floor(random() * options.length)] : null;
}

// ============================================================
// SINKING (The Sinking Ship)
// Each turn (Wait, Lure, Relocate, Strike) brings the ship closer to going under. At
// sinkingTurns the hunt ends: survivors take to the lifeboats and the mimic drifts ashore.
// ============================================================
/** The log warning for a sinking turn, if this turn has one. */
export function sinkingWarning(totalTurns: number, turn: number): string | null {
  const left = totalTurns - turn;
  if (left <= 0) return null;
  if (turn === Math.floor(totalTurns / 3)) return "🌊 Water sloshes across the lower decks. The hull groans under the strain.";
  if (turn === Math.floor((totalTurns * 2) / 3)) return "🌊 The ship lists hard. Loose cargo slides, and the hold is half underwater.";
  if (left <= 2) return `🌊 The deck is awash. ${left === 1 ? "One more turn" : "Two more turns"} before she goes under!`;
  return null;
}

// ============================================================
// PARTY ELIGIBILITY
// Whether a template may appear in a party at this location for this mimic.
// ============================================================
export function isTemplateEligible(
  template: AdventurerTemplate, location: HuntLocation, mimicTier: Tier | undefined, mimicMass: number | undefined,
): boolean {
  const tierIdx = TIER_ORDER.indexOf(mimicTier || "Minor");
  if (template.minTier && TIER_ORDER.indexOf(template.minTier) > tierIdx) return false;
  if (template.minMass && (mimicMass ?? 0) < template.minMass) return false;
  if (template.locations && !template.locations.includes(location.id)) return false;
  if (location.exclusiveRoster && !template.locations?.includes(location.id)) return false;
  // Giant-kin only appear in giant-realm locations
  if (template.group === "giantKin" && !location.isGiantRealm) return false;
  return true;
}

// ============================================================
// ACHIEVEMENTS
// The single list the Home badges, in-game banners and Codex all read from.
// Each is earned from the saved character, so nothing else needs to track it.
// ============================================================
export const CULT_CONVERSIONS = 3;
export const CANNIBAL_MIMICS = 10;

export type AchievementId =
  "hatboxToLegend" | "apexPeak" | "titanicFeast" | "downWithTheShip" | "cultOfPersonality" | "cannibal" |
  "connoisseur" | "masterOfDisguise" | "curiosityCabinet" | "festive" | "forAllSeasons";

type AchievementProgress = Pick<MimicCharacter,
  "hatboxToLegendReached" | "apexPeakReached" | "titanicFeastReached" | "downWithTheShipReached" |
  "conversions" | "mimicsConsumed" | "adventurersEaten" | "learnedMaterials" | "learnedTraits" | "formsUsed">;

/**
 * Every material and trait an adventurer (or companion, or treasure) can teach. Master of
 * Disguise needs ALL_MATERIALS and LEARNABLE_TRAITS, so anything missing from these lists is a
 * content bug: it can never be learned (tests/achievements.test.mjs checks this).
 */
export function obtainableMaterialsAndTraits(): { materials: Set<Material>; traits: Set<LearnableTrait> } {
  const materials = new Set<Material>();
  const traits = new Set<LearnableTrait>();
  for (const t of ADVENTURER_TEMPLATES) {
    t.lootMaterials.forEach(x => materials.add(x));
    t.lootTraits.forEach(x => traits.add(x));
    t.treasure?.materials.forEach(x => materials.add(x));
    t.treasure?.traits.forEach(x => traits.add(x));
    for (const o of t.companion?.options ?? []) {
      o.lootMaterials?.forEach(x => materials.add(x));
      o.lootTraits?.forEach(x => traits.add(x));
    }
  }
  return { materials, traits };
}

export interface Achievement {
  id: AchievementId;
  name: string;
  icon: string;
  /** How to earn it (Codex). */
  description: string;
  /** Banner flavor text for a mimic that has earned it. */
  flavor: (mimicName: string) => string;
  isEarned: (character: AchievementProgress) => boolean;
  /**
   * Where its banner appears during a hunt (only while hunting there). Achievements without
   * one have no in-game banner; every earned achievement is listed on the character sheet.
   */
  bannerLocation?: LocationId;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "hatboxToLegend", name: "From Hatbox to Legend", icon: "📦",
    description: "Begin as a Minor mimic and evolve all the way to the Apex tier. Mimics that started at Lesser don't qualify.",
    // A mimic named Hatbox was promised this at creation ("You'll be a legend in no time")
    flavor: (n) => n.trim().toLowerCase() === "hatbox"
      ? "Told you. Hatbox, the legend."
      : `${n} was once small enough to overlook. No one makes that mistake anymore.`,
    isEarned: (c) => c.hatboxToLegendReached,
  },
  {
    id: "apexPeak", name: "Peak of the Apex", icon: "🏆",
    description: "Reach mass 40 at the Apex tier.",
    flavor: (n) => `${n} has consumed entire roads. Cartographers have stopped trying.`,
    isEarned: (c) => c.apexPeakReached,
  },
  {
    id: "titanicFeast", name: "Titanic Feast", icon: "🍖",
    description: "Consume all five Cloud Kingdom giants whole — finishing one off with bites doesn't count.",
    flavor: () => "The Cloud Kingdom's halls stand empty. Its lords, smiths and riders went in whole, and nothing came back out.",
    isEarned: (c) => c.titanicFeastReached,
    bannerLocation: "cloud_kingdom",
  },
  {
    id: "downWithTheShip", name: "Down With the Ship", icon: "⚓",
    description: "Swallow the Ship's Captain whole, strongbox and all, aboard The Sinking Ship.",
    flavor: (n) => `The captain never did abandon ship. ${n} made sure of it.`,
    isEarned: (c) => c.downWithTheShipReached,
    bannerLocation: "sinking_ship",
  },
  {
    id: "cultOfPersonality", name: "Cult of Personality", icon: "🕯️",
    description: `Convert ${CULT_CONVERSIONS} devotees to your worship at The Hollow Reliquary.`,
    flavor: (n) => `Candles burn for ${n} in three different hands now. The faithful are learning the hymns.`,
    isEarned: (c) => c.conversions >= CULT_CONVERSIONS,
    bannerLocation: "hollow_reliquary",
  },
  {
    id: "cannibal", name: "Cannibal", icon: "🦷",
    description: `Devour ${CANNIBAL_MIMICS} other mimics — nest mimics, Elders and lone rivals all count.`,
    flavor: (n) => `${n} has eaten its own kind ${CANNIBAL_MIMICS} times over. The others have learned to hide from it.`,
    isEarned: (c) => c.mimicsConsumed >= CANNIBAL_MIMICS,
    bannerLocation: "mimic_nest",
  },
  {
    id: "connoisseur", name: "Connoisseur", icon: "🍽️",
    description: "Eat at least one of every kind of adventurer (companions don't count). The Codex tracks your progress.",
    flavor: (n) => `There is no one left that ${n} hasn't tasted. It has opinions about all of them.`,
    isEarned: (c) => ADVENTURER_TEMPLATES.every(t => c.adventurersEaten.includes(t.name)),
  },
  {
    id: "masterOfDisguise", name: "Master of Disguise", icon: "🎭",
    description: "Learn every material and every learnable trait (surface, symbolic, condition, and scent) in the game.",
    flavor: (n) => `${n} can be anything, made of anything. Nobody will ever be sure of a chair again.`,
    isEarned: (c) => ALL_MATERIALS.every(x => c.learnedMaterials.includes(x)) &&
      LEARNABLE_TRAITS.every(x => knowsTrait(c, x)),
  },
  {
    id: "curiosityCabinet", name: "Curiosity Cabinet", icon: "🗝️",
    description: "Hunt in every variant form at least once — the shapes you can only take after learning something new.",
    flavor: (n) => `${n} has been a whispering grimoire, a weeping portrait and a grinning gargoyle. Collectors would pay a fortune — if they knew.`,
    isEarned: (c) => VARIANT_FORMS.every(f => c.formsUsed.includes(f.id as FormId)),
  },
  {
    id: "festive", name: "Festive", icon: "🎊",
    description: "Hunt in a seasonal form: one of the shapes that only appear around a holiday.",
    flavor: (n) => `${n} spent the holiday as part of the decorations. Nobody noticed. Nobody ever does.`,
    isEarned: (c) => SEASONAL_FORMS.some(f => c.formsUsed.includes(f.id)),
  },
  {
    id: "forAllSeasons", name: "A Mimic for All Seasons", icon: "🗓️",
    description: "Hunt in at least one seasonal form from every holiday season of the year.",
    flavor: (n) => `${n} has been a lantern, an egg, a bonfire and a gift. The calendar has learned to fear it.`,
    isEarned: (c) => (Object.keys(HOLIDAYS) as HolidayId[]).every(h =>
      SEASONAL_FORMS.some(f => f.holiday === h && c.formsUsed.includes(f.id))),
  },
];

// ============================================================
// LIFETIME STATS (character sheet)
// ============================================================
export interface LifetimeStats {
  huntsSurvived: number;
  huntsFailed: number;
  huntsTotal: number;
  /** Adventurers, companions and rival mimics eaten. */
  entitiesEaten: number;
  formsUsed: number;
  closestCall: number;
  biggestMeal: { name: string; ap: number } | null;
  lifetimeApEarned: number;
  favoriteForm: { name: string; hunts: number } | null;
  favoriteHuntingGround: { name: string; hunts: number } | null;
}

/** The key with the highest count (first one wins a tie), or null if nothing has been counted. */
export function mostCounted<K extends string>(counts: Partial<Record<K, number>>): { key: K; count: number } | null {
  let best: { key: K; count: number } | null = null;
  for (const [key, count] of Object.entries(counts) as [K, number][]) {
    if (count > 0 && (!best || count > best.count)) best = { key, count };
  }
  return best;
}

/** Adds one to a key's count. */
export function withCount<K extends string>(counts: Partial<Record<K, number>>, key: K | null | undefined): Partial<Record<K, number>> {
  if (!key) return { ...counts };
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

/** The bigger of the current biggest meal and this one. */
export function withBiggestMeal(
  current: { name: string; ap: number } | null, name: string, ap: number,
): { name: string; ap: number } | null {
  return !current || ap > current.ap ? { name, ap } : current;
}

export function lifetimeStats(c: Pick<MimicCharacter,
  "huntsSurvived" | "huntsFailed" | "partyMembersEaten" | "mimicsConsumed" | "formsUsed" | "closestCall" |
  "biggestMeal" | "lifetimeApEarned" | "formHuntCounts" | "locationHuntCounts">): LifetimeStats {
  const form = mostCounted(c.formHuntCounts);
  const place = mostCounted(c.locationHuntCounts);
  return {
    huntsSurvived: c.huntsSurvived,
    huntsFailed: c.huntsFailed,
    huntsTotal: c.huntsSurvived + c.huntsFailed,
    entitiesEaten: c.partyMembersEaten + c.mimicsConsumed,
    formsUsed: c.formsUsed.length,
    closestCall: c.closestCall,
    biggestMeal: c.biggestMeal,
    lifetimeApEarned: c.lifetimeApEarned,
    favoriteForm: form ? { name: ALL_FORMS.find(f => f.id === form.key)?.name ?? form.key, hunts: form.count } : null,
    favoriteHuntingGround: place ? { name: LOCATIONS.find(l => l.id === place.key)?.name ?? place.key, hunts: place.count } : null,
  };
}

// ============================================================
// FROM HATBOX TO LEGEND
// Achievement for a mimic that began as a Minor and evolved all the way to Apex.
// Starting at Lesser doesn't count, and reaching Apex is enough (Peak of the Apex
// separately rewards reaching mass 40).
// ============================================================
export function earnsHatboxToLegend(
  character: Pick<MimicCharacter, "startingType" | "hatboxToLegendReached">, newTier: Tier,
): boolean {
  return newTier === "Apex" && character.startingType === "Minor" && !character.hatboxToLegendReached;
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
// TITANIC FEAST
// Achievement for consuming every giant of the Cloud Kingdom Outpost whole
// (finishing one off with bites doesn't count).
// ============================================================
export const TITANIC_FEAST_GIANTS: readonly string[] = ADVENTURER_TEMPLATES
  .filter(t => t.group === "giantKin" && t.locations?.includes("cloud_kingdom"))
  .map(t => t.name);

export function isTitanicFeastComplete(consumedWhole: readonly string[]): boolean {
  return TITANIC_FEAST_GIANTS.every(name => consumedWhole.includes(name));
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

// ============================================================
// LEGENDARY REPUTATION
// Returns true if the current hunt should be a Bounty Hunt (mimic hunters specifically targeting the mimic)
// Chance scales with mass. At mass 30+ it becomes possible; at 36+ it is more common.
// ============================================================
export function shouldTriggerBountyHunt(mass: number): boolean {
  if (mass < 30) return false;
  if (mass >= 36) return Math.random() < 0.50; // 50% chance at mass 36+
  return Math.random() < 0.25; // 25% chance at mass 30-35
}

// ============================================================
// PARTIES AND CREATURES
// Who's at a location when a hunt starts.
// ============================================================
/** A small creature (rat, crow…) wandering the location during a hunt. */
export interface SmallCreature extends LocationCreature {
  uid: string;
  isConsumed: boolean;
  location: RoomName;
}

// Hunters, elites and giant-kin fill up to 2 "elite" slots (Greater+ only).
// Everyone else — including tier-gated monsters — fills the common slots.
const ELITE_GROUPS: readonly AdventurerGroupId[] = ["huntersElites", "giantKin"];

/**
 * A normal party for a location: any adventurers it always has, then (Greater+) up to 2 elites,
 * then a random mix of everyone else eligible. Some locations save slots for their locals
 * (`nativeShare`), and a location's real monsters never come this way (see addRealMonster).
 */
export function generateParty(location: HuntLocation, mimicTier: Tier, mimicMass: number, random: () => number = Math.random): PartyMember[] {
  const [min, max] = location.partySize;
  const size = min + Math.floor(random() * (max - min + 1));
  const tierIdx = TIER_ORDER.indexOf(mimicTier || "Minor");

  // A location's real monsters only ever join through addRealMonster, never the normal draw
  const eligible = ADVENTURER_TEMPLATES.filter(t =>
    isTemplateEligible(t, location, mimicTier, mimicMass) && !location.realMonsters?.names.includes(t.name));
  // Some locations guarantee certain adventurers a place (e.g. the Reliquary's pilgrim)
  const required = eligible.filter(t => location.alwaysIncludes?.includes(t.name));
  const pool = eligible.filter(t => !required.includes(t));
  const common = pool.filter(t => !ELITE_GROUPS.includes(t.group));
  const elite = pool.filter(t => ELITE_GROUPS.includes(t.group));

  // Exclusive-roster locations draw only from their own adventurers, with no elite/common split
  if (location.exclusiveRoster) {
    common.push(...elite);
    elite.length = 0;
  }
  const eliteCount = tierIdx >= TIER_ORDER.indexOf("Greater") ? Math.min(2, elite.length) : 0;
  const shuffledCommon = [...common].sort(() => random() - 0.5);
  const shuffledElite = [...elite].sort(() => random() - 0.5);

  const baseParty: AdventurerTemplate[] = [...required];
  // Some locations save a few slots for their own locals (e.g. the Snowbound Lodge's gnomes)
  if (location.nativeShare) {
    const natives = shuffledCommon.filter(t => t.locations?.includes(location.id)).slice(0, location.nativeShare);
    for (const t of natives) {
      if (baseParty.length >= size) break;
      baseParty.push(t);
      shuffledCommon.splice(shuffledCommon.indexOf(t), 1);
    }
  }
  for (let i = 0; i < eliteCount && baseParty.length < size; i++) {
    if (shuffledElite[i]) baseParty.push(shuffledElite[i]);
  }
  let ci = 0;
  while (baseParty.length < size && ci < shuffledCommon.length) {
    baseParty.push(shuffledCommon[ci++]);
  }

  const members: PartyMember[] = [];
  baseParty.forEach((t, i) => {
    const room = location.rooms[Math.floor(random() * location.rooms.length)];
    members.push({
      ...t,
      id: `adv_${Date.now()}_${i}`,
      suspicion: t.baseSuspicion,
      isAlive: true,
      isConsumed: false,
      isAttracted: false,
      location: room,
    });
    // Companion/familiar injection
    if (t.companion && random() < t.companion.chance) {
      const opts = t.companion.options;
      const chosen = pickCompanionOption(opts);
      const companionRoom = location.rooms[Math.floor(random() * location.rooms.length)];
      members.push(createCompanion(t, chosen, `comp_${Date.now()}_${i}`, companionRoom));
    }
  });

  return members;
}

const FALLBACK_CREATURES: readonly LocationCreature[] = [
  { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A fat cellar rat." },
  { id: "cat", name: "Cat", ap: 2, discipline: 2, description: "A wary housecat." },
  { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "A rooftop crow, curious and bold." },
  { id: "spider", name: "Giant Spider", ap: 2, discipline: 2, description: "A palm-sized cellar spider." },
  { id: "weasel", name: "Weasel", ap: 1, discipline: 2, description: "Fast and wiry." },
  { id: "pigeon", name: "Pigeon", ap: 1, discipline: 1, description: "Fat and oblivious." },
];

/** The small creatures about at the start of a hunt: 3–5, each in a room it's allowed in, none over its `max`. */
export function spawnSmallCreatures(loc: HuntLocation, random: () => number = Math.random): SmallCreature[] {
  const pool = loc.locationCreatures.length ? loc.locationCreatures : FALLBACK_CREATURES;
  const count = 3 + Math.floor(random() * 3);
  const creatures: SmallCreature[] = [];
  for (let i = 0; i < count; i++) {
    // Skip any creature that has already reached its limit for the hunt (e.g. one reindeer)
    const open = pool.filter(t => !t.max || creatures.filter(c => c.id === t.id).length < t.max);
    if (open.length === 0) break;
    const template = open[Math.floor(random() * open.length)];
    // Some creatures keep to certain rooms (the Lodge's reindeer stays out by the woodpile)
    const rooms = template.rooms ? loc.rooms.filter(r => template.rooms?.includes(r)) : loc.rooms;
    const room = rooms[Math.floor(random() * rooms.length)];
    creatures.push({ ...template, uid: `sc_${Date.now()}_${i}`, isConsumed: false, location: room });
  }
  return creatures;
}

// Build a Bounty Hunt party — all members are mimic hunter variants
export function generateBountyParty(location: HuntLocation, mimicMass: number): PartyMember[] {
  const hunterTemplates = ADVENTURER_TEMPLATES.filter(t => t.isMimicHunter);
  const size = mimicMass >= 36 ? 4 : 3;
  const shuffled = [...hunterTemplates].sort(() => Math.random() - 0.5);
  const members: PartyMember[] = [];
  for (let i = 0; i < size; i++) {
    const t = shuffled[i % shuffled.length];
    const room = location.rooms[Math.floor(Math.random() * location.rooms.length)];
    members.push({
      ...t,
      id: `bounty_${Date.now()}_${i}`,
      suspicion: t.baseSuspicion,
      isAlive: true,
      isConsumed: false,
      isAttracted: false,
      location: room,
    });
  }
  return members;
}

// Returns a sickness if all stats are capped and the random roll hits (20% chance)
export function rollForSickness(character: Pick<MimicCharacter, CombatStat>): Sickness | null {
  const STAT_CAP = 6;
  const allCapped = character.plausibility >= STAT_CAP &&
                    character.adhesion >= STAT_CAP &&
                    character.patience >= STAT_CAP;
  if (!allCapped) return null;
  if (Math.random() > 0.20) return null;
  return SICKNESSES[Math.floor(Math.random() * SICKNESSES.length)];
}
