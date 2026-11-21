import { createContext, useContext } from "react";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import {
  activeAdventurers, effectiveStats, getActiveForm, lureRange, skyward,
  type EffectiveStats, type Form, type Hunt, type HuntLocation, type PartyMember, type RivalMimic, type RoomName,
  type Sickness, type SmallCreature,
} from "@/data/gameData";

/**
 * Everything about the current hunt that the game screen's pieces read: who you are, where you
 * are, who else is there, and the state of the location's twist. Game provides it (fresh every
 * render); components read it with useHunt() rather than taking it all as props. Actions stay
 * props, so what a component can *do* is still spelled out where it's used.
 */
export interface HuntState {
  character: MimicCharacter;
  activeForm: Form | null;
  /** Stats after mass, sickness and form-tier penalties. */
  stats: EffectiveStats;
  sickness: Sickness | null;
  suspicion: number;
  /** Rooms a Lure reaches. */
  lureRange: number;

  /** Null while choosing where to hunt. */
  location: HuntLocation | null;
  /** Null until you've picked a room. */
  mimicRoom: RoomName | null;
  party: readonly PartyMember[];
  /** Party members still in the hunt (not eaten, fled, vanished, frozen or converted). */
  activeAdventurers: readonly PartyMember[];
  creatures: readonly SmallCreature[];
  rivals: readonly RivalMimic[];
  isBountyHunt: boolean;
  huntOver: boolean;
  /** Actions since the last Strike (the party leaves at ACTION_LIMIT). */
  actionCount: number;
  /** Mid-turn: actions are locked until it resolves. */
  acting: boolean;

  /** Full turns taken this hunt; the location's twist (sinking, stars, fireworks, cold) runs off it. */
  huntTurn: number;
  /** Fireworks: the room the last volley went up over (for the turn after). */
  fireworksRoom: RoomName | null;
  /** Starfall: where a fallen star fragment is lying, if anywhere. */
  starFragment: RoomName | null;
  /** The Tear in Time: the turn the volcano erupts, while it hasn't yet (null if it won't, or has). */
  eruptionTurn: number | null;
  /** The Long After: rooms the dig hasn't opened yet. */
  sealedRooms: readonly RoomName[];
  /** The Hollow Court: how many of the siege's waves have come. */
  wavesArrived: number;
  /** Everyone in your room is watching fireworks right now. */
  skyward: boolean;
}

/**
 * What the screen reads, from the character and the hunt (null before one starts).
 * `location` is the one being set up before the hunt begins (after that, the hunt's own).
 */
export function huntState(
  character: MimicCharacter, hunt: Hunt | null,
  { location = null, huntOver = false, acting = false }: { location?: HuntLocation | null; huntOver?: boolean; acting?: boolean } = {},
): HuntState {
  const activeForm = getActiveForm(character);
  const sickness = hunt?.sickness ?? null;
  return {
    character, activeForm, stats: effectiveStats(character, sickness, activeForm), sickness,
    suspicion: hunt?.suspicion ?? 0, lureRange: lureRange(character),
    location: hunt?.location ?? location, mimicRoom: hunt?.mimicRoom ?? null, party: hunt?.party ?? [],
    activeAdventurers: hunt ? activeAdventurers(hunt) : [], creatures: hunt?.creatures ?? [], rivals: hunt?.rivals ?? [],
    isBountyHunt: hunt?.bounty ?? false, huntOver, actionCount: hunt?.actionCount ?? 0, acting,
    huntTurn: hunt?.turn ?? 0, fireworksRoom: hunt?.fireworksRoom ?? null, starFragment: hunt?.starFragment ?? null, eruptionTurn: hunt?.eruptionTurn ?? null, sealedRooms: hunt?.sealedRooms ?? [], wavesArrived: hunt?.wavesArrived ?? 0,
    skyward: !!hunt && skyward(hunt),
  };
}

export const HuntContext = createContext<HuntState | null>(null);

/** The current hunt (inside the game screen). */
export function useHunt(): HuntState {
  const hunt = useContext(HuntContext);
  if (!hunt) throw new Error("useHunt() must be used inside the game screen (HuntContext.Provider)");
  return hunt;
}
