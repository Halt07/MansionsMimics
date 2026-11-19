// ============================================================
// MANSIONS & MIMICS — The hunt
// A hunt in progress is one value (Hunt). Every action takes it, with the character, to the
// next one: a Turn collects what happens (the hunt, the character's changes, the log lines),
// and finish() checks what has to be checked after every action. The actions are in ./turns.
// Pure apart from the random source and the clock, which tests can pin (TurnOptions).
// Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import type { PartyMember } from "./adventurerData";
import type { HuntLocation, RoomName } from "./locationData";
import type { Sickness } from "./mimicData";
import type { GameEventType } from "./vocabulary";
import type { HuntEnding } from "./huntReportData";
import { the } from "./text";
import {
  BURN_HUNTS, CAT_KNOWS_LINE, CULT_CONVERSIONS, DOUBTING_SCHOLAR, SCHOLAR_NOTES_LINE, STILLNESS_LINE, STILLNESS_TURNS,
  DUPLICATE_ROOM_SUSPICION, TIER_CONFIG,
  burnAfterDiscovery, chillParty, distractedRooms, effectiveStats, findDevotee, fireworksDue, fireworksRummage,
  getActiveForm, getBehaviorReactions, isCat, isNestCleared, resolveStealth, rollOfferings, sinkingWarning,
  starfallDue, tossRoom, uneatenFrozen, withBiggestMeal,
  type BehaviorContext, type BehaviorTrigger, type RivalMimic, type SmallCreature,
} from "./gameData";

/** A hunt with this many actions and no meal ends: the party gets bored and leaves. */
export const ACTION_LIMIT = 50;
/** The banner starts warning this many actions before the limit. */
export const ACTION_WARNING = 20;

/** Suspicion tops out here, and reaching it ends the hunt: you've been found out. */
export const MAX_SUSPICION = 10;

export interface Hunt {
  location: HuntLocation;
  mimicRoom: RoomName;
  party: PartyMember[];
  creatures: SmallCreature[];
  /** Rival mimics hiding here: none, a lone rival, or a whole nest. */
  rivals: RivalMimic[];
  suspicion: number;
  bounty: boolean;
  /** Afflicting the mimic for this hunt only. */
  sickness: Sickness | null;
  /** Actions since the last Strike or meal (the party leaves at ACTION_LIMIT). A star fragment isn't a meal here: see DECISIONS.md. */
  actionCount: number;
  /** Full turns taken (Relocate, Lure, Strike or Wait); the location's twist runs off it. */
  turn: number;
  /** Stargazers' Hill: where a fallen star fragment is lying, if anywhere. */
  starFragment: RoomName | null;
  /** The Founders' Fair: the room the last volley went up over (for the turn after it). */
  fireworksRoom: RoomName | null;
  /** Set once the hunt ends early: found out, or the party got bored and left. A cleared hunt (see huntCleared) leaves it null. */
  ending: Exclude<HuntEnding, "cleared"> | null;

  /** Waits and Lures in a row with nobody coming in (the spiderweb). */
  stillTurns: number;
  /** Cats that have already stared at the mimic (once per cat per hunt). */
  catsThatKnow: string[];
  /** For the end-of-hunt report: the highest suspicion reached, and the biggest meal. */
  peakSuspicion: number;
  biggestMeal: { name: string; ap: number } | null;
  /** So the end-of-hunt report reads the same every time it's shown. */
  seed: number;
  /** Counted in the lifetime stats yet (each hunt once, as survived or failed). */
  recorded: boolean;
}

export interface LogLine {
  type: GameEventType;
  message: string;
}

export interface TurnResult {
  hunt: Hunt;
  character: MimicCharacter;
  /** What changed on the character this turn, to save. */
  changes: Partial<MimicCharacter>;
  log: LogLine[];
  /** There's enough AP to evolve: open the upgrade screen. */
  evolve: boolean;
  /** The mimic changed size and lost forms that no longer fit: choose replacements. */
  chooseForms: boolean;
}

export interface TurnOptions {
  random?: () => number;
  /** When it happens (for lastFedAt). */
  now?: Date;
}

/** Still in the hunt: not eaten, fled, vanished, frozen or converted. */
export const stillInHunt = (a: PartyMember): boolean => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared;

export const activeAdventurers = (hunt: Pick<Hunt, "party">): PartyMember[] => hunt.party.filter(stillInHunt);

/**
 * The hunt is won: a nest hunt when its Elder is devoured (not when the adventurers run out),
 * any other when nobody is left (and nobody frozen is still waiting to be eaten).
 */
export function huntCleared(hunt: Pick<Hunt, "location" | "party" | "rivals">): boolean {
  if (hunt.party.length === 0) return false;
  return hunt.location.rivalNest
    ? isNestCleared(hunt.rivals)
    : activeAdventurers(hunt).length === 0 && uneatenFrozen(hunt.party).length === 0;
}

/** The Founders' Fair: everyone in the mimic's room is watching the fireworks right now. */
export function skyward(hunt: Pick<Hunt, "location" | "fireworksRoom" | "mimicRoom">): boolean {
  return !!hunt.location.fireworks && !!hunt.fireworksRoom && distractedRooms(hunt.location, hunt.fireworksRoom).includes(hunt.mimicRoom);
}

/**
 * One action in the making. Start one from the hunt and the character, change them through its
 * methods, and finish() it. Everything it does is in the result: nothing is changed in place.
 */
export class Turn {
  hunt: Hunt;
  /** The hunt as it stood before this action. */
  readonly before: Hunt;
  character: MimicCharacter;
  readonly log: LogLine[] = [];
  changes: Partial<MimicCharacter> = {};
  readyToEvolve = false;
  chooseForms = false;
  readonly random: () => number;
  readonly now: Date;

  constructor(hunt: Hunt, character: MimicCharacter, { random = Math.random, now = new Date() }: TurnOptions = {}) {
    this.hunt = hunt;
    this.before = hunt;
    this.character = character;
    this.random = random;
    this.now = now;
  }

  say(type: GameEventType, message: string) {
    this.log.push({ type, message });
  }

  // Shorthand for the common kinds of log line (say() for the rest, or when the kind depends on the outcome)
  alert(message: string) { this.say("alert", message); }
  info(message: string) { this.say("info", message); }
  evolve(message: string) { this.say("evolve", message); }
  consume(message: string) { this.say("consume", message); }
  escape(message: string) { this.say("escape", message); }
  system(message: string) { this.say("system", message); }

  set(patch: Partial<Hunt>) {
    this.hunt = { ...this.hunt, ...patch };
  }

  /**
   * The mimic moves (or is moved) to another room. Whoever it had lured was drawn to where it
   * was, so they aren't lured any more: a Strike only reaches someone lured to where it is.
   */
  moveTo(room: RoomName) {
    this.set({ mimicRoom: room, party: this.hunt.party.map(a => a.isAttracted ? { ...a, isAttracted: false } : a) });
  }

  /** Change the character (and save the change). */
  update(changes: Partial<MimicCharacter>) {
    this.character = { ...this.character, ...changes };
    this.changes = { ...this.changes, ...changes };
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.random() * list.length)];
  }

  /**
   * The hunt has ended (found out, or the party left): nothing more happens this turn. Raising
   * suspicion, stealth checks, reactions and the end of the turn all stop here.
   */
  get over(): boolean {
    return !!this.hunt.ending;
  }

  get form() {
    return getActiveForm(this.character);
  }

  /** Stats after mass, sickness and form-tier penalties (see effectiveStats). */
  get stats() {
    return effectiveStats(this.character, this.hunt.sickness, this.form);
  }

  get active() {
    return activeAdventurers(this.hunt);
  }

  patchMember(id: string, patch: (a: PartyMember) => Partial<PartyMember>) {
    this.set({ party: this.hunt.party.map(a => a.id === id ? { ...a, ...patch(a) } : a) });
  }

  patchRival(id: string, patch: Partial<RivalMimic>) {
    this.set({ rivals: this.hunt.rivals.map(r => r.id === id ? { ...r, ...patch } : r) });
  }

  /** Raise suspicion (up to MAX_SUSPICION). Reaching it ends the hunt: you've been found out. */
  raise(amount: number) {
    if (amount <= 0 || this.over) return;
    const suspicion = Math.min(this.hunt.suspicion + amount, MAX_SUSPICION);
    this.set({ suspicion });
    if (suspicion >= MAX_SUSPICION && !this.hunt.ending) this.discovered();
  }

  private discovered() {
    this.alert("🔥 The party has found you out! Torches are lit. You flee into the dark.");
    this.record("failed");
    // The survivors spread word of this place and of the shape you wore (see burnAfterDiscovery)
    const { location } = this.hunt;
    const form = this.form;
    this.update(burnAfterDiscovery(this.character, location.id, form?.id ?? null));
    this.alert(`${the(location.name, true)} is burned${form ? `, and the survivors will describe your ${form.name} shape to anyone who listens` : ""}. For the next ${BURN_HUNTS} hunts, returning here${form ? " or wearing that form" : ""} means starting under suspicion.`);
    this.set({ ending: "discovered" });
  }

  /** Count the hunt in the lifetime stats (once, however it ends). */
  record(outcome: "survived" | "failed") {
    if (this.hunt.recorded) return;
    this.set({ recorded: true });
    const c = this.character;
    this.update(outcome === "survived"
      ? { huntsSurvived: c.huntsSurvived + 1, closestCall: Math.max(c.closestCall, this.hunt.peakSuspicion, this.hunt.suspicion) }
      : { huntsFailed: c.huntsFailed + 1 });
  }

  /**
   * A meal: adds `ap` and any other changes to the character, notes that it just fed, and opens
   * the upgrade screen once there's enough AP to evolve.
   */
  feed(ap: number, changes: Partial<MimicCharacter> = {}) {
    this.update({ ...changes, assimilationPoints: (this.character.assimilationPoints || 0) + ap, lastFedAt: this.now.toISOString() });
    if (!this.readyToEvolve && this.character.assimilationPoints >= TIER_CONFIG[this.character.tier].apToEvolve) {
      this.evolve(`Your assimilation has reached the threshold! You may evolve!`);
      this.readyToEvolve = true;
    }
  }

  /** For the end-of-hunt report. */
  noteMeal(name: string, ap: number) {
    this.set({ biggestMeal: withBiggestMeal(this.hunt.biggestMeal, name, ap) });
  }

  /** Any action but a Wait or Lure (or someone coming in) starts the spiderweb's count over. */
  stir() {
    this.set({ stillTurns: 0 });
  }

  /**
   * Counts a Wait or Lure toward the spiderweb: STILLNESS_TURNS of them in a row with nobody
   * entering your room.
   */
  holdStill(someoneArrived: boolean) {
    const stillTurns = someoneArrived ? 0 : this.hunt.stillTurns + 1;
    this.set({ stillTurns });
    if (stillTurns === STILLNESS_TURNS) this.info(STILLNESS_LINE);
  }

  /** One more action without a meal; at ACTION_LIMIT the party gets bored and leaves. */
  countAction() {
    const actionCount = this.hunt.actionCount + 1;
    this.set({ actionCount });
    // Snowed in, the party can't wander off: the cold is the only clock
    if (actionCount >= ACTION_LIMIT && !this.hunt.location.snowbound && !this.hunt.ending) {
      this.info(`After ${ACTION_LIMIT} uneventful turns, the adventurers grow bored and depart. Nothing interesting here.`);
      this.system(`The party leaves ${the(this.hunt.location.name)} of their own accord. Find new prey.`);
      this.set({ ending: "abandoned" });
      this.record("survived");
    }
  }

  /**
   * Stealth checks for adventurers who just came into the mimic's room (see resolveStealth):
   * writes them up, and raises the suspicion.
   */
  stealth(arrivals: readonly PartyMember[]) {
    const form = this.form;
    if (!form || arrivals.length === 0 || this.over) return;
    const { plausibility, patience } = this.stats;
    const { location, mimicRoom } = this.hunt;
    const stealth = resolveStealth(arrivals, { location, mimicRoom, form, mimic: this.character, plausibility, patience }, this.random);
    const { roomMod } = stealth;
    if (roomMod.plausibility !== 0) {
      this.say(roomMod.plausibility > 0 ? "stealth" : "alert",
        `Room context: ${roomMod.note} (Plausibility ${roomMod.plausibility > 0 ? "+" : ""}${roomMod.plausibility})`);
    }
    for (const { member, quirk, result } of stealth.checks) {
      if (quirk) this.info(quirk);
      result.detectedFlaws.forEach(f => this.say("flaw", `${member.name} notices: "${f}"`));
      this.say(result.success ? "stealth" : "alert", result.narrative);
    }
    if (stealth.duplicateRoom) {
      this.alert(`There is already a ${stealth.duplicateRoom} in this location — a second one raises immediate suspicion! (+${DUPLICATE_ROOM_SUSPICION})`);
    }
    this.raise(stealth.suspicion);
  }

  /** Adventurers with special behaviors (see BEHAVIORS) react to what the mimic just did. */
  react(trigger: BehaviorTrigger, ctx: Pick<BehaviorContext, "fromRoom" | "excludeIds"> = {}) {
    if (this.over) return;
    const { party, location, mimicRoom } = this.hunt;
    const reactions = getBehaviorReactions(trigger, { party, location, mimicRoom, appearance: this.character.currentAppearance, ...ctx });
    reactions.events.forEach(e => this.say(e.type, e.text));
    if (Object.keys(reactions.patches).length > 0) {
      this.set({
        party: this.hunt.party.map(a => {
          const patch = reactions.patches[a.id];
          if (!patch || !a.isAlive || a.isConsumed) return a;
          const { suspicionDelta = 0, ...rest } = patch;
          return { ...a, ...rest, suspicion: a.suspicion + suspicionDelta };
        }),
      });
    }
    this.raise(reactions.suspicion);
    this.stealth(reactions.arrivals);
  }

  /**
   * The end of a full turn (Relocate, Lure, Strike or Wait): the hunt clock ticks, the
   * location's twist, if it has one, takes its turn, and then the cold (once everyone has moved).
   */
  endTurn() {
    if (this.over) return;
    const turn = this.hunt.turn + 1;
    this.set({ turn });
    const { location } = this.hunt;
    // Each twist can end the hunt (the fireworks crew finding you out): the rest then don't happen
    if (location.fireworks) this.fireworks();
    if (location.starfall && !this.over) this.starfall();
    if (location.sinkingTurns && !this.over) this.sinking(location.sinkingTurns);
    if (location.snowbound && !this.over) this.frost();
  }

  // The Founders' Fair: a volley over a random room every few turns, distracting it and the rooms
  // next to it for a turn. The crew comes looking for rockets: a crate-shaped mimic gets thrown out.
  private fireworks() {
    const { location, turn, mimicRoom } = this.hunt;
    if (!fireworksDue(location, turn)) {
      this.set({ fireworksRoom: null });
      return;
    }
    const room = this.pick(location.rooms);
    this.set({ fireworksRoom: room });
    this.alert(`🎆 A volley of fireworks bursts over the ${room}! Everyone there and next door is staring at the sky.`);
    const rummage = room === mimicRoom ? fireworksRummage(location, this.form) : null;
    if (rummage === null) return;
    const occupied = [
      ...this.active.map(a => a.location),
      ...this.hunt.rivals.filter(r => !r.consumed).map(r => r.room),
    ];
    const to = tossRoom(location, mimicRoom, occupied, this.random);
    this.alert(`The fireworks crew pries your lid open, looking for more rockets. "Empty! Who left this here?" They heave you out into the ${to}. (+${rummage} suspicion)`);
    this.moveTo(to);
    this.stir();
    this.raise(rummage);
  }

  // Stargazers' Hill: every few turns a star fragment lands somewhere, unless one was lying about
  // when the turn began (so a star claimed this turn means the sky waits for the next one)
  private starfall() {
    const { location, turn, mimicRoom } = this.hunt;
    if (!location.starfall || !starfallDue(location, turn) || this.before.starFragment) return;
    const room = this.pick(location.rooms);
    this.set({ starFragment: room });
    const landing = location.starfall.landings[room] ?? `comes down in the ${room}`;
    this.alert(room === mimicRoom
      ? `🌠 The sky splits open, and a fragment of star ${landing}, right beside you. Every head on the hill turns your way.`
      : `🌠 The sky splits open, and a fragment of star ${landing}! Every head turns.`);
  }

  // The Sinking Ship: each turn brings it closer to going under. When it sinks, anyone still
  // aboard takes to the lifeboats (counted as fled) and the hunt ends.
  private sinking(total: number) {
    const { turn } = this.hunt;
    if (turn > total) return;
    const warning = sinkingWarning(total, turn);
    if (warning) this.alert(warning);
    if (turn < total) return;
    this.set({ party: this.hunt.party.map(a => stillInHunt(a) ? { ...a, isAlive: false, isAttracted: false, fled: true } : a) });
    this.alert(`🌊 The ship rolls over and slides beneath the waves. Whoever is left scrambles for the lifeboats.`);
    this.system(`You let the current carry you ashore, heavier than you came. The hunt is over.`);
  }

  // The Snowbound Lodge: after each turn, the cold takes its toll (see chillParty)
  private frost() {
    const { party, frozen, numb } = chillParty(this.hunt.party, this.hunt.location);
    this.set({ party });
    numb.forEach(a => this.info(`❄️ ${a.name}'s teeth are chattering. They won't last much longer in this cold.`));
    frozen.forEach(a => this.alert(`🧊 ${a.name} stops moving. Frozen solid, in the ${a.location}.`));
    if (frozen.length > 0 && this.active.length === 0) {
      this.system(`The lodge falls silent. Nothing moves but you, and whatever the ice has left for you.`);
    }
  }

  /** Done: what's checked after every action, then the result. */
  finish(): TurnResult {
    const { hunt } = this;
    this.set({ peakSuspicion: Math.max(hunt.peakSuspicion, hunt.suspicion) });
    // The cat knows: once per cat per hunt, whenever one is in the mimic's room
    if (!hunt.ending) {
      const staring = hunt.creatures.filter(c =>
        !c.isConsumed && c.location === hunt.mimicRoom && isCat(c) && !hunt.catsThatKnow.includes(c.uid));
      if (staring.length > 0) {
        staring.forEach(() => this.info(CAT_KNOWS_LINE));
        this.set({ catsThatKnow: [...hunt.catsThatKnow, ...staring.map(c => c.uid)] });
      }
    }
    if (huntCleared(this.hunt)) this.record("survived");
    return { hunt: this.hunt, character: this.character, changes: this.changes, log: this.log, evolve: this.readyToEvolve, chooseForms: this.chooseForms };
  }
}

// ---------- Devotion (The Hollow Reliquary) ----------

export interface DevotionStep {
  log: LogLine[];
  /** AP from an offering accepted in this step. */
  ap: number;
}

export interface Devotion {
  /** The hunt and character the moment the pilgrim kneels: converted, and counted. */
  start: TurnResult;
  /** The ceremony, one step at a time. */
  steps: DevotionStep[];
  /** Saved when the ceremony ends: the offerings' AP. */
  changes: Partial<MimicCharacter>;
  /** The offerings bring enough AP to evolve. */
  evolve: boolean;
}

/**
 * Once a devoted pilgrim is the last one left, it recognises the mimic as the shrine's lost god,
 * brings offerings and leaves, ending the hunt. Null if nobody is ready to convert. Check after
 * every action that leaves the hunt going (and when coming back to it from the upgrade screen).
 */
export function devotion(hunt: Hunt, character: MimicCharacter, opts: TurnOptions = {}): Devotion | null {
  if (hunt.ending) return null;
  const devotee = findDevotee(hunt.party);
  if (!devotee) return null;
  const t = new Turn(hunt, character, opts);
  const offerings = rollOfferings(hunt.location, t.random);
  const apGained = offerings.reduce((sum, c) => sum + c.ap, 0);
  const zealot = devotee.convertedName ?? devotee.name;
  t.patchMember(devotee.id, () => ({ name: zealot, isAlive: false, isAttracted: false, isConverted: true }));
  // Counted straight away, so leaving mid-ceremony can't lose it
  const conversions = character.conversions + 1;
  t.update({ conversions });
  const start = t.finish();

  const line = (type: GameEventType, message: string): DevotionStep => ({ log: [{ type, message }], ap: 0 });
  const total = character.assimilationPoints + apGained;
  const evolve = total >= TIER_CONFIG[character.tier].apToEvolve;
  const steps: DevotionStep[] = [
    line("evolve", `${devotee.name} stares at the empty places where their companions stood… then falls to their knees before you. "It is real. It has come back."`),
    ...(zealot !== devotee.name ? [line("evolve", `${devotee.name} is now ${the(zealot)}.`)] : []),
    line("info", `${the(zealot, true)} hurries out, and returns with offerings, laying them before you one by one.`),
    ...offerings.map(c => ({ log: [{ type: "consume" as const, message: `You accept the ${c.name}. +${c.ap} AP.` }], ap: c.ap })),
    line("system", `🕯 ${the(zealot, true)} backs out of the shrine, never once turning away from you. The hunt is over. (+${apGained} AP in offerings)`),
    // Easter egg: the skeptic's treatise gets an ending
    ...(hunt.party.some(a => a.name === DOUBTING_SCHOLAR) ? [line("info", SCHOLAR_NOTES_LINE)] : []),
    {
      log: [
        ...(conversions === CULT_CONVERSIONS
          ? [{ type: "evolve" as const, message: `🕯️ Cult of Personality! ${CULT_CONVERSIONS} souls now worship you. The faithful are growing in number.` }]
          : []),
        ...(evolve ? [{ type: "evolve" as const, message: `Your assimilation has reached the threshold! You may evolve!` }] : []),
      ],
      ap: 0,
    },
  ];
  return { start, steps, changes: { assimilationPoints: total, lastFedAt: t.now.toISOString() }, evolve };
}
