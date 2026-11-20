// ============================================================
// MANSIONS & MIMICS — Location events
// The twists particular locations (and some hunts) bring: rival mimics, the Sinking Ship, and
// the seasonal locations' cold, falling stars, fireworks and door-to-door procession. (Devotion
// at the Hollow Reliquary has its own module, ./devotion.) Re-exported from ./gameData.
// ============================================================
import { ADVENTURER_TEMPLATES, getApReward, isHiddenAdventurer, stillInHunt, type PartyMember, type Treasure } from "./adventurerData";
import { getAdjacentRooms, getRoomDistance, shuffle } from "./core";
import type { HuntLocation, RoomName } from "./locationData";
import { type Form, type FormId } from "./mimicData";
import { plural } from "./text";
import {
  TIER_ORDER, type Material, type TeachableTrait, type Tier, type Trait,
} from "./vocabulary";

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
  const pool = shuffle(COSTUMES.filter(c => !taken.has(c)), random);
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

/**
 * Maybe add a stray (with the location's `strays.chance`): an ordinary adventurer from the
 * world the mimic knows (not tied to any location, not giant-kin) who has wandered somewhere they
 * don't belong, like the Tear in Time. Returns the party and the stray, if one came.
 */
export function addStray(
  party: readonly PartyMember[], location: HuntLocation, tier: Tier, mass: number, random: () => number = Math.random,
): { party: PartyMember[]; stray: PartyMember | null } {
  if (!location.strays || random() >= location.strays.chance) return { party: [...party], stray: null };
  const tierIdx = TIER_ORDER.indexOf(tier);
  const options = ADVENTURER_TEMPLATES.filter(t => !t.locations && t.group !== "giantKin" && !isHiddenAdventurer(t) &&
    (!t.minTier || TIER_ORDER.indexOf(t.minTier) <= tierIdx) && (!t.minMass || mass >= t.minMass));
  if (options.length === 0) return { party: [...party], stray: null };
  const t = options[Math.floor(random() * options.length)];
  const room = location.rooms[Math.floor(random() * location.rooms.length)];
  const stray: PartyMember = {
    ...t, id: `stray_${t.name.replace(/\W+/g, "_")}_${party.length}`, suspicion: t.baseSuspicion,
    isAlive: true, isConsumed: false, isAttracted: false, location: room,
  };
  return { party: [...party, stray], stray };
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
  const free = shuffle(order.filter(r => r !== avoid), random);
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
  const claimer = party.find(a => stillInHunt(a) && a.location === star && !a.treasure);
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
    if (!stillInHunt(a) || a.warmth === undefined) return a;
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
// RIVAL MIMICS
// A lone rival can lurk in an ordinary hunt; the Mimic Nest holds several, one of
// them the Elder. Rivals hide in separate rooms, eat adventurers who wander in, and
// are exposed when the mimic moves into their room.
// ============================================================
export type RivalKind = "lone" | "nest" | "elder";

/**
 * What a rival mimic is posing as once it's found (its marker on the room map), and the mimic
 * forms that count as each (their variants too: a Rum Cask is a barrel).
 */
export const RIVAL_DISGUISES = [
  { icon: "📦", name: "crate", forms: ["lesser_crate"] },
  { icon: "🧰", name: "chest", forms: ["minor_jewelry_box", "lesser_chest", "giant_chest"] },
  { icon: "🛢️", name: "barrel", forms: ["lesser_barrel", "giant_barrel"] },
  { icon: "🪑", name: "chair", forms: ["lesser_chair", "standard_grand_chair", "greater_throne", "giant_throne"] },
  { icon: "📕", name: "book", forms: ["minor_book", "giant_book"] },
  { icon: "🧱", name: "brick", forms: ["minor_brick", "greater_wall"] },
] as const satisfies readonly { icon: string; name: string; forms: readonly FormId[] }[];
export type RivalDisguise = (typeof RIVAL_DISGUISES)[number];

/** The disguise matching a mimic form (a crate, chest or barrel, or a variant of one), if any. */
export function disguiseOf(form: Pick<Form, "id" | "variantOf"> | null | undefined): RivalDisguise | null {
  if (!form) return null;
  const is = (id: string | undefined) => !!id && RIVAL_DISGUISES.find(d => (d.forms as readonly string[]).includes(id));
  return is(form.id) || is(form.variantOf) || null;
}

export interface RivalMimic {
  id: string;
  kind: RivalKind;
  room: RoomName;
  revealed: boolean;
  consumed: boolean;
  /** It has eaten someone, so the player knows it's out there. */
  clueGiven: boolean;
  /** Chosen when it's placed, and kept all hunt (even after it slips away and hides again). */
  disguise: RivalDisguise;
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
  const rooms = shuffle(location.rooms.filter(r => r !== startRoom), random);
  return kinds.slice(0, rooms.length).map((kind, i) => ({
    id: `rival_${i}`, kind, room: rooms[i], revealed: false, consumed: false, clueGiven: false,
    disguise: RIVAL_DISGUISES[Math.floor(random() * RIVAL_DISGUISES.length)],
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

/** The uneaten rival in a room, hidden or found, if any. */
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
  if (left <= 2) return `🌊 The deck is awash. ${plural(left, "One more turn", "Two more turns")} before she goes under!`;
  return null;
}
