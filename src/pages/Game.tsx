import { useState, useEffect, useEffectEvent, useCallback, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { Appearance, FormRef, MimicCharacter, MimicCharacterInput } from "@/api/schemas/mimicCharacter";
import {
  ALL_FORMS, STAT_CAP, VARIANT_FORMS, ACHIEVEMENTS,
  notices, relocateRooms, minionRooms, placeMinion, today, dropExpiredSeasonalForms, isVariantUnlocked,
  getActiveForm, applyUpgrade, displayTier, type UpgradeChoice,
  activeAdventurers, huntCleared, beginHunt, relocate, lure, strike, canStrike, wait,
  eatCreature, eatStar, eatRemains, changeForm, changeAppearance,
  type Hunt, type LogLine, type TurnResult,
  type Form, type GameEvent, type GameEventType, type HuntLocation, type RoomName,
  // DEV ONLY (achievement-preview branch): the dev buttons below
  ADVENTURER_TEMPLATES, ALL_MATERIALS, LEARNABLE_TRAITS, LOCATIONS, SEASONAL_FORMS, HOLIDAYS, CULT_CONVERSIONS, CANNIBAL_MIMICS,
  TIME_TEAR_MAGIC_USERS, TIME_TEAR_MASS, tearInTimeOpen, ETERNAL_DECAY_FREE_DAYS, branchOnOpening, SOVEREIGN_MASS, sovereignOnGrowth, type Material, type HolidayId,
} from "@/data/gameData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DiceRollDisplay from "../components/game/DiceRollDisplay";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Home, BookOpen } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import EventLogPanel from "../components/game/EventLogPanel";
import CharacterSheet from "../components/game/CharacterSheet";
import AppearanceEditor from "../components/game/AppearanceEditor";
import FormSelector from "../components/game/FormSelector";
import { buildHuntReport } from "@/data/huntReportData";
import { AchievementBanners } from "../components/game/Achievements";
import { HuntContext, huntState } from "../components/game/hunt/HuntContext";
import StatusPanel from "../components/game/hunt/StatusPanel";
import LocationBanners from "../components/game/hunt/LocationBanners";
import PartyCard from "../components/game/hunt/PartyCard";
import { LocationSelect, RoomSelect } from "../components/game/hunt/LocationSelect";
import HuntHeader from "../components/game/hunt/HuntHeader";
import ActionBar from "../components/game/hunt/ActionBar";
import { FormSwitcher, MealsHere, MinionPanel, RelocatePanel } from "../components/game/hunt/HuntPanels";
import { EvolveScreen, GameOverScreen, HuntOverPanel } from "../components/game/hunt/EndScreens";
import { CEREMONY_STEP_MS, useDevotionCeremony } from "../components/game/hunt/useDevotionCeremony";
import { useHuntKeys } from "../components/game/hunt/useHuntKeys";
import { useLoadedMimic } from "../components/game/useLoadedMimic";

// ── Game-screen state types ──
type Phase = "setup" | "hunt" | "formSelect" | "evolve" | "gameover";

/** TEMPORARY: a sample Strike for the dev dice preview (your Adhesion vs. the Elusive Captain's 5 dice). */
interface DicePreview {
  mimic: { rolls: number[]; total: number };
  target: { rolls: number[]; total: number };
}
// DEV ONLY: main no longer has rollDiceVerbose, so the preview rolls its own
const rollDiceVerbose = (n: number) => {
  const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
};
const rollDicePreview = (adhesion: number): DicePreview => ({
  mimic: rollDiceVerbose(adhesion),
  target: rollDiceVerbose(5),
});

/** DEV ONLY: the debug date (localStorage "mm.debugDate", month-day) that today() pretends it is. */
const DEBUG_DATE_KEY = "mm.debugDate";
const readDebugDate = (): string => { try { return localStorage.getItem(DEBUG_DATE_KEY) ?? ""; } catch { return ""; } };

export default function Game({ ceremonyStepMs = CEREMONY_STEP_MS }: {
  /** How long each line of a Devotion ceremony waits (the tests shorten it). */
  ceremonyStepMs?: number;
} = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get("characterId");

  // The hunt in progress (or the last one, until the next begins). Every action takes it to the
  // next one: see src/data/hunt.ts and turns.ts.
  const [hunt, setHunt] = useState<Hunt | null>(null);
  // Where the next hunt will be, while its room is being picked
  const [pendingLocation, setPendingLocation] = useState<HuntLocation | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [showSheet, setShowSheet] = useState(false);
  // One purchase per visit to the upgrade screen; reset each time the screen opens
  const upgradeChosenRef = useRef(false);
  useEffect(() => {
    if (phase === "evolve") upgradeChosenRef.current = false;
  }, [phase]);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);
  const [roomSelecting, setRoomSelecting] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [massDecayNotice, setMassDecayNotice] = useState<string | null>(null); // shown once on load
  const [seasonNotice, setSeasonNotice] = useState<string | null>(null); // a seasonal form was lost
  const [branchNotice, setBranchNotice] = useState<string | null>(null); // a branch tier was taken
  // Where form selection returns to: the hunting-ground screen normally, or straight back
  // into the hunt when a mid-hunt tier-up forced the selection
  const [formSelectReturnPhase, setFormSelectReturnPhase] = useState<Phase>("setup");

  // The mimic to play, caught up on what happened while it was away (see useLoadedMimic)
  const { character, setCharacter, loading, loadError } = useLoadedMimic(characterId, opened => {
    setFormSelectReturnPhase("setup");
    // With no forms left (a season ended), choose new ones first
    setPhase(opened.character.forms.length ? "setup" : "formSelect");
    setMassDecayNotice(opened.massDecayNotice);
    if (opened.seasonNotice) setSeasonNotice(opened.seasonNotice);
    if (opened.branchNotice) setBranchNotice(opened.branchNotice);
  });

  // Every event is stamped with the turn it happened in, so the
  // screen effects can react to what the latest turn did. beginTurn() starts a new one.
  const turnRef = useRef(0);
  const beginTurn = () => { turnRef.current += 1; };
  const addLog = useCallback((lines: readonly LogLine[]) => {
    if (lines.length === 0) return;
    const turn = turnRef.current;
    setEvents(prev => [...prev, ...lines.map(l => ({ turn, ...l }))]);
  }, []);
  const addEvent = useCallback((type: GameEventType, message: string) => addLog([{ type, message }]), [addLog]);

  // Save changes to the character. The game never waits on this; a failed save is
  // reported in the event log instead of silently disappearing.
  const persist = (updates: Partial<MimicCharacterInput>) => {
    if (!character || Object.keys(updates).length === 0) return;
    db.entities.MimicCharacter.update(character.id, updates).catch((err: unknown) => {
      console.error("Failed to save character:", err);
      const message = err instanceof Error ? err.message : String(err);
      addEvent("alert", `⚠ Your progress could not be saved: ${message.split("\n")[0]}`);
    });
  };

  // Devotion (The Hollow Reliquary): once a devoted pilgrim is the last one left, it recognises
  // the mimic as the shrine's lost god, brings offerings and leaves. Checked after every action
  // that leaves the hunt going, and on coming back to it from the upgrade or form screen. The
  // ceremony plays out a line at a time (see useDevotionCeremony); actions and the end-of-hunt
  // panel wait until it finishes.
  const { running: ceremonyRunning, start: startDevotion } = useDevotionCeremony({
    onBegin: start => {
      beginTurn();
      setHunt(start.hunt);
      setCharacter(start.character);
      persist(start.changes);
    },
    // Each offering's AP is saved as it's accepted, like any meal (so leaving mid-ceremony keeps
    // what was given so far, and lifetime AP, which counts every rise, never runs ahead of it)
    onStep: (log, apNow) => {
      addLog(log);
      if (apNow === null) return;
      setCharacter(prev => prev ? { ...prev, assimilationPoints: apNow } : prev);
      persist({ assimilationPoints: apNow });
    },
    onEnd: ceremony => {
      persist(ceremony.changes);
      if (ceremony.evolve) setPhase("evolve");
    },
  }, ceremonyStepMs);

  /** Back to the hunt (from the upgrade or form screen), where a pilgrim may be waiting. */
  const returnToHunt = (c: MimicCharacter) => {
    setPhase("hunt");
    if (hunt) startDevotion(hunt, c);
  };

  /** Apply what an action did: the hunt, the character (saved), the log, and where the screen goes next. */
  const apply = (result: TurnResult) => {
    beginTurn();
    addLog(result.log);
    setHunt(result.hunt);
    setCharacter(result.character);
    persist(result.changes);
    // The move panel closes once you've moved, or once someone is in the room with you
    const crowded = activeAdventurers(result.hunt).some(a => a.location === result.hunt.mimicRoom);
    if (result.hunt.mimicRoom !== hunt?.mimicRoom || crowded) setShowMovePanel(false);
    if (result.hunt.ending) setPhase("gameover");
    else if (result.chooseForms) startFormSelection("hunt");
    else if (result.evolve) setPhase("evolve");
    else startDevotion(result.hunt, result.character);
  };

  /** Take a hunt action (see turns.ts). */
  // Only while the hunt is on: not once it's won or over, and not while a ceremony plays out
  const act = (action: (h: Hunt, c: MimicCharacter) => TurnResult) => {
    if (!hunt || !character || hunt.ending || huntCleared(hunt) || ceremonyRunning) return;
    apply(action(hunt, character));
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
    setHunt(null);
    setEvents([]);
    setPendingLocation(loc);
    setRoomSelecting(true);
  };

  // The mimic has picked its room: the hunt begins (see beginHunt)
  const confirmRoom = (room: RoomName, loc: HuntLocation) => {
    if (!character) return;
    setRoomSelecting(false);
    setPendingLocation(null);
    setPhase("hunt");
    apply(beginHunt(character, loc, room));
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

  const doRelocate = (room: RoomName) => { if (canRelocate) act((h, c) => relocate(h, c, room)); };
  const doLure = () => act(lure);
  const doStrike = () => act(strike);
  const doWait = () => act(wait);
  const doEatStar = () => act(eatStar);

  // Done with this hunt (it's over, or abandoned): its suspicion, sickness and panels go with it
  const leaveHunt = () => {
    setHunt(null);
    setShowMovePanel(false);
    setShowFormPanel(false);
    setShowAppearancePanel(false);
  };
  const backToSetup = () => {
    leaveHunt();
    setPhase("setup");
  };

  // Open form selection. returnTo is where confirming or skipping goes afterwards.
  const startFormSelection = (returnTo: Phase = "setup") => {
    setFormSelectReturnPhase(returnTo);
    setPhase("formSelect");
  };

  const leaveFormSelection = (c: MimicCharacter) => {
    if (formSelectReturnPhase === "hunt") returnToHunt(c);
    else setPhase(formSelectReturnPhase);
  };

  const confirmFormSelections = (selectedForms: Form[]) => {
    if (!character) return;
    const formRefs: FormRef[] = selectedForms.map(f => ({ formId: f.id, name: f.name, tier: f.tier, learned: true }));
    const updatedChar = { ...character, forms: formRefs, activeFormIndex: 0 };
    setCharacter(updatedChar);
    persist({ forms: formRefs, activeFormIndex: 0 });
    addEvent("info", `You reshape yourself. New forms prepared: ${formRefs.map(f => f.name).join(", ")}.`);
    leaveFormSelection(updatedChar);
  };

  const doChangeForm = (formIndex: number) => {
    act((h, c) => changeForm(h, c, formIndex));
    setShowFormPanel(false);
  };

  const doUpdateAppearance = (appearance: Appearance) => {
    act((h, c) => changeAppearance(h, c, appearance));
    setShowAppearancePanel(false);
  };

  // The left sidebar shows the room map or the party list; clicking it switches (saved per mimic)
  const toggleSidebarView = () => {
    if (!character) return;
    const sidebarView = character.sidebarView === "map" ? "party" : "map";
    setCharacter(prev => prev ? { ...prev, sidebarView } : prev);
    persist({ sidebarView });
  };

  // Spend AP on one upgrade (see applyUpgrade), then return to the hunt. Only one choice per
  // visit: to upgrade again you have to reach the AP threshold again.
  const handleEvolution = (choice: UpgradeChoice) => {
    if (!character || upgradeChosenRef.current) return;
    beginTurn();
    const result = applyUpgrade(character, choice);
    if (result.kind === "capped") {
      const label = result.stat.charAt(0).toUpperCase() + result.stat.slice(1);
      addEvent("info", `${label} is already at its maximum (${STAT_CAP}).`);
      return;
    }
    if (result.kind === "stat") {
      addEvent("evolve", `Your ${result.stat} increases to ${result.value}.`);
    } else if (result.kind === "grew") {
      addEvent("evolve", `Your mass increases to ${result.mass}.`);
      if (result.apexPeak) addEvent("evolve", `🏆 You have reached the Peak of the Apex tier — a living legend!`);
      if (result.branchLine) addEvent("evolve", result.branchLine);
    } else {
      addEvent("evolve", `🌟 You have evolved to ${result.tier} tier!`);
      if (result.hatboxToLegend) {
        addEvent("evolve", `📦 From Hatbox to Legend! You began as a Minor mimic and have risen all the way to Apex.`);
      }
      addEvent("evolve", `The strain of growth weakens your ${result.weakened.stat} by 1 (now ${result.weakened.value}). Choose your next hunts carefully.`);
      if (result.formsLost) {
        addEvent("evolve", `Some of your forms are no longer compatible with your new tier and have been lost. You must choose replacements.`);
      }
    }

    upgradeChosenRef.current = true;
    const updates = result.changes;
    const updated = { ...character, ...updates };
    setCharacter(updated);
    persist(updates);

    // Leave the upgrade screen right away. If forms were lost on tier-up, choose replacements
    // first: tier-ups happen while feeding, so that goes straight back to the hunt afterwards.
    if (result.kind === "evolved" && result.formsLost) {
      startFormSelection("hunt");
    } else {
      returnToHunt(updated);
    }
  };

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
        const announced: readonly string[] = ["connoisseur", "masterOfDisguise", "curiosityCabinet", "festive", "forAllSeasons", "seasonedTraveler", "stitchInTime", "closingTime", "longLiveTheKing"];
        if (announced.includes(a.id) && earned.has(a.id) && !earnedRef.current.has(a.id)) {
          addEvent("evolve", `${a.icon} ${a.name}! ${a.flavor(character.name)}`);
        }
      }
    }
    earnedRef.current = earned;
  }, [character, addEvent]);

  const location = hunt?.location ?? pendingLocation;
  const mimicRoom = hunt?.mimicRoom ?? null;
  const party = hunt?.party ?? [];
  const suspicion = hunt?.suspicion ?? 0;
  const active = hunt ? activeAdventurers(hunt) : [];
  const activeForm = getActiveForm(character);
  // Won, and any ceremony has finished playing out
  const huntOver = phase === "hunt" && !!hunt && !ceremonyRunning && huntCleared(hunt);
  const gameoverReason = hunt?.ending ?? "discovered";

  // What the world says about the hunt once it's over (all inputs are final by then)
  const endReport = character && hunt && (huntOver || phase === "gameover") ? buildHuntReport({
    ending: huntOver ? "cleared" : gameoverReason,
    seed: hunt.seed,
    locationName: hunt.location.name,
    lastRoom: hunt.mimicRoom,
    formName: activeForm?.name ?? null,
    tier: character.tier,
    mimicName: character.name,
    bounty: hunt.bounty,
    peakSuspicion: phase === "gameover" && gameoverReason === "discovered" ? 10 : hunt.peakSuspicion,
    biggestMeal: hunt.biggestMeal,
    party: hunt.party,
    mimicsDevoured: hunt.rivals.filter(r => r.consumed).length,
    sank: !!hunt.location.sinkingTurns && hunt.turn >= hunt.location.sinkingTurns,
    locationId: hunt.location.id,
    erupted: !!hunt.erupted,
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
  const acting = ceremonyRunning;
  // Relocating needs nobody watching here or there (a Moat Serpent doesn't count; see relocateRooms)
  const relocateTo = location && mimicRoom ? relocateRooms(location, party, mimicRoom) : [];
  const someoneInMyRoom = !!location && !!mimicRoom && party.some(a => notices(a) && a.location === mimicRoom);
  const canRelocate = !acting && !huntOver && !someoneInMyRoom;
  const canLure = !acting && !huntOver && active.length > 0;
  const canStrikeNow = !acting && !huntOver && !!hunt && canStrike(hunt);
  const canWait = !acting && !huntOver;
  // Changing form or look takes a turn too
  const canChange = !acting && !huntOver;
  // Empty rooms next door, in the order the Relocate panel lists (and numbers) them
  const toggleMovePanel = () => {
    if (!canRelocate) return;
    setShowMovePanel(prev => !prev);
    setShowFormPanel(false);
    setShowAppearancePanel(false);
  };

  // Keyboard shortcuts during a hunt: R / L / S / W, and 1–9 to pick a room while relocating
  useHuntKeys({
    enabled: phase === "hunt" && !showSheet,
    actions: {
      r: { can: canRelocate, run: toggleMovePanel },
      l: { can: canLure, run: doLure },
      s: { can: canStrikeNow, run: doStrike },
      w: { can: canWait, run: doWait },
    },
    numbered: showMovePanel ? { choices: relocateTo, can: canRelocate, choose: doRelocate, close: () => setShowMovePanel(false) } : null,
  });

  // ── DEV ONLY (achievement-preview branch) ──
  // TEMPORARY dev preview: show banners and the sheet as if every achievement were earned.
  // Only affects what's displayed (displayCharacter); the real character is never changed.
  const [previewAchievements, setPreviewAchievements] = useState(false);
  // TEMPORARY dev preview of DiceRollDisplay (see the button under the status panel)
  const [dicePreview, setDicePreview] = useState<DicePreview | null>(null);

  // Learn or unlearn a material for testing (saved). Used by the appearance editor's Thimblewood button.
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

  // Give or take away what opens the Tear in Time (saved), to check its card on the hunting-ground
  // screen. Giving makes the mimic Apex with at least TIME_TEAR_MASS mass and TIME_TEAR_MAGIC_USERS
  // magic users, on no branch; taking away clears the count (and Primordial, which keeps it open).
  const devToggleTear = () => {
    if (!character) return;
    const open = tearInTimeOpen(character) || character.branchTier === "Primordial";
    const updates: Partial<MimicCharacter> = open
      ? { timeTearCounter: 0, ...(character.branchTier === "Primordial" ? { branchTier: null } : {}) }
      : { tier: "Apex", mass: Math.max(character.mass, TIME_TEAR_MASS), timeTearCounter: Math.max(character.timeTearCounter, TIME_TEAR_MAGIC_USERS), branchTier: null };
    setCharacter(prev => prev ? { ...prev, ...updates } : prev);
    persist(updates);
  };

  // Give or take away Eternal (saved), to check the Long After and its card. Giving makes the mimic
  // Apex with ETERNAL_DECAY_FREE_DAYS without decay, on no branch, then lets the real rule make it
  // Eternal straight away (as opening the mimic would); taking away clears it and the stretch.
  // Give or take away Sovereign (saved), to check the Hollow Court and its card. Giving makes the
  // mimic Apex with at least SOVEREIGN_MASS, on no branch, then lets the real rule crown it (as
  // growing there would); taking away clears it and drops it just below, so the next growth
  // doesn't crown it again. Ruler of All Mimics stays earned, as it would in play.
  const devToggleSovereign = () => {
    if (!character) return;
    if (character.branchTier === "Sovereign") {
      const updates: Partial<MimicCharacter> = { branchTier: null, mass: Math.min(character.mass, SOVEREIGN_MASS - 1) };
      setCharacter(prev => prev ? { ...prev, ...updates } : prev);
      persist(updates);
      return;
    }
    const ready: Partial<MimicCharacter> = { tier: "Apex", branchTier: null, mass: Math.max(character.mass, SOVEREIGN_MASS) };
    const updates = { ...ready, ...sovereignOnGrowth({ ...character, ...ready }, ready.mass ?? SOVEREIGN_MASS)?.changes };
    setCharacter(prev => prev ? { ...prev, ...updates } : prev);
    persist(updates);
  };

  const devToggleEternal = () => {
    if (!character) return;
    const now = new Date();
    if (character.branchTier === "Eternal") {
      const updates: Partial<MimicCharacter> = { branchTier: null, decayFreeDate: now.toISOString() };
      setCharacter(prev => prev ? { ...prev, ...updates } : prev);
      persist(updates);
      return;
    }
    const days = (ETERNAL_DECAY_FREE_DAYS + 1) * 24 * 60 * 60 * 1000;
    const ready: Partial<MimicCharacter> = { tier: "Apex", branchTier: null, decayFreeDate: new Date(now.getTime() - days).toISOString() };
    const updates = { ...ready, ...branchOnOpening({ ...character, ...ready }, now)?.changes };
    setCharacter(prev => prev ? { ...prev, ...updates } : prev);
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
        formsUsed: [...new Set([
          ...character.formsUsed,
          ...VARIANT_FORMS.map(f => f.id),   // Curiosity Cabinet
          ...SEASONAL_FORMS.map(f => f.id),  // Festive, A Mimic for All Seasons
        ])],
        // Seasonal Traveler: a hunt at every seasonal location
        locationHuntCounts: {
          ...character.locationHuntCounts,
          ...Object.fromEntries(LOCATIONS.filter(l => l.holiday).map(l => [l.id, Math.max(character.locationHuntCounts[l.id] ?? 0, 1)])),
        },
        // The hidden ones. A mimic is only ever on one branch, so this shows Primordial (Eternal's
        // entry can't be earned alongside it; its banner still shows, see AchievementBanners showAll)
        branchTier: "Primordial" as const, sovereignReached: true, timeCasterEaten: true,
      }
    : character;
  // If a new achievement is added and the preview above doesn't earn it, say so (Eternal can't be: see above)
  if (import.meta.env.DEV && previewAchievements && displayCharacter) {
    const missed = ACHIEVEMENTS.filter(a => a.id !== "eternal" && !a.isEarned(displayCharacter)).map(a => a.name);
    if (missed.length) console.warn(`Dev achievement preview doesn't cover: ${missed.join(", ")}`);
  }

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
        <button aria-label="Dismiss" onClick={() => setMassDecayNotice(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
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
        <button aria-label="Dismiss" onClick={() => setSeasonNotice(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
      </div>
    </div>
  ) : null;

  // A branch tier taken while the mimic was away (Eternal, or Sovereign for a mimic already past 100 mass)
  const BranchBanner = branchNotice ? (
    <div className="max-w-5xl mx-auto px-4 pt-3">
      <div className="p-3 bg-primary/10 border border-primary/40 rounded-lg flex items-start justify-between gap-3">
        <div>
          <p className="font-cinzel text-primary text-xs font-bold mb-0.5">Beyond the Apex</p>
          <p className="text-xs text-foreground/80">{branchNotice}</p>
        </div>
        <button aria-label="Dismiss" onClick={() => setBranchNotice(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>
      </div>
    </div>
  ) : null;

  // What the screen's pieces read (see HuntContext); actions are passed to them as props
  const huntView = huntState(character, hunt, { location: pendingLocation, huntOver, acting });

  return (
    <HuntContext.Provider value={huntView}>
    <div
      className={`hunt-stage min-h-screen bg-background ${phase === "hunt" && !huntOver ? "pb-28 lg:pb-0" : ""}`}
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
          <Link to={createPageUrl("Home")} aria-label="Home" className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-cinzel text-foreground text-sm">{character.name}</span>
          <Badge variant="outline" className="border-primary/30 text-primary text-[11px]">{displayTier(character)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* The character sheet, over everything: a modal dialog (focus moves in and stays there, and
              Escape, a click outside or Close puts it away, back to this button) */}
          <Dialog.Root open={showSheet} onOpenChange={setShowSheet}>
            <Dialog.Trigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs gap-1">
                <BookOpen className="w-3 h-3" /> Sheet
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              >
                <Dialog.Title className="sr-only">{character.name}&apos;s character sheet</Dialog.Title>
                <CharacterSheet character={displayCharacter ?? character} onClose={() => setShowSheet(false)} />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <Link to={createPageUrl(`Codex?characterId=${character.id}`)} className="text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" /> Codex
          </Link>
        </div>
      </div>

      {/* Notices that need dismissing sit under the top bar, not above it */}
      {MassDecayBanner}
      {SeasonBanner}
      {BranchBanner}


      <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Status */}
        <div className="space-y-4">
          <StatusPanel />

          {/* TEMPORARY (dev builds only): preview every achievement's banner and sheet entry.
              Display only — nothing is saved. Remove once the banners have been reviewed. */}
          {import.meta.env.DEV && phase === "hunt" && (
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
                onClick={() => setDicePreview(p => p ? null : rollDicePreview(character.adhesion))}
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
                      onClick={() => setDicePreview(rollDicePreview(character.adhesion))}>
                      Re-roll
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {phase === "hunt" && <LocationBanners />}

          {/* Party list or room map: one card, click it to switch (remembered per mimic) */}
          {phase !== "setup" && party.length > 0 && <PartyCard onToggle={toggleSidebarView} />}
        </div>

        {/* Center: Main action area */}
        <div className="lg:col-span-2 space-y-4">
          {/* DEV ONLY (achievement-preview branch): pretend it's a holiday, to try seasonal forms and
              locations out of season. Sets localStorage "mm.debugDate" (see today()) and reloads. */}
          {import.meta.env.DEV && phase === "setup" && !roomSelecting && (
            <label className="flex items-center gap-2 text-[10px] px-3 py-1.5 rounded border border-dashed border-amber-400/40 text-amber-400/80">
              🛠 Dev: pretend it's
              <select
                value={readDebugDate()}
                onChange={(e) => {
                  try {
                    if (e.target.value) localStorage.setItem(DEBUG_DATE_KEY, e.target.value);
                    else localStorage.removeItem(DEBUG_DATE_KEY);
                  } catch { /* storage unavailable */ }
                  window.location.reload();
                }}
                className="bg-transparent border border-amber-400/30 rounded px-1 py-0.5 text-amber-400"
              >
                <option value="">today (real date)</option>
                {(Object.keys(HOLIDAYS) as HolidayId[]).map(h => {
                  const { start, name, icon } = HOLIDAYS[h];
                  const value = `${start[0]}-${start[1]}`;
                  return <option key={h} value={value}>{icon} {name} ({value})</option>;
                })}
              </select>
            </label>
          )}
          {/* DEV ONLY (achievement-preview branch): open or close the Tear in Time for this mimic, to
              check its card. Saved, like the Thimblewood button. */}
          {import.meta.env.DEV && phase === "setup" && !roomSelecting && (() => {
            const open = tearInTimeOpen(character) || character.branchTier === "Primordial";
            return (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[10px] border-dashed border-amber-400/40 text-amber-400/80"
                onClick={devToggleTear}
              >
                🛠 Dev: {open
                  ? "take away the Tear in Time (saved)"
                  : `give the Tear in Time: Apex, ${TIME_TEAR_MASS}+ mass, ${TIME_TEAR_MAGIC_USERS} magic users (saved)`}
              </Button>
            );
          })()}
          {/* DEV ONLY (achievement-preview branch): make this mimic Eternal or not, to check the Long
              After and its card. Saved, like the Tear button above. */}
          {import.meta.env.DEV && phase === "setup" && !roomSelecting && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] border-dashed border-amber-400/40 text-amber-400/80"
              onClick={devToggleEternal}
            >
              🛠 Dev: {character.branchTier === "Eternal"
                ? "take away Eternal (saved)"
                : `give Eternal: Apex, ${ETERNAL_DECAY_FREE_DAYS} days without decay (saved)`}
            </Button>
          )}
          {/* DEV ONLY (achievement-preview branch): make this mimic Sovereign or not, to check the
              Hollow Court and its card. Saved, like the buttons above. */}
          {import.meta.env.DEV && phase === "setup" && !roomSelecting && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[10px] border-dashed border-amber-400/40 text-amber-400/80"
              onClick={devToggleSovereign}
            >
              🛠 Dev: {character.branchTier === "Sovereign"
                ? "take away Sovereign (saved)"
                : `give Sovereign: Apex, ${SOVEREIGN_MASS} mass (saved)`}
            </Button>
          )}
          {phase === "setup" && !roomSelecting && (
            <LocationSelect onChoose={chooseLocation} onChooseForms={() => startFormSelection("setup")} />
          )}

          {roomSelecting && <RoomSelect onConfirm={confirmRoom} onBack={() => { setRoomSelecting(false); setPendingLocation(null); }} />}

          {phase === "hunt" && (
            <div className="space-y-4">
              <HuntHeader
                canLeave={!ceremonyRunning}
                canChange={canChange}
                onNewHunt={backToSetup}
                onToggleForms={() => { setShowFormPanel(!showFormPanel); setShowAppearancePanel(false); setShowMovePanel(false); }}
                onToggleAppearance={() => { setShowAppearancePanel(!showAppearancePanel); setShowFormPanel(false); setShowMovePanel(false); }}
              />
              {showFormPanel && canChange && <FormSwitcher onChange={doChangeForm} />}
              {showAppearancePanel && canChange && (
                <AppearanceEditor
                  character={character}
                  onSave={doUpdateAppearance}
                  onClose={() => setShowAppearancePanel(false)}
                  onDevToggleLearnedMaterial={import.meta.env.DEV ? devToggleLearnedMaterial : undefined}
                />
              )}
              {showMovePanel && canRelocate && location && mimicRoom && <RelocatePanel rooms={relocateTo} onRelocate={doRelocate} />}
              {hunt && !huntOver && (
                <MinionPanel
                  waiting={hunt.minionsToPlace ?? 0}
                  rooms={minionRooms(hunt)}
                  disabled={acting}
                  onPlace={room => act((h, c) => placeMinion(h, c, room))}
                />
              )}
              {/* Once the hunt is won there's nothing left to do: the report takes their place */}
              {!huntOver && (
                <>
                  <ActionBar
                    canRelocate={canRelocate}
                    canLure={canLure}
                    canStrike={canStrikeNow}
                    canWait={canWait}
                    onRelocate={toggleMovePanel}
                    onLure={doLure}
                    onStrike={doStrike}
                    onWait={doWait}
                  />
                  <MealsHere
                    onEatCreature={c => act((h, ch) => eatCreature(h, ch, c.uid))}
                    onEatStar={doEatStar}
                    onEatRemains={body => act((h, ch) => eatRemains(h, ch, body.id))}
                  />
                </>
              )}
              {huntOver && (
                <HuntOverPanel report={endReport} onChooseForms={() => { leaveHunt(); startFormSelection("setup"); }} onHuntAgain={backToSetup} />
              )}
            </div>
          )}

          {/* FORM SELECTION phase (post-hunt) */}
          {phase === "formSelect" && (
            <ScrollArea className="max-h-[70vh] pr-2">
              <FormSelector
                character={character}
                onConfirm={confirmFormSelections}
                onSkip={() => leaveFormSelection(character)}
              />
            </ScrollArea>
          )}

          {phase === "evolve" && (
            <EvolveScreen onChoose={handleEvolution} onSkip={() => returnToHunt(character)} />
          )}

          {phase === "gameover" && (
            <GameOverScreen
              reason={gameoverReason}
              report={endReport}
              onChooseForms={() => { leaveHunt(); startFormSelection("setup"); }}
              onHuntAgain={backToSetup}
            />
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
    </HuntContext.Provider>
  );
}