import { createContext, useContext } from "react";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import type {
  EffectiveStats, Form, HuntLocation, PartyMember, RivalMimic, RoomName, Sickness, SmallCreature,
} from "../gameData";

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

  /** The location's twist: turns so far, and what's lying about (see the location fields). */
  shipTurn: number;
  fairTurn: number;
  fireworksRoom: RoomName | null;
  starTurn: number;
  starFragment: RoomName | null;
  /** Everyone in your room is watching fireworks right now. */
  skyward: boolean;
}

export const HuntContext = createContext<HuntState | null>(null);

/** The current hunt (inside the game screen). */
export function useHunt(): HuntState {
  const hunt = useContext(HuntContext);
  if (!hunt) throw new Error("useHunt() must be used inside the game screen (HuntContext.Provider)");
  return hunt;
}
