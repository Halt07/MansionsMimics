// ============================================================
// MANSIONS & MIMICS — Codex
// What the Codex knows: which adventurers a mimic has met or eaten, and which hunting grounds
// it has found or mapped. Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { TIER_ORDER } from "./vocabulary";
import { ADVENTURER_TEMPLATES, isHiddenAdventurer, type AdventurerTemplate, type PartyMember } from "./adventurerData";
import { LOCATIONS, type HuntLocation } from "./locationData";
import { isInSeason, today } from "./holidays";
import { meetsLocationRequirements } from "./core";

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

/**
 * Adds template names to a discovery list, ignoring companions and anything that isn't a
 * template. Someone in costume counts under the costume, which isn't a template: pass
 * `unmask(member)` to record who they really are.
 */
export function withDiscovered(list: readonly string[], members: readonly Pick<PartyMember, "name" | "isCompanion" | "costume">[]): string[] {
  const templateNames = new Set(ADVENTURER_TEMPLATES.map(t => t.name));
  // Someone still in costume tells you nothing (a "Werewolf" costume isn't necessarily a Werewolf)
  const added = members.filter(m => !m.isCompanion && !m.costume && templateNames.has(m.name)).map(m => m.name);
  return [...new Set([...list, ...added])];
}

// ============================================================
// CODEX: LOCATIONS
// The Codex groups hunting grounds and only tells you about the ones you've found.
// ============================================================
export type LocationGroupId = "common" | "uncommon" | "advanced" | "giant" | "adept" | "rare" | "seasonal" | "beyond";

export const LOCATION_GROUPS: readonly { id: LocationGroupId; label: string; description: string }[] = [
  { id: "common", label: "Common", description: "Hunting grounds every mimic knows from its first meal." },
  { id: "uncommon", label: "Uncommon", description: "Grounds that open once a mimic outgrows the first five, at Standard and Greater." },
  { id: "advanced", label: "Advanced", description: "Grounds that open up as a mimic grows in tier and mass." },
  { id: "giant", label: "Giant", description: "Where the giants live. Only the largest mimics are taken seriously there." },
  { id: "adept", label: "Adept", description: "Grounds for mimics that have outgrown even the giants' doorways." },
  { id: "rare", label: "Rare", description: "Places that open only now and then, for a hunt or two." },
  { id: "seasonal", label: "Seasonal", description: "Places that open to mimics of every size, but only while their holiday lasts." },
  // Only listed once one of them has been hunted (see codexLocations)
  { id: "beyond", label: "Beyond the Apex", description: "What else don't you know?" },
];

/** Where a location's requirements fall in unlock order: tier first, then mass. */
const unlockRank = (l: HuntLocation) => TIER_ORDER.indexOf(l.minTier) * 1000 + (l.minMass ?? 0);
/** The first giant-realm location to unlock: Advanced grounds unlock before it, Adept ones after. */
const firstGiantRank = Math.min(...LOCATIONS.filter(l => l.isGiantRealm).map(unlockRank));

/** Which Codex group a location belongs to. */
export function locationGroup(location: HuntLocation): LocationGroupId {
  if (location.branch) return "beyond";
  if (location.holiday) return "seasonal";
  if (location.rare) return "rare";
  if (location.isGiantRealm) return "giant";
  if (location.minTier === TIER_ORDER[0] && !location.minMass) return "common";
  // Standard and Greater: the grounds between the starter five and Grand
  if (TIER_ORDER.indexOf(location.minTier) < TIER_ORDER.indexOf("Grand")) return "uncommon";
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
  if (location.branch) return "unknown";
  if (location.holiday) return isInSeason(location.holiday, date) ? "known" : "unknown";
  const group = locationGroup(location);
  if (group === "common") return "known";
  if (group === "rare") return "unknown";
  return characters.some(c => meetsLocationRequirements(location, c.tier, c.mass)) ? "known" : "unknown";
}

// ============================================================
// SECRETS
// The branch tiers' own hunting grounds and adventurers (see "Beyond Apex" in IDEAS.md) aren't
// even listed as "???" until a mimic has been there or met them, so the Codex doesn't give
// away that there's anything past Apex.
// ============================================================

/** The locations the Codex lists: all but a branch tier's own ground no one here has hunted. */
export function codexLocations(
  characters: readonly Pick<MimicCharacter, "locationHuntCounts">[],
): HuntLocation[] {
  return LOCATIONS.filter(l => !l.branch || locationHunts(l, characters) > 0);
}

/** The adventurers the Codex lists: all but the hidden ones no one here has met. */
export function codexAdventurers(discoveries: Discoveries): AdventurerTemplate[] {
  return ADVENTURER_TEMPLATES.filter(t => !isHiddenAdventurer(t) || discoveryLevel(discoveries, t.name) !== "unknown");
}
