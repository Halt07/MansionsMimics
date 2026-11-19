// ============================================================
// MANSIONS & MIMICS — Game rules
// The core rules of a hunt: rooms, dice, which forms a mimic can take, magic, burns and rare
// locations.
// The rest lives alongside it:
//   ./events     location events (rivals, the Sinking Ship, Devotion, the seasonal twists)
//   ./stats      effective stats, mass decay, achievements and lifetime stats
//   ./codex      what the Codex knows (adventurers met and eaten, hunting grounds found)
//   ./mealPrep   setting up a hunt (the party, companions, small creatures, sickness)
//   ./strike     what happens when the mimic strikes (rivals, bites, swallowing whole), and the adhesion check
//   ./lure       luring adventurers in, and the stealth and allure checks
//   ./behaviors  how adventurers with a behavior react to what the mimic does
//   ./easterEggs name remarks, the cat that knows, the spiderweb, quirks and other flavor
//   ./movement   where the party and the small creatures go each Wait
//   ./hunt       a hunt in progress (Hunt), and what every turn shares (Turn): suspicion, meals, the end of a turn
//   ./turns      each hunt action, from starting the hunt to Relocate, Lure, Strike, Wait and eating
// The data lives in ./vocabulary, ./mimicData, ./adventurerData and ./locationData. This module
// re-exports all of it, so callers can keep importing everything from gameData.
// ============================================================
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import {
  ALL_MATERIALS, ALL_STARTING_TRAITS, MATERIALS, TIER_ORDER,
  type MagicMaterial, type Material, type Tier, type Trait,
} from "./vocabulary";
import {
  ALL_FORMS, MASTER_FORMS, SEASONAL_FORMS, TIER_CONFIG, type Form, type FormId, type SeasonalForm,
} from "./mimicData";
import {
  LOCATIONS, ROOM_FORM_MODIFIERS, type HuntLocation, type LocationId, type RoomModifier,
  type RoomContextMod, type RoomName,
} from "./locationData";
import { HOLIDAYS, isInSeason, seasonStart, today } from "./holidays";

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
export * from "./lure";
export * from "./behaviors";
export * from "./easterEggs";
export * from "./movement";
export * from "./hunt";
export * from "./turns";

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
