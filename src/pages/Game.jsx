import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import {
  MASTER_FORMS, ADVENTURER_TEMPLATES, LOCATIONS, TIER_CONFIG, TIER_ORDER,
  rollDice, stealthCheck, allureCheck, adhesionCheck, getApReward, ADVENTURER_MATERIALS,
  ADVENTURER_TRAITS, calcAllureInterest, getRoomDistance, getAdjacentRooms, ROOM_FORM_IDS, FORM_ROOM_TYPE, getRoomContextMod,
  shouldTriggerBountyHunt, generateBountyParty, rollForSickness,
  isTemplateEligible, getBehaviorReactions, isStationary,
  needsPartialBites, getBiteAp, rollBiteMaterial, hasMagic
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

function generateParty(location, mimicTier, mimicMass) {
  const [min, max] = location.partySize;
  const size = min + Math.floor(Math.random() * (max - min + 1));
  const tierIdx = TIER_ORDER.indexOf(mimicTier || "Minor");

  // Hunters, elites and giant-kin fill up to 2 "elite" slots (Greater+ only).
  // Everyone else — including tier-gated monsters — fills the common slots.
  const ELITE_GROUPS = ["huntersElites", "giantKin"];
  const eligible = ADVENTURER_TEMPLATES.filter(t => isTemplateEligible(t, location, mimicTier, mimicMass));
  const common = eligible.filter(t => !ELITE_GROUPS.includes(t.group));
  const elite = eligible.filter(t => ELITE_GROUPS.includes(t.group));

  const eliteCount = tierIdx >= TIER_ORDER.indexOf("Greater") ? Math.min(2, elite.length) : 0;
  const shuffledCommon = [...common].sort(() => Math.random() - 0.5);
  const shuffledElite = [...elite].sort(() => Math.random() - 0.5);

  const baseParty = [];
  for (let i = 0; i < eliteCount && i < size; i++) {
    if (shuffledElite[i]) baseParty.push(shuffledElite[i]);
  }
  let ci = 0;
  while (baseParty.length < size && ci < shuffledCommon.length) {
    baseParty.push(shuffledCommon[ci++]);
  }

  const members = [];
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
      const chosen = opts[Math.floor(Math.random() * opts.length)];
      const companionRoom = location.rooms[Math.floor(Math.random() * location.rooms.length)];
      members.push({
        name: t.name + chosen.nameSuffix,
        type: chosen.type,
        discipline: chosen.ap, // re-use ap as discipline for combat purposes
        baseSuspicion: 1,
        suspicion: 1,
        constitution: chosen.constitution,
        interactionStyle: "touch",
        quirks: [chosen.description],
        alluringQualities: { materials: [], traits: [], tags: [] },
        perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0 },
        lootMaterials: [],
        lootTraits: [],
        partialLoot: ["scruff of fur", "a claw", "patch of hide"],
        id: `comp_${Date.now()}_${i}`,
        isAlive: true,
        isConsumed: false,
        isAttracted: false,
        isCompanion: true,
        location: companionRoom,
      });
    }
  });

  return members;
}

function getActiveForm(character) {
  if (!character?.forms?.length) return null;
  const idx = character.activeFormIndex ?? 0;
  const formRef = character.forms[idx];
  if (!formRef) return null;
  for (const tier of TIER_ORDER) {
    const found = MASTER_FORMS[tier]?.find(f => f.id === formRef.formId);
    if (found) return found;
  }
  return null;
}

export default function Game() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get("characterId");

  const [character, setCharacter] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [session, setSession] = useState(null);
  const [location, setLocation] = useState(null);
  const [party, setParty] = useState([]);
  const [events, setEvents] = useState([]);
  const [suspicion, setSuspicion] = useState(0);
  const [phase, setPhase] = useState("setup"); // setup | roomSelect | hunt | formSelect | evolve | gameover
  const [gameoverReason, setGameoverReason] = useState("discovered"); // "discovered" | "abandoned"
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [evolveChoice, setEvolveChoice] = useState(null);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);
  const [smallCreatures, setSmallCreatures] = useState([]);
  const [mimicRoom, setMimicRoom] = useState(null);
  const [roomSelecting, setRoomSelecting] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [apexPeakAchieved, setApexPeakAchieved] = useState(false);
  const ACTION_LIMIT = 50;
  const [isBountyHunt, setIsBountyHunt] = useState(false);
  const [actionCount, setActionCount] = useState(0); // actions since last Strike
  const [rivalMimic, setRivalMimic] = useState(null); // { room, clue, revealed, consumed }
  const [massDecayNotice, setMassDecayNotice] = useState(null); // string message shown once on load
  const [currentSickness, setCurrentSickness] = useState(null); // cleared each hunt
  // Post-hunt form selection
  const [pendingFormChoices, setPendingFormChoices] = useState(null); // { slot: 0|1|2, options: [...] }
  const [formSelectionSlot, setFormSelectionSlot] = useState(0);
  const [newFormSelections, setNewFormSelections] = useState([]);

  useEffect(() => {
    if (!characterId) {
      setLoading(false);
      return;
    }
    db.entities.MimicCharacter.filter({ id: characterId }).then(res => {
      if (res[0]) {
        const char = res[0];
        // Mass decay check: 1 mass per 3 days since last fed
        let decayMessage = null;
        if (char.lastFedAt && char.mass > 1) {
          const daysSinceFed = (Date.now() - new Date(char.lastFedAt).getTime()) / (1000 * 60 * 60 * 24);
          const massLost = Math.min(Math.floor(daysSinceFed / 3), char.mass - 1);
          if (massLost > 0) {
            const newMass = char.mass - massLost;
            char.mass = newMass;
            db.entities.MimicCharacter.update(char.id, { mass: newMass });
            decayMessage = `You have been away for ${Math.floor(daysSinceFed)} days without feeding. Your mass has diminished by ${massLost} (now ${newMass}). Hunger gnaws at your form.`;
          }
        }
        setCharacter(char);
        setPhase("setup");
        if (char.apexPeakReached) setApexPeakAchieved(true);
        if (decayMessage) setMassDecayNotice(decayMessage);
      }
    }).catch(err => {
      console.error("Failed to load character:", err);
      setLoadError(err?.message || "Unknown error");
    }).finally(() => setLoading(false));
  }, [characterId]);

  const addEvent = useCallback((type, message) => {
    setEvents(prev => [...prev, { turn: prev.length + 1, type, message }]);
  }, []);

  const FALLBACK_CREATURES = [
    { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A fat cellar rat." },
    { id: "cat", name: "Cat", ap: 2, discipline: 2, description: "A wary housecat." },
    { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "A rooftop crow, curious and bold." },
    { id: "spider", name: "Giant Spider", ap: 2, discipline: 2, description: "A palm-sized cellar spider." },
    { id: "weasel", name: "Weasel", ap: 1, discipline: 2, description: "Fast and wiry." },
    { id: "pigeon", name: "Pigeon", ap: 1, discipline: 1, description: "Fat and oblivious." },
  ];

  const spawnSmallCreatures = (loc) => {
    const pool = loc.locationCreatures?.length ? loc.locationCreatures : FALLBACK_CREATURES;
    const count = 3 + Math.floor(Math.random() * 3);
    const creatures = [];
    for (let i = 0; i < count; i++) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      const room = loc.rooms[Math.floor(Math.random() * loc.rooms.length)];
      creatures.push({ ...template, uid: `sc_${Date.now()}_${i}`, isConsumed: false, location: room });
    }
    return creatures;
  };

  const chooseLocation = (loc) => {
    setLocation(loc);
    setSuspicion(0);
    setEvents([]);
    setMimicRoom(null);
    setIsBountyHunt(false);
    setRivalMimic(null);
    setActionCount(0);
    setGameoverReason("discovered");
    setCurrentSickness(null);
    setRoomSelecting(true);
  };

  const confirmRoom = (room, loc) => {
    const bounty = shouldTriggerBountyHunt(character?.mass ?? 0);
    // Rival mimic: ~1 in 7 chance, only on non-bounty hunts, Greater tier+
    const tierIdx = TIER_ORDER.indexOf(character?.tier ?? "Minor");
    const canHaveRival = !bounty && tierIdx >= TIER_ORDER.indexOf("Greater");
    const hasRival = canHaveRival && Math.random() < (1/7);
    let rivalData = null;
    if (hasRival) {
      // Pick a room other than the player's starting room
      const otherRooms = loc.rooms.filter(r => r !== room);
      const rivalRoom = otherRooms[Math.floor(Math.random() * otherRooms.length)];
      rivalData = { room: rivalRoom, revealed: false, consumed: false, clueGiven: false };
    }

    let newParty;
    if (bounty) {
      newParty = generateBountyParty(loc, character?.mass ?? 26);
    } else {
      newParty = generateParty(loc, character?.tier, character?.mass);
    }
    const creatures = spawnSmallCreatures(loc);
    setMimicRoom(room);
    setParty(newParty);
    setSmallCreatures(creatures);
    setIsBountyHunt(bounty);
    setRivalMimic(rivalData);
    setActionCount(0);
    setRoomSelecting(false);
    // Roll for sickness (only when all stats are capped)
    const sickness = character ? rollForSickness(character) : null;
    setCurrentSickness(sickness);

    if (bounty) {
      setSuspicion(4); // Hunters know the mimic is here
      addEvent("alert", `⚠️ A bounty has been placed on the mimic known as "${character?.name}". Hunters from across the realm have come to collect.`);
      addEvent("alert", `${newParty.length} bounty hunters are sweeping the ${loc.name} — they know exactly what they are looking for.`);
      addEvent("alert", `The hunters enter with weapons drawn. Suspicion starts at 4.`);
    } else {
      setSuspicion(0);
      addEvent("info", `You settle into the ${room} of the ${loc.name}, perfectly still.`);
      addEvent("system", `${newParty.length} adventurers are exploring the premises.`);
    }
    if (sickness) {
      addEvent("alert", `⚠ You are afflicted with ${sickness.name}: ${sickness.description} ${Object.entries(sickness.penalties).map(([k, v]) => `–${v} ${k}`).join(", ")} this hunt.`);
    }
    if (rivalData) {
      addEvent("alert", `Something feels wrong. Another predator lurks within these walls — and it is not you.`);
      if (hasMagic(character?.currentAppearance, "Soulglass")) {
        addEvent("alert", `Your Soulglass hums faintly. The intruder hides in the ${rivalData.room}.`);
      }
    }
    addEvent("info", `Small creatures scurry about: ${creatures.map(c => c.name).join(", ")}.`);
    newParty.forEach(a => addEvent("info", `${a.name} (${a.type}) — currently in the ${a.location}.`));
    setPhase("hunt");
  };

  // Called whenever suspicion hits 10 — ends hunt immediately
  const triggerHuntEnd = () => {
    addEvent("alert", "🔥 The party has found you out! Torches are lit. You flee into the dark.");
    addEvent("alert", "Your hunting ground is burned. Find new prey — and perhaps a new form.");
    setGameoverReason("discovered");
    setPhase("gameover");
  };

  // Runs stealth checks for a given list of adventurers entering/in the mimic's room.
  // Returns total suspicion gained so caller can apply it.
  const runStealthChecks = (advs, currentMimicRoom) => {
    const form = getActiveForm(character);
    if (!form || !location || !currentMimicRoom || advs.length === 0) return 0;

    const roomMod = getRoomContextMod(form.id, currentMimicRoom);
    if (roomMod.plausibility !== 0) {
      addEvent(roomMod.plausibility > 0 ? "stealth" : "alert",
        `Room context: ${roomMod.note} (Plausibility ${roomMod.plausibility > 0 ? "+" : ""}${roomMod.plausibility})`);
    }

    const effectivePlausibility = Math.max(1, character.plausibility - massPenalty - sickPlausibilityPenalty);
    let totalSuspicionChange = 0;
    advs.forEach(adv => {
      const result = stealthCheck(effectivePlausibility, effectivePatience, form.tier, character.tier, form, adv, roomMod, character.currentAppearance);
      if (result.detectedFlaws.length > 0) {
        result.detectedFlaws.forEach(f => addEvent("flaw", `${adv.name} notices: "${f}"`));
      }
      addEvent(result.success ? "stealth" : "alert", result.narrative);
      if (!result.success) totalSuspicionChange += result.suspicionChange;
    });

    // Duplicate room-type plausibility check (Grand/Apex room-forms only)
    const form2 = getActiveForm(character);
    if (form2 && ROOM_FORM_IDS.has(form2.id)) {
      const formRoomType = FORM_ROOM_TYPE[form2.id];
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
  const applyBehaviorReactions = (trigger, ctx = {}) => {
    const roomNow = ctx.mimicRoom ?? mimicRoom;
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
  const doRelocate = (targetRoom) => {
    if (!character || !location) return;
    setShowMovePanel(false);
    addEvent("info", `You silently flow toward the ${targetRoom}... (+1 suspicion)`);
    setMimicRoom(targetRoom);

    // Rival mimic reveal: entering the rival's room exposes it
    if (rivalMimic && !rivalMimic.consumed && targetRoom === rivalMimic.room) {
      addEvent("alert", `You sense it immediately — another mimic has been hunting in your territory! It lurks here in the ${targetRoom}, fat with stolen prey.`);
      addEvent("alert", `This is YOUR hunting ground. Devour the intruder to reclaim it. Use Lure to draw it out, then Strike.`);
      setRivalMimic(prev => prev ? { ...prev, revealed: true } : prev);
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
  };

  // Lure range: 1 (same or adjacent room). +1 at baseAllure >= 5
  const getAllureRange = () =>
    ((character?.baseAllure ?? 2) >= 5 ? 2 : 1) + (hasMagic(character?.currentAppearance, "Aether Crystal") ? 1 : 0);

  const doAllureTurn = () => {
    if (!character || !location || !mimicRoom) return;
    const newCount = actionCount + 1;
    setActionCount(newCount);
    setActing(true);
    const form = getActiveForm(character);
    if (!form) { addEvent("alert", "No active form!"); setActing(false); return; }
    const range = getAllureRange();
    const roomMod = getRoomContextMod(form.id, mimicRoom);

    if (roomMod.allure !== 0) {
      addEvent(roomMod.allure > 0 ? "allure" : "alert",
        `Room context: ${roomMod.note} (Allure ${roomMod.allure > 0 ? "+" : ""}${roomMod.allure})`);
    }

    let anyInRange = false;
    const newlyAttracted = [];
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
      if (rivalMimic?.revealed && !rivalMimic?.consumed && rivalMimic?.room === mimicRoom) {
        addEvent("alert", `The rival mimic does not respond to your lure — it knows your tricks. You must Strike directly!`);
      } else {
        addEvent("info", `No adventurers are within lure range (${range} rooms). Wait for them to wander closer.`);
      }
    }
    setParty(updatedParty);

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
    setActing(false);
  };

  const doStrikeTurn = () => {
    if (!character || !location) return;
    // Bonesteel: +1 die on strike rolls
    const strikeAdhesion = effectiveAdhesion + (hasMagic(character.currentAppearance, "Bonesteel") ? 1 : 0);

    // Check if rival mimic can be struck (revealed + in same room)
    if (rivalMimic && rivalMimic.revealed && !rivalMimic.consumed && rivalMimic.room === mimicRoom) {
      setActing(true);
      setActionCount(0); // Strike resets action counter
      const roll = rollDice(strikeAdhesion);
      const rivalRoll = rollDice(3); // rival resists with 3 dice
      if (roll >= rivalRoll) {
        const apGained = 12;
        addEvent("consume", `You overwhelm the rival mimic! It writhes, loses cohesion, and is absorbed into your mass. +${apGained} AP — and its stolen prey.`);
        setRivalMimic(prev => prev ? { ...prev, consumed: true } : prev);
        const updatedChar = { ...character, assimilationPoints: (character.assimilationPoints || 0) + apGained };
        setCharacter(updatedChar);
        db.entities.MimicCharacter.update(character.id, { assimilationPoints: updatedChar.assimilationPoints, lastFedAt: new Date().toISOString() });
        const cfg2 = TIER_CONFIG[character.tier];
        if (updatedChar.assimilationPoints >= cfg2.apToEvolve) {
          addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
          setPhase("evolve");
        }
      } else {
        addEvent("escape", `The rival mimic slips your grasp — it is clever, as mimics are. It retreats deeper into the ${location.name}.`);
        // Rival escapes to another room
        const otherRooms = location.rooms.filter(r => r !== mimicRoom);
        if (otherRooms.length > 0) {
          const newRoom = otherRooms[Math.floor(Math.random() * otherRooms.length)];
          setRivalMimic(prev => prev ? { ...prev, revealed: false, room: newRoom } : prev);
          addEvent("alert", `It has hidden itself once more somewhere in the ${location.name}. Track it down.`);
        }
        setSuspicion(s => { const n = Math.min(s + 1, 10); if (n >= 10) triggerHuntEnd(); return n; });
      }
      setActing(false);
      return;
    }

    const attracted = party.filter(a => a.isAlive && !a.isConsumed && a.isAttracted);
    if (attracted.length === 0) {
      addEvent("info", "No adventurers are close enough to strike. Use Allure first.");
      return;
    }
    setActing(true);
    setActionCount(0); // Strike resets the action counter
    const form = getActiveForm(character);

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
          const isNewMaterial = biteMaterial && !(character.learnedMaterials || []).includes(biteMaterial);
          if (isNewMaterial) addEvent("evolve", `New material absorbed from the bite: ${biteMaterial}!`);
          applyBehaviorReactions("feed", { excludeIds: [target.id] });
          // A bite that wears the target down may make them collapse (killed) or flee
          const finishing = hitsSoFar >= maxHits;
          const flees = finishing && target.discipline >= 3 && Math.random() < 0.5;
          const finalKill = finishing && !flees && !othersRemain;
          if (!finalKill) {
            setSuspicion(s => { const n = Math.min(s + 2, 10); if (n >= 10) triggerHuntEnd(); return n; });
          }
          const learnedMaterials = isNewMaterial
            ? [...(character.learnedMaterials || []), biteMaterial]
            : (character.learnedMaterials || []);
          const updatedChar = {
            ...character,
            assimilationPoints: (character.assimilationPoints || 0) + apGained,
            learnedMaterials,
          };
          setCharacter(updatedChar);
          db.entities.MimicCharacter.update(character.id, {
            assimilationPoints: updatedChar.assimilationPoints,
            learnedMaterials: updatedChar.learnedMaterials,
            lastFedAt: new Date().toISOString(),
          });

          if (finishing) {
            // Dead or fled
            if (flees) {
              addEvent("escape", `${target.name} has had enough — they flee the building entirely!`);
              setParty(prev => prev.map(a => a.id === target.id ? { ...a, isAlive: false, isConsumed: false, fled: true } : a));
              setSuspicion(s => { const n = Math.min(s + 3, 10); if (n >= 10) triggerHuntEnd(); return n; });
            } else {
              addEvent("consume", `${target.name} collapses from their wounds. You finish the meal. +2 AP bonus.`);
              const finalChar = { ...updatedChar, assimilationPoints: updatedChar.assimilationPoints + 2 };
              setCharacter(finalChar);
              db.entities.MimicCharacter.update(character.id, { assimilationPoints: finalChar.assimilationPoints });
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
          if (hitsSoFarMissed + 1 >= (target.constitution || 3) && Math.random() < 0.6) {
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
      return;
    }

    // Full-size mimics: full consumption
    const result = adhesionCheck(strikeAdhesion, form, target);
    addEvent(result.success ? "attack" : "escape", result.narrative);

    if (result.success) {
      const apGained = getApReward(target);
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

      setParty(prev => prev.map(a => a.id === target.id ? { ...a, isConsumed: true, isAlive: false } : a));
      addEvent("consume", `${target.name} has been consumed! +${apGained} Assimilation Points.`);
      if (othersRemain) {
        // +1 suspicion — a party member vanished
        setSuspicion(s => { const n = Math.min(s + 1, 10); if (n >= 10) triggerHuntEnd(); return n; });
        addEvent("alert", `One of the party has vanished — the others grow uneasy. (+1 suspicion)`);
      } else {
        addEvent("consume", `The last of the party is gone. No one remains to grow suspicious.`);
      }
      applyBehaviorReactions("feed", { excludeIds: [target.id] });
      if (learnedNewMats.length > 0) addEvent("evolve", `New materials absorbed: ${learnedNewMats.join(", ")}!`);
      if (learnedNewTraits.length > 0) addEvent("evolve", `New traits assimilated: ${learnedNewTraits.join(", ")}!`);
      if (learnedNewMats.length === 0 && learnedNewTraits.length === 0 && (matsToLearn.length > 0 || traitsToLearn.length > 0)) {
        addEvent("info", `The prey yields nothing new — you already know these materials.`);
      }

      const updatedChar = {
        ...character,
        assimilationPoints: (character.assimilationPoints || 0) + apGained,
        learnedMaterials: [...new Set([...(character.learnedMaterials || []), ...matsToLearn])],
        learnedTraits: [...new Set([...(character.learnedTraits || []), ...traitsToLearn])],
      };
      setCharacter(updatedChar);
      db.entities.MimicCharacter.update(character.id, {
        assimilationPoints: updatedChar.assimilationPoints,
        learnedMaterials: updatedChar.learnedMaterials,
        learnedTraits: updatedChar.learnedTraits,
        lastFedAt: new Date().toISOString(),
      });

      const cfg = TIER_CONFIG[character.tier];
      if (updatedChar.assimilationPoints >= cfg.apToEvolve) {
        addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
        setEvolveChoice("evolve");
        setPhase("evolve");
      }
    } else {
      const lungePenalty = hasMagic(character.currentAppearance, "Dragonhide") ? 3 : 4;
      setSuspicion(s => { const n = Math.min(s + lungePenalty, 10); if (n >= 10) triggerHuntEnd(); return n; });
      addEvent("alert", `${target.name} saw you lunge — they've seen your true nature! (+${lungePenalty} suspicion${lungePenalty < 4 ? ", softened by your Dragonhide" : ""})`);
      setParty(prev => prev.map(a => a.id === target.id ? { ...a, isAttracted: false, suspicion: a.suspicion + 3 } : a));
    }
    setActing(false);
  };

  const doConsumeCreature = (creature) => {
    if (!character) return;
    addEvent("consume", `You snap up the ${creature.name} — a modest feast. +${creature.ap} AP.`);
    setSmallCreatures(prev => prev.map(c => c.uid === creature.uid ? { ...c, isConsumed: true } : c));
    setActionCount(0); // Eating resets the stagnation counter
    const updatedChar = {
      ...character,
      assimilationPoints: (character.assimilationPoints || 0) + creature.ap,
    };
    setCharacter(updatedChar);
    db.entities.MimicCharacter.update(character.id, { assimilationPoints: updatedChar.assimilationPoints, lastFedAt: new Date().toISOString() });
    const cfg = TIER_CONFIG[character.tier];
    if (updatedChar.assimilationPoints >= cfg.apToEvolve) {
      addEvent("evolve", `Your assimilation has reached the threshold! You may evolve!`);
      setPhase("evolve");
    }
  };

  // Post-hunt: offer form re-selection before next hunt
  const startFormSelection = () => {
    setPhase("formSelect");
  };

  const confirmFormSelections = async (selectedForms) => {
    // selectedForms: array of form objects (up to 3)
    const formRefs = selectedForms.map(f => ({ formId: f.id, name: f.name, tier: f.tier, learned: true }));
    const updatedChar = { ...character, forms: formRefs, activeFormIndex: 0 };
    setCharacter(updatedChar);
    await db.entities.MimicCharacter.update(character.id, { forms: formRefs, activeFormIndex: 0 });
    addEvent("info", `You reshape yourself. New forms prepared: ${formRefs.map(f => f.name).join(", ")}.`);
    setPhase("setup");
  };

  const doChangeForm = (formIndex) => {
    const updatedChar = { ...character, activeFormIndex: formIndex };
    setCharacter(updatedChar);
    db.entities.MimicCharacter.update(character.id, { activeFormIndex: formIndex });
    const newForm = MASTER_FORMS[character.forms[formIndex]?.tier]?.find(f => f.id === character.forms[formIndex]?.formId);
    if (hasMagic(character.currentAppearance, "Feywood")) {
      addEvent("info", `You flow seamlessly into the form of a ${newForm?.name || "new shape"} — the Feywood makes the shift effortless.`);
    } else {
      addEvent("info", `You shift into the form of a ${newForm?.name || "new shape"}. (Takes 1 turn — stealth suspended.)`);
      setSuspicion(s => Math.min(s + 1, 10)); // shifting takes time, slight suspicion risk
    }
    applyBehaviorReactions("formChange");
    setShowFormPanel(false);
  };

  const doUpdateAppearance = (newAppearance) => {
    const updatedChar = { ...character, currentAppearance: newAppearance };
    setCharacter(updatedChar);
    db.entities.MimicCharacter.update(character.id, { currentAppearance: newAppearance });
    addEvent("info", `You adjust your surface appearance.`);
    const soulglassNew = hasMagic(newAppearance, "Soulglass") && !hasMagic(character.currentAppearance, "Soulglass");
    if (soulglassNew && phase === "hunt" && rivalMimic && !rivalMimic.consumed && !rivalMimic.revealed) {
      addEvent("alert", `Your Soulglass hums faintly. The rival mimic hides in the ${rivalMimic.room}.`);
    }
    setShowAppearancePanel(false);
  };

  const checkActionLimit = (newCount) => {
    if (newCount >= ACTION_LIMIT) {
      addEvent("info", `After ${ACTION_LIMIT} uneventful turns, the adventurers grow bored and depart. Nothing interesting here.`);
      addEvent("system", `The party leaves the ${location?.name} of their own accord. Find new prey.`);
      setGameoverReason("abandoned");
      setPhase("gameover");
    }
  };

  const doWaitTurn = () => {
    // Increment action counter
    const newCount = actionCount + 1;
    setActionCount(newCount);

    // Patience check — reduce suspicion slightly (threshold scales with dice count)
    // Runestone: +1 die (the threshold stays based on Patience alone)
    const roll = rollDice(effectivePatience + (hasMagic(character?.currentAppearance, "Runestone") ? 1 : 0));
    const threshold = effectivePatience * 3;
    if (roll >= threshold) {
      setSuspicion(s => Math.max(0, s - 1));
      addEvent("stealth", `You wait in perfect stillness. Suspicion decreases.`);
    } else {
      addEvent("info", `You wait. The adventurers continue their search.`);
    }

    // Compute adventurer movement SYNCHRONOUSLY before any setState
    const currentParty = party;
    const currentMimicRoom = mimicRoom;
    const currentRival = rivalMimic;

    const newlyArrived = [];
    const updatedParty = currentParty.map(adv => {
      if (!adv.isAlive || adv.isConsumed) return adv;
      if (isStationary(adv)) return adv;
      if (Math.random() < 0.5) return adv;
      const adjacent = getAdjacentRooms(location, adv.location);
      const candidates = adjacent.length > 0 ? adjacent : location.rooms;
      const newRoom = candidates[Math.floor(Math.random() * candidates.length)];
      if (newRoom !== adv.location) {
        // Rival mimic: silently consume this adventurer if they move into the rival's room
        if (currentRival && !currentRival.consumed && newRoom === currentRival.room) {
          // The rival eats them — adventurer silently vanishes with a cryptic message
          const crypticMessages = [
            `${adv.name} heads toward the ${newRoom}... and does not emerge.`,
            `A muffled sound comes from the ${newRoom}. ${adv.name} never reappears.`,
            `${adv.name} rounds the corner into the ${newRoom}. Silence follows.`,
            `You hear ${adv.name}'s footsteps enter the ${newRoom} — then stop abruptly.`,
            `Something in the ${newRoom} has ${adv.name}'s attention. They do not return.`,
          ];
          addEvent("alert", crypticMessages[Math.floor(Math.random() * crypticMessages.length)]);
          setRivalMimic(prev => prev ? { ...prev, clueGiven: true } : prev);
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
  };

  const STAT_CAP = 6;

  const handleEvolution = async (choice) => {
    if (!character) return;
    let updates = {};
    const cfg = TIER_CONFIG[character.tier];

    if (choice === "mass") {
      const nextTier = TIER_ORDER[TIER_ORDER.indexOf(character.tier) + 1];
      const newMass = character.mass + 2;
      const shouldEvolve = !!nextTier && newMass > cfg.massRange[1];

      updates = {
        mass: shouldEvolve ? TIER_CONFIG[nextTier].massRange[0] : newMass,
        assimilationPoints: character.assimilationPoints - cfg.apToEvolve,
        tier: shouldEvolve ? nextTier : character.tier,
      };

      if (shouldEvolve) {
        addEvent("evolve", `🌟 You have evolved to ${nextTier} tier!`);
        // On tier evolution: reduce the highest stat by 1 (min 1)
        const stats = { plausibility: character.plausibility, adhesion: character.adhesion, patience: character.patience };
        const maxVal = Math.max(stats.plausibility, stats.adhesion, stats.patience);
        const highStats = Object.keys(stats).filter(k => stats[k] === maxVal);
        const statToReduce = highStats[Math.floor(Math.random() * highStats.length)];
        const newVal = Math.max(1, maxVal - 1);
        updates[statToReduce] = newVal;
        addEvent("evolve", `The strain of growth weakens your ${statToReduce} by 1 (now ${newVal}). Choose your next hunts carefully.`);

        // Invalidate forms that are now out of range (more than 1 tier from new tier)
        const newTierIdx = TIER_ORDER.indexOf(nextTier);
        const currentForms = character.forms || [];
        const validForms = currentForms.filter(ref => {
          const formTierIdx = TIER_ORDER.indexOf(ref.tier);
          return Math.abs(formTierIdx - newTierIdx) <= 1;
        });
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
            setApexPeakAchieved(true);
            db.entities.MimicCharacter.update(character.id, { ...updates, apexPeakReached: true });
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

    const updatedChar = { ...character, ...updates };
    setCharacter(updatedChar);
    await db.entities.MimicCharacter.update(character.id, updates);

    // If forms were invalidated on tier-up, force form selection
    if (updates.forms !== undefined) {
      setPhase("formSelect");
    } else if (phase === "evolve") {
      setPhase("hunt");
    }
    setEvolveChoice(null);
  };

  const activeAdventurers = party.filter(a => a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared);
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
  const effectiveAdhesion = Math.max(1, (character?.adhesion ?? 1) - sickAdhesionPenalty);
  const effectivePatience = Math.max(1, (character?.patience ?? 1) - sickPatiencePenalty);
  const activeForm = character ? getActiveForm(character) : null;
  const cfg = character ? TIER_CONFIG[character.tier] : null;
  const apProgress = cfg ? Math.min((character.assimilationPoints / cfg.apToEvolve) * 100, 100) : 0;

  // Filter locations by minTier and minMass
  const availableLocations = LOCATIONS.filter(loc => {
    const charTierIdx = character ? TIER_ORDER.indexOf(character.tier) : 0;
    if (loc.minTier) {
      const locTierIdx = TIER_ORDER.indexOf(loc.minTier);
      if (charTierIdx < locTierIdx) return false;
    }
    if (loc.minMass && (character?.mass ?? 0) < loc.minMass) return false;
    return true;
  });

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

  return (
    <div className="min-h-screen bg-background">
      {MassDecayBanner}
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")} className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="font-cinzel text-foreground text-sm">{character.name}</span>
          <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">{character.tier}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSheet(!showSheet)} className="text-muted-foreground hover:text-foreground text-xs gap-1">
            <BookOpen className="w-3 h-3" /> Sheet
          </Button>
          <Link to={createPageUrl("Codex")} className="text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" /> Codex
          </Link>
        </div>
      </div>

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
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-xs text-muted-foreground uppercase tracking-wide">Active Form</span>
                {activeForm ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 border text-[10px]">{activeForm.name}</Badge>
                ) : (
                  <span className="text-xs text-destructive">None</span>
                )}
              </div>
              {activeForm && (
                <p className="text-xs text-muted-foreground flavor-text italic mb-1">{activeForm.description}</p>
              )}
              {activeForm?.builtInTraits?.length > 0 && (
                <p className="text-[10px] text-muted-foreground mb-1">
                  Built-in: <span className="text-primary">{activeForm.builtInTraits.join(", ")}</span>
                </p>
              )}
              {/* Current appearance summary */}
              {character.currentAppearance && (() => {
                const app = character.currentAppearance;
                const mats = [...(app.primaryMaterials || []), ...(app.secondaryMaterials || [])];
                const traits = [...(app.surfaceTraits || []), ...(app.symbolicTraits || []), ...(app.conditionTraits || [])];
                if (mats.length === 0 && traits.length === 0) return null;
                return (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    {mats.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {mats.map(m => (
                          <span key={m} className="text-[9px] bg-accent/20 text-accent-foreground rounded px-1.5 py-0.5 border border-accent/20">{m}</span>
                        ))}
                      </div>
                    )}
                    {traits.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {traits.map(t => (
                          <span key={t} className="text-[9px] bg-primary/10 text-primary/80 rounded px-1.5 py-0.5 border border-primary/20">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="space-y-2 pt-1 border-t border-border">
                <StatBar label="Plausibility" value={character.plausibility} max={6} color="bg-green-500"
                  penalty={massPenalty + (currentSickness?.penalties?.plausibility ?? 0)}
                  penaltyLabel={currentSickness?.penalties?.plausibility ? `–${currentSickness.penalties.plausibility} ${currentSickness.name}` : null}
                  massPenalty={massPenalty}
                />
                <StatBar label="Adhesion" value={character.adhesion} max={6} color="bg-primary"
                  penalty={currentSickness?.penalties?.adhesion ?? 0}
                  penaltyLabel={currentSickness?.penalties?.adhesion ? `–${currentSickness.penalties.adhesion} ${currentSickness.name}` : null}
                />
                <StatBar label="Patience" value={character.patience} max={6} color="bg-purple-500"
                  penalty={currentSickness?.penalties?.patience ?? 0}
                  penaltyLabel={currentSickness?.penalties?.patience ? `–${currentSickness.penalties.patience} ${currentSickness.name}` : null}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <SuspicionMeter value={suspicion} max={10} />
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-cinzel uppercase tracking-wide text-[10px]">Assimilation</span>
                  <span className="text-foreground font-bold">{character.assimilationPoints} AP</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${apProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {`${character.assimilationPoints} / ${cfg?.apToEvolve} AP`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rival Mimic status */}
          {phase === "hunt" && rivalMimic && !rivalMimic.consumed && (
            <Card className={`border ${rivalMimic.revealed ? "border-orange-400/50 bg-orange-400/5" : "border-purple-400/20 bg-card"}`}>
              <CardContent className="p-3">
                <p className="font-cinzel text-xs mb-1 text-orange-400/90">⚠ Rival Mimic</p>
                {rivalMimic.clueGiven && !rivalMimic.revealed && (
                  <p className="text-[10px] text-muted-foreground italic">Something consumed one of the party. Track the predator — relocate to find it.</p>
                )}
                {rivalMimic.revealed && (
                  <p className="text-[10px] text-orange-400/80">Exposed in the <span className="font-bold">{rivalMimic.room}</span>. Move there and Strike to devour it!</p>
                )}
                {!rivalMimic.clueGiven && !rivalMimic.revealed && (
                  <p className="text-[10px] text-muted-foreground/60 italic">A presence lurks... Wait and observe.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action counter warning */}
          {phase === "hunt" && actionCount >= 30 && (
            <div className={`px-3 py-2 rounded border text-xs ${actionCount >= 40 ? "border-destructive/40 bg-destructive/5 text-destructive/80" : "border-yellow-400/30 bg-yellow-400/5 text-yellow-400/80"}`}>
              <span className="font-cinzel">⏳ {ACTION_LIMIT - actionCount} actions remaining</span>
              <p className="text-[10px] mt-0.5 opacity-70">The adventurers grow restless. Strike soon or they will leave.</p>
            </div>
          )}

          {/* Party status */}
          {phase !== "setup" && party.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-cinzel text-muted-foreground uppercase tracking-wide">
                  Party ({activeAdventurers.length} active / {consumedCount} consumed)
                </CardTitle>
              </CardHeader>
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
                        {fled && <span className="text-[9px] text-muted-foreground">Fled</span>}
                        {disappeared && <span className="text-[9px] text-purple-400/60">Disappeared</span>}
                        {adv.isConsumed && <span className="text-[9px] text-muted-foreground">Consumed</span>}
                        {adv.isAttracted && !adv.isConsumed && (
                          <Badge className="text-[9px] bg-yellow-400/10 text-yellow-400 border-yellow-400/20 border px-1 py-0">Attracted</Badge>
                        )}
                        {adv.hitsTaken > 0 && !adv.isConsumed && !fled && (
                          <span className="text-[9px] text-destructive/70">{adv.hitsTaken}/{maxHits}hp</span>
                        )}
                        {dist !== null && (
                          <span className={`text-[9px] ${inRange ? "text-green-400/80" : "text-muted-foreground"}`}>
                            {adv.location?.split(" ")[0]} ({dist})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center: Main action area */}
        <div className="lg:col-span-2 space-y-4">

          {/* SETUP phase */}
          {phase === "setup" && !roomSelecting && (
            <div>
              <h2 className="font-cinzel text-xl text-foreground mb-1">Choose Your Hunting Ground</h2>
              <p className="text-muted-foreground text-sm mb-1 flavor-text italic">Where will you lie in wait?</p>
              {character && TIER_ORDER.indexOf(character.tier) < TIER_ORDER.indexOf("Grand") && (
                <p className="text-[10px] text-muted-foreground/60 mb-4 italic">Wilderness territories unlock at Grand tier and beyond.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableLocations.map(loc => (
                  <Card
                    key={loc.id}
                    onClick={() => chooseLocation(loc)}
                    className="cursor-pointer border-border hover:border-primary/40 bg-card transition-all group"
                  >
                    <CardContent className="p-4">
                      <h3 className="font-cinzel text-foreground group-hover:text-primary transition-colors mb-1">{loc.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{loc.description}</p>
                      <p className="flavor-text text-[11px] text-muted-foreground/70 italic mb-3 line-clamp-2">{loc.flavorText}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {loc.partySize[0]}–{loc.partySize[1]} adventurers
                        </span>
                        {loc.advantageTags.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] text-primary border border-primary/20 bg-primary/5 rounded px-1.5 py-0.5">{t}</span>
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
                        <p className="text-[10px] text-muted-foreground">
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
                <Button variant="outline" size="sm" onClick={() => setPhase("setup")} className="text-xs border-border gap-1">
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
              {showFormPanel && character.forms?.length > 0 && (
                <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                  <p className="text-[10px] text-muted-foreground font-cinzel uppercase tracking-widest">Select Active Form (costs 1 suspicion)</p>
                  {character.forms.map((ref, i) => {
                    const form = TIER_ORDER.reduce((found, t) => found || MASTER_FORMS[t]?.find(f => f.id === ref.formId), null);
                    if (!form) return null;
                    const isActive = i === (character.activeFormIndex ?? 0);
                    return (
                      <button
                        key={ref.formId}
                        onClick={() => !isActive && doChangeForm(i)}
                        className={`w-full text-left px-3 py-2 rounded border text-xs transition-all ${
                          isActive ? "border-primary bg-primary/10 text-primary cursor-default" :
                          "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-cinzel">{form.name}</span>
                          <div className="flex gap-1">
                            <span className="text-[9px] border border-border rounded px-1">{form.tier}</span>
                            {isActive && <span className="text-[9px] text-primary">Active</span>}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{form.description}</p>
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
                />
              )}

              {/* Relocate panel */}
              {showMovePanel && (() => {
                const adjacentRooms = getAdjacentRooms(location, mimicRoom);
                const openRooms = adjacentRooms.filter(room =>
                  !activeAdventurers.some(a => a.location === room)
                );
                return (
                  <div className="bg-muted/20 border border-blue-400/20 rounded-lg p-3 space-y-2">
                    <p className="text-[10px] text-blue-400/70 font-cinzel uppercase tracking-widest">Relocate — Choose Destination</p>
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
                          <span className="text-[9px] text-muted-foreground ml-2">(+1 suspicion)</span>
                        </button>
                      ))
                    )}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    const inMyRoom = activeAdventurers.filter(a => a.location === mimicRoom);
                    if (inMyRoom.length > 0) return; // disabled
                    setShowMovePanel(prev => !prev);
                    setShowFormPanel(false);
                    setShowAppearancePanel(false);
                  }}
                  disabled={acting || activeAdventurers.some(a => a.location === mimicRoom)}
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 border-border hover:border-blue-400/30 hover:text-blue-400"
                >
                  <MoveRight className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-cinzel">Relocate</span>
                  <span className="text-[10px] text-muted-foreground">Slip to empty room</span>
                </Button>
                <Button
                  onClick={doAllureTurn}
                  disabled={acting || activeAdventurers.length === 0}
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 border-border hover:border-yellow-400/30 hover:text-yellow-400"
                >
                  <Zap className="w-5 h-5 text-yellow-400/70" />
                  <span className="text-xs font-cinzel">Lure</span>
                  <span className="text-[10px] text-muted-foreground">Attract adventurers</span>
                </Button>
                <Button
                  onClick={doStrikeTurn}
                  disabled={acting || (!party.some(a => a.isAlive && !a.isConsumed && a.isAttracted) && !(rivalMimic?.revealed && !rivalMimic?.consumed && rivalMimic?.room === mimicRoom))}
                  className="h-auto py-3 flex-col gap-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30"
                  variant="ghost"
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-xs font-cinzel">Strike!</span>
                  <span className="text-[10px]">Consume attracted prey</span>
                </Button>
                <Button
                  onClick={doWaitTurn}
                  disabled={acting}
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 border-border hover:border-purple-400/30"
                >
                  <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-cinzel">Wait</span>
                  <span className="text-[10px] text-muted-foreground">Rest & reduce suspicion</span>
                </Button>
              </div>

              {/* Small creatures — only show those currently in mimic's room */}
              {(() => {
                const inRoom = smallCreatures.filter(c => !c.isConsumed && c.location === mimicRoom);
                if (inRoom.length === 0) return null;
                return (
                  <div className="bg-muted/10 border border-border rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground font-cinzel uppercase tracking-widest mb-2">
                      Creatures of Opportunity
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inRoom.map(creature => (
                        <button
                          key={creature.uid}
                          onClick={() => doConsumeCreature(creature)}
                          className="text-xs px-3 py-1.5 rounded border border-border bg-card hover:border-primary/40 hover:text-primary transition-all text-muted-foreground"
                          title={creature.description}
                        >
                          🐀 {creature.name} <span className="text-primary ml-1">+{creature.ap} AP</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {activeAdventurers.length === 0 && party.length > 0 && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-primary font-cinzel mb-2">The hunt is over.</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {party.filter(a => a.isConsumed).length} consumed · {party.filter(a => a.fled).length} fled
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={startFormSelection} className="bg-primary text-primary-foreground hover:bg-primary/80 text-xs">
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
                onSkip={() => setPhase("setup")}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "mass", label: "Increase Mass", desc: `Grow toward the next tier. Cost: ${cfg?.apToEvolve} AP`, icon: "⬆", capped: false },
                  { key: "plausibility", label: "+1 Plausibility", desc: `Improve deception. Cost: ${cfg?.apToUpgrade} AP (${character.plausibility}/${6})`, icon: "👁", capped: character.plausibility >= 6 },
                  { key: "adhesion", label: "+1 Adhesion", desc: `Better grappling. Cost: ${cfg?.apToUpgrade} AP (${character.adhesion}/${6})`, icon: "🔒", capped: character.adhesion >= 6 },
                  { key: "patience", label: "+1 Patience", desc: `Longer stillness. Cost: ${cfg?.apToUpgrade} AP (${character.patience}/${6})`, icon: "⌛", capped: character.patience >= 6 },
                ].map(opt => (
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
              <p className="text-xs text-muted-foreground mb-6 max-w-xs mx-auto">
                {gameoverReason === "abandoned"
                  ? "Find a new hunting ground. Better forms and higher stats will help you lure more resistant prey."
                  : "You must find a new hunting ground. Your forms remain, but consider changing them — the survivors will warn others of your shape."}
              </p>
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={() => setPhase("formSelect")} className="bg-primary text-primary-foreground hover:bg-primary/80 w-48">
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

          {/* Apex Peak Achievement Banner */}
          {apexPeakAchieved && (
            <div className="p-4 bg-primary/10 border border-primary/40 rounded-lg text-center">
              <div className="text-3xl mb-1">🏆</div>
              <p className="font-cinzel text-primary text-sm font-bold">Peak of the Apex</p>
              <p className="text-xs text-muted-foreground mt-1 flavor-text italic">
                "{character.name} has consumed entire roads. Cartographers have stopped trying."
              </p>
            </div>
          )}

          {/* Event log */}
          {phase !== "setup" && (
            <div className="h-64">
              <EventLogPanel events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}