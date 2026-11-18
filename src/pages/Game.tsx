import { useState, useEffect, useEffectEvent, useCallback, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { Appearance, FormRef, MimicCharacter, MimicCharacterInput } from "@/api/schemas/mimicCharacter";
import {
  ALL_FORMS, STAT_CAP, VARIANT_FORMS, ACHIEVEMENTS,
  getAdjacentRooms, massDecay, today, dropExpiredSeasonalForms, isVariantUnlocked,
  getActiveForm, effectiveStats, lureRange, applyUpgrade, type UpgradeChoice,
  activeAdventurers, huntCleared, skyward, devotion, beginHunt, relocate, lure, strike, canStrike, wait,
  eatCreature, eatStar, eatFrozen, changeForm, changeAppearance,
  type Hunt, type LogLine, type TurnResult,
  type Form, type GameEvent, type GameEventType, type HuntLocation, type RoomName,
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
import { EvolveScreen, GameOverScreen, HuntOverPanel } from "../components/game/hunt/EndScreens";

// ── Game-screen state types ──
type Phase = "setup" | "hunt" | "formSelect" | "evolve" | "gameover";

/** Delay between lines of a multi-step event sequence (e.g. a Devotion ceremony). */
const CEREMONY_STEP_MS = 2000;

export default function Game() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get("characterId");

  const [character, setCharacter] = useState<MimicCharacter | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The hunt in progress (or the last one, until the next begins). Every action takes it to the
  // next one: see src/data/hunt.ts and turns.ts.
  const [hunt, setHunt] = useState<Hunt | null>(null);
  // Where the next hunt will be, while its room is being picked
  const [pendingLocation, setPendingLocation] = useState<HuntLocation | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  // Nothing to load without a character id
  const [loading, setLoading] = useState(!!characterId);
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
  // the mimic as the shrine's lost god, brings offerings and leaves (see devotion). Checked after
  // every action that leaves the hunt going, and on coming back to it from the upgrade or form
  // screen. The ceremony plays out one line at a time (CEREMONY_STEP_MS apart); actions and the
  // end-of-hunt panel wait until it finishes.
  const [ceremonyRunning, setCeremonyRunning] = useState(false);
  const ceremonyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => ceremonyTimers.current.forEach(clearTimeout), []);
  const startDevotion = (h: Hunt, c: MimicCharacter) => {
    const ceremony = devotion(h, c);
    if (!ceremony) return;
    beginTurn();
    setHunt(ceremony.start.hunt);
    setCharacter(ceremony.start.character);
    persist(ceremony.start.changes);
    setCeremonyRunning(true);
    const last = ceremony.steps.length - 1;
    ceremonyTimers.current = ceremony.steps.map((step, i) => setTimeout(() => {
      addLog(step.log);
      if (step.ap) setCharacter(prev => prev ? { ...prev, assimilationPoints: prev.assimilationPoints + step.ap } : prev);
      if (i !== last) return;
      persist(ceremony.changes);
      setCeremonyRunning(false);
      if (ceremony.evolve) setPhase("evolve");
    }, i * CEREMONY_STEP_MS));
  };

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
    if (result.hunt.mimicRoom !== hunt?.mimicRoom) setShowMovePanel(false);
    if (result.hunt.ending) setPhase("gameover");
    else if (result.chooseForms) startFormSelection("hunt");
    else if (result.evolve) setPhase("evolve");
    else startDevotion(result.hunt, result.character);
  };

  /** Take a hunt action (see turns.ts). */
  const act = (action: (h: Hunt, c: MimicCharacter) => TurnResult) => {
    if (hunt && character) apply(action(hunt, character));
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

  const doRelocate = (room: RoomName) => act((h, c) => relocate(h, c, room));
  const doLure = () => act(lure);
  const doStrike = () => act(strike);
  const doWait = () => act(wait);
  const doEatStar = () => act(eatStar);

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
    } else if (phase === "evolve") {
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
        const announced: readonly string[] = ["connoisseur", "masterOfDisguise", "curiosityCabinet", "festive", "forAllSeasons", "seasonedTraveler"];
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
  const someoneInMyRoom = active.some(a => a.location === mimicRoom);
  const canRelocate = !acting && !huntOver && !someoneInMyRoom;
  const canLure = !acting && !huntOver && active.length > 0;
  const canStrikeNow = !acting && !huntOver && !!hunt && canStrike(hunt);
  const canWait = !acting && !huntOver;
  // Empty rooms next door, in the order the Relocate panel lists (and numbers) them
  const relocateRooms = location && mimicRoom
    ? getAdjacentRooms(location, mimicRoom).filter(room => !active.some(a => a.location === room))
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
      l: [canLure, doLure],
      s: [canStrikeNow, doStrike],
      w: [canWait, doWait],
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
  const sickness = hunt?.sickness ?? null;
  const huntView: HuntState = {
    character, activeForm, stats: effectiveStats(character, sickness, activeForm), sickness,
    suspicion, lureRange: lureRange(character),
    location, mimicRoom, party, activeAdventurers: active, creatures: hunt?.creatures ?? [], rivals: hunt?.rivals ?? [],
    isBountyHunt: hunt?.bounty ?? false, huntOver, actionCount: hunt?.actionCount ?? 0, acting,
    huntTurn: hunt?.turn ?? 0, fireworksRoom: hunt?.fireworksRoom ?? null, starFragment: hunt?.starFragment ?? null,
    skyward: !!hunt && skyward(hunt),
  };

  return (
    <HuntContext.Provider value={huntView}>
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

          {roomSelecting && <RoomSelect onConfirm={confirmRoom} onBack={() => { setRoomSelecting(false); setPendingLocation(null); }} />}

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
                onEatFrozen={body => act((h, ch) => eatFrozen(h, ch, body.id))}
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