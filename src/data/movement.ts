// ============================================================
// MANSIONS & MIMICS — Movement
// Where everyone goes each turn the mimic Waits: the party (wandering, heading for a fallen
// star, walking the door-to-door loop, or walking into a rival), and the small
// creatures (with Honeyamber drawing them toward the mimic). Pure: each returns where they
// ended up, and the turn logs and applies it. Re-exported from ./gameData.
// ============================================================
import { stillInHunt, type PartyMember } from "./adventurerData";
import { getAdjacentRooms, getRoomDistance } from "./core";
import { answersDoor, claimStar, nextHouse, rivalInRoom, type RivalMimic } from "./events";
import type { HuntLocation, LocationCreature, RoomName } from "./locationData";
import type { Form } from "./mimicData";
import { the } from "./text";

// ---------- the party ----------
// Where everyone goes when the mimic Waits. Each adventurer still in the hunt usually wanders
// to a neighboring room (half the time they stay put), unless the location says otherwise: a
// fallen star draws everyone toward it, and a door-to-door procession walks the loop. Walking
// into a rival mimic's room is the end of them, whether it's hidden or has been found (a found
// rival is still hungry: see DECISIONS.md).

/** Adventurers with this behavior never wander on their own. */
export function isStationary(adventurer: Pick<PartyMember, "behavior">): boolean {
  return adventurer.behavior === "stoneWatch";
}

/** The adjacent room that brings `fromRoom` closest to `targetRoom` (or fromRoom if already there). */
export function stepToward(location: HuntLocation, fromRoom: RoomName, targetRoom: RoomName): RoomName {
  if (fromRoom === targetRoom) return fromRoom;
  const options = getAdjacentRooms(location, fromRoom);
  if (options.length === 0) return fromRoom;
  return options.reduce((best, room) =>
    getRoomDistance(location, room, targetRoom) < getRoomDistance(location, best, targetRoom) ? room : best
  );
}

/** Chance an adventurer stays where it is on a Wait (when nothing is drawing it anywhere). */
export const STAY_CHANCE = 0.5;

/** What happened to one adventurer this turn: a step from one room to another, or into a rival. */
export interface PartyStep {
  member: PartyMember;
  from: RoomName;
  to: RoomName;
  /** Walked into a rival mimic's room and vanished (that rival's id). */
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
  if (!stillInHunt(adv) || isStationary(adv)) return null;
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

/** The log line when someone walks into a rival's room out of sight, and doesn't come out. */
export const VANISHING_LINES: readonly ((name: string, room: RoomName) => string)[] = [
  (n, r) => `${n} heads toward the ${r}... and does not emerge.`,
  (n, r) => `A muffled sound comes from the ${r}. ${n} never reappears.`,
  (n, r) => `${n} rounds the corner into the ${r}. Silence follows.`,
  (n, r) => `You hear ${n}'s footsteps enter the ${r} — then stop abruptly.`,
  (n, r) => `Something in the ${r} has ${n}'s attention. They do not return.`,
];

/** The log line when a rival in the mimic's own room gets to an adventurer first (walking or lured in). */
export const rivalAteFirst = (rivalName: string, name: string): string =>
  `${the(rivalName, true)} snatched up ${the(name)} before you could get to them.`;

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

// ---------- small creatures ----------
// Each turn a creature may wander to an adjacent room. Honeyamber (a magic material) makes
// them wander more often, and half of those moves step toward the mimic's room.

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
