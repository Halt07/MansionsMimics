// ============================================================
// MANSIONS & MIMICS — Behavior reactions
// How adventurers with a behavior react to what the mimic does: keen hearing, shape sense, the
// stone watcher, and the scent of a meal. (The behaviors themselves are listed in
// ./adventurerData; Elusive is handled by ./strike, Devotion by ./events.) Pure: returns the
// changes for the turn to apply. Re-exported from ./gameData.
// ============================================================
import { BEHAVIORS, stillInHunt, type BehaviorId, type BehaviorInfo, type PartyMember } from "./adventurerData";
import { getRoomDistance, hasMagic, type AppearanceLike } from "./core";
import type { HuntLocation, RoomName } from "./locationData";
import { stepToward } from "./movement";
import type { GameEventType } from "./vocabulary";

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

/** Hidden behaviors are never revealed to the player (e.g. in the Codex). */
export function isHiddenBehavior(id: BehaviorId): boolean {
  const info: BehaviorInfo = BEHAVIORS[id];
  return !!info.hidden;
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
    if (!adv.behavior || !stillInHunt(adv) || excludeIds.includes(adv.id)) return;

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
