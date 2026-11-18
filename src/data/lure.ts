// ============================================================
// MANSIONS & MIMICS — Lure and stealth
// Luring adventurers into the mimic's room, and the stealth checks anyone who walks in has to
// get past. Pure: each returns what happened, and Game writes the log and applies it. Both take
// an optional random source so tests can pin the dice. Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import type { Form } from "./mimicData";
import type { PartyMember } from "./adventurerData";
import type { HuntLocation, RoomContextMod, RoomName } from "./locationData";
import {
  FORM_ROOM_TYPE, ROOM_FORM_IDS, allureCheck, effectiveFormTier, formFamily, formTier, getRoomContextMod,
  getRoomDistance, quirkLine, stealthCheck, type AllureResult, type CheckResult,
} from "./gameData";

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
