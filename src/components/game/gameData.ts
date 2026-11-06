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
  ALL_FORMS, MASTER_FORMS, SICKNESSES, TIER_CONFIG, type Form, type FormId, type Sickness,
} from "./mimicData";
import {
  ADVENTURER_TEMPLATES, AP_REWARDS, BEHAVIORS, type Treasure, type AdventurerTemplate, type BehaviorId, type BehaviorInfo, type CompanionOption,
  type PartyMember, type QualityList,
} from "./adventurerData";
import {
  LOCATIONS, ROOM_FORM_MODIFIERS, type HuntLocation, type LocationCreature, type LocationId, type RoomModifier,
  type RoomContextMod, type RoomName,
} from "./locationData";

export * from "./vocabulary";
export * from "./mimicData";
export * from "./adventurerData";
export * from "./locationData";

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
 * Which of a mimic's forms it may still carry at this size (tier, mass, variant unlocks and the
 * one-form-above limit), in their current order. Used after a tier-up or a Thimblewood change.
 */
export function formsStillAllowed<T extends { formId: string }>(
  forms: readonly T[], tier: Tier, mass: number, knowledge: FormKnowledge,
): T[] {
  const valid = getValidForms(tier, mass, knowledge);
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

export function isFormAboveTier(form: Pick<Form, "tier">, mimicTier: Tier): boolean {
  return TIER_ORDER.indexOf(form.tier) === TIER_ORDER.indexOf(mimicTier) + 1;
}

/** Whether `form` may be added to `selectedForms` without breaking the one-form-above rule. */
export function canAddForm(selectedForms: readonly Pick<Form, "tier">[], form: Pick<Form, "tier">, mimicTier: Tier): boolean {
  if (!isFormAboveTier(form, mimicTier)) return true;
  return selectedForms.filter(f => isFormAboveTier(f, mimicTier)).length < MAX_FORMS_ABOVE_TIER;
}

// ============================================================
// VARIANT FORMS
// A variant (e.g. Grimoire, a variant of Book) is available whenever its base form is,
// once the mimic knows any one of its unlockedBy materials or traits. It shares its
// base form's burn and room modifiers; "forms used" counts it separately.
// ============================================================
export const VARIANT_FORMS: readonly Form[] = ALL_FORMS.filter(f => f.variantOf);

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

/** Forms whose tier and mass rules allow them, ignoring variant unlocks. */
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

/**
 * Forms a mimic can choose. Base forms by tier and mass; variant forms only when `knowledge`
 * is given and unlocks them (omit it, e.g. at character creation, for base forms only).
 */
export function getValidForms(tierStr: Tier, massVal: number, knowledge?: FormKnowledge): Form[] {
  return formsInRange(tierStr, massVal).filter(f =>
    !isVariantForm(f) || (knowledge !== undefined && isVariantUnlocked(f, knowledge)));
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
export function withDiscovered(list: readonly string[], members: readonly Pick<PartyMember, "name" | "isCompanion">[]): string[] {
  const templateNames = new Set(ADVENTURER_TEMPLATES.map(t => t.name));
  const added = members.filter(m => !m.isCompanion && templateNames.has(m.name)).map(m => m.name);
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

/** Whether a location appears on the hunting-ground screen right now. */
export function isLocationAvailable(
  location: HuntLocation, tier: Tier, mass: number, rareLocation: RareLocationState | null | undefined,
): boolean {
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
  "connoisseur" | "masterOfDisguise" | "curiosityCabinet";

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
    flavor: (n) => `${n} was once small enough to overlook. No one makes that mistake anymore.`,
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
];

/** A remark on the mimic's name — or null for an unremarkable name. */
export function nameFlavor(rawName: string): string | null {
  const name = rawName.trim().replace(/\s+/g, " ");
  const key = name.toLowerCase();
  return NAME_REMARKS.find(r => r.names.includes(key))?.line(name) ?? null;
}

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
function stepToward(location: HuntLocation, fromRoom: RoomName, targetRoom: RoomName): RoomName {
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
