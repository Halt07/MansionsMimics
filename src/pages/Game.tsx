import { useState, useEffect, useEffectEvent, useCallback, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { Appearance, FormRef, MimicCharacter, MimicCharacterInput } from "@/api/schemas/mimicCharacter";
import {
  ALL_FORMS, TIER_CONFIG, TIER_ORDER,
  rollDice, maxTargetForChance, consumeSuspicion, stealthCheck, allureCheck, getRoomDistance, getAdjacentRooms, ROOM_FORM_IDS, FORM_ROOM_TYPE, getRoomContextMod,
  shouldTriggerBountyHunt, generateBountyParty, rollForSickness, getBehaviorReactions,
  needsPartialBites, hasMagic,
  TITANIC_FEAST_GIANTS, earnsHatboxToLegend, advanceRareLocation, findDevotee, rollOfferings,
  CULT_CONVERSIONS, CANNIBAL_MIMICS,
  sinkingWarning, pickTreasurePrize, escapeRoom,
  withWarmth, chillParty, frozenMealAp, uneatenFrozen,
  starfallDue, STAR_FRAGMENT,
  fireworksDue, distractedRooms, fireworksRummage, tossRoom, massDecay,
  dressParty, unmask, placeProcession, PRANKS, addRealMonster, isTheRealThing,
  generateParty, spawnSmallCreatures, type SmallCreature,
  moveParty, moveCreatures, VANISHING_LINES,
  strikeDice, strikeCandidates, pickStrikeTarget, strikeWitnesses, resolveRivalStrike, resolveBite, resolveSwallow,
  COLLAPSE_BONUS_AP, type Witnesses,
  STAT_CAP, getActiveForm, effectiveStats, lureRange,
  RIVAL_SAME_SHAPE_CHANCE, RIVAL_SAME_SHAPE_LINE, quirkLine,
  isCat, CAT_KNOWS_LINE, STILLNESS_TURNS, STILLNESS_LINE,
  PORTER_SISTER, PORTER_TOKEN_LINE, DOUBTING_SCHOLAR, SCHOLAR_NOTES_LINE,
  VARIANT_FORMS, isVariantUnlocked, formFamily, formTier, formsStillAllowed, effectiveFormTier, today, dropExpiredSeasonalForms,
  withDiscovered, withFormUsed, withCount, withBiggestMeal, ACHIEVEMENTS,
  BURN_HUNTS, BURN_SUSPICION, burnAfterDiscovery, locationBurn, formBurn, tickBurns,
  placeRivals, rollNestKinds, rivalInRoom, isNestCleared, RIVAL_STATS, type RivalMimic,
  type BehaviorContext, type BehaviorTrigger, type CombatStat,
  type Form, type GameEvent, type GameEventType, type HuntLocation, type PartyMember,
  type RoomName, type Sickness, type Tier,
  ACTION_LIMIT,
} from "@/data/gameData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Home, BookOpen } from "lucide-react";
import EventLogPanel from "../components/game/EventLogPanel";
import CharacterSheet from "../components/game/CharacterSheet";
import AppearanceEditor from "../components/game/AppearanceEditor";
import FormSelector from "../components/game/FormSelector";
import { buildHuntReport } from "@/data/huntReportData";
import { AchievementBanners } from "../components/game/Achievements";
import { HuntContext, type HuntState } from "../components/game/hunt/HuntContext";
import StatusPanel from "../components/game/hunt/StatusPanel";
import LocationBanners from "../components/game/hunt/LocationBanners";
import PartyCard from "../components/game/hunt/PartyCard";
import { LocationSelect, RoomSelect } from "../components/game/hunt/LocationSelect";
import HuntHeader from "../components/game/hunt/HuntHeader";
import ActionBar from "../components/game/hunt/ActionBar";
import { FormSwitcher, MealsHere, RelocatePanel } from "../components/game/hunt/HuntPanels";
import { EvolveScreen, GameOverScreen, HuntOverPanel, type UpgradeChoice } from "../components/game/hunt/EndScreens";

// ── Game-screen state types ──
type Phase = "setup" | "hunt" | "formSelect" | "evolve" | "gameover";
type GameoverReason = "discovered" | "abandoned";

/** How a devoured rival is named in the "biggest meal" stat. */
const RIVAL_MEAL_NAMES: Record<RivalMimic["kind"], string> = { lone: "Rival Mimic", nest: "Nest Mimic", elder: "Elder Mimic" };
/** Delay between lines of a multi-step event sequence (e.g. a Devotion ceremony). */
const CEREMONY_STEP_MS = 2000;
/** Waiting always has at least this chance to lower suspicion, however penalized your Patience. */
const WAIT_MIN_CHANCE = 0.4;

export default function Game() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get("characterId");

  const [character, setCharacter] = useState<MimicCharacter | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [location, setLocation] = useState<HuntLocation | null>(null);
  const [party, setParty] = useState<PartyMember[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [suspicion, setSuspicion] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [gameoverReason, setGameoverReason] = useState<GameoverReason>("discovered");
  // Nothing to load without a character id
  const [loading, setLoading] = useState(!!characterId);
  const [acting, setActing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  // One purchase per visit to the upgrade screen; reset each time the screen opens
  const upgradeChosenRef = useRef(false);
  useEffect(() => {
    if (phase === "evolve") upgradeChosenRef.current = false;
  }, [phase]);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);
  const [smallCreatures, setSmallCreatures] = useState<SmallCreature[]>([]);
  const [mimicRoom, setMimicRoom] = useState<RoomName | null>(null);
  const [roomSelecting, setRoomSelecting] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [isBountyHunt, setIsBountyHunt] = useState(false);
  const [actionCount, setActionCount] = useState(0); // actions since last Strike
  // Rival mimics hiding in the location: none, a lone rival, or a whole nest
  const [rivals, setRivals] = useState<RivalMimic[]>([]);
  // Full turns taken this hunt (Relocate, Lure, Strike or Wait; see endTurn). The location's
  // twist runs off it: when the ship sinks, when stars fall, when fireworks go up, the cold, etc.
  const [huntTurn, setHuntTurn] = useState(0);
  // Starfall: the room a fallen star fragment is lying in, if any
  const [starFragment, setStarFragment] = useState<RoomName | null>(null);
  // Fireworks: the room the last volley went up over (for the turn after it)
  const [fireworksRoom, setFireworksRoom] = useState<RoomName | null>(null);
  const [massDecayNotice, setMassDecayNotice] = useState<string | null>(null); // shown once on load
  const [seasonNotice, setSeasonNotice] = useState<string | null>(null); // a seasonal form was lost
  const [currentSickness, setCurrentSickness] = useState<Sickness | null>(null); // cleared each hunt
  // Where form selection returns to: the hunting-ground screen normally, or straight back
  // into the hunt when a mid-hunt tier-up forced the selection
  const [formSelectReturnPhase, setFormSelectReturnPhase] = useState<Phase>("setup");

  useEffect(() => {
    if (!characterId) return;
    db.entities.MimicCharacter.filter({ id: characterId }).then(res => {
      if (res[0]) {
        const char = res[0];
        // Mass decay: 1 mass per 3 days since last fed. lastFedAt moves forward by the days
        // charged, so reloading doesn't take the same mass again.
        let decayMessage: string | null = null;
        const decay = massDecay(char.mass, char.lastFedAt);
        if (decay) {
          char.mass = decay.mass;
          char.lastFedAt = decay.lastFedAt;
          db.entities.MimicCharacter.update(char.id, { mass: decay.mass, lastFedAt: decay.lastFedAt })
            .catch(err => console.error("Failed to save mass decay:", err));
          decayMessage = `You have been away for ${decay.daysAway} days without feeding. Your mass has diminished by ${decay.massLost} (now ${decay.mass}). Hunger gnaws at your form.`;
        }
        // Seasonal forms whose season has ended slip away
        const dropped = dropExpiredSeasonalForms(char.forms, char.activeFormIndex, today());
        if (dropped) {
          char.forms = dropped.forms;
          char.activeFormIndex = dropped.activeFormIndex;
          db.entities.MimicCharacter.update(char.id, { forms: dropped.forms, activeFormIndex: dropped.activeFormIndex })
            .catch(err => console.error("Failed to save expired seasonal forms:", err));
          setSeasonNotice(dropped.message);
        }
        setCharacter(char);
        // With no forms left, choose new ones first
        setFormSelectReturnPhase("setup");
        setPhase(char.forms.length ? "setup" : "formSelect");
        if (decayMessage) setMassDecayNotice(decayMessage);
      }
    }).catch(err => {
      console.error("Failed to load character:", err);
      setLoadError(err instanceof Error ? err.message : String(err));
    }).finally(() => setLoading(false));
  }, [characterId]);

  // Every event is stamped with the turn it happened in, so the
  // screen effects can react to what the latest turn did. beginTurn() starts a new one.
  const turnRef = useRef(0);
  const beginTurn = () => { turnRef.current += 1; };
  const addEvent = useCallback((type: GameEventType, message: string) => {
    setEvents(prev => [...prev, { turn: turnRef.current, type, message }]);
  }, []);

  // Save changes to the character. The game never waits on this; a failed save is
  // reported in the event log instead of silently disappearing.
  const persist = (updates: Partial<MimicCharacterInput>) => {
    if (!character) return;
    db.entities.MimicCharacter.update(character.id, updates).catch((err: unknown) => {
      console.error("Failed to save character:", err);
      const message = err instanceof Error ? err.message : String(err);
      addEvent("alert", `⚠ Your progress could not be saved: ${message.split("\n")[0]}`);
    });
  };

  /** Raises suspicion (capped at 10). Reaching 10 ends the hunt: you've been found out. */
  const raiseSuspicion = (amount: number) => {
    setSuspicion(s => {
      const next = Math.min(s + amount, 10);
      if (next >= 10) triggerHuntEnd();
      return next;
    });
  };

  /**
   * A meal: adds `ap` and any other changes to the character, saves them (and that it just fed),
   * and opens the upgrade screen once there's enough AP to evolve. Returns the updated character.
   */
  const feed = (base: MimicCharacter, ap: number, changes: Partial<MimicCharacter> = {}): MimicCharacter => {
    const updated = { ...base, ...changes, assimilationPoints: (base.assimilationPoints || 0) + ap };
    setCharacter(updated);
    persist({ ...changes, assimilationPoints: updated.assimilationPoints, lastFedAt: new Date().toISOString() });
    if (updated.assimilationPoints >= TIER_CONFIG[base.tier].apToEvolve) {
      addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
      setPhase("evolve");
    }
    return updated;
  };

  const chooseLocation = (loc: HuntLocation) => {
    // A season can end while the game is open: check again before every hunt
    const dropped = character && dropExpiredSeasonalForms(character.forms, character.activeFormIndex, today());
    if (dropped) {
      setCharacter(prev => prev ? { ...prev, forms: dropped.forms, activeFormIndex: dropped.activeFormIndex } : prev);
      persist({ forms: dropped.forms, activeFormIndex: dropped.activeFormIndex });
      setSeasonNotice(dropped.message);
      if (dropped.forms.length === 0) {
        startFormSelection("setup");
        return;
      }
    }
    setLocation(loc);
    setSuspicion(0);
    setEvents([]);
    setMimicRoom(null);
    setIsBountyHunt(false);
    setRivals([]);
    setHuntTurn(0);
    setStarFragment(null);
    setFireworksRoom(null);
    setActionCount(0);
    setGameoverReason("discovered");
    setCurrentSickness(null);
    setRoomSelecting(true);
  };

  const confirmRoom = (room: RoomName, loc: HuntLocation) => {
    beginTurn();
    // Rare locations tell their own story: no bounty hunters or rival mimics there
    const bounty = !loc.rare && shouldTriggerBountyHunt(character?.mass ?? 0);
    // Rival mimic: ~1 in 7 chance, only on non-bounty hunts, Greater tier+
    const tierIdx = TIER_ORDER.indexOf(character?.tier ?? "Minor");
    const canHaveRival = !bounty && !loc.rare && tierIdx >= TIER_ORDER.indexOf("Greater");
    const hasRival = canHaveRival && Math.random() < (1/7);
    // The Mimic Nest always holds its nest (Elder included); elsewhere maybe a lone rival
    const newRivals = loc.rivalNest
      ? placeRivals(loc, room, rollNestKinds(loc))
      : hasRival ? placeRivals(loc, room, ["lone"]) : [];

    const generated = withWarmth(bounty
      ? generateBountyParty(loc, character?.mass ?? 26)
      : generateParty(loc, character?.tier ?? "Minor", character?.mass ?? 0), loc);
    // Spell or Sweet Street: maybe a real monster among them, everyone in costume, a few walking
    // together and the rest spread out
    const withMonster = bounty ? generated : addRealMonster(generated, loc, character?.tier ?? "Minor", character?.mass ?? 0);
    const dressed = loc.costumes ? dressParty(withMonster) : withMonster;
    const newParty = loc.procession ? placeProcession(dressed, loc, room) : dressed;
    const creatures = spawnSmallCreatures(loc);
    setMimicRoom(room);
    setParty(newParty);
    setSmallCreatures(creatures);
    setIsBountyHunt(bounty);
    setRivals(newRivals);
    setActionCount(0);
    setRoomSelecting(false);
    // Roll for sickness (only when all stats are capped)
    const sickness = character ? rollForSickness(character) : null;
    setCurrentSickness(sickness);

    // Burned locations and forms (from earlier discoveries) start the hunt under suspicion
    const startForm = character ? getActiveForm(character) : null;
    const burnLoc = character ? locationBurn(character, loc.id) > 0 : false;
    const burnForm = character && startForm ? formBurn(character, startForm.id) > 0 : false;
    const burnExtra = (burnLoc ? BURN_SUSPICION : 0) + (burnForm ? BURN_SUSPICION : 0);

    if (bounty) {
      setSuspicion(Math.min(4 + burnExtra, 9)); // Hunters know the mimic is here
      addEvent("alert", `⚠️ A bounty has been placed on the mimic known as "${character?.name}". Hunters from across the realm have come to collect.`);
      addEvent("alert", `${newParty.length} bounty hunters are sweeping the ${loc.name} — they know exactly what they are looking for.`);
      addEvent("alert", `The hunters enter with weapons drawn. Suspicion starts at 4.`);
    } else {
      setSuspicion(Math.min(burnExtra, 9));
      addEvent("info", `You settle into the ${room} of the ${loc.name}, perfectly still.`);
      addEvent("system", `${newParty.length} adventurers are exploring the premises.`);
    }
    if (burnLoc) addEvent("alert", `🔥 Word of your last hunt here has spread. Everyone is on edge. (+${BURN_SUSPICION} suspicion)`);
    if (burnForm && startForm) addEvent("alert", `🔥 The survivors described a ${startForm.name} that moved. People are watching for one. (+${BURN_SUSPICION} suspicion)`);
    if (sickness) {
      addEvent("alert", `⚠ You are afflicted with ${sickness.name}: ${sickness.description} ${Object.entries(sickness.penalties).map(([k, v]) => `–${v} ${k}`).join(", ")} this hunt.`);
    }
    if (loc.rivalNest) {
      addEvent("alert", `The air is thick with hunger. Others of your kind nest here — and one of them is old. Very old.`);
      addEvent("alert", `Find the Elder Mimic and devour it. Watch where the adventurers vanish: something hungry hides there.`);
    } else if (newRivals.length > 0) {
      addEvent("alert", `Something feels wrong. Another predator lurks within these walls — and it is not you.`);
    }
    // Soulglass senses the strongest presence: the Elder if there is one
    const sensed = newRivals.find(r => r.kind === "elder") ?? newRivals[0];
    if (sensed && hasMagic(character?.currentAppearance, "Soulglass")) {
      addEvent("alert", `Your Soulglass hums faintly. ${sensed.kind === "elder" ? "The Elder" : "The intruder"} hides in the ${sensed.room}.`);
    }
    addEvent("info", `Small creatures scurry about: ${creatures.map(c => c.name).join(", ")}.`);
    newParty.forEach(a => addEvent("info", a.costume
      ? `Someone dressed as a ${a.costume} is at the ${a.location}.`
      : `${a.name} (${a.type}) — currently in the ${a.location}.`));

    // Rare locations: visiting closes the open one, hunting elsewhere uses up one of its hunts,
    // and if none was open there's a chance one opens for the next hunts
    if (character) {
      const { state, opened } = advanceRareLocation(character.rareLocation, loc.id, character.tier, character.mass);
      if (opened) {
        addEvent("system", `✦ Whispers reach you of somewhere new: ${opened.name}. It won't stay within reach for long.`);
      }
      // Burns count down one hunt each time a hunt starts
      const burns = tickBurns(character);
      // Codex discovery: everyone in this party has now been met
      const adventurersMet = withDiscovered(character.adventurersMet, newParty);
      const formsUsed = withFormUsed(character.formsUsed, startForm?.id);
      const formHuntCounts = withCount(character.formHuntCounts, startForm?.id);
      const locationHuntCounts = withCount(character.locationHuntCounts, loc.id);
      const startUpdates = { rareLocation: state, ...burns, adventurersMet, formsUsed, formHuntCounts, locationHuntCounts };
      setCharacter(prev => prev ? { ...prev, ...startUpdates } : prev);
      persist(startUpdates);
      huntRecordedRef.current = false;
      stillTurnsRef.current = 0;
      catsThatKnowRef.current = new Set();
      peakSuspicionRef.current = 0;
      huntMealRef.current = null;
      huntSeedRef.current = Math.floor(Math.random() * 2 ** 31);
    }
    setPhase("hunt");
  };

  // For the end-of-hunt report: this hunt's biggest meal, and a seed so the report
  // reads the same every time it renders.
  const huntMealRef = useRef<{ name: string; ap: number } | null>(null);
  const huntSeedRef = useRef(0);
  const noteMeal = (name: string, ap: number) => {
    huntMealRef.current = withBiggestMeal(huntMealRef.current, name, ap);
  };

  // Lifetime stats: each hunt is counted once, as survived or failed, however it ends.
  // (Leaving mid-hunt with "New Hunt" isn't counted either way.)
  const huntRecordedRef = useRef(true);
  // Highest suspicion reached this hunt, for the "closest call" stat
  const peakSuspicionRef = useRef(0);
  useEffect(() => {
    if (phase === "hunt") peakSuspicionRef.current = Math.max(peakSuspicionRef.current, suspicion);
  }, [suspicion, phase]);
  const recordHunt = (outcome: "survived" | "failed") => {
    if (huntRecordedRef.current || !character) return;
    huntRecordedRef.current = true;
    if (outcome === "survived") {
      const updates = {
        huntsSurvived: character.huntsSurvived + 1,
        closestCall: Math.max(character.closestCall, peakSuspicionRef.current),
      };
      setCharacter(prev => prev ? { ...prev, ...updates } : prev);
      persist(updates);
    } else {
      const huntsFailed = character.huntsFailed + 1;
      setCharacter(prev => prev ? { ...prev, huntsFailed } : prev);
      persist({ huntsFailed });
    }
  };

  // Lifetime AP: every increase in current AP counts, whatever caused it (spending AP on
  // upgrades lowers current AP but never this). Starts tracking once a character is loaded.
  const lastApRef = useRef<number | null>(null);
  const trackLifetimeAp = useEffectEvent(() => {
    if (!character) return;
    const prev = lastApRef.current;
    lastApRef.current = character.assimilationPoints;
    if (prev === null || character.assimilationPoints <= prev) return;
    const lifetimeApEarned = character.lifetimeApEarned + (character.assimilationPoints - prev);
    setCharacter(c => c ? { ...c, lifetimeApEarned } : c);
    persist({ lifetimeApEarned });
  });
  useEffect(() => trackLifetimeAp(), [character?.assimilationPoints]);

  /**
   * The end of a full turn (Relocate, Lure, Strike or Wait): the hunt clock ticks, and the
   * location's twist, if it has one, takes its turn. (The cold waits until the turn's moves have
   * landed; see applyFrost.)
   */
  const endTurn = () => {
    if (!location) return;
    const turn = huntTurn + 1;
    setHuntTurn(turn);
    if (location.fireworks) fireworksTurn(location, turn);
    if (location.starfall) starfallTurn(location, turn);
    if (location.sinkingTurns) sinkingTurn(location.sinkingTurns, turn);
  };

  // The Founders' Fair: a volley over a random room every few turns, distracting it and the rooms
  // next to it for a turn. The crew comes looking for rockets: a crate-shaped mimic gets thrown out.
  const fireworksTurn = (loc: HuntLocation, turn: number) => {
    if (!fireworksDue(loc, turn)) {
      setFireworksRoom(null);
      return;
    }
    const room = loc.rooms[Math.floor(Math.random() * loc.rooms.length)];
    setFireworksRoom(room);
    addEvent("alert", `🎆 A volley of fireworks bursts over the ${room}! Everyone there and next door is staring at the sky.`);
    const rummage = room === mimicRoom ? fireworksRummage(loc, getActiveForm(character)) : null;
    if (rummage === null || !mimicRoom) return;
    const occupied = [
      ...activeAdventurers.map(a => a.location),
      ...rivals.filter(r => !r.consumed).map(r => r.room),
    ];
    const to = tossRoom(loc, mimicRoom, occupied);
    addEvent("alert", `The fireworks crew pries your lid open, looking for more rockets. "Empty! Who left this here?" They heave you out into the ${to}. (+${rummage} suspicion)`);
    setMimicRoom(to);
    stillTurnsRef.current = 0;
    setShowMovePanel(false);
    raiseSuspicion(rummage);
  };

  // Stargazers' Hill: every few turns a star fragment lands somewhere (unless one is still lying about)
  const starfallTurn = (loc: HuntLocation, turn: number) => {
    if (!loc.starfall || !starfallDue(loc, turn) || starFragment) return;
    const room = loc.rooms[Math.floor(Math.random() * loc.rooms.length)];
    setStarFragment(room);
    const landing = loc.starfall.landings[room] ?? `comes down in the ${room}`;
    addEvent("alert", room === mimicRoom
      ? `🌠 The sky splits open, and a fragment of star ${landing}, right beside you. Every head on the hill turns your way.`
      : `🌠 The sky splits open, and a fragment of star ${landing}! Every head turns.`);
  };

  // The Sinking Ship: each turn brings it closer to going under. When it sinks, anyone
  // still aboard takes to the lifeboats (counted as fled) and the hunt ends.
  const sinkingTurn = (total: number, turn: number) => {
    if (turn > total) return;
    const warning = sinkingWarning(total, turn);
    if (warning) addEvent("alert", warning);
    if (turn < total) return;
    setParty(prev => prev.map(a => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared
      ? { ...a, isAlive: false, isAttracted: false, fled: true }
      : a));
    addEvent("alert", `🌊 The ship rolls over and slides beneath the waves. Whoever is left scrambles for the lifeboats.`);
    addEvent("system", `You let the current carry you ashore, heavier than you came. The hunt is over.`);
  };

  // Spell or Sweet Street: eating someone shows who was under the costume
  const revealCostume = (member: PartyMember) => {
    if (isTheRealThing(member)) {
      addEvent("evolve", `😱 That wasn't a costume. It was a real ${member.trueName?.toLowerCase() ?? "monster"}!`);
    } else if (member.costume && member.trueName) {
      addEvent("evolve", `🎭 Under the ${member.costume} costume: ${/^The /.test(member.trueName) ? member.trueName.replace(/^The /, "the ") : `a ${member.trueName}`}!`);
    }
  };

  // The Founders' Fair: whether everyone in `room` is watching the fireworks right now
  const watchingSky = (room: RoomName | null): boolean =>
    !!location?.fireworks && !!fireworksRoom && !!room && distractedRooms(location, fireworksRoom).includes(room);

  // The Snowbound Lodge: after each turn, the cold takes its toll (see chillParty)
  const applyFrost = useEffectEvent(() => {
    if (!location?.snowbound || huntTurn === 0) return;
    const { party: chilled, frozen, numb } = chillParty(party, location);
    setParty(chilled);
    numb.forEach(a => addEvent("info", `❄️ ${a.name}'s teeth are chattering. They won't last much longer in this cold.`));
    frozen.forEach(a => addEvent("alert", `🧊 ${a.name} stops moving. Frozen solid, in the ${a.location}.`));
    if (frozen.length > 0 && !chilled.some(a => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared)) {
      addEvent("system", `The lodge falls silent. Nothing moves but you, and whatever the ice has left for you.`);
    }
  });
  // Intentional: every kind of turn moves the party in its own way (wandering, lures, bolting),
  // so the cold is applied once that turn's moves have landed rather than inside each action.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => applyFrost(), [huntTurn]);

  // Called whenever suspicion hits 10 — ends hunt immediately
  const triggerHuntEnd = () => {
    addEvent("alert", "🔥 The party has found you out! Torches are lit. You flee into the dark.");
    recordHunt("failed");
    // The survivors spread word of this place and of the shape you wore (see burnAfterDiscovery)
    if (character && location) {
      const form = getActiveForm(character);
      const burns = burnAfterDiscovery(character, location.id, form?.id ?? null);
      setCharacter(prev => prev ? { ...prev, ...burns } : prev);
      persist(burns);
      addEvent("alert", `The ${location.name} is burned${form ? `, and the survivors will describe your ${form.name} shape to anyone who listens` : ""}. For the next ${BURN_HUNTS} hunts, returning here${form ? " or wearing that form" : ""} means starting under suspicion.`);
    }
    setGameoverReason("discovered");
    setPhase("gameover");
  };

  // Runs stealth checks for a given list of adventurers entering/in the mimic's room.
  // Returns total suspicion gained so caller can apply it.
  const runStealthChecks = (advs: PartyMember[], currentMimicRoom: RoomName | null): number => {
    const form = getActiveForm(character);
    if (!form || !character || !location || !currentMimicRoom || advs.length === 0) return 0;

    const roomMod = getRoomContextMod(form.id, location.id, currentMimicRoom);
    if (roomMod.plausibility !== 0) {
      addEvent(roomMod.plausibility > 0 ? "stealth" : "alert",
        `Room context: ${roomMod.note} (Plausibility ${roomMod.plausibility > 0 ? "+" : ""}${roomMod.plausibility})`);
    }

    let totalSuspicionChange = 0;
    advs.forEach(adv => {
      // Now and then, the newcomer acts out one of its quirks on your form
      const quirk = quirkLine(adv, form.name);
      if (quirk) addEvent("info", quirk);
      const result = stealthCheck(effectivePlausibility, effectivePatience, effectiveFormTier(form, formTier(character)), formTier(character), form, adv, roomMod, character.currentAppearance);
      if (result.detectedFlaws.length > 0) {
        result.detectedFlaws.forEach(f => addEvent("flaw", `${adv.name} notices: "${f}"`));
      }
      addEvent(result.success ? "stealth" : "alert", result.narrative);
      if (!result.success) totalSuspicionChange += result.suspicionChange;
    });

    // Duplicate room-type plausibility check (Grand/Apex room-forms only)
    const form2 = getActiveForm(character);
    // Variants of room-forms (Atheneum, Cathedral) count as their base room type
    if (form2 && ROOM_FORM_IDS.has(formFamily(form2.id))) {
      const formRoomType = FORM_ROOM_TYPE[formFamily(form2.id)];
      if (formRoomType) {
        const otherRooms = location.rooms.filter(r => r !== currentMimicRoom);
        const hasDuplicate = otherRooms.some(r => r.toLowerCase().includes(formRoomType));
        if (hasDuplicate) {
          const duplicateRoom = otherRooms.find(r => r.toLowerCase().includes(formRoomType));
          totalSuspicionChange += 2;
          addEvent("alert", `There is already a ${duplicateRoom} in this location — a second one raises immediate suspicion! (+2)`);
        }
      }
    }

    return totalSuspicionChange;
  };

  // Let adventurers with special behaviors (see BEHAVIORS in gameData) react to an action.
  // ctx may override mimicRoom (e.g. while relocating) and pass fromRoom / excludeIds.
  const applyBehaviorReactions = (
    trigger: BehaviorTrigger,
    ctx: Pick<BehaviorContext, "mimicRoom" | "fromRoom" | "excludeIds"> | Pick<BehaviorContext, "excludeIds"> = {},
  ) => {
    const roomNow = ("mimicRoom" in ctx ? ctx.mimicRoom : undefined) ?? mimicRoom;
    const reactions = getBehaviorReactions(trigger, { party, location, mimicRoom: roomNow, appearance: character?.currentAppearance, ...ctx });
    reactions.events.forEach(e => addEvent(e.type, e.text));
    if (Object.keys(reactions.patches).length > 0) {
      setParty(prev => prev.map(a => {
        const patch = reactions.patches[a.id];
        if (!patch || !a.isAlive || a.isConsumed) return a;
        const { suspicionDelta = 0, ...rest } = patch;
        return { ...a, ...rest, suspicion: a.suspicion + suspicionDelta };
      }));
    }
    let suspDelta = reactions.suspicion;
    if (reactions.arrivals.length > 0) suspDelta += runStealthChecks(reactions.arrivals, roomNow);
    if (suspDelta > 0) {
      raiseSuspicion(suspDelta);
    }
  };

  // Relocate to an adjacent empty room (+1 suspicion cost)
  // Easter eggs: consecutive quiet turns (the spiderweb), and cats that have already stared at you
  const stillTurnsRef = useRef(0);
  const catsThatKnowRef = useRef(new Set<string>());
  /**
   * Counts a Wait or Lure toward the spiderweb: STILLNESS_TURNS of them in a row with nobody
   * entering your room. Someone arriving, or any other action (Relocate, Strike, changing
   * form), starts the count over.
   */
  const countStillTurn = (someoneArrived: boolean) => {
    stillTurnsRef.current = someoneArrived ? 0 : stillTurnsRef.current + 1;
    if (stillTurnsRef.current === STILLNESS_TURNS) addEvent("info", STILLNESS_LINE);
  };

  const doRelocate = (targetRoom: RoomName) => {
    if (!character || !location) return;
    beginTurn();
    stillTurnsRef.current = 0;
    setShowMovePanel(false);
    addEvent("info", `You silently flow toward the ${targetRoom}... (+1 suspicion)`);
    setMimicRoom(targetRoom);

    // Rival mimic reveal: entering a rival's room exposes it
    const found = rivalInRoom(rivals, targetRoom);
    if (found && !found.revealed) {
      if (found.kind === "elder") {
        addEvent("alert", `The whole room seems to lean toward you. Something vast and patient has been waiting in the ${targetRoom} — the Elder Mimic.`);
        addEvent("alert", `It is older and stronger than anything you have faced. Strike to devour it, and the nest is yours.`);
      } else if (found.kind === "nest") {
        addEvent("alert", `A young mimic is nested here in the ${targetRoom}, gorged and sluggish. It is not the Elder, but it will feed you. Strike!`);
      } else {
        addEvent("alert", `You sense it immediately — another mimic has been hunting in your territory! It lurks here in the ${targetRoom}, fat with stolen prey.`);
        addEvent("alert", `This is YOUR hunting ground. Devour the intruder to reclaim it. Use Lure to draw it out, then Strike.`);
      }
      if (Math.random() < RIVAL_SAME_SHAPE_CHANCE) addEvent("info", RIVAL_SAME_SHAPE_LINE);
      setRivals(prev => prev.map(r => r.id === found.id ? { ...r, revealed: true } : r));
    }

    // Increment action count
    const newCount = actionCount + 1;
    setActionCount(newCount);

    // Run stealth against any adventurers already in the target room
    const inTargetRoom = party.filter(a => a.isAlive && !a.isConsumed && !a.fled && a.location === targetRoom);
    const stealthSusp = runStealthChecks(inTargetRoom, targetRoom);
    const totalSusp = 1 + stealthSusp;
    raiseSuspicion(totalSusp);
    applyBehaviorReactions("relocate", { mimicRoom: targetRoom, fromRoom: mimicRoom });
    checkActionLimit(newCount);
    endTurn();
  };

  // Lure range: 1 (same or adjacent room). +1 at baseAllure >= 5
  const getAllureRange = () => lureRange(character);

  const doAllureTurn = () => {
    if (!character || !location || !mimicRoom) return;
    beginTurn();
    const newCount = actionCount + 1;
    setActionCount(newCount);
    setActing(true);
    const form = getActiveForm(character);
    if (!form) { addEvent("alert", "No active form!"); setActing(false); return; }
    const range = getAllureRange();
    const roomMod = getRoomContextMod(form.id, location.id, mimicRoom);

    if (roomMod.allure !== 0) {
      addEvent(roomMod.allure > 0 ? "allure" : "alert",
        `Room context: ${roomMod.note} (Allure ${roomMod.allure > 0 ? "+" : ""}${roomMod.allure})`);
    }

    let anyInRange = false;
    const newlyAttracted: PartyMember[] = [];
    const updatedParty = party.map(adv => {
      if (!adv.isAlive || adv.isConsumed || adv.isAttracted) return adv;
      const dist = getRoomDistance(location, mimicRoom, adv.location);
      if (dist > range) return adv;
      anyInRange = true;
      const result = allureCheck(
        character.baseAllure, effectivePlausibility, form,
        character.currentAppearance || {}, adv, roomMod
      );
      addEvent(result.success ? "allure" : "info", result.narrative);
      if (result.disliked.length > 0) {
        addEvent("info", `${adv.name} is put off by the ${result.disliked.join(", ")}. (−${result.aversion} allure)`);
      }
      if (result.suspicionChange > 0) {
        raiseSuspicion(result.suspicionChange);
        addEvent("alert", `${adv.name} grows suspicious of the excessive allure!`);
      }
      if (result.success) {
        // Move the adventurer into the mimic's room if they were in an adjacent room
        const newLocation = adv.location !== mimicRoom ? mimicRoom : adv.location;
        if (adv.location !== mimicRoom) {
          addEvent("allure", `${adv.name} is drawn into the ${mimicRoom}...`);
          newlyAttracted.push({ ...adv, location: newLocation });
        }
        return { ...adv, isAttracted: true, location: newLocation };
      }
      return adv;
    });

    if (!anyInRange) {
      // If the rival is revealed and in the same room, give flavor instead of generic message
      const rivalHere = rivalInRoom(rivals, mimicRoom);
      if (rivalHere?.revealed) {
        addEvent("alert", `The ${RIVAL_STATS[rivalHere.kind].name} does not respond to your lure — it knows your tricks. You must Strike directly!`);
      } else {
        addEvent("info", `No adventurers are within lure range (${range} rooms). Wait for them to wander closer.`);
      }
    }
    setParty(updatedParty);

    // A Lure that draws nobody into the room still counts as holding still (the spiderweb)
    countStillTurn(newlyAttracted.length > 0);

    // Run stealth check for newly attracted adventurers who just entered the room
    if (newlyAttracted.length > 0) {
      const suspDelta = runStealthChecks(newlyAttracted, mimicRoom);
      if (suspDelta > 0) {
        raiseSuspicion(suspDelta);
      }
    }
    checkActionLimit(newCount);
    endTurn();
    setActing(false);
  };

  // Elusive adventurers never leave the hunting ground: when they get away they bolt to
  // another room instead (unattracted, and more wary).
  const boltAway = (target: PartyMember, extraSuspicion: number, hitsTaken?: number) => {
    if (!location) return;
    const room = escapeRoom(location, target.location, mimicRoom);
    addEvent("escape", `${target.name} bolts for the ${room}!`);
    setParty(prev => prev.map(a => a.id === target.id
      ? { ...a, location: room, isAttracted: false, suspicion: a.suspicion + extraSuspicion, hitsTaken: hitsTaken ?? a.hitsTaken }
      : a));
  };

  // Resolves a Strike (see strike.ts for what happens; this writes it up and applies it).
  // Returns whether it took a turn (false if there was nothing to strike).
  const resolveStrike = (): boolean => {
    if (!character || !location) return false;
    stillTurnsRef.current = 0;
    const dice = strikeDice(effectiveAdhesion, character.currentAppearance);

    // A revealed rival mimic in the room comes first
    const rival = rivalInRoom(rivals, mimicRoom);
    if (rival?.revealed && mimicRoom) {
      setActing(true);
      setActionCount(0); // Strike resets the action counter
      strikeRival(rival, dice, mimicRoom);
      setActing(false);
      return true;
    }

    // Under the fireworks, anyone in your room is staring at the sky: no need to lure them first
    const skyward = watchingSky(mimicRoom);
    const candidates = strikeCandidates(party, mimicRoom, skyward);
    if (candidates.length === 0) {
      addEvent("info", "No adventurers are close enough to strike. Use Allure first.");
      return false;
    }
    const form = getActiveForm(character);
    if (!form) { addEvent("alert", "No active form!"); return false; }
    const target = pickStrikeTarget(candidates, location, mimicRoom, form, character.currentAppearance);
    if (!target) return false;
    setActing(true);
    setActionCount(0); // Strike resets the action counter
    if (!target.isAttracted) addEvent("info", `🎆 ${target.name} is staring up at the fireworks, mouth open, right next to you.`);
    const seen = strikeWitnesses(party, target, mimicRoom, skyward);
    applyBehaviorReactions("strike", { excludeIds: [target.id] });

    // Minor mimics always bite; so does anyone facing a giant too big to swallow yet
    if (needsPartialBites(character, target)) strikeBite(target, form, dice, seen);
    else strikeSwallow(target, form, dice, seen, skyward);
    setActing(false);
    return true;
  };

  /** Strike a revealed rival mimic: devour it, or it slips away and hides again. */
  const strikeRival = (rival: RivalMimic, dice: number, room: RoomName) => {
    if (!character || !location) return;
    const stats = RIVAL_STATS[rival.kind];
    const outcome = resolveRivalStrike(rival, dice, location, rivals, room);
    if (!outcome.devoured) {
      addEvent("escape", `The ${stats.name} slips your grasp — it is clever, as mimics are. It retreats deeper into the ${location.name}.`);
      setRivals(prev => prev.map(r => r.id === rival.id ? { ...r, revealed: false, room: outcome.hidesIn } : r));
      addEvent("alert", `It has hidden itself once more somewhere in the ${location.name}. Track it down.`);
      raiseSuspicion(1);
      return;
    }
    if (rival.kind === "elder") {
      addEvent("consume", `You tear into the Elder Mimic. It fights like a cornered god, then folds into you, century by century. +${outcome.ap} AP.`);
      addEvent("system", `🕸 The nest falls silent. Whatever else hides here will scatter without its Elder. The hunt is over.`);
      // Easter egg: the porter she was searching for
      if (party.some(a => a.name === PORTER_SISTER)) addEvent("info", PORTER_TOKEN_LINE);
    } else {
      addEvent("consume", `You overwhelm the ${stats.name}! It writhes, loses cohesion, and is absorbed into your mass. +${outcome.ap} AP — and its stolen prey.`);
    }
    setRivals(prev => prev.map(r => r.id === rival.id ? { ...r, consumed: true } : r));
    noteMeal(RIVAL_MEAL_NAMES[rival.kind], outcome.ap);
    const mimicsConsumed = character.mimicsConsumed + 1;
    if (mimicsConsumed === CANNIBAL_MIMICS) {
      addEvent("evolve", `🦷 Cannibal! You have devoured ${CANNIBAL_MIMICS} of your own kind.`);
    }
    feed(character, outcome.ap, {
      mimicsConsumed,
      biggestMeal: withBiggestMeal(character.biggestMeal, RIVAL_MEAL_NAMES[rival.kind], outcome.ap),
    });
  };

  /** Update one party member. */
  const patchMember = (id: string, patch: (a: PartyMember) => Partial<PartyMember>) =>
    setParty(prev => prev.map(a => a.id === id ? { ...a, ...patch(a) } : a));

  /** A partial bite: tear a piece off, and maybe wear them down until they collapse (or run). */
  const strikeBite = (target: PartyMember, form: Form, dice: number, seen: Witnesses) => {
    if (!character || !location) return;
    if (target.group === "giantKin" && character.tier !== "Minor") {
      addEvent("info", `${target.name} is far too large to swallow whole — you'll have to take it in bites. (Whole at mass ${target.wholeMealMass}+)`);
    }
    const bite = resolveBite(target, {
      dice, patience: effectivePatience, form, knownMaterials: character.learnedMaterials, snowbound: !!location.snowbound, witnesses: seen,
    });
    if (!bite.latched) {
      addEvent("escape", `${target.name} sidesteps your lunge — your jaws snap shut on nothing!`);
      raiseSuspicion(bite.suspicion);
      patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + bite.targetSuspicion }));
      return;
    }
    addEvent("attack", `You latch onto ${target.name}'s ${bite.part}!`);

    if (!bite.held) {
      addEvent("escape", `${target.name} wrenches free before you can tear anything loose!`);
      raiseSuspicion(bite.suspicion);
      if (bite.ending === "bolts") boltAway(target, bite.targetSuspicion, bite.hits);
      else if (bite.ending === "trapped") {
        addEvent("escape", `Badly shaken, ${target.name} runs for the door, but it won't budge under the drifts!`);
        boltAway(target, bite.targetSuspicion, bite.hits);
      } else if (bite.ending === "flees") {
        addEvent("escape", `Badly shaken, ${target.name} turns and flees the building!`);
        patchMember(target.id, () => ({ isAlive: false, fled: true }));
      } else {
        patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + bite.targetSuspicion, hitsTaken: bite.hits }));
      }
      return;
    }

    const biteAp = bite.ending === "collapses" ? bite.ap - COLLAPSE_BONUS_AP : bite.ap;
    addEvent("consume", `You tear free with a ${bite.scrap}! +${biteAp} AP. ${target.name} staggers back. (${bite.hits}/${bite.maxHits} hits taken)`);
    if (bite.material) addEvent("evolve", `New material absorbed from the bite: ${bite.material}!`);
    applyBehaviorReactions("feed", { excludeIds: [target.id] });
    if (bite.loudCry) addEvent("alert", `${target.name}'s cry turns every head in the room. (+${bite.crySuspicion} suspicion)`);

    // The bite (and, if it finishes them off, the rest of the meal) is fed in one go below
    let changes: Partial<MimicCharacter> = {
      learnedMaterials: bite.material ? [...character.learnedMaterials, bite.material] : character.learnedMaterials,
    };
    if (bite.ending === "bolts") {
      boltAway(target, bite.targetSuspicion, bite.hits);
    } else if (bite.ending === "trapped") {
      addEvent("escape", `${target.name} has had enough and claws at the door, but the snow has sealed it shut!`);
      boltAway(target, bite.targetSuspicion, bite.hits);
    } else if (bite.ending === "flees") {
      addEvent("escape", `${target.name} has had enough — they flee the building entirely!`);
      patchMember(target.id, () => ({ isAlive: false, isConsumed: false, fled: true }));
    } else if (bite.ending === "collapses") {
      addEvent("consume", `${target.name} collapses from their wounds. You finish the meal. +${COLLAPSE_BONUS_AP} AP bonus.`);
      revealCostume(target);
      changes = {
        ...changes,
        adventurersEaten: withDiscovered(character.adventurersEaten, [unmask(target)]),
        partyMembersEaten: character.partyMembersEaten + 1,
      };
      patchMember(target.id, () => ({ isConsumed: true, isAlive: false }));
    } else {
      patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + bite.targetSuspicion, hitsTaken: bite.hits }));
    }
    raiseSuspicion(bite.suspicion);
    feed(character, bite.ap, changes);
  };

  /** Swallow them whole, treasure and all (or lunge, miss, and be seen). */
  const strikeSwallow = (target: PartyMember, form: Form, dice: number, seen: Witnesses, skyward: boolean) => {
    if (!character) return;
    const meal = resolveSwallow(target, character, { dice, form, witnesses: seen });
    addEvent(meal.swallowed ? "attack" : "escape", meal.narrative);

    if (!meal.swallowed) {
      raiseSuspicion(meal.suspicion);
      addEvent("alert", `${target.name} saw you lunge — they've seen your true nature! (+${meal.suspicion} suspicion${meal.suspicion < 4 ? ", softened by your Dragonhide" : ""})`);
      if (meal.bolts) boltAway(target, 3);
      else patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + 3 }));
      return;
    }

    const { learning } = meal;
    const total = meal.ap + meal.treasureAp;
    patchMember(target.id, () => ({ isConsumed: true, isAlive: false }));
    addEvent("consume", `${target.name} has been consumed! +${meal.ap} Assimilation Points.`);
    revealCostume(target);
    if (target.treasure) {
      addEvent("consume", `You swallow ${target.treasure.description} along with them. +${target.treasure.ap} AP.`);
      if (learning.prize) {
        addEvent("evolve", `The ${target.treasure.noun ?? "strongbox"} ${target.treasure.noun ? "flares" : "cracks open"} inside you: ${learning.prize.name}! New ${learning.prize.kind} learned.`);
      } else if (target.treasure.noun) {
        addEvent("info", `The ${target.treasure.noun} glows a moment inside you, then fades. Nothing you haven't tasted before.`);
      } else {
        const shrugs = [
          "The strongbox holds nothing you haven't tasted before. You keep it anyway. It's a nice box.",
          "Coins, a silver comb, a crystal stopper — all old flavors to you now. The box itself is the best part.",
          "You rattle the strongbox around inside you. Nothing new. The captain was clearly overpaying for security.",
        ];
        addEvent("info", shrugs[Math.floor(Math.random() * shrugs.length)]);
      }
    }
    if (meal.sankWithShip) addEvent("evolve", `⚓ Down With the Ship! The captain never did abandon ship.`);

    if (seen.othersRemain) {
      // A party member vanished; anyone still in the room watched it happen
      const gain = meal.suspicion;
      raiseSuspicion(gain);
      if (seen.witnesses === 0 && skyward && seen.inRoom > 0) {
        addEvent("alert", `🎆 Right beside you, every face is turned to the sky. Nobody sees ${target.name} go. (+${gain} suspicion, once they're missed)`);
      } else if (seen.witnesses === 0) {
        addEvent("alert", `One of the party has vanished — the others grow uneasy. (+${gain} suspicion)`);
      } else {
        // Witnesses catch only a glimpse: they know something happened here, not what or who
        const glimpses = seen.witnesses === 1
          ? [
              `Someone in the room spins around — ${target.name} was right there a moment ago. (+${gain} suspicion)`,
              `A companion catches a flicker of movement where ${target.name} stood. Now there's no one. (+${gain} suspicion)`,
              `"${target.name}?" A voice in the room trails off, uncertain. (+${gain} suspicion)`,
            ]
          : [
              `Heads turn across the room — ${target.name} was just here. Weapons are drawn. (+${gain} suspicion)`,
              `The others glimpse something wrong where ${target.name} stood. Nobody saw exactly what. (+${gain} suspicion)`,
              `The room goes quiet. ${target.name} is gone, and every shadow now feels like it's watching. (+${gain} suspicion)`,
            ];
        addEvent("alert", glimpses[Math.floor(Math.random() * glimpses.length)]);
      }
    } else {
      addEvent("consume", `The last of the party is gone. No one remains to grow suspicious.`);
    }
    applyBehaviorReactions("feed", { excludeIds: [target.id] });
    if (learning.newMaterials.length > 0) addEvent("evolve", `New materials absorbed: ${learning.newMaterials.join(", ")}!`);
    if (learning.newTraits.length > 0) addEvent("evolve", `New traits assimilated: ${learning.newTraits.join(", ")}!`);
    if (learning.newMaterials.length === 0 && learning.newTraits.length === 0 && (learning.materials.length > 0 || learning.traits.length > 0)) {
      addEvent("info", `The prey yields nothing new — you already know these materials.`);
    }
    if (meal.feastProgress) {
      addEvent("evolve", `Giant consumed whole: ${meal.giantsConsumedWhole.length}/${TITANIC_FEAST_GIANTS.length} toward the Titanic Feast.`);
    }
    if (meal.feastComplete) addEvent("evolve", `🍖 Titanic Feast! You have swallowed every giant of the Cloud Kingdom whole.`);

    noteMeal(target.name, total);
    feed(character, total, {
      learnedMaterials: [...new Set([...(character.learnedMaterials || []), ...learning.materials])],
      learnedTraits: [...new Set([...(character.learnedTraits || []), ...learning.traits])],
      giantsConsumedWhole: meal.giantsConsumedWhole,
      titanicFeastReached: character.titanicFeastReached || meal.feastComplete,
      downWithTheShipReached: character.downWithTheShipReached || meal.sankWithShip,
      adventurersEaten: withDiscovered(character.adventurersEaten, [unmask(target)]),
      partyMembersEaten: character.partyMembersEaten + 1,
      biggestMeal: withBiggestMeal(character.biggestMeal, unmask(target).name, total),
    });
  };

  const doStrikeTurn = () => {
    beginTurn();
    if (resolveStrike()) endTurn();
  };

  const doConsumeCreature = (creature: SmallCreature) => {
    if (!character) return;
    beginTurn();
    addEvent("consume", `You snap up the ${creature.name} — a modest feast. +${creature.ap} AP.`);
    setSmallCreatures(prev => prev.map(c => c.uid === creature.uid ? { ...c, isConsumed: true } : c));
    noteMeal(creature.name, creature.ap);
    setActionCount(0); // Eating resets the stagnation counter
    feed(character, creature.ap);
  };

  // Stargazers' Hill: a star fragment in your room can be swallowed before anyone else gets to
  // it. It's worth a little AP and may teach something; anyone watching sees it vanish.
  const doEatStar = () => {
    if (!character || !starFragment || starFragment !== mimicRoom) return;
    beginTurn();
    setStarFragment(null);
    const prize = pickTreasurePrize(STAR_FRAGMENT, character.learnedMaterials, character.learnedTraits);
    addEvent("consume", `You swallow the star fragment whole. It's warm all the way down. +${STAR_FRAGMENT.ap} AP.`);
    if (prize) addEvent("evolve", `The star fragment flares inside you: ${prize.name}! New ${prize.kind} learned.`);
    const witnesses = activeAdventurers.filter(a => a.location === mimicRoom).length;
    if (witnesses > 0) {
      const gain = consumeSuspicion(witnesses);
      addEvent("alert", `Someone was reaching for the fragment when its glow simply went out. (+${gain} suspicion)`);
      raiseSuspicion(gain);
    }
    noteMeal("Star Fragment", STAR_FRAGMENT.ap);
    feed(character, STAR_FRAGMENT.ap, {
      learnedMaterials: prize?.kind === "material" ? [...character.learnedMaterials, prize.name] : character.learnedMaterials,
      learnedTraits: prize?.kind === "trait" ? [...character.learnedTraits, prize.name] : character.learnedTraits,
    });
  };

  // The Snowbound Lodge: a frozen adventurer in your room is a cheap meal. Easy to take (no
  // roll, any size of mimic), but worth less, and it teaches nothing: the flavor is locked in the ice.
  const doEatFrozen = (body: PartyMember) => {
    if (!character || !body.isFrozen || body.isConsumed) return;
    beginTurn();
    const ap = frozenMealAp(body);
    addEvent("consume", `You crack ${body.name} free of the ice and swallow them, stiff and cold. +${ap} AP.`);
    const witnesses = activeAdventurers.filter(a => a.location === mimicRoom).length;
    if (witnesses > 0) {
      const gain = consumeSuspicion(witnesses);
      addEvent("alert", `Someone turns back to where ${body.name} stood frozen. There's nothing there now. (+${gain} suspicion)`);
      raiseSuspicion(gain);
    }
    setParty(prev => prev.map(a => a.id === body.id ? { ...a, isConsumed: true } : a));
    noteMeal(body.name, ap);
    setActionCount(0);
    feed(character, ap, {
      adventurersEaten: withDiscovered(character.adventurersEaten, [unmask(body)]),
      partyMembersEaten: character.partyMembersEaten + 1,
      biggestMeal: withBiggestMeal(character.biggestMeal, unmask(body).name, ap),
    });
  };

  // Devotion (The Hollow Reliquary): once a devoted pilgrim is the last one left, it
  // recognises the mimic as the shrine's lost god, brings offerings and leaves — ending the hunt.
  // Runs whenever the party changes; if the last kill opened the upgrade screen it waits
  // until the hunt resumes. The ceremony plays out one line at a time (CEREMONY_STEP_MS
  // apart); actions and the end-of-hunt panel wait until it finishes.
  const [ceremonyRunning, setCeremonyRunning] = useState(false);
  const ceremonyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => ceremonyTimers.current.forEach(clearTimeout), []);

  // An effect event: reads the latest character/location without re-running on their changes
  const checkDevotion = useEffectEvent(() => {
    if (phase !== "hunt" || !location || !character) return;
    const devotee = findDevotee(party);
    if (!devotee) return;
    const offerings = rollOfferings(location);
    const apGained = offerings.reduce((sum, c) => sum + c.ap, 0);
    const zealot = devotee.convertedName ?? devotee.name;
    // Mark the convert right away so this can't trigger twice
    setParty(prev => prev.map(a => a.id === devotee.id
      ? { ...a, name: zealot, isAlive: false, isAttracted: false, isConverted: true }
      : a));
    beginTurn();
    setCeremonyRunning(true);
    setActing(true);
    // Counted straight away, so leaving mid-ceremony can't lose it
    const conversions = character.conversions + 1;
    setCharacter(prev => prev ? { ...prev, conversions } : prev);
    persist({ conversions });

    const steps: (() => void)[] = [
      () => addEvent("evolve", `${devotee.name} stares at the empty places where their companions stood… then falls to their knees before you. "It is real. It has come back."`),
      ...(zealot !== devotee.name ? [() => addEvent("evolve", `${devotee.name} is now the ${zealot}.`)] : []),
      () => addEvent("info", `The ${zealot} hurries out, and returns with offerings, laying them before you one by one.`),
      ...offerings.map(c => () => {
        addEvent("consume", `You accept the ${c.name}. +${c.ap} AP.`);
        setCharacter(prev => prev ? { ...prev, assimilationPoints: prev.assimilationPoints + c.ap } : prev);
      }),
      () => addEvent("system", `🕯 The ${zealot} backs out of the shrine, never once turning away from you. The hunt is over. (+${apGained} AP in offerings)`),
      // Easter egg: the skeptic's treatise gets an ending
      ...(party.some(a => a.name === DOUBTING_SCHOLAR) ? [() => addEvent("info", SCHOLAR_NOTES_LINE)] : []),
      () => {
        const total = character.assimilationPoints + apGained;
        persist({ assimilationPoints: total, lastFedAt: new Date().toISOString() });
        if (conversions === CULT_CONVERSIONS) {
          addEvent("evolve", `🕯️ Cult of Personality! ${CULT_CONVERSIONS} souls now worship you. The faithful are growing in number.`);
        }
        setCeremonyRunning(false);
        setActing(false);
        if (total >= TIER_CONFIG[character.tier].apToEvolve) {
          addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
          setPhase("evolve");
        }
      },
    ];
    ceremonyTimers.current = steps.map((step, i) => setTimeout(step, i * CEREMONY_STEP_MS));
  });
  // Intentional: many different actions can leave the pilgrim as the last one standing, so the
  // conversion reacts to the party changing rather than being triggered from each action.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => checkDevotion(), [party, phase]);

  // Open form selection. returnTo is where confirming or skipping goes afterwards.
  const startFormSelection = (returnTo: Phase = "setup") => {
    setFormSelectReturnPhase(returnTo);
    setPhase("formSelect");
  };

  const confirmFormSelections = (selectedForms: Form[]) => {
    if (!character) return;
    const formRefs: FormRef[] = selectedForms.map(f => ({ formId: f.id, name: f.name, tier: f.tier, learned: true }));
    const updatedChar = { ...character, forms: formRefs, activeFormIndex: 0 };
    setCharacter(updatedChar);
    persist({ forms: formRefs, activeFormIndex: 0 });
    addEvent("info", `You reshape yourself. New forms prepared: ${formRefs.map(f => f.name).join(", ")}.`);
    setPhase(formSelectReturnPhase);
  };

  const doChangeForm = (formIndex: number) => {
    if (!character) return;
    beginTurn();
    stillTurnsRef.current = 0;
    const formsUsed = phase === "hunt"
      ? withFormUsed(character.formsUsed, character.forms[formIndex]?.formId)
      : character.formsUsed;
    const updatedChar = { ...character, activeFormIndex: formIndex, formsUsed };
    setCharacter(updatedChar);
    persist({ activeFormIndex: formIndex, formsUsed });
    const newForm = ALL_FORMS.find(f => f.id === character.forms[formIndex]?.formId);
    if (hasMagic(character.currentAppearance, "Feywood")) {
      addEvent("info", `You flow seamlessly into the form of a ${newForm?.name || "new shape"} — the Feywood makes the shift effortless.`);
    } else {
      addEvent("info", `You shift into the form of a ${newForm?.name || "new shape"}. (Takes 1 turn — stealth suspended.)`);
      // Shifting takes time, slight suspicion risk
      raiseSuspicion(1);
    }
    applyBehaviorReactions("formChange");
    setShowFormPanel(false);
  };

  // The left sidebar shows the room map or the party list; clicking it switches (saved per mimic)
  const toggleSidebarView = () => {
    if (!character) return;
    const sidebarView = character.sidebarView === "map" ? "party" : "map";
    setCharacter(prev => prev ? { ...prev, sidebarView } : prev);
    persist({ sidebarView });
  };

  const doUpdateAppearance = (newAppearance: Appearance) => {
    if (!character) return;
    beginTurn();
    // Thimblewood changes the mimic's size: forms that no longer fit are dropped, and (like a
    // tier-up) the form menu opens so new ones can be chosen. The editor warned with a toast.
    const resized = hasMagic(newAppearance, "Thimblewood") !== hasMagic(character.currentAppearance, "Thimblewood");
    let formUpdates: Partial<MimicCharacter> = {};
    if (resized) {
      const kept = formsStillAllowed(character.forms, formTier({ ...character, currentAppearance: newAppearance }), character.mass, character, today());
      const activeId = character.forms[character.activeFormIndex]?.formId;
      formUpdates = { forms: kept, activeFormIndex: Math.max(0, kept.findIndex(f => f.formId === activeId)) };
      addEvent("evolve", hasMagic(newAppearance, "Thimblewood")
        ? "🪵 The Thimblewood draws you in. You are one size smaller now."
        : "🪵 You let the Thimblewood go and swell back to your full size.");
      const lost = character.forms.filter(f => !kept.includes(f)).map(f => f.name);
      if (lost.length > 0) addEvent("evolve", `These forms no longer fit you and have been lost: ${lost.join(", ")}. Choose replacements.`);
    }
    const updatedChar = { ...character, currentAppearance: newAppearance, ...formUpdates };
    setCharacter(updatedChar);
    persist({ currentAppearance: newAppearance, ...formUpdates });
    addEvent("info", `You adjust your surface appearance.`);
    const soulglassNew = hasMagic(newAppearance, "Soulglass") && !hasMagic(character.currentAppearance, "Soulglass");
    const hidden = rivals.filter(r => !r.consumed && !r.revealed);
    const sensed = hidden.find(r => r.kind === "elder") ?? hidden[0];
    if (soulglassNew && phase === "hunt" && sensed) {
      addEvent("alert", `Your Soulglass hums faintly. ${sensed.kind === "elder" ? "The Elder" : `The ${RIVAL_STATS[sensed.kind].name}`} hides in the ${sensed.room}.`);
    }
    setShowAppearancePanel(false);
    if (resized) startFormSelection(phase === "hunt" ? "hunt" : "setup");
  };

  const checkActionLimit = (newCount: number) => {
    // Snowed in, the party can't wander off: the cold is the only clock
    if (newCount >= ACTION_LIMIT && !location?.snowbound) {
      addEvent("info", `After ${ACTION_LIMIT} uneventful turns, the adventurers grow bored and depart. Nothing interesting here.`);
      addEvent("system", `The party leaves the ${location?.name} of their own accord. Find new prey.`);
      setGameoverReason("abandoned");
      setPhase("gameover");
      recordHunt("survived");
    }
  };

  const doWaitTurn = () => {
    if (!character || !location) return;
    beginTurn();
    // Increment action counter
    const newCount = actionCount + 1;
    setActionCount(newCount);

    // Patience check — reduce suspicion slightly. Roll effective Patience (after sickness and
    // form-tier penalties; Runestone adds a die) against a threshold set by base Patience,
    // so penalties lower the odds (~67–79% unpenalized). The threshold is capped so the dice
    // actually rolled still succeed at least WAIT_MIN_CHANCE of the time.
    const waitDice = effectivePatience + (hasMagic(character.currentAppearance, "Runestone") ? 1 : 0);
    const roll = rollDice(waitDice);
    const threshold = Math.min(character.patience * 3, maxTargetForChance(waitDice, WAIT_MIN_CHANCE));
    if (roll >= threshold) {
      setSuspicion(s => Math.max(0, s - 1));
      addEvent("stealth", `You wait in perfect stillness. Suspicion decreases.`);
    } else {
      addEvent("info", `You wait. The adventurers continue their search.`);
    }

    // Everyone takes their turn (see moveParty): wandering, heading for a star, or door to door
    const form = getActiveForm(character);
    const moves = moveParty(party, location, { mimicRoom, rivals, starFragment, form });
    for (const step of moves.steps) {
      if (step.vanishedInto) {
        // Walked into a hidden rival: it eats them, and all you hear is the silence
        const line = VANISHING_LINES[Math.floor(Math.random() * VANISHING_LINES.length)];
        addEvent("alert", line(step.member.name, step.to));
        setRivals(prev => prev.map(r => r.id === step.vanishedInto ? { ...r, clueGiven: true } : r));
      } else {
        addEvent("info", `${step.member.name} moves from the ${step.from} to the ${step.to}.`);
      }
    }
    // Knock knock: the right shape hands out sweets and they come right up; any other gets pranked
    if (moves.knock?.answered) {
      moves.knock.callers.forEach(a => addEvent("info", `🍬 ${a.name} knocks: "Spell or sweet!" They lean right up to the ${form?.name ?? "door"} for a sweet.`));
    } else if (moves.knock) {
      const callers = moves.knock.callers;
      addEvent("alert", `🪄 ${callers.map(a => a.name).join(" and ")} ${callers.length === 1 ? "knocks" : "knock"}: "Spell or sweet!" Nobody answers at the ${mimicRoom}. ${PRANKS[Math.floor(Math.random() * PRANKS.length)]} (+1 suspicion)`);
      raiseSuspicion(1);
    }
    if (moves.claimedStar) {
      setStarFragment(null);
      addEvent("info", `🌠 ${moves.claimedStar.name} scoops up the star fragment and pockets it, still glowing.`);
    }
    setParty(moves.party);

    countStillTurn(moves.arrivals.length > 0);

    // Auto stealth check for adventurers who just wandered into the mimic's room
    if (moves.arrivals.length > 0) {
      const suspDelta = runStealthChecks(moves.arrivals, mimicRoom);
      if (suspDelta > 0) raiseSuspicion(suspDelta);
    }

    // Small creatures also wander (toward you, sometimes, if you wear Honeyamber)
    const honeyamber = hasMagic(character.currentAppearance, "Honeyamber");
    const critters = moveCreatures(smallCreatures, location, mimicRoom, honeyamber);
    setSmallCreatures(critters.creatures);
    if (honeyamber) {
      critters.arrivals.forEach(c => addEvent("info", `🍯 A ${c.name} creeps into the ${mimicRoom}, following a sweet smell only it can catch.`));
    }

    checkActionLimit(newCount);
    endTurn();
  };

  // Spend AP on one upgrade, then return to the hunt. Only one choice per visit:
  // to upgrade again you have to reach the AP threshold again.
  const handleEvolution = (choice: UpgradeChoice) => {
    if (!character || upgradeChosenRef.current) return;
    beginTurn();
    let updates: Partial<MimicCharacter> = {};
    const cfg = TIER_CONFIG[character.tier];

    if (choice === "mass") {
      const nextTier: Tier | undefined = TIER_ORDER[TIER_ORDER.indexOf(character.tier) + 1];
      const newMass = character.mass + 2;
      const shouldEvolve = !!nextTier && newMass > cfg.massRange[1];

      updates = {
        mass: shouldEvolve ? TIER_CONFIG[nextTier].massRange[0] : newMass,
        assimilationPoints: character.assimilationPoints - cfg.apToEvolve,
        tier: shouldEvolve ? nextTier : character.tier,
      };

      if (shouldEvolve) {
        addEvent("evolve", `🌟 You have evolved to ${nextTier} tier!`);
        if (earnsHatboxToLegend(character, nextTier)) {
          addEvent("evolve", `📦 From Hatbox to Legend! You began as a Minor mimic and have risen all the way to Apex.`);
          updates.hatboxToLegendReached = true;
        }
        // On tier evolution: reduce the highest stat by 1 (min 1)
        const stats: Record<CombatStat, number> = { plausibility: character.plausibility, adhesion: character.adhesion, patience: character.patience };
        const maxVal = Math.max(stats.plausibility, stats.adhesion, stats.patience);
        const highStats = (Object.keys(stats) as CombatStat[]).filter(k => stats[k] === maxVal);
        const statToReduce = highStats[Math.floor(Math.random() * highStats.length)];
        const newVal = Math.max(1, maxVal - 1);
        updates[statToReduce] = newVal;
        addEvent("evolve", `The strain of growth weakens your ${statToReduce} by 1 (now ${newVal}). Choose your next hunts carefully.`);

        // Invalidate forms that are now out of range at the new size (Thimblewood still shrinks it)
        const currentForms = character.forms;
        const validForms = formsStillAllowed(
          currentForms, formTier({ ...character, tier: nextTier }), updates.mass ?? character.mass, character, today());
        if (validForms.length < currentForms.length) {
          updates.forms = validForms;
          updates.activeFormIndex = 0;
          addEvent("evolve", `Some of your forms are no longer compatible with your new tier and have been lost. You must choose replacements.`);
        }
      } else {
        addEvent("evolve", `Your mass increases to ${updates.mass}.`);
        // Apex peak achievement at mass 40
        if (updates.tier === "Apex" || character.tier === "Apex") {
          const newMassVal = updates.mass ?? character.mass + 2;
          if (newMassVal >= 40 && character.mass < 40) {
            addEvent("evolve", `🏆 You have reached the Peak of the Apex tier — a living legend!`);
            updates.apexPeakReached = true;
          }
        }
      }
    } else if (choice === "plausibility") {
      if (character.plausibility >= STAT_CAP) { addEvent("info", `Plausibility is already at its maximum (${STAT_CAP}).`); return; }
      updates = { plausibility: character.plausibility + 1, assimilationPoints: character.assimilationPoints - cfg.apToUpgrade };
      addEvent("evolve", `Your plausibility increases to ${character.plausibility + 1}.`);
    } else if (choice === "adhesion") {
      if (character.adhesion >= STAT_CAP) { addEvent("info", `Adhesion is already at its maximum (${STAT_CAP}).`); return; }
      updates = { adhesion: character.adhesion + 1, assimilationPoints: character.assimilationPoints - cfg.apToUpgrade };
      addEvent("evolve", `Your adhesion increases to ${character.adhesion + 1}.`);
    } else if (choice === "patience") {
      if (character.patience >= STAT_CAP) { addEvent("info", `Patience is already at its maximum (${STAT_CAP}).`); return; }
      updates = { patience: character.patience + 1, assimilationPoints: character.assimilationPoints - cfg.apToUpgrade };
      addEvent("evolve", `Your patience increases to ${character.patience + 1}.`);
    }

    upgradeChosenRef.current = true;
    const updatedChar = { ...character, ...updates };
    setCharacter(updatedChar);

    // Leave the upgrade screen right away. If forms were invalidated on tier-up, force form selection.
    if (updates.forms !== undefined) {
      // Tier-ups happen while feeding, so pick the replacement and go straight back to the hunt
      startFormSelection("hunt");
    } else if (phase === "evolve") {
      setPhase("hunt");
    }
    persist(updates);
  };

  const activeAdventurers = party.filter(a => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared);
  // A nest hunt ends when its Elder is devoured (not when the adventurers run out);
  // any other hunt ends when no adventurers remain. Either way, wait for a ceremony to finish.
  const isNest = !!location?.rivalNest;
  const huntOver = phase === "hunt" && party.length > 0 && !ceremonyRunning &&
    (isNest ? isNestCleared(rivals) : activeAdventurers.length === 0 && uneatenFrozen(party).length === 0);
  const recordSurvivedHunt = useEffectEvent(() => recordHunt("survived"));
  useEffect(() => {
    if (huntOver) recordSurvivedHunt();
  }, [huntOver]);

  // The cat knows: once per cat per hunt, whenever one is in the mimic's room
  useEffect(() => {
    if (phase !== "hunt" || !mimicRoom) return;
    for (const c of smallCreatures) {
      if (c.isConsumed || c.location !== mimicRoom || !isCat(c) || catsThatKnowRef.current.has(c.uid)) continue;
      catsThatKnowRef.current.add(c.uid);
      addEvent("info", CAT_KNOWS_LINE);
    }
  }, [smallCreatures, mimicRoom, phase, addEvent]);

  // Announce variant forms the moment something learned unlocks them (not on load)
  const unlockedVariantsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!character) return;
    const unlocked = VARIANT_FORMS.filter(f => isVariantUnlocked(f, character));
    if (unlockedVariantsRef.current) {
      for (const f of unlocked) {
        if (unlockedVariantsRef.current.has(f.id)) continue;
        const base = ALL_FORMS.find(b => b.id === f.variantOf)?.name ?? "another form";
        addEvent("evolve", `🗝️ What you've learned gives you an idea… you could now take the shape of a ${f.name}, a variant of the ${base}. Choose it the next time you pick your forms.`);
      }
    }
    unlockedVariantsRef.current = new Set(unlocked.map(f => f.id));
  }, [character, addEvent]); // re-running is harmless: only newly unlocked variants are announced

  // Announce achievements that can be completed from several places (bites, meals, the
  // strongbox…) the moment they're earned. The others announce themselves where they happen.
  const earnedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!character) return;
    const earned = new Set(ACHIEVEMENTS.filter(a => a.isEarned(character)).map(a => a.id));
    if (earnedRef.current) {
      for (const a of ACHIEVEMENTS) {
        const announced: readonly string[] = ["connoisseur", "masterOfDisguise", "curiosityCabinet", "festive", "forAllSeasons", "seasonedTraveler"];
        if (announced.includes(a.id) && earned.has(a.id) && !earnedRef.current.has(a.id)) {
          addEvent("evolve", `${a.icon} ${a.name}! ${a.flavor(character.name)}`);
        }
      }
    }
    earnedRef.current = earned;
  }, [character, addEvent]);

  // Stats after mass, sickness and form-tier penalties (see effectiveStats)
  const activeForm = getActiveForm(character);
  const stats = character ? effectiveStats(character, currentSickness, activeForm) : null;
  const effectivePlausibility = stats?.plausibility ?? 1;
  const effectiveAdhesion = stats?.adhesion ?? 1;
  const effectivePatience = stats?.patience ?? 1;

  // What the world says about the hunt once it's over (all inputs are final by then)
  const endReport = character && location && (huntOver || phase === "gameover") ? buildHuntReport({
    ending: huntOver ? "cleared" : gameoverReason,
    seed: huntSeedRef.current,
    locationName: location.name,
    lastRoom: mimicRoom,
    formName: activeForm?.name ?? null,
    tier: character.tier,
    mimicName: character.name,
    bounty: isBountyHunt,
    peakSuspicion: phase === "gameover" && gameoverReason === "discovered" ? 10 : peakSuspicionRef.current,
    biggestMeal: huntMealRef.current,
    party,
    mimicsDevoured: rivals.filter(r => r.consumed).length,
    sank: !!location.sinkingTurns && huntTurn >= location.sinkingTurns,
    locationId: location.id,
  }) : null;

  // Screen effects for the latest turn (the CSS lives under HUNT EFFECTS in index.css):
  // jaws for a meal, a jolt when prey gets away, torchlight when you're found out.
  const latestTurn = events.at(-1)?.turn ?? 0;
  const latestTypes = new Set(events.filter(e => e.turn === latestTurn).map(e => e.type));
  const fx = phase === "gameover" && gameoverReason === "discovered" ? "discovered"
    : latestTypes.has("consume") ? "chomp"
    : latestTypes.has("escape") ? "shake"
    : null;


  // What the four hunt actions can do right now (shared by the buttons and the keyboard)
  const someoneInMyRoom = activeAdventurers.some(a => a.location === mimicRoom);
  const canRelocate = !acting && !huntOver && !someoneInMyRoom;
  const canLure = !acting && !huntOver && activeAdventurers.length > 0;
  const canStrike = !acting && !huntOver &&
    (party.some(a => a.isAlive && !a.isConsumed && a.isAttracted) || !!rivalInRoom(rivals, mimicRoom)?.revealed ||
      (watchingSky(mimicRoom) && someoneInMyRoom));
  const canWait = !acting && !huntOver;
  // Empty rooms next door, in the order the Relocate panel lists (and numbers) them
  const relocateRooms = location && mimicRoom
    ? getAdjacentRooms(location, mimicRoom).filter(room => !activeAdventurers.some(a => a.location === room))
    : [];
  const toggleMovePanel = () => {
    if (!canRelocate) return;
    setShowMovePanel(prev => !prev);
    setShowFormPanel(false);
    setShowAppearancePanel(false);
  };

  // Keyboard shortcuts during a hunt: R / L / S / W, and 1–9 to pick a room while relocating
  const onHuntKey = useEffectEvent((e: KeyboardEvent) => {
    if (phase !== "hunt" || showSheet || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const key = e.key.toLowerCase();
    if (showMovePanel && /^[1-9]$/.test(key)) {
      const room = relocateRooms[Number(key) - 1];
      if (room && canRelocate) { e.preventDefault(); doRelocate(room); }
      return;
    }
    if (key === "escape" && showMovePanel) { setShowMovePanel(false); return; }
    const actions: Record<string, [boolean, () => void]> = {
      r: [canRelocate, toggleMovePanel],
      l: [canLure, doAllureTurn],
      s: [canStrike, doStrikeTurn],
      w: [canWait, doWaitTurn],
    };
    const action = actions[key];
    if (!action) return;
    e.preventDefault();
    if (action[0]) action[1]();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onHuntKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-cinzel">Awakening...</p>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {loadError ? `Could not load your character: ${loadError}` : "Character not found."}
          </p>
          <Button asChild><Link to={createPageUrl("CharacterCreation")}>Create a Mimic</Link></Button>
        </div>
      </div>
    );
  }

  // Mass decay notice — shown once, dismissed on click
  const MassDecayBanner = massDecayNotice ? (
    <div className="max-w-5xl mx-auto px-4 pt-3">
      <div className="p-3 bg-destructive/10 border border-destructive/40 rounded-lg flex items-start justify-between gap-3">
        <div>
          <p className="font-cinzel text-destructive text-xs font-bold mb-0.5">Mass Decay</p>
          <p className="text-xs text-destructive/80">{massDecayNotice}</p>
        </div>
        <button onClick={() => setMassDecayNotice(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
      </div>
    </div>
  ) : null;

  const SeasonBanner = seasonNotice ? (
    <div className="max-w-5xl mx-auto px-4 pt-3">
      <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg flex items-start justify-between gap-3">
        <div>
          <p className="font-cinzel text-amber-400 text-xs font-bold mb-0.5">The Season Has Passed</p>
          <p className="text-xs text-amber-200/80">{seasonNotice}</p>
        </div>
        <button onClick={() => setSeasonNotice(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
      </div>
    </div>
  ) : null;

  // What the screen's pieces read (see HuntContext); actions are passed to them as props
  const hunt: HuntState = {
    character, activeForm, stats: effectiveStats(character, currentSickness, activeForm), sickness: currentSickness,
    suspicion, lureRange: lureRange(character),
    location, mimicRoom, party, activeAdventurers, creatures: smallCreatures, rivals, isBountyHunt, huntOver, actionCount, acting,
    huntTurn, fireworksRoom, starFragment, skyward: watchingSky(mimicRoom),
  };

  return (
    <HuntContext.Provider value={hunt}>
    <div
      className={`hunt-stage min-h-screen bg-background ${phase === "hunt" ? "pb-28 lg:pb-0" : ""}`}
      style={{ "--suspicion": suspicion } as CSSProperties}
      data-suspicion={suspicion}
      data-fx={fx ?? undefined}
      data-fx-turn={latestTurn % 2}
    >
      {phase === "hunt" && <div className="suspicion-vignette" aria-hidden />}
      {/* Remounted for each turn with an effect, which replays its animation */}
      {fx && fx !== "shake" && <div key={`${latestTurn}-${fx}`} className="fx-layer" data-fx={fx} aria-hidden />}
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-cinzel text-foreground text-sm">{character.name}</span>
          <Badge variant="outline" className="border-primary/30 text-primary text-[11px]">{character.tier}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSheet(!showSheet)} className="text-muted-foreground hover:text-foreground text-xs gap-1">
            <BookOpen className="w-3 h-3" /> Sheet
          </Button>
          <Link to={createPageUrl(character ? `Codex?characterId=${character.id}` : "Codex")} className="text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" /> Codex
          </Link>
        </div>
      </div>

      {/* Notices that need dismissing sit under the top bar, not above it */}
      {MassDecayBanner}
      {SeasonBanner}

      {showSheet && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSheet(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CharacterSheet character={character} onClose={() => setShowSheet(false)} />
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Status */}
        <div className="space-y-4">
          <StatusPanel />

          {phase === "hunt" && <LocationBanners />}

          {/* Party list or room map: one card, click it to switch (remembered per mimic) */}
          {phase !== "setup" && party.length > 0 && <PartyCard onToggle={toggleSidebarView} />}
        </div>

        {/* Center: Main action area */}
        <div className="lg:col-span-2 space-y-4">
          {phase === "setup" && !roomSelecting && (
            <LocationSelect onChoose={chooseLocation} onChooseForms={() => startFormSelection("setup")} />
          )}

          {roomSelecting && <RoomSelect onConfirm={confirmRoom} onBack={() => { setRoomSelecting(false); setLocation(null); }} />}

          {phase === "hunt" && (
            <div className="space-y-4">
              <HuntHeader
                canLeave={!ceremonyRunning}
                onNewHunt={() => setPhase("setup")}
                onToggleForms={() => { setShowFormPanel(!showFormPanel); setShowAppearancePanel(false); setShowMovePanel(false); }}
                onToggleAppearance={() => { setShowAppearancePanel(!showAppearancePanel); setShowFormPanel(false); setShowMovePanel(false); }}
              />
              {showFormPanel && <FormSwitcher onChange={doChangeForm} />}
              {showAppearancePanel && (
                <AppearanceEditor
                  character={character}
                  onSave={doUpdateAppearance}
                  onClose={() => setShowAppearancePanel(false)}
                />
              )}
              {showMovePanel && location && mimicRoom && <RelocatePanel rooms={relocateRooms} onRelocate={doRelocate} />}
              <ActionBar
                canRelocate={canRelocate}
                canLure={canLure}
                canStrike={canStrike}
                canWait={canWait}
                onRelocate={toggleMovePanel}
                onLure={doAllureTurn}
                onStrike={doStrikeTurn}
                onWait={doWaitTurn}
              />
              <MealsHere
                onEatCreature={doConsumeCreature}
                onEatStar={doEatStar}
                onEatFrozen={doEatFrozen}
              />
              {huntOver && (
                <HuntOverPanel report={endReport} onChooseForms={() => startFormSelection("setup")} onHuntAgain={() => setPhase("setup")} />
              )}
            </div>
          )}

          {/* FORM SELECTION phase (post-hunt) */}
          {phase === "formSelect" && (
            <ScrollArea className="max-h-[70vh] pr-2">
              <FormSelector
                character={character}
                onConfirm={confirmFormSelections}
                onSkip={() => setPhase(formSelectReturnPhase)}
              />
            </ScrollArea>
          )}

          {phase === "evolve" && (
            <EvolveScreen onChoose={handleEvolution} onSkip={() => setPhase("hunt")} />
          )}

          {phase === "gameover" && (
            <GameOverScreen
              reason={gameoverReason}
              report={endReport}
              onChooseForms={() => startFormSelection("setup")}
              onHuntAgain={() => setPhase("setup")}
            />
          )}

          {/* Achievement banners */}
          {character && <AchievementBanners character={character} huntingAt={phase === "hunt" ? location?.id ?? null : null} />}

          {/* Event log */}
          {phase !== "setup" && (
            <div className="fx-shake h-64">
              <EventLogPanel events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
    </HuntContext.Provider>
  );
}