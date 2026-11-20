// ============================================================
// MANSIONS & MIMICS — Meal prep
// Setting the table for a hunt: who's in the party (companions, eligibility, bounty hunts),
// which small creatures are about, and whether the mimic starts it sick. Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { TIER_ORDER, type CombatStat, type PerceptionSense, type Tier } from "./vocabulary";
import { SICKNESSES, type Form, type Sickness } from "./mimicData";
import { ADVENTURER_TEMPLATES, type AdventurerGroupId, type AdventurerTemplate, type CompanionOption, type PartyMember } from "./adventurerData";
import { type HuntLocation, type LocationCreature, type RoomName } from "./locationData";
import {
  BURN_SUSPICION, advanceRareLocation, formBurn, locationBurn, shuffle, tickBurns, type RareLocationState,
} from "./core";
import {
  addRealMonster, addStray, dressParty, rollEruption, placeProcession, placeRivals, rollNestKinds, withWarmth, type RivalMimic,
} from "./events";
import { STAT_CAP, getActiveForm, isMagicUser, withCount, withFormUsed } from "./stats";
import { withDiscovered } from "./codex";

// ============================================================
// COMPANIONS
// ============================================================
const COMPANION_PERCEPTION: Readonly<Record<PerceptionSense, number>> = {
  material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0,
};

/** Picks one companion option, honoring each option's `weight`. */
export function pickCompanionOption(options: readonly CompanionOption[], random: () => number = Math.random): CompanionOption {
  const total = options.reduce((sum, o) => sum + (o.weight ?? 1), 0);
  let r = random() * total;
  for (const o of options) {
    r -= o.weight ?? 1;
    if (r < 0) return o;
  }
  return options[options.length - 1];
}

/** Builds the party member for an adventurer's companion. */
export function createCompanion(
  owner: Pick<AdventurerTemplate, "name">, option: CompanionOption, id: string, room: RoomName,
  random: () => number = Math.random,
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
    behavior: option.behavior && random() < (option.behaviorChance ?? 1) ? option.behavior : undefined,
    apReward: option.ap,
    id,
    isAlive: true,
    isConsumed: false,
    isAttracted: false,
    isCompanion: true,
    location: room,
  };
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
  // The Old Academy: magic users from anywhere (unless they belong somewhere else), and its own
  if (location.magicUsersOnly && !template.locations?.includes(location.id) && !isMagicUser(template)) return false;
  // Giant-kin only appear in giant-realm locations
  if (template.group === "giantKin" && !location.isGiantRealm) return false;
  return true;
}

// ============================================================
// LEGENDARY REPUTATION
// Returns true if the current hunt should be a Bounty Hunt (mimic hunters specifically targeting the mimic)
// Chance scales with mass. At mass 30+ it becomes possible; at 36+ it is more common.
// ============================================================
export function shouldTriggerBountyHunt(mass: number, random: () => number = Math.random): boolean {
  if (mass < 30) return false;
  if (mass >= 36) return random() < 0.50; // 50% chance at mass 36+
  return random() < 0.25; // 25% chance at mass 30-35
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

// Hunters, elites and giant-kin fill the "elite" slots: 2 from Greater, 3 at Apex (word of a
// mimic that size gets around, and the people who come looking are the dangerous kind).
// Everyone else — including tier-gated monsters — fills the common slots.
const ELITE_GROUPS: readonly AdventurerGroupId[] = ["huntersElites", "giantKin"];

/** How many of a party's places can go to elites, by the mimic's tier. */
export function eliteSlots(tier: Tier): number {
  if (tier === "Apex") return 3;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf("Greater") ? 2 : 0;
}

/**
 * A normal party for a location: any adventurers it always has, then (Greater+) a few elites (see eliteSlots),
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
  const eliteCount = Math.min(eliteSlots(mimicTier || "Minor"), elite.length);
  const shuffledCommon = shuffle(common, random);
  const shuffledElite = shuffle(elite, random);

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
      const chosen = pickCompanionOption(opts, random);
      const companionRoom = location.rooms[Math.floor(random() * location.rooms.length)];
      members.push(createCompanion(t, chosen, `comp_${Date.now()}_${i}`, companionRoom, random));
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
export function generateBountyParty(location: HuntLocation, mimicMass: number, random: () => number = Math.random): PartyMember[] {
  const hunterTemplates = ADVENTURER_TEMPLATES.filter(t => t.isMimicHunter);
  const size = mimicMass >= 36 ? 4 : 3;
  const shuffled = shuffle(hunterTemplates, random);
  const members: PartyMember[] = [];
  for (let i = 0; i < size; i++) {
    const t = shuffled[i % shuffled.length];
    const room = location.rooms[Math.floor(random() * location.rooms.length)];
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
export function rollForSickness(character: Pick<MimicCharacter, CombatStat>, random: () => number = Math.random): Sickness | null {
  const allCapped = character.plausibility >= STAT_CAP &&
                    character.adhesion >= STAT_CAP &&
                    character.patience >= STAT_CAP;
  if (!allCapped) return null;
  if (random() > 0.20) return null;
  return SICKNESSES[Math.floor(random() * SICKNESSES.length)];
}

// ============================================================
// STARTING A HUNT
// Everything decided when the mimic picks its room: who's there (an ordinary party, or bounty
// hunters after it), rival mimics, small creatures, a sickness, and how suspicious everyone is
// from the start. Pure: Game writes the log, sets up the hunt and saves `changes`.
// ============================================================
/** Chance of a lone rival mimic in an ordinary hunt (Greater tier and up). */
export const RIVAL_CHANCE = 1 / 7;
/** The smallest tier a lone rival comes after. */
export const RIVAL_MIN_TIER: Tier = "Greater";
/** Bounty hunters know the mimic is there: they start at this suspicion. */
export const BOUNTY_START_SUSPICION = 4;
/** Starting suspicion never reaches 10 (that would end the hunt before it begins). */
export const MAX_START_SUSPICION = 9;

export interface HuntStart {
  /** Hunters after the mimic itself, instead of an ordinary party. */
  bounty: boolean;
  party: PartyMember[];
  rivals: RivalMimic[];
  creatures: SmallCreature[];
  sickness: Sickness | null;
  suspicion: number;
  /** The form the mimic starts in. */
  startForm: Form | null;
  /** Burned here before, and/or burned in this shape before (each adds BURN_SUSPICION). */
  burned: { location: boolean; form: boolean };
  /** A rare location that just came within reach (for the next hunts). */
  openedRare: HuntLocation | null;
  /** An ordinary adventurer lost somewhere they don't belong (see addStray), if one came. */
  stray: PartyMember | null;
  /** The Tear in Time: the turn the volcano erupts this hunt, or null if it won't (see rollEruption). */
  eruptionTurn: number | null;
  /** What to save on the character now: burns tick down, the rare location, discovery, hunt counts. */
  changes: Partial<MimicCharacter>;
}

/** Set up a hunt at `location`, with the mimic waiting in `room`. */
export function startHunt(
  character: MimicCharacter, location: HuntLocation, room: RoomName, random: () => number = Math.random,
): HuntStart {
  // Rare and branch locations tell their own story: no bounty hunters or rival mimics there (at
  // the Tear in Time, there are no other mimics yet)
  const ownStory = !!location.rare || !!location.branch;
  const bounty = !ownStory && shouldTriggerBountyHunt(character.mass, random);
  const rivalTier = TIER_ORDER.indexOf(character.tier) >= TIER_ORDER.indexOf(RIVAL_MIN_TIER);
  const lone = !bounty && !ownStory && rivalTier && random() < RIVAL_CHANCE;
  // The Mimic Nest always holds its nest (Elder included); elsewhere maybe a lone rival
  const rivals = location.rivalNest
    ? placeRivals(location, room, rollNestKinds(location, random), random)
    : lone ? placeRivals(location, room, ["lone"], random) : [];

  // The party: warmed up if it's snowed in; on Spell or Sweet Street maybe a real monster among
  // them, everyone in costume, a few walking together and the rest spread out
  const base = withWarmth(bounty
    ? generateBountyParty(location, character.mass, random)
    : generateParty(location, character.tier, character.mass, random), location, random);
  const withMonster = bounty ? base : addRealMonster(base, location, character.tier, character.mass, random);
  const { party: withStray, stray } = addStray(withMonster, location, character.tier, character.mass, random);
  const dressed = location.costumes ? dressParty(withStray, random) : withStray;
  const party = location.procession ? placeProcession(dressed, location, room, random) : dressed;
  const creatures = spawnSmallCreatures(location, random);
  const eruptionTurn = rollEruption(location, random);
  const sickness = rollForSickness(character, random);

  // Burned places and shapes (from being found out before) start the hunt under suspicion
  const startForm = getActiveForm(character);
  const burned = { location: locationBurn(character, location.id) > 0, form: !!startForm && formBurn(character, startForm.id) > 0 };
  const burnSuspicion = (burned.location ? BURN_SUSPICION : 0) + (burned.form ? BURN_SUSPICION : 0);
  const suspicion = Math.min((bounty ? BOUNTY_START_SUSPICION : 0) + burnSuspicion, MAX_START_SUSPICION);

  // Rare locations: visiting closes the open one, hunting elsewhere uses up one of its hunts,
  // and if none was open there's a chance one opens for the next hunts
  const rare: { state: RareLocationState | null; opened: HuntLocation | null } =
    advanceRareLocation(character.rareLocation, location.id, character.tier, character.mass, random);
  const changes: Partial<MimicCharacter> = {
    rareLocation: rare.state,
    ...tickBurns(character),                                           // burns count down a hunt
    adventurersMet: withDiscovered(character.adventurersMet, party),   // the Codex: everyone here is met
    formsUsed: withFormUsed(character.formsUsed, startForm?.id),
    formHuntCounts: withCount(character.formHuntCounts, startForm?.id),
    locationHuntCounts: withCount(character.locationHuntCounts, location.id),
  };
  return { bounty, party, rivals, creatures, sickness, suspicion, startForm, burned, openedRare: rare.opened, stray, eruptionTurn, changes };
}
