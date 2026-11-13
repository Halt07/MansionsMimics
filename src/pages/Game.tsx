import { useState, useEffect, useEffectEvent, useCallback, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { Appearance, FormRef, MimicCharacter, MimicCharacterInput } from "@/api/schemas/mimicCharacter";
import {
  ALL_FORMS, ADVENTURER_TEMPLATES, LOCATIONS, TIER_CONFIG, TIER_ORDER,
  rollDice, rollDiceVerbose, maxTargetForChance, consumeSuspicion, stealthCheck, allureCheck, adhesionCheck, getApReward, getFormTierPenalties, ADVENTURER_MATERIALS,
  ADVENTURER_TRAITS, calcAllureInterest, getRoomDistance, getAdjacentRooms, ROOM_FORM_IDS, FORM_ROOM_TYPE, getRoomContextMod,
  shouldTriggerBountyHunt, generateBountyParty, rollForSickness,
  isTemplateEligible, getBehaviorReactions, isStationary,
  needsPartialBites, getBiteAp, rollBiteMaterial, hasMagic, pickCompanionOption, createCompanion,
  TITANIC_FEAST_GIANTS, isTitanicFeastComplete, earnsHatboxToLegend,
  isLocationAvailable, advanceRareLocation, findDevotee, rollOfferings,
  CULT_CONVERSIONS, CANNIBAL_MIMICS,
  sinkingWarning, pickTreasurePrize, escapeRoom,
  ALL_MATERIALS, LEARNABLE_TRAITS, type Material,
  RIVAL_SAME_SHAPE_CHANCE, RIVAL_SAME_SHAPE_LINE, quirkLine,
  isCat, creatureEmoji, CAT_KNOWS_LINE, STILLNESS_TURNS, STILLNESS_LINE,
  PORTER_SISTER, PORTER_TOKEN_LINE, DOUBTING_SCHOLAR, SCHOLAR_NOTES_LINE,
  VARIANT_FORMS, isVariantUnlocked, formFamily, formTier, formsStillAllowed, effectiveFormTier, getSeasonalForms, today, HOLIDAYS, dropExpiredSeasonalForms,
  withDiscovered, withFormUsed, withCount, withBiggestMeal, ACHIEVEMENTS,
  BURN_HUNTS, BURN_SUSPICION, burnAfterDiscovery, locationBurn, formBurn, tickBurns,
  placeRivals, rollNestKinds, rivalEscapeRoom, rivalInRoom, isNestCleared, RIVAL_STATS, type RivalMimic,
  type AdventurerGroupId, type AdventurerTemplate, type BehaviorContext, type BehaviorTrigger, type CombatStat,
  type Form, type GameEvent, type GameEventType, type HuntLocation, type LocationCreature, type PartyMember,
  type RoomName, type Sickness, type Tier,
  ACTION_LIMIT,
  ACTION_WARNING,
} from "../components/game/gameData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Zap, RefreshCw, Shield, Home, BookOpen, Layers, Palette, MoveRight
} from "lucide-react";
import StatBar from "../components/game/StatBar";
import SuspicionMeter from "../components/game/SuspicionMeter";
import EventLogPanel from "../components/game/EventLogPanel";
import CharacterSheet from "../components/game/CharacterSheet";
import AppearanceEditor from "../components/game/AppearanceEditor";
import FormSelector from "../components/game/FormSelector";
import DiceRollDisplay from "../components/game/DiceRollDisplay";
import BurnBadge from "../components/game/BurnBadge";
import RoomMap from "../components/game/RoomMap";
import HuntReport from "../components/game/HuntReport";
import HolidayBadge from "../components/game/HolidayBadge";
import { buildHuntReport } from "../components/game/huntReportData";
import { AchievementBanners } from "../components/game/Achievements";

// ── Game-screen state types ──
type Phase = "setup" | "hunt" | "formSelect" | "evolve" | "gameover";
type GameoverReason = "discovered" | "abandoned";
type UpgradeChoice = "mass" | CombatStat;

/** A small creature (rat, crow…) wandering the location during a hunt. */
interface SmallCreature extends LocationCreature {
  uid: string;
  isConsumed: boolean;
  location: RoomName;
}

/** TEMPORARY: a sample Strike for the dev dice preview (your Adhesion vs. the Elusive Captain's 5 dice). */
interface DicePreview {
  mimic: { rolls: number[]; total: number };
  target: { rolls: number[]; total: number };
}
const rollDicePreview = (adhesion: number): DicePreview => ({
  mimic: rollDiceVerbose(adhesion),
  target: rollDiceVerbose(5),
});

/** How a devoured rival is named in the "biggest meal" stat. */
const RIVAL_MEAL_NAMES: Record<RivalMimic["kind"], string> = { lone: "Rival Mimic", nest: "Nest Mimic", elder: "Elder Mimic" };
/** Delay between lines of a multi-step event sequence (e.g. a Devotion ceremony). */
const CEREMONY_STEP_MS = 2000;
/** Waiting always has at least this chance to lower suspicion, however penalized your Patience. */
const WAIT_MIN_CHANCE = 0.4;
const STAT_CAP = 6;

// Hunters, elites and giant-kin fill up to 2 "elite" slots (Greater+ only).
// Everyone else — including tier-gated monsters — fills the common slots.
const ELITE_GROUPS: readonly AdventurerGroupId[] = ["huntersElites", "giantKin"];

function generateParty(location: HuntLocation, mimicTier: Tier, mimicMass: number): PartyMember[] {
  const [min, max] = location.partySize;
  const size = min + Math.floor(Math.random() * (max - min + 1));
  const tierIdx = TIER_ORDER.indexOf(mimicTier || "Minor");

  const eligible = ADVENTURER_TEMPLATES.filter(t => isTemplateEligible(t, location, mimicTier, mimicMass));
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
  const eliteCount = tierIdx >= TIER_ORDER.indexOf("Greater") ? Math.min(2, elite.length) : 0;
  const shuffledCommon = [...common].sort(() => Math.random() - 0.5);
  const shuffledElite = [...elite].sort(() => Math.random() - 0.5);

  const baseParty: AdventurerTemplate[] = [...required];
  for (let i = 0; i < eliteCount && baseParty.length < size; i++) {
    if (shuffledElite[i]) baseParty.push(shuffledElite[i]);
  }
  let ci = 0;
  while (baseParty.length < size && ci < shuffledCommon.length) {
    baseParty.push(shuffledCommon[ci++]);
  }

  const members: PartyMember[] = [];
  baseParty.forEach((t, i) => {
    const room = location.rooms[Math.floor(Math.random() * location.rooms.length)];
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
    if (t.companion && Math.random() < t.companion.chance) {
      const opts = t.companion.options;
      const chosen = pickCompanionOption(opts);
      const companionRoom = location.rooms[Math.floor(Math.random() * location.rooms.length)];
      members.push(createCompanion(t, chosen, `comp_${Date.now()}_${i}`, companionRoom));
    }
  });

  return members;
}

function getActiveForm(character: MimicCharacter | null): Form | null {
  const formRef = character?.forms[character.activeFormIndex];
  if (!formRef) return null;
  return ALL_FORMS.find(f => f.id === formRef.formId) ?? null;
}

const FALLBACK_CREATURES: readonly LocationCreature[] = [
  { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A fat cellar rat." },
  { id: "cat", name: "Cat", ap: 2, discipline: 2, description: "A wary housecat." },
  { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "A rooftop crow, curious and bold." },
  { id: "spider", name: "Giant Spider", ap: 2, discipline: 2, description: "A palm-sized cellar spider." },
  { id: "weasel", name: "Weasel", ap: 1, discipline: 2, description: "Fast and wiry." },
  { id: "pigeon", name: "Pigeon", ap: 1, discipline: 1, description: "Fat and oblivious." },
];

function spawnSmallCreatures(loc: HuntLocation): SmallCreature[] {
  const pool = loc.locationCreatures.length ? loc.locationCreatures : FALLBACK_CREATURES;
  const count = 3 + Math.floor(Math.random() * 3);
  const creatures: SmallCreature[] = [];
  for (let i = 0; i < count; i++) {
    const template = pool[Math.floor(Math.random() * pool.length)];
    const room = loc.rooms[Math.floor(Math.random() * loc.rooms.length)];
    creatures.push({ ...template, uid: `sc_${Date.now()}_${i}`, isConsumed: false, location: room });
  }
  return creatures;
}

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
  // TEMPORARY dev preview: show banners and the sheet as if every achievement were earned.
  // Only affects what's displayed (displayCharacter); the real character is never changed.
  const [previewAchievements, setPreviewAchievements] = useState(false);
  // The Sinking Ship: turns taken so far this hunt (see advanceShip)
  const [shipTurn, setShipTurn] = useState(0);
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
        // Mass decay check: 1 mass per 3 days since last fed
        let decayMessage: string | null = null;
        if (char.lastFedAt && char.mass > 1) {
          const daysSinceFed = (Date.now() - new Date(char.lastFedAt).getTime()) / (1000 * 60 * 60 * 24);
          const massLost = Math.min(Math.floor(daysSinceFed / 3), char.mass - 1);
          if (massLost > 0) {
            const newMass = char.mass - massLost;
            char.mass = newMass;
            db.entities.MimicCharacter.update(char.id, { mass: newMass })
              .catch(err => console.error("Failed to save mass decay:", err));
            decayMessage = `You have been away for ${Math.floor(daysSinceFed)} days without feeding. Your mass has diminished by ${massLost} (now ${newMass}). Hunger gnaws at your form.`;
          }
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
    setShipTurn(0);
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

    const newParty = bounty
      ? generateBountyParty(loc, character?.mass ?? 26)
      : generateParty(loc, character?.tier ?? "Minor", character?.mass ?? 0);
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
    newParty.forEach(a => addEvent("info", `${a.name} (${a.type}) — currently in the ${a.location}.`));

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

  // The Sinking Ship: each turn brings it closer to going under. When it sinks, anyone
  // still aboard takes to the lifeboats (counted as fled) and the hunt ends.
  const advanceShip = () => {
    const total = location?.sinkingTurns;
    if (!total || shipTurn >= total) return;
    const turn = shipTurn + 1;
    setShipTurn(turn);
    const warning = sinkingWarning(total, turn);
    if (warning) addEvent("alert", warning);
    if (turn >= total) {
      setParty(prev => prev.map(a => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared
        ? { ...a, isAlive: false, isAttracted: false, fled: true }
        : a));
      addEvent("alert", `🌊 The ship rolls over and slides beneath the waves. Whoever is left scrambles for the lifeboats.`);
      addEvent("system", `You let the current carry you ashore, heavier than you came. The hunt is over.`);
    }
  };

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

    const effectivePlausibility = Math.max(1, character.plausibility - massPenalty - sickPlausibilityPenalty);
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
      setSuspicion(s => {
        const next = Math.min(s + suspDelta, 10);
        if (next >= 10) triggerHuntEnd();
        return next;
      });
    }
  };

  // Relocate to an adjacent empty room (+1 suspicion cost)
  // DEV ONLY (achievement-preview branch): learn or unlearn a material for testing (saved).
  // Used by the appearance editor's Thimblewood button.
  const devToggleLearnedMaterial = (material: Material) => {
    if (!character) return;
    const knows = character.learnedMaterials.includes(material);
    const learnedMaterials = knows
      ? character.learnedMaterials.filter(x => x !== material)
      : [...character.learnedMaterials, material];
    setCharacter(prev => prev ? { ...prev, learnedMaterials } : prev);
    persist({ learnedMaterials });
    addEvent("system", `🛠 Dev: ${material} ${knows ? "removed" : "learned"}.`);
  };

  // TEMPORARY dev preview of DiceRollDisplay (see the button under the Suspicion card)
  const [dicePreview, setDicePreview] = useState<DicePreview | null>(null);

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
    setSuspicion(s => {
      const next = Math.min(s + totalSusp, 10);
      if (next >= 10) triggerHuntEnd();
      return next;
    });
    applyBehaviorReactions("relocate", { mimicRoom: targetRoom, fromRoom: mimicRoom });
    checkActionLimit(newCount);
    advanceShip();
  };

  // Lure range: 1 (same or adjacent room). +1 at baseAllure >= 5
  const getAllureRange = () =>
    ((character?.baseAllure ?? 2) >= 5 ? 2 : 1) + (hasMagic(character?.currentAppearance, "Aether Crystal") ? 1 : 0);

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
        character.baseAllure, Math.max(1, character.plausibility - massPenalty - sickPlausibilityPenalty), form,
        character.currentAppearance || {}, adv, roomMod
      );
      addEvent(result.success ? "allure" : "info", result.narrative);
      if (result.disliked.length > 0) {
        addEvent("info", `${adv.name} is put off by the ${result.disliked.join(", ")}. (−${result.aversion} allure)`);
      }
      if (result.suspicionChange > 0) {
        setSuspicion(s => {
          const next = Math.min(s + result.suspicionChange, 10);
          if (next >= 10) triggerHuntEnd();
          return next;
        });
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
        setSuspicion(s => {
          const next = Math.min(s + suspDelta, 10);
          if (next >= 10) triggerHuntEnd();
          return next;
        });
      }
    }
    checkActionLimit(newCount);
    advanceShip();
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

  // Resolves a Strike. Returns whether it took a turn (false if there was nothing to strike).
  const resolveStrike = (): boolean => {
    if (!character || !location) return false;
    stillTurnsRef.current = 0;
    // Bonesteel: +1 die on strike rolls
    const strikeAdhesion = effectiveAdhesion + (hasMagic(character.currentAppearance, "Bonesteel") ? 1 : 0);

    // Check if a rival mimic can be struck (revealed + in same room)
    const rivalTarget = rivalInRoom(rivals, mimicRoom);
    if (rivalTarget?.revealed && mimicRoom) {
      setActing(true);
      setActionCount(0); // Strike resets action counter
      const stats = RIVAL_STATS[rivalTarget.kind];
      const roll = rollDice(strikeAdhesion);
      const rivalRoll = rollDice(stats.dice);
      if (roll >= rivalRoll) {
        const apGained = stats.ap;
        const updatedRivals = rivals.map(r => r.id === rivalTarget.id ? { ...r, consumed: true } : r);
        if (rivalTarget.kind === "elder") {
          addEvent("consume", `You tear into the Elder Mimic. It fights like a cornered god, then folds into you, century by century. +${apGained} AP.`);
          addEvent("system", `🕸 The nest falls silent. Whatever else hides here will scatter without its Elder. The hunt is over.`);
          // Easter egg: the porter she was searching for
          if (party.some(a => a.name === PORTER_SISTER)) addEvent("info", PORTER_TOKEN_LINE);
        } else {
          addEvent("consume", `You overwhelm the ${stats.name}! It writhes, loses cohesion, and is absorbed into your mass. +${apGained} AP — and its stolen prey.`);
        }
        setRivals(updatedRivals);
        noteMeal(RIVAL_MEAL_NAMES[rivalTarget.kind], apGained);
        const updatedChar = {
          ...character,
          assimilationPoints: (character.assimilationPoints || 0) + apGained,
          mimicsConsumed: character.mimicsConsumed + 1,
          biggestMeal: withBiggestMeal(character.biggestMeal, RIVAL_MEAL_NAMES[rivalTarget.kind], apGained),
        };
        setCharacter(updatedChar);
        persist({
          assimilationPoints: updatedChar.assimilationPoints,
          mimicsConsumed: updatedChar.mimicsConsumed,
          biggestMeal: updatedChar.biggestMeal,
          lastFedAt: new Date().toISOString(),
        });
        if (updatedChar.mimicsConsumed === CANNIBAL_MIMICS) {
          addEvent("evolve", `🦷 Cannibal! You have devoured ${CANNIBAL_MIMICS} of your own kind.`);
        }
        const cfg2 = TIER_CONFIG[character.tier];
        if (updatedChar.assimilationPoints >= cfg2.apToEvolve) {
          addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
          setPhase("evolve");
        }
      } else {
        addEvent("escape", `The ${stats.name} slips your grasp — it is clever, as mimics are. It retreats deeper into the ${location.name}.`);
        // The rival escapes to a room away from you and the other rivals
        const newRoom = rivalEscapeRoom(location, rivals, rivalTarget, mimicRoom);
        setRivals(prev => prev.map(r => r.id === rivalTarget.id ? { ...r, revealed: false, room: newRoom } : r));
        addEvent("alert", `It has hidden itself once more somewhere in the ${location.name}. Track it down.`);
        setSuspicion(s => { const n = Math.min(s + 1, 10); if (n >= 10) triggerHuntEnd(); return n; });
      }
      setActing(false);
      return true;
    }

    const attracted = party.filter(a => a.isAlive && !a.isConsumed && a.isAttracted);
    if (attracted.length === 0) {
      addEvent("info", "No adventurers are close enough to strike. Use Allure first.");
      return false;
    }
    const form = getActiveForm(character);
    if (!form) { addEvent("alert", "No active form!"); return false; }
    setActing(true);
    setActionCount(0); // Strike resets the action counter

    // Pick target: closest to mimic, break ties by highest allure interest score
    const scored = attracted.map(a => ({
      adv: a,
      dist: mimicRoom ? getRoomDistance(location, mimicRoom, a.location) : 0,
      interest: calcAllureInterest(form, character.currentAppearance || {}, a),
    }));
    scored.sort((a, b) => a.dist - b.dist || b.interest - a.interest);
    const target = scored[0].adv;
    // Killing the last adventurer ends the hunt in success, so it never adds suspicion
    const othersRemain = party.some(a =>
      a.id !== target.id && a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared);
    // Other party members in the mimic's room who could notice the attack
    const witnessCount = party.filter(a =>
      a.id !== target.id && a.location === mimicRoom &&
      a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared).length;
    applyBehaviorReactions("strike", { excludeIds: [target.id] });

    // Partial bites: Minor mimics always; larger mimics against giants they can't yet swallow whole
    if (needsPartialBites(character, target)) {
      const isGiantTarget = target.group === "giantKin";
      if (isGiantTarget && character.tier !== "Minor") {
        addEvent("info", `${target.name} is far too large to swallow whole — you'll have to take it in bites. (Whole at mass ${target.wholeMealMass}+)`);
      }
      const biteResult = adhesionCheck(strikeAdhesion, form, target);
      const bodyParts = isGiantTarget
        ? ["ankle", "bootlace, thick as rope", "cloak hem", "calloused toe", "belt edge", "trailing sleeve"]
        : ["hand", "forearm", "boot", "calf", "pant leg", "cloak edge", "shirt sleeve"];
      const part = bodyParts[Math.floor(Math.random() * bodyParts.length)];
      if (biteResult.success) {
        addEvent("attack", `You latch onto ${target.name}'s ${part}!`);
        const escapeRoll = rollDice(effectivePatience);
        const pursuitRoll = rollDice(target.discipline + 1);
        const held = escapeRoll >= pursuitRoll;
        const hitsSoFar = (target.hitsTaken || 0) + 1;
        const maxHits = target.constitution || 3;

        if (held) {
          // The scrap is flavor; sometimes the bite also teaches one of the target's real materials
          const partialLoot = target.partialLoot || ["scrap of cloth"];
          const scrap = partialLoot[Math.floor(Math.random() * partialLoot.length)];
          const apGained = getBiteAp(target);
          addEvent("consume", `You tear free with a ${scrap}! +${apGained} AP. ${target.name} staggers back. (${hitsSoFar}/${maxHits} hits taken)`);
          const biteMaterial = rollBiteMaterial(target);
          const newMaterial = biteMaterial && !character.learnedMaterials.includes(biteMaterial) ? biteMaterial : null;
          if (newMaterial) addEvent("evolve", `New material absorbed from the bite: ${newMaterial}!`);
          applyBehaviorReactions("feed", { excludeIds: [target.id] });
          // A bite that wears the target down may make them collapse (killed) or flee
          const finishing = hitsSoFar >= maxHits;
          const flees = finishing && target.discipline >= 3 && Math.random() < 0.5;
          const finalKill = finishing && !flees && !othersRemain;
          if (!finalKill) {
            // A bite is always noticed (+2); a crowd of 3+ others in the room raises it to +3
            const gain = Math.max(2, consumeSuspicion(witnessCount));
            setSuspicion(s => { const n = Math.min(s + gain, 10); if (n >= 10) triggerHuntEnd(); return n; });
            if (gain > 2) {
              addEvent("alert", `${target.name}'s cry turns every head in the room. (+${gain} suspicion)`);
            }
          }
          const learnedMaterials = newMaterial
            ? [...character.learnedMaterials, newMaterial]
            : character.learnedMaterials;
          const updatedChar = {
            ...character,
            assimilationPoints: (character.assimilationPoints || 0) + apGained,
            learnedMaterials,
          };
          setCharacter(updatedChar);
          persist({
            assimilationPoints: updatedChar.assimilationPoints,
            learnedMaterials: updatedChar.learnedMaterials,
            lastFedAt: new Date().toISOString(),
          });

          if (finishing) {
            // Dead or fled
            if (flees && target.behavior === "elusive") {
              boltAway(target, 2, hitsSoFar);
            } else if (flees) {
              addEvent("escape", `${target.name} has had enough — they flee the building entirely!`);
              setParty(prev => prev.map(a => a.id === target.id ? { ...a, isAlive: false, isConsumed: false, fled: true } : a));
              setSuspicion(s => { const n = Math.min(s + 3, 10); if (n >= 10) triggerHuntEnd(); return n; });
            } else {
              addEvent("consume", `${target.name} collapses from their wounds. You finish the meal. +2 AP bonus.`);
              const finalChar = {
                ...updatedChar,
                assimilationPoints: updatedChar.assimilationPoints + 2,
                adventurersEaten: withDiscovered(character.adventurersEaten, [target]),
                partyMembersEaten: character.partyMembersEaten + 1,
              };
              setCharacter(finalChar);
              persist({
                assimilationPoints: finalChar.assimilationPoints,
                adventurersEaten: finalChar.adventurersEaten,
                partyMembersEaten: finalChar.partyMembersEaten,
              });
              setParty(prev => prev.map(a => a.id === target.id ? { ...a, isConsumed: true, isAlive: false } : a));
            }
          } else {
            setParty(prev => prev.map(a => a.id === target.id
              ? { ...a, isAttracted: false, suspicion: a.suspicion + 2, hitsTaken: hitsSoFar }
              : a));
          }

          const cfg = TIER_CONFIG[character.tier];
          const checkChar = { ...character, assimilationPoints: (character.assimilationPoints || 0) + apGained };
          if (checkChar.assimilationPoints >= cfg.apToEvolve) {
            addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
            setPhase("evolve");
          }
        } else {
          const hitsSoFarMissed = (target.hitsTaken || 0);
          addEvent("escape", `${target.name} wrenches free before you can tear anything loose!`);
          setSuspicion(s => { const n = Math.min(s + 3, 10); if (n >= 10) triggerHuntEnd(); return n; });
          if (hitsSoFarMissed + 1 >= (target.constitution || 3) && target.behavior === "elusive") {
            boltAway(target, 4, hitsSoFarMissed + 1);
          } else if (hitsSoFarMissed + 1 >= (target.constitution || 3) && Math.random() < 0.6) {
            addEvent("escape", `Badly shaken, ${target.name} turns and flees the building!`);
            setParty(prev => prev.map(a => a.id === target.id ? { ...a, isAlive: false, fled: true } : a));
          } else {
            setParty(prev => prev.map(a => a.id === target.id
              ? { ...a, isAttracted: false, suspicion: a.suspicion + 4, hitsTaken: (a.hitsTaken || 0) + 1 }
              : a));
          }
        }
      } else {
        addEvent("escape", `${target.name} sidesteps your lunge — your jaws snap shut on nothing!`);
        setSuspicion(s => { const n = Math.min(s + 2, 10); if (n >= 10) triggerHuntEnd(); return n; });
        setParty(prev => prev.map(a => a.id === target.id ? { ...a, isAttracted: false, suspicion: a.suspicion + 2 } : a));
      }
      setActing(false);
      return true;
    }

    // Full-size mimics: full consumption
    const result = adhesionCheck(strikeAdhesion, form, target);
    addEvent(result.success ? "attack" : "escape", result.narrative);

    if (result.success) {
      // Treasure carried by the target (e.g. the Captain's strongbox) goes down with them
      const apGained = getApReward(target) + (target.treasure?.ap ?? 0);
      const allMaterials = target.lootMaterials || ADVENTURER_MATERIALS[target.type] || [];
      const allTraits = target.lootTraits || ADVENTURER_TRAITS[target.type] || [];
      // Variable learning: learn 1–all materials randomly (at least 1 if any exist)
      const shuffledMats = [...allMaterials].sort(() => Math.random() - 0.5);
      const shuffledTraits = [...allTraits].sort(() => Math.random() - 0.5);
      const matsToLearn = shuffledMats.slice(0, Math.max(1, Math.floor(Math.random() * (shuffledMats.length + 1))));
      const traitsToLearn = shuffledTraits.length > 0
        ? shuffledTraits.slice(0, Math.random() < 0.6 ? 1 : shuffledTraits.length)
        : [];
      const learnedNewMats = matsToLearn.filter(m => !(character.learnedMaterials || []).includes(m));
      const learnedNewTraits = traitsToLearn.filter(t => !(character.learnedTraits || []).includes(t));
      // Treasure guarantees one prize the mimic doesn't know yet (counting this meal's learning)
      const prize = target.treasure
        ? pickTreasurePrize(target.treasure, [...character.learnedMaterials, ...matsToLearn], [...character.learnedTraits, ...traitsToLearn])
        : null;
      if (prize?.kind === "material") matsToLearn.push(prize.name);
      if (prize?.kind === "trait") traitsToLearn.push(prize.name);
      const sankWithShip = target.name === "Ship's Captain" && !character.downWithTheShipReached;

      setParty(prev => prev.map(a => a.id === target.id ? { ...a, isConsumed: true, isAlive: false } : a));
      addEvent("consume", `${target.name} has been consumed! +${apGained - (target.treasure?.ap ?? 0)} Assimilation Points.`);
      if (target.treasure) {
        addEvent("consume", `You swallow ${target.treasure.description} along with them. +${target.treasure.ap} AP.`);
        if (prize) {
          addEvent("evolve", `The strongbox cracks open inside you: ${prize.name}! New ${prize.kind} learned.`);
        } else {
          const shrugs = [
            "The strongbox holds nothing you haven't tasted before. You keep it anyway. It's a nice box.",
            "Coins, a silver comb, a crystal stopper — all old flavors to you now. The box itself is the best part.",
            "You rattle the strongbox around inside you. Nothing new. The captain was clearly overpaying for security.",
          ];
          addEvent("info", shrugs[Math.floor(Math.random() * shrugs.length)]);
        }
      }
      if (sankWithShip) {
        addEvent("evolve", `⚓ Down With the Ship! The captain never did abandon ship.`);
      }
      if (othersRemain) {
        // A party member vanished; anyone still in the room watched it happen
        const gain = consumeSuspicion(witnessCount);
        setSuspicion(s => { const n = Math.min(s + gain, 10); if (n >= 10) triggerHuntEnd(); return n; });
        if (witnessCount === 0) {
          addEvent("alert", `One of the party has vanished — the others grow uneasy. (+${gain} suspicion)`);
        } else {
          // Witnesses catch only a glimpse: they know something happened here, not what or who
          const glimpses = witnessCount === 1
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
      if (learnedNewMats.length > 0) addEvent("evolve", `New materials absorbed: ${learnedNewMats.join(", ")}!`);
      if (learnedNewTraits.length > 0) addEvent("evolve", `New traits assimilated: ${learnedNewTraits.join(", ")}!`);
      if (learnedNewMats.length === 0 && learnedNewTraits.length === 0 && (matsToLearn.length > 0 || traitsToLearn.length > 0)) {
        addEvent("info", `The prey yields nothing new — you already know these materials.`);
      }

      // Titanic Feast: track Cloud Kingdom giants consumed whole
      const isFeastGiant = !target.isCompanion && TITANIC_FEAST_GIANTS.includes(target.name);
      const giantsConsumedWhole = isFeastGiant && !character.giantsConsumedWhole.includes(target.name)
        ? [...character.giantsConsumedWhole, target.name]
        : character.giantsConsumedWhole;
      const feastNowComplete = !character.titanicFeastReached && isTitanicFeastComplete(giantsConsumedWhole);
      if (isFeastGiant && giantsConsumedWhole !== character.giantsConsumedWhole && !feastNowComplete) {
        addEvent("evolve", `Giant consumed whole: ${giantsConsumedWhole.length}/${TITANIC_FEAST_GIANTS.length} toward the Titanic Feast.`);
      }
      if (feastNowComplete) {
        addEvent("evolve", `🍖 Titanic Feast! You have swallowed every giant of the Cloud Kingdom whole.`);
      }

      const updatedChar = {
        ...character,
        assimilationPoints: (character.assimilationPoints || 0) + apGained,
        learnedMaterials: [...new Set([...(character.learnedMaterials || []), ...matsToLearn])],
        learnedTraits: [...new Set([...(character.learnedTraits || []), ...traitsToLearn])],
        giantsConsumedWhole,
        titanicFeastReached: character.titanicFeastReached || feastNowComplete,
        downWithTheShipReached: character.downWithTheShipReached || sankWithShip,
        adventurersEaten: withDiscovered(character.adventurersEaten, [target]),
        partyMembersEaten: character.partyMembersEaten + 1,
        biggestMeal: withBiggestMeal(character.biggestMeal, target.name, apGained),
      };
      noteMeal(target.name, apGained);
      setCharacter(updatedChar);
      persist({
        assimilationPoints: updatedChar.assimilationPoints,
        learnedMaterials: updatedChar.learnedMaterials,
        learnedTraits: updatedChar.learnedTraits,
        giantsConsumedWhole: updatedChar.giantsConsumedWhole,
        titanicFeastReached: updatedChar.titanicFeastReached,
        downWithTheShipReached: updatedChar.downWithTheShipReached,
        adventurersEaten: updatedChar.adventurersEaten,
        partyMembersEaten: updatedChar.partyMembersEaten,
        biggestMeal: updatedChar.biggestMeal,
        lastFedAt: new Date().toISOString(),
      });

      const cfg = TIER_CONFIG[character.tier];
      if (updatedChar.assimilationPoints >= cfg.apToEvolve) {
        addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
        setPhase("evolve");
      }
    } else {
      const lungePenalty = hasMagic(character.currentAppearance, "Dragonhide") ? 3 : 4;
      setSuspicion(s => { const n = Math.min(s + lungePenalty, 10); if (n >= 10) triggerHuntEnd(); return n; });
      addEvent("alert", `${target.name} saw you lunge — they've seen your true nature! (+${lungePenalty} suspicion${lungePenalty < 4 ? ", softened by your Dragonhide" : ""})`);
      if (target.behavior === "elusive") {
        boltAway(target, 3);
      } else {
        setParty(prev => prev.map(a => a.id === target.id ? { ...a, isAttracted: false, suspicion: a.suspicion + 3 } : a));
      }
    }
    setActing(false);
    return true;
  };

  const doStrikeTurn = () => {
    beginTurn();
    if (resolveStrike()) advanceShip();
  };

  const doConsumeCreature = (creature: SmallCreature) => {
    if (!character) return;
    beginTurn();
    addEvent("consume", `You snap up the ${creature.name} — a modest feast. +${creature.ap} AP.`);
    setSmallCreatures(prev => prev.map(c => c.uid === creature.uid ? { ...c, isConsumed: true } : c));
    noteMeal(creature.name, creature.ap);
    setActionCount(0); // Eating resets the stagnation counter
    const updatedChar = {
      ...character,
      assimilationPoints: (character.assimilationPoints || 0) + creature.ap,
    };
    setCharacter(updatedChar);
    persist({ assimilationPoints: updatedChar.assimilationPoints, lastFedAt: new Date().toISOString() });
    const cfg = TIER_CONFIG[character.tier];
    if (updatedChar.assimilationPoints >= cfg.apToEvolve) {
      addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
      setPhase("evolve");
    }
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
      setSuspicion(s => {
        const next = Math.min(s + 1, 10);
        if (next >= 10) triggerHuntEnd();
        return next;
      });
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
    if (newCount >= ACTION_LIMIT) {
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

    // Compute adventurer movement SYNCHRONOUSLY before any setState
    const currentParty = party;
    const currentMimicRoom = mimicRoom;
    const currentRivals = rivals;

    const newlyArrived: PartyMember[] = [];
    const updatedParty = currentParty.map(adv => {
      if (!adv.isAlive || adv.isConsumed) return adv;
      if (isStationary(adv)) return adv;
      if (Math.random() < 0.5) return adv;
      const adjacent = getAdjacentRooms(location, adv.location);
      const candidates = adjacent.length > 0 ? adjacent : location.rooms;
      const newRoom = candidates[Math.floor(Math.random() * candidates.length)];
      if (newRoom !== adv.location) {
        // Rival mimic: silently consume this adventurer if they move into the rival's room
        const lurker = rivalInRoom(currentRivals, newRoom);
        if (lurker) {
          // The rival eats them — adventurer silently vanishes with a cryptic message
          const crypticMessages = [
            `${adv.name} heads toward the ${newRoom}... and does not emerge.`,
            `A muffled sound comes from the ${newRoom}. ${adv.name} never reappears.`,
            `${adv.name} rounds the corner into the ${newRoom}. Silence follows.`,
            `You hear ${adv.name}'s footsteps enter the ${newRoom} — then stop abruptly.`,
            `Something in the ${newRoom} has ${adv.name}'s attention. They do not return.`,
          ];
          addEvent("alert", crypticMessages[Math.floor(Math.random() * crypticMessages.length)]);
          setRivals(prev => prev.map(r => r.id === lurker.id ? { ...r, clueGiven: true } : r));
          return { ...adv, isAlive: false, isConsumed: false, isDisappeared: true, location: newRoom };
        }
        addEvent("info", `${adv.name} moves from the ${adv.location} to the ${newRoom}.`);
        if (newRoom === currentMimicRoom) {
          newlyArrived.push({ ...adv, location: newRoom });
        }
      }
      return { ...adv, location: newRoom, isAttracted: false };
    });

    setParty(updatedParty);

    countStillTurn(newlyArrived.length > 0);

    // Auto stealth check for adventurers who just wandered into the mimic's room
    if (newlyArrived.length > 0) {
      const suspDelta = runStealthChecks(newlyArrived, currentMimicRoom);
      if (suspDelta > 0) {
        setSuspicion(s => {
          const next = Math.min(s + suspDelta, 10);
          if (next >= 10) triggerHuntEnd();
          return next;
        });
      }
    }

    // Small creatures also wander
    setSmallCreatures(prev => prev.map(c => {
      if (c.isConsumed) return c;
      if (Math.random() < 0.6) return c;
      const adjacent = getAdjacentRooms(location, c.location);
      const candidates = adjacent.length > 0 ? adjacent : location.rooms;
      const newRoom = candidates[Math.floor(Math.random() * candidates.length)];
      return { ...c, location: newRoom };
    }));

    checkActionLimit(newCount);
    advanceShip();
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

  const displayCharacter = character && previewAchievements
    ? {
        ...character,
        hatboxToLegendReached: true, apexPeakReached: true, titanicFeastReached: true, downWithTheShipReached: true,
        conversions: Math.max(character.conversions, CULT_CONVERSIONS),
        mimicsConsumed: Math.max(character.mimicsConsumed, CANNIBAL_MIMICS),
        adventurersEaten: ADVENTURER_TEMPLATES.map(t => t.name),                            // Connoisseur
        learnedMaterials: [...ALL_MATERIALS],                                                // Master of Disguise
        learnedTraits: [...LEARNABLE_TRAITS],
        formsUsed: [...new Set([...character.formsUsed, ...VARIANT_FORMS.map(f => f.id)])], // Curiosity Cabinet
      }
    : character;
  // If a new achievement is added and the preview above doesn't earn it, say so
  if (import.meta.env.DEV && previewAchievements && displayCharacter) {
    const missed = ACHIEVEMENTS.filter(a => !a.isEarned(displayCharacter)).map(a => a.name);
    if (missed.length) console.warn(`Dev achievement preview doesn't cover: ${missed.join(", ")}`);
  }
  const activeAdventurers = party.filter(a => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared);
  // A nest hunt ends when its Elder is devoured (not when the adventurers run out);
  // any other hunt ends when no adventurers remain. Either way, wait for a ceremony to finish.
  const isNest = !!location?.rivalNest;
  const huntOver = phase === "hunt" && party.length > 0 && !ceremonyRunning &&
    (isNest ? isNestCleared(rivals) : activeAdventurers.length === 0);
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
        const announced: readonly string[] = ["connoisseur", "masterOfDisguise", "curiosityCabinet", "festive", "forAllSeasons"];
        if (announced.includes(a.id) && earned.has(a.id) && !earnedRef.current.has(a.id)) {
          addEvent("evolve", `${a.icon} ${a.name}! ${a.flavor(character.name)}`);
        }
      }
    }
    earnedRef.current = earned;
  }, [character, addEvent]);
  const consumedCount = party.filter(a => a.isConsumed).length;

  // Mass-below-tier plausibility penalty
  const getMassPenalty = () => {
    if (!character) return 0;
    const tierIdx = TIER_ORDER.indexOf(character.tier);
    const tierMin = TIER_CONFIG[character.tier]?.massRange[0] ?? 0;
    const oneTierBelowMin = tierIdx > 0 ? (TIER_CONFIG[TIER_ORDER[tierIdx - 1]]?.massRange[0] ?? 0) : 0;
    if (character.mass < oneTierBelowMin) return 2;
    if (character.mass < tierMin) return 1;
    return 0;
  };
  const massPenalty = getMassPenalty();
  const sickPlausibilityPenalty = (currentSickness?.penalties?.plausibility ?? 0);
  const sickAdhesionPenalty = (currentSickness?.penalties?.adhesion ?? 0);
  const sickPatiencePenalty = (currentSickness?.penalties?.patience ?? 0);
  const activeForm = character ? getActiveForm(character) : null;
  // Forms from an adjacent tier: –2 Plausibility (tier above, applied in stealthCheck) or –1 Patience (tier below)
  const formTierPenalties = activeForm && character ? getFormTierPenalties(effectiveFormTier(activeForm, formTier(character)), formTier(character)) : { plausibility: 0, patience: 0 };
  const effectiveAdhesion = Math.max(1, (character?.adhesion ?? 1) - sickAdhesionPenalty);
  const effectivePatience = Math.max(1, (character?.patience ?? 1) - sickPatiencePenalty - formTierPenalties.patience);
  const cfg = character ? TIER_CONFIG[character.tier] : null;
  const apProgress = cfg && character ? Math.min((character.assimilationPoints / cfg.apToEvolve) * 100, 100) : 0;

  // Seasonal forms in season for this mimic that it isn't carrying yet (nudged on the setup screen)
  const seasonalHint = (() => {
    if (!character) return null;
    const carried = new Set<string>(character.forms.map(f => f.formId));
    const fresh = getSeasonalForms(formTier(character), today()).filter(f => !carried.has(f.id));
    const holiday = fresh[0]?.holiday;
    if (!holiday) return null;
    const names = fresh.map(f => `a ${f.name}`);
    return { holiday: HOLIDAYS[holiday], names: names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0] };
  })();

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
    sank: !!location.sinkingTurns && shipTurn >= location.sinkingTurns,
  }) : null;

  // Screen effects for the latest turn (the CSS lives under HUNT EFFECTS in index.css):
  // jaws for a meal, a jolt when prey gets away, torchlight when you're found out.
  const latestTurn = events.at(-1)?.turn ?? 0;
  const latestTypes = new Set(events.filter(e => e.turn === latestTurn).map(e => e.type));
  const fx = phase === "gameover" && gameoverReason === "discovered" ? "discovered"
    : latestTypes.has("consume") ? "chomp"
    : latestTypes.has("escape") ? "shake"
    : null;

  // Filter locations by minTier and minMass
  const availableLocations = character
    ? LOCATIONS.filter(loc => isLocationAvailable(loc, character.tier, character.mass, character.rareLocation))
    : [];

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

  return (
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
      {MassDecayBanner}
      {SeasonBanner}
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

      {showSheet && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSheet(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CharacterSheet character={displayCharacter ?? character} onClose={() => setShowSheet(false)} />
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Status */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="fx-shake p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-xs text-muted-foreground uppercase tracking-wide">Active Form</span>
                {activeForm ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 border text-[11px]">{activeForm.name}</Badge>
                ) : (
                  <span className="text-xs text-destructive">None</span>
                )}
              </div>
              {activeForm && (
                <p className="text-xs text-muted-foreground flavor-text italic mb-1">{activeForm.description}</p>
              )}
              {activeForm && activeForm.builtInTraits.length > 0 && (
                <p className="text-[11px] text-muted-foreground mb-1">
                  Built-in: <span className="text-primary">{activeForm.builtInTraits.join(", ")}</span>
                </p>
              )}
              {/* Current appearance summary */}
              {character.currentAppearance && (() => {
                const app = character.currentAppearance;
                const mats = [...(app.primaryMaterials || []), ...(app.secondaryMaterials || [])];
                const traits = [...(app.surfaceTraits || []), ...(app.symbolicTraits || []), ...(app.conditionTraits || []), ...(app.scentTraits || [])];
                if (mats.length === 0 && traits.length === 0) return null;
                return (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    {mats.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {mats.map(m => (
                          <span key={m} className="text-[10px] bg-accent/20 text-accent-foreground rounded px-1.5 py-0.5 border border-accent/20">{m}</span>
                        ))}{traits.length > 0 && (<>{traits.map(t => (
                          <span key={t} className="text-[10px] bg-primary/10 text-primary/80 rounded px-1.5 py-0.5 border border-primary/20">{t}</span>
                        ))}</>)}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="space-y-2 pt-1 border-t border-border">
                <StatBar label="Plausibility" value={character.plausibility} max={6} color="bg-green-500"
                  penalty={massPenalty + (currentSickness?.penalties?.plausibility ?? 0) + formTierPenalties.plausibility}
                  penaltyLabel={currentSickness?.penalties?.plausibility ? `–${currentSickness.penalties.plausibility} ${currentSickness.name}` : null}
                  massPenalty={massPenalty}
                  formPenalty={formTierPenalties.plausibility}
                  formPenaltyNote="Your form is from the tier above — you can't quite match its appearance (stealth checks)."
                />
                <StatBar label="Adhesion" value={character.adhesion} max={6} color="bg-primary"
                  penalty={currentSickness?.penalties?.adhesion ?? 0}
                  penaltyLabel={currentSickness?.penalties?.adhesion ? `–${currentSickness.penalties.adhesion} ${currentSickness.name}` : null}
                />
                <StatBar label="Patience" value={character.patience} max={6} color="bg-purple-500"
                  penalty={(currentSickness?.penalties?.patience ?? 0) + formTierPenalties.patience}
                  penaltyLabel={currentSickness?.penalties?.patience ? `–${currentSickness.penalties.patience} ${currentSickness.name}` : null}
                  formPenalty={formTierPenalties.patience}
                  formPenaltyNote="Your form is from the tier below — too much mass in a small space makes you restless."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="fx-shake bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <SuspicionMeter value={suspicion} max={10} />
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-cinzel uppercase tracking-wide text-[11px]">Assimilation</span>
                  <span className="text-foreground font-bold">{character.assimilationPoints} AP</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${apProgress}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 text-right">
                  {`${character.assimilationPoints} / ${cfg?.apToEvolve} AP`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* TEMPORARY (dev builds only): preview every achievement's banner and sheet entry.
              Display only — nothing is saved. Remove once the banners have been reviewed. */}
          {import.meta.env.DEV && phase === "hunt" && character && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] border-dashed border-amber-400/40 text-amber-400/80"
              onClick={() => setPreviewAchievements(p => !p)}
            >
              🛠 Dev: {previewAchievements ? "stop previewing achievements" : "preview all achievements (not saved)"}
            </Button>
          )}
          {/* TEMPORARY (dev builds only): preview the unused DiceRollDisplay component with a sample
              Strike, to decide whether to show rolls in the hunt. Remove once decided. */}
          {import.meta.env.DEV && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[10px] border-dashed border-amber-400/40 text-amber-400/80"
                onClick={() => setDicePreview(p => p ? null : rollDicePreview(character?.adhesion ?? 4))}
              >
                🛠 Dev: {dicePreview ? "hide dice preview" : "preview dice"}
              </Button>
              {dicePreview && (
                <Card className="bg-card border-dashed border-amber-400/40">
                  <CardContent className="p-3 space-y-3">
                    <DiceRollDisplay rolls={dicePreview.mimic.rolls} label={`Your Strike (Adhesion ${dicePreview.mimic.rolls.length}d6)`} animate />
                    <DiceRollDisplay rolls={dicePreview.target.rolls} label="Captain resists (4d6 + 1 Elusive die)" color="text-destructive" animate />
                    <p className="text-xs text-muted-foreground">
                      {dicePreview.mimic.total >= dicePreview.target.total ? "✓ The Strike lands." : "✗ The Captain slips free."}
                    </p>
                    <Button variant="outline" size="sm" className="w-full text-[10px]"
                      onClick={() => setDicePreview(rollDicePreview(character?.adhesion ?? 4))}>
                      Re-roll
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Rival mimic / nest status */}
          {phase === "hunt" && !huntOver && rivals.some(r => !r.consumed) && (() => {
            const remaining = rivals.filter(r => !r.consumed);
            const exposed = remaining.filter(r => r.revealed);
            const tracked = remaining.some(r => r.clueGiven && !r.revealed);
            const devoured = rivals.filter(r => r.consumed).length;
            const elder = remaining.find(r => r.kind === "elder");
            return (
              <Card className={`border ${exposed.length > 0 ? "border-orange-400/50 bg-orange-400/5" : "border-purple-400/20 bg-card"}`}>
                <CardContent className="p-3 space-y-1">
                  <p className="font-cinzel text-xs text-orange-400/90">{isNest ? "🕸 The Nest" : "⚠ Rival Mimic"}</p>
                  {isNest && (
                    <p className="text-[11px] text-muted-foreground">
                      Mimics devoured: {devoured}{elder && !elder.revealed ? " · The Elder still hides." : ""}
                    </p>
                  )}
                  {exposed.map(r => (
                    <p key={r.id} className="text-[11px] text-orange-400/80">
                      {r.kind === "elder" ? "The Elder Mimic" : `A ${RIVAL_STATS[r.kind].name}`} is exposed in the <span className="font-bold">{r.room}</span>. Strike to devour it!
                    </p>
                  ))}
                  {tracked && (
                    <p className="text-[11px] text-muted-foreground italic">Something consumed one of the party. Track the predator — relocate to where they vanished.</p>
                  )}
                  {!tracked && exposed.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 italic">A presence lurks... Wait and observe.</p>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Sinking ship status */}
          {phase === "hunt" && !huntOver && location?.sinkingTurns && (() => {
            const left = location.sinkingTurns - shipTurn;
            const urgent = left <= 3;
            return (
              <div className={`px-3 py-2 rounded border text-xs ${urgent ? "border-destructive/40 bg-destructive/5 text-destructive/80" : "border-sky-400/30 bg-sky-400/5 text-sky-400/80"}`}>
                <span className="font-cinzel">🌊 {left} {left === 1 ? "turn" : "turns"} until she goes under</span>
                <div className="h-1 mt-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${urgent ? "bg-destructive/70" : "bg-sky-400/60"} transition-all duration-500`} style={{ width: `${(shipTurn / location.sinkingTurns) * 100}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Action counter warning */}
          {phase === "hunt" && ACTION_LIMIT - actionCount <= ACTION_WARNING && (
            <div className={`px-3 py-2 rounded border text-xs ${ACTION_LIMIT - actionCount <= ACTION_WARNING / 2 ? "border-destructive/40 bg-destructive/5 text-destructive/80" : "border-yellow-400/30 bg-yellow-400/5 text-yellow-400/80"}`}>
              <span className="font-cinzel">⏳ {ACTION_LIMIT - actionCount} actions remaining</span>
              <p className="text-[11px] mt-0.5 opacity-70">The adventurers grow restless. Strike soon or they will leave.</p>
            </div>
          )}

          {/* Party list or room map: one card, click it to switch (remembered per mimic) */}
          {phase !== "setup" && location && mimicRoom && party.length > 0 && (() => {
            const showMap = character.sidebarView === "map";
            const counts = `(${activeAdventurers.length} active / ${consumedCount} consumed)`;
            return (
              <Card
                role="button"
                tabIndex={0}
                aria-label={showMap ? "Show the party list" : "Show the room map"}
                onClick={toggleSidebarView}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSidebarView(); }
                }}
                className={"sidebar-view-card bg-card border-border fx-shake"}
              >
                <CardHeader className={`${showMap ? "pb-2" : "pb-1"} pt-3 px-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xs font-cinzel text-muted-foreground uppercase tracking-wide">
                      {showMap ? <>{location.name} <span className="normal-case tracking-normal">{counts}</span></> : <>Party {counts}</>}
                    </CardTitle>
                    {showMap
                      ? <span className="view-toggle-icon" aria-hidden>Aa</span>
                      : <span className="view-toggle-icon view-toggle-map" aria-hidden><i /><i /><i /><i /><i /><i /></span>}
                  </div>
                </CardHeader>
                {showMap ? (
                  <CardContent className="px-4 pb-4">
                    <RoomMap
                      location={location}
                      mimicRoom={mimicRoom}
                      lureRange={getAllureRange()}
                      adventurers={activeAdventurers}
                      creatures={smallCreatures.filter(c => !c.isConsumed)}
                      rivals={rivals}
                      formName={activeForm?.name}
                    />
                  </CardContent>
                ) : (
                  <CardContent className="px-4 pb-3 space-y-2">
                    {party.map(adv => {
                      const dist = mimicRoom && location && adv.isAlive && !adv.isConsumed
                        ? getRoomDistance(location, mimicRoom, adv.location) : null;
                      const inRange = dist !== null && dist <= getAllureRange();
                      const fled = adv.fled && !adv.isConsumed;
                      const disappeared = adv.isDisappeared && !adv.isConsumed;
                      const maxHits = adv.constitution || 3;
                      return (
                        <div key={adv.id} className={`text-xs flex items-center justify-between ${adv.isConsumed || fled || disappeared ? "opacity-40" : ""}`}>
                          <span className={
                            adv.isConsumed ? "line-through text-muted-foreground" :
                            fled ? "text-muted-foreground italic" :
                            disappeared ? "text-purple-400/60 italic" :
                            adv.isAttracted ? "text-yellow-400" : "text-foreground"
                          }>
                            {adv.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {fled && <span className="text-[10px] text-muted-foreground">Fled</span>}
                            {disappeared && <span className="text-[10px] text-purple-400/60">Disappeared</span>}
                            {adv.isConsumed && <span className="text-[10px] text-muted-foreground">Consumed</span>}
                            {adv.isAttracted && !adv.isConsumed && (
                              <Badge className="text-[10px] bg-yellow-400/10 text-yellow-400 border-yellow-400/20 border px-1 py-0">Attracted</Badge>
                            )}
                            {(adv.hitsTaken ?? 0) > 0 && !adv.isConsumed && !fled && (
                              <span className="text-[10px] text-destructive/70">{maxHits - (adv.hitsTaken ?? 0)}/{maxHits}hp</span>
                            )}
                            {dist !== null && (
                              <span title={adv.location} className={`text-[10px] whitespace-nowrap ${inRange ? "text-green-400/80" : "text-muted-foreground"}`}>
                                <span className="inline-block max-w-[6.5rem] truncate align-bottom">{adv.location}</span> ({dist})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })()}

        </div>

        {/* Center: Main action area */}
        <div className="lg:col-span-2 space-y-4">

          {/* SETUP phase */}
          {phase === "setup" && !roomSelecting && (
            <div>
              <h2 className="font-cinzel text-xl text-foreground mb-1">Choose Your Hunting Ground</h2>
              <p className="text-muted-foreground text-sm mb-1 flavor-text italic">Where will you lie in wait?</p>
              {character && TIER_ORDER.indexOf(character.tier) < TIER_ORDER.indexOf("Grand") && (
                <p className="text-[11px] text-muted-foreground/60 mb-4 italic">Wilderness territories unlock at Grand tier and beyond.</p>
              )}
              {seasonalHint && (
                <button
                  onClick={() => startFormSelection("setup")}
                  data-holiday={seasonalHint.holiday.id}
                  className="holiday-card w-full text-left mb-4 px-3 py-2 rounded-lg border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="holiday-badge text-xs font-cinzel">{seasonalHint.holiday.icon} {seasonalHint.holiday.name}</span>
                  {" "}· Something in the air: you could take the shape of {seasonalHint.names}. <span className="text-primary">Choose forms →</span>
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...availableLocations].sort((a, b) => Number(!!b.rare) - Number(!!a.rare)).map(loc => (
                  <Card
                    key={loc.id}
                    onClick={() => chooseLocation(loc)}
                    className={`cursor-pointer bg-card transition-all group ${loc.rare
                      ? "border-amber-400/50 hover:border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                      : "border-border hover:border-primary/40"}`}
                  >
                    <CardContent className="p-4">
                      {character && <BurnBadge huntsLeft={locationBurn(character, loc.id)} />}
                      {loc.rare && character?.rareLocation && (
                        <p className="text-[11px] font-cinzel uppercase tracking-wide text-amber-400 mb-1">
                          ✦ Rare · leaves after {character.rareLocation.huntsLeft} more {character.rareLocation.huntsLeft === 1 ? "hunt" : "hunts"} elsewhere
                        </p>
                      )}
                      <h3 className="font-cinzel text-foreground group-hover:text-primary transition-colors mb-1">{loc.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{loc.description}</p>
                      <p className="flavor-text text-[11px] text-muted-foreground/70 italic mb-3 line-clamp-2">{loc.flavorText}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {loc.partySize[0]}–{loc.partySize[1]} adventurers
                        </span>
                        {loc.advantageTags.slice(0, 2).map(t => (
                          <span key={t} className="text-[11px] text-primary border border-primary/20 bg-primary/5 rounded px-1.5 py-0.5">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ROOM SELECTION phase */}
          {roomSelecting && location && (
            <div>
              <h2 className="font-cinzel text-xl text-foreground mb-1">{location.name}</h2>
              <p className="text-muted-foreground text-sm mb-1 flavor-text italic">{location.flavorText}</p>
              <p className="text-xs text-muted-foreground mb-4">Choose the room where you will take your form and wait.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {location.rooms.map(room => {
                  const adjacent = getAdjacentRooms(location, room);
                  return (
                    <Card
                      key={room}
                      onClick={() => confirmRoom(room, location)}
                      className="cursor-pointer border-border hover:border-primary/40 bg-card transition-all group"
                    >
                      <CardContent className="p-4">
                        <h3 className="font-cinzel text-sm text-foreground group-hover:text-primary transition-colors mb-1">{room}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          Adjacent: {adjacent.join(", ")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <button
                onClick={() => { setRoomSelecting(false); setLocation(null); }}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
              >
                ← Back to location select
              </button>
            </div>
          )}

          {/* HUNT phase */}
          {phase === "hunt" && (
            <div className="space-y-4">
              {isBountyHunt && (
                <div className="p-3 bg-destructive/10 border border-destructive/40 rounded-lg">
                  <p className="font-cinzel text-destructive text-sm font-bold mb-0.5">⚠ Bounty Hunt</p>
                  <p className="text-xs text-destructive/80">
                    A bounty has been placed on <span className="font-bold">{character?.name}</span>. These hunters know your kind intimately — they will be extremely difficult to deceive.
                  </p>
                </div>
              )}
              {currentSickness && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg">
                  <p className="font-cinzel text-amber-400 text-sm font-bold mb-0.5">☠ {currentSickness.name}</p>
                  <p className="text-xs text-amber-400/80 flavor-text italic mb-1">{currentSickness.flavorText}</p>
                  <p className="text-xs text-amber-400/70">
                    {Object.entries(currentSickness.penalties).map(([k, v]) => `–${v} ${k}`).join(" · ")} — this hunt only.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-cinzel text-xl text-foreground">{location?.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-muted-foreground">{activeAdventurers.length} adventurers remain</p>
                    {mimicRoom && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-primary/80 font-cinzel">You: {mimicRoom}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-yellow-400/70">Lure range: {getAllureRange()} rooms</span>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPhase("setup")} disabled={ceremonyRunning} className="text-xs border-border gap-1">
                  <RefreshCw className="w-3 h-3" /> New Hunt
                </Button>
              </div>

              {/* Form & Appearance quick-change */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowFormPanel(!showFormPanel); setShowAppearancePanel(false); setShowMovePanel(false); }}
                  className="text-xs border-border gap-1 flex-1"
                >
                  <Layers className="w-3 h-3" /> Change Form
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowAppearancePanel(!showAppearancePanel); setShowFormPanel(false); setShowMovePanel(false); }}
                  className="text-xs border-border gap-1 flex-1"
                >
                  <Palette className="w-3 h-3" /> Appearance
                </Button>
              </div>

              {/* Form switcher panel */}
              {showFormPanel && character.forms.length > 0 && (
                <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground font-cinzel uppercase tracking-widest">Select Active Form (costs 1 suspicion)</p>
                  {character.forms.map((ref, i) => {
                    const form = ALL_FORMS.find(f => f.id === ref.formId);
                    if (!form) return null;
                    const isActive = i === (character.activeFormIndex ?? 0);
                    return (
                      <button
                        key={ref.formId}
                        onClick={() => !isActive && doChangeForm(i)}
                        data-holiday={form.holiday}
                        className={`${form.holiday ? "holiday-card" : ""} w-full text-left px-3 py-2 rounded border text-xs transition-all ${
                          isActive ? "border-primary bg-primary/10 text-primary cursor-default" :
                          "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-cinzel">{form.name}</span>
                          <div className="flex gap-1">
                            <span className="text-[10px] border border-border rounded px-1">{effectiveFormTier(form, formTier(character))}</span>
                            {isActive && <span className="text-[10px] text-primary">Active</span>}
                          </div>
                        </div>
                        <HolidayBadge form={form} />
                        <p className="text-[11px] text-muted-foreground mt-0.5">{form.description}</p>
                        <div className="mt-1"><BurnBadge huntsLeft={formBurn(character, form.id)} /></div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Appearance panel */}
              {showAppearancePanel && (
                <AppearanceEditor
                  character={character}
                  onSave={doUpdateAppearance}
                  onClose={() => setShowAppearancePanel(false)}
                  onDevToggleLearnedMaterial={import.meta.env.DEV ? devToggleLearnedMaterial : undefined}
                />
              )}

              {/* Relocate panel */}
              {showMovePanel && (() => {
                if (!location || !mimicRoom) return null;
                const adjacentRooms = getAdjacentRooms(location, mimicRoom);
                const openRooms = adjacentRooms.filter(room =>
                  !activeAdventurers.some(a => a.location === room)
                );
                return (
                  <div className="bg-muted/20 border border-blue-400/20 rounded-lg p-3 space-y-2">
                    <p className="text-[11px] text-blue-400/70 font-cinzel uppercase tracking-widest">Relocate — Choose Destination</p>
                    {openRooms.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">There are too many people nearby — moving now would be too risky.</p>
                    ) : (
                      openRooms.map(room => (
                        <button
                          key={room}
                          onClick={() => doRelocate(room)}
                          className="w-full text-left px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:border-blue-400/40 hover:text-foreground transition-all"
                        >
                          <span className="font-cinzel">{room}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">(+1 suspicion)</span>
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* Action buttons: a bar fixed to the bottom of the screen below lg, a 2×2 grid above */}
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
              <div className="h-1 bg-muted lg:hidden" aria-hidden><div className="action-bar-suspicion h-full" /></div>
              <div className="grid grid-cols-4 gap-2 p-2 lg:grid-cols-2 lg:gap-3 lg:p-0">
                <Button
                  onClick={() => {
                    const inMyRoom = activeAdventurers.filter(a => a.location === mimicRoom);
                    if (inMyRoom.length > 0) return; // disabled
                    setShowMovePanel(prev => !prev);
                    setShowFormPanel(false);
                    setShowAppearancePanel(false);
                  }}
                  disabled={acting || huntOver || activeAdventurers.some(a => a.location === mimicRoom)}
                  variant="outline"
                  className="h-auto py-2 lg:py-3 flex-col gap-1 border-border hover:border-blue-400/30 hover:text-blue-400"
                >
                  <MoveRight className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-cinzel">Relocate</span>
                  <span className="hidden lg:inline text-[11px] text-muted-foreground">Slip to empty room</span>
                </Button>
                <Button
                  onClick={doAllureTurn}
                  disabled={acting || huntOver || activeAdventurers.length === 0}
                  variant="outline"
                  className="h-auto py-2 lg:py-3 flex-col gap-1 border-border hover:border-yellow-400/30 hover:text-yellow-400"
                >
                  <Zap className="w-5 h-5 text-yellow-400/70" />
                  <span className="text-xs font-cinzel">Lure</span>
                  <span className="hidden lg:inline text-[11px] text-muted-foreground">Attract adventurers</span>
                </Button>
                <Button
                  onClick={doStrikeTurn}
                  disabled={acting || huntOver || (!party.some(a => a.isAlive && !a.isConsumed && a.isAttracted) && !rivalInRoom(rivals, mimicRoom)?.revealed)}
                  className="h-auto py-2 lg:py-3 flex-col gap-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30"
                  variant="ghost"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-xs font-cinzel">Strike!</span>
                  <span className="hidden lg:inline text-[11px]">Consume attracted prey</span>
                </Button>
                <Button
                  onClick={doWaitTurn}
                  disabled={acting || huntOver}
                  variant="outline"
                  className="h-auto py-2 lg:py-3 flex-col gap-1 border-border hover:border-purple-400/30"
                >
                  <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-cinzel">Wait</span>
                  <span className="hidden lg:inline text-[11px] text-muted-foreground">Rest & reduce suspicion</span>
                </Button>
              </div>
              </div>

              {/* Small creatures — only show those currently in mimic's room */}
              {(() => {
                const inRoom = smallCreatures.filter(c => !c.isConsumed && c.location === mimicRoom);
                if (inRoom.length === 0) return null;
                return (
                  <div className="bg-muted/10 border border-border rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground font-cinzel uppercase tracking-widest mb-2">
                      Creatures of Opportunity
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inRoom.map(creature => (
                        <button
                          key={creature.uid}
                          onClick={() => doConsumeCreature(creature)}
                          disabled={acting}
                          className="disabled:opacity-50 disabled:pointer-events-none text-xs px-3 py-1.5 rounded border border-border bg-card hover:border-primary/40 hover:text-primary transition-all text-muted-foreground"
                          title={creature.description}
                        >
                          {creatureEmoji(creature.name)} {creature.name} <span className="text-primary ml-1">+{creature.ap} AP</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {huntOver && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-primary font-cinzel mb-3">The hunt is over.</p>
                  {endReport && <div className="mb-4"><HuntReport report={endReport} /></div>}
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => startFormSelection("setup")} className="bg-primary text-primary-foreground hover:bg-primary/80 text-xs">
                      Choose New Forms
                    </Button>
                    <Button onClick={() => setPhase("setup")} variant="outline" className="border-border text-xs">
                      Hunt Again (Keep Forms)
                    </Button>
                  </div>
                </div>
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

          {/* EVOLVE phase */}
          {phase === "evolve" && (
            <div>
              <h2 className="font-cinzel text-2xl text-primary mb-2">Assimilation Threshold Reached</h2>
              <p className="flavor-text text-muted-foreground mb-6 italic">
                Your body strains with absorbed essence. Spend your assimilation — grow, or refine.
              </p>
              <p className="text-xs text-muted-foreground -mt-4 mb-6">
                Choose one. To upgrade again, you&apos;ll need to reach the threshold again ({character.assimilationPoints} / {cfg?.apToEvolve} AP).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { key: "mass", label: "Increase Mass", desc: `Grow toward the next tier. Cost: ${cfg?.apToEvolve} AP`, icon: "⬆", capped: false },
                  { key: "plausibility", label: "+1 Plausibility", desc: `Improve deception. Cost: ${cfg?.apToUpgrade} AP (${character.plausibility}/${STAT_CAP})`, icon: "👁", capped: character.plausibility >= STAT_CAP },
                  { key: "adhesion", label: "+1 Adhesion", desc: `Better grappling. Cost: ${cfg?.apToUpgrade} AP (${character.adhesion}/${STAT_CAP})`, icon: "🔒", capped: character.adhesion >= STAT_CAP },
                  { key: "patience", label: "+1 Patience", desc: `Longer stillness. Cost: ${cfg?.apToUpgrade} AP (${character.patience}/${STAT_CAP})`, icon: "⌛", capped: character.patience >= STAT_CAP },
                ] satisfies { key: UpgradeChoice; label: string; desc: string; icon: string; capped: boolean }[]).map(opt => (
                  <Card
                    key={opt.key}
                    onClick={() => !opt.capped && handleEvolution(opt.key)}
                    className={`border-border bg-card transition-all group ${opt.capped ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{opt.icon}</div>
                      <h3 className="font-cinzel text-foreground group-hover:text-primary transition-colors mb-1">{opt.label}</h3>
                      <p className="text-xs text-muted-foreground">{opt.capped ? "MAX — cannot increase further" : opt.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setPhase("hunt")}
                className="w-full mt-4 border-border text-muted-foreground hover:text-foreground text-xs"
              >
                Not Now — Continue Hunting
              </Button>
            </div>
          )}

          {/* GAME OVER */}
          {phase === "gameover" && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">{gameoverReason === "abandoned" ? "🌫️" : "🔥"}</div>
              <h2 className={`font-cinzel text-3xl mb-2 ${gameoverReason === "abandoned" ? "text-muted-foreground" : "text-destructive"}`}>
                {gameoverReason === "abandoned" ? "They Left" : "Discovered"}
              </h2>
              <p className="flavor-text text-muted-foreground mb-2 italic max-w-sm mx-auto">
                {gameoverReason === "abandoned"
                  ? "The adventurers found nothing of interest and moved on. Hunger remains."
                  : "Torches are lit. Steel is drawn. You scatter into the dark — this lair is burned."}
              </p>
              {endReport && <div className="my-6"><HuntReport report={endReport} /></div>}
              <p className="text-xs text-muted-foreground mb-6 max-w-xs mx-auto">
                {gameoverReason === "abandoned"
                  ? "Find a new hunting ground. Better forms and higher stats will help you lure more resistant prey."
                  : `This hunting ground and the form you were caught in are burned for ${BURN_HUNTS} hunts: using either starts you under suspicion (+${BURN_SUSPICION} each). Consider a new form.`}
              </p>
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={() => startFormSelection("setup")} className="bg-primary text-primary-foreground hover:bg-primary/80 w-48">
                  Change Forms & Hunt Again
                </Button>
                <Button onClick={() => setPhase("setup")} variant="outline" className="border-border w-48">
                  Hunt Again (Keep Forms)
                </Button>
                <Button asChild variant="ghost" className="text-muted-foreground w-48">
                  <Link to={createPageUrl("Home")}>Return Home</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Achievement banners */}
          {displayCharacter && (
            <AchievementBanners
              character={displayCharacter}
              huntingAt={phase === "hunt" ? location?.id ?? null : null}
              showAll={previewAchievements}
            />
          )}

          {/* Event log */}
          {phase !== "setup" && (
            <div className="fx-shake h-64">
              <EventLogPanel events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}