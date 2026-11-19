// ============================================================
// MANSIONS & MIMICS — Core rules
// The rules everything else builds on: rooms (distances, neighbours, room modifiers), dice and
// shuffling, magic materials and what a mimic knows, choosing what to wear, burns, and which
// locations are open (rare ones included). Re-exported from ./gameData.
// ============================================================
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import { isInSeason, today } from "./holidays";
import {
  LOCATIONS, ROOM_FORM_MODIFIERS, type HuntLocation, type LocationId, type RoomContextMod, type RoomModifier,
  type RoomName,
} from "./locationData";
import { formFamily, type FormId } from "./mimicData";
import {
  ALL_STARTING_TRAITS, MATERIALS, TIER_ORDER, type MagicMaterial, type Material, type Tier, type Trait,
} from "./vocabulary";


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
/**
 * A shuffled copy (Fisher–Yates: every order equally likely). Sorting by a random comparison
 * isn't: some orders come up far more often than others, depending on how the sort compares.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

// ============================================================
// MAGIC AND KNOWLEDGE
// What the mimic is wearing (magic materials have effects all over the rules) and what it knows.
// ============================================================
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

/**
 * Clicking a choice in an appearance slot (a material or a trait): a chosen one comes off;
 * otherwise it goes on, unless the slot is full. With `swap`, a slot that holds just one swaps
 * instead (the new pick replaces the old). Materials swap; traits don't.
 */
export function toggleChoice<T>(current: readonly T[], item: T, max: number, { swap = false }: { swap?: boolean } = {}): T[] {
  if (current.includes(item)) return current.filter(x => x !== item);
  if (swap && max === 1) return [item];
  if (current.length >= max) return [...current];
  return [...current, item];
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
