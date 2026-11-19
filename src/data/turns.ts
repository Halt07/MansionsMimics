// ============================================================
// MANSIONS & MIMICS — Turns
// What each hunt action does: starting the hunt, Relocate, Lure, Strike, Wait, eating what's
// in the room, and changing form or appearance mid-hunt. Each takes the hunt and the character
// and returns the next of both, the log, and what to save (see Turn in ./hunt). Game applies
// the result. Re-exported from ./gameData.
// ============================================================
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import { stillInHunt, type PartyMember } from "./adventurerData";
import { withDiscovered } from "./codex";
import { BURN_SUSPICION, getRoomDistance, hasMagic, maxTargetForChance, rollDice } from "./core";
import { PORTER_SISTER, PORTER_TOKEN_LINE, RIVAL_SAME_SHAPE_CHANCE, RIVAL_SAME_SHAPE_LINE } from "./easterEggs";
import {
  PRANKS, RIVAL_STATS, STAR_FRAGMENT, disguiseOf, frozenMealAp, isTheRealThing, pickTreasurePrize, rivalInRoom,
  unmask, type RivalMimic,
} from "./events";
import { formsStillAllowed, formTier } from "./forms";
import { skyward, Turn, type Hunt, type TurnOptions, type TurnResult } from "./hunt";
import type { HuntLocation, RoomName } from "./locationData";
import { resolveLure } from "./lure";
import { BOUNTY_START_SUSPICION, startHunt } from "./mealPrep";
import { ALL_FORMS, type Form } from "./mimicData";
import { VANISHING_LINES, moveCreatures, moveParty, rivalAteFirst } from "./movement";
import { CANNIBAL_MIMICS, TITANIC_FEAST_GIANTS, lureRange, withBiggestMeal, withFormUsed } from "./stats";
import {
  COLLAPSE_BONUS_AP, consumeSuspicion, escapeRoom, needsPartialBites, pickStrikeTarget, resolveBite,
  resolveRivalStrike, resolveSwallow, strikeCandidates, strikeDice, strikeWitnesses, type Witnesses,
} from "./strike";
import { plural, the } from "./text";

/** How a devoured rival is named in the "biggest meal" stat. */
const RIVAL_MEAL_NAMES: Record<RivalMimic["kind"], string> = { lone: "Rival Mimic", nest: "Nest Mimic", elder: "Elder Mimic" };
/** Waiting always has at least this chance to lower suspicion, however penalized your Patience. */
export const WAIT_MIN_CHANCE = 0.4;

// ---------- the start ----------

/** The mimic has picked its room: set up the hunt (see startHunt) and write it up. */
export function beginHunt(character: MimicCharacter, location: HuntLocation, room: RoomName, opts: TurnOptions = {}): TurnResult {
  const random = opts.random ?? Math.random;
  const start = startHunt(character, location, room, random);
  const hunt: Hunt = {
    location, mimicRoom: room, party: start.party, creatures: start.creatures, rivals: start.rivals,
    suspicion: start.suspicion, bounty: start.bounty, sickness: start.sickness,
    actionCount: 0, turn: 0, starFragment: null, fireworksRoom: null, ending: null,
    stillTurns: 0, catsThatKnow: [], peakSuspicion: 0, biggestMeal: null,
    seed: Math.floor(random() * 2 ** 31), recorded: false,
  };
  const t = new Turn(hunt, character, { ...opts, random });
  t.update(start.changes);
  const { party, rivals, creatures, sickness, startForm, burned } = start;

  if (start.bounty) {
    t.alert(`⚠️ A bounty has been placed on the mimic known as "${character.name}". Hunters from across the realm have come to collect.`);
    t.alert(`${party.length} bounty hunters are sweeping ${the(location.name)} — they know exactly what they are looking for.`);
    t.alert(`The hunters enter with weapons drawn. Suspicion starts at ${BOUNTY_START_SUSPICION}.`);
  } else {
    t.info(`You settle into the ${room} of ${the(location.name)}, perfectly still.`);
    t.system(`${party.length} adventurers are exploring the premises.`);
  }
  if (burned.location) t.alert(`🔥 Word of your last hunt here has spread. Everyone is on edge. (+${BURN_SUSPICION} suspicion)`);
  if (burned.form && startForm) t.alert(`🔥 The survivors described a ${startForm.name} that moved. People are watching for one. (+${BURN_SUSPICION} suspicion)`);
  if (sickness) {
    t.alert(`⚠ You are afflicted with ${sickness.name}: ${sickness.description} ${Object.entries(sickness.penalties).map(([k, v]) => `–${v} ${k}`).join(", ")} this hunt.`);
  }
  if (location.rivalNest) {
    t.alert(`The air is thick with hunger. Others of your kind nest here — and one of them is old. Very old.`);
    t.alert(`Find the Elder Mimic and devour it. Watch where the adventurers vanish: something hungry hides there.`);
  } else if (rivals.length > 0) {
    t.alert(`Something feels wrong. Another predator lurks within these walls — and it is not you.`);
  }
  if (hasMagic(character.currentAppearance, "Soulglass")) t.senseRival();
  t.info(`Small creatures scurry about: ${creatures.map(c => c.name).join(", ")}.`);
  party.forEach(a => t.info(a.costume
    ? `Someone dressed as a ${a.costume} is at the ${a.location}.`
    : `${a.name} (${a.type}) — currently in the ${a.location}.`));
  if (start.openedRare) {
    t.system(`✦ Whispers reach you of somewhere new: ${start.openedRare.name}. It won't stay within reach for long.`);
  }
  return t.finish();
}

// ---------- Relocate ----------

/** Slip into an empty room next door (+1 suspicion, and a stealth check for anyone already there). */
export function relocate(hunt: Hunt, character: MimicCharacter, targetRoom: RoomName, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const fromRoom = hunt.mimicRoom;
  t.stir();
  t.info(`You silently flow toward the ${targetRoom}... (+1 suspicion)`);
  t.moveTo(targetRoom);

  // Rival mimic reveal: entering a rival's room exposes it
  const found = rivalInRoom(hunt.rivals, targetRoom);
  if (found && !found.revealed) {
    if (found.kind === "elder") {
      t.alert(`The whole room seems to lean toward you. Something vast and patient has been waiting in the ${targetRoom} — the Elder Mimic.`);
      t.alert(`It is older and stronger than anything you have faced. Strike to devour it, and the nest is yours.`);
    } else if (found.kind === "nest") {
      t.alert(`A young mimic is nested here in the ${targetRoom}, gorged and sluggish. It is not the Elder, but it will feed you. Strike!`);
    } else {
      t.alert(`You sense it immediately — another mimic has been hunting in your territory! It lurks here in the ${targetRoom}, fat with stolen prey.`);
      t.alert(`This is YOUR hunting ground. Entering its room has drawn it out: Strike to devour the intruder and reclaim it.`);
    }
    const sameShape = t.random() < RIVAL_SAME_SHAPE_CHANCE;
    if (sameShape) t.info(RIVAL_SAME_SHAPE_LINE);
    // When it's wearing your shape, the map shows it too (if your form has a marker; see disguiseOf)
    const mirrored = sameShape ? disguiseOf(t.form) : null;
    t.patchRival(found.id, { revealed: true, ...(mirrored ? { disguise: mirrored } : {}) });
  }

  t.countAction();
  t.raise(1);
  // Anyone already in the room gets a look at you
  t.stealth(hunt.party.filter(a => stillInHunt(a) && a.location === targetRoom));
  t.react("relocate", { fromRoom });
  t.endTurn();
  return t.finish();
}

// ---------- Lure ----------

/** Lure everyone in range (see resolveLure); whoever falls for it comes into your room. */
export function lure(hunt: Hunt, character: MimicCharacter, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const form = t.form;
  if (!form) {
    t.alert("No active form!");
    return t.finish();
  }
  t.countAction();
  if (t.over) return t.finish();
  const { location, mimicRoom } = hunt;
  const range = lureRange(character);
  const outcome = resolveLure(hunt.party, { location, mimicRoom, range, form, mimic: character, plausibility: t.stats.plausibility }, t.random);

  if (outcome.roomMod.allure !== 0) {
    t.say(outcome.roomMod.allure > 0 ? "allure" : "alert",
      `Room context: ${outcome.roomMod.note} (Allure ${outcome.roomMod.allure > 0 ? "+" : ""}${outcome.roomMod.allure})`);
  }
  for (const { member, result, drawnIn } of outcome.attempts) {
    t.say(result.success ? "allure" : "info", result.narrative);
    if (result.disliked.length > 0) {
      t.info(`${member.name} is put off by the ${result.disliked.join(", ")}. (−${result.aversion} allure)`);
    }
    if (result.suspicionChange > 0) t.alert(`${member.name} grows suspicious of the excessive allure!`);
    if (drawnIn) t.say("allure", `${member.name} is drawn into the ${mimicRoom}...`);
  }
  t.raise(outcome.suspicion);

  if (outcome.attempts.length === 0) {
    const rivalHere = rivalInRoom(hunt.rivals, mimicRoom);
    // Nobody new to draw in: everyone in reach is already lured, or nobody is in reach at all
    const inReach = t.active.some(a => getRoomDistance(location, mimicRoom, a.location) <= range);
    if (rivalHere?.revealed) {
      t.alert(`The ${RIVAL_STATS[rivalHere.kind].name} does not respond to your lure — it knows your tricks. You must Strike directly!`);
    } else if (inReach) {
      t.info(`Every adventurer within reach is already interested.`);
    } else {
      t.info(`No adventurers are within lure range (${range} ${plural(range, "room")}). Wait for them to wander closer.`);
    }
  }
  // A rival found in your room is still hungry: whoever you draw in, it gets to first
  let { party, arrivals } = outcome;
  const rivalHere = rivalInRoom(hunt.rivals, mimicRoom);
  if (rivalHere?.revealed && arrivals.length > 0) {
    const eaten = new Set(arrivals.map(a => a.id));
    party = party.map(a => eaten.has(a.id) ? { ...a, isAlive: false, isAttracted: false, isDisappeared: true } : a);
    arrivals.forEach(a => t.alert(rivalAteFirst(RIVAL_STATS[rivalHere.kind].name, a.name)));
    arrivals = [];
  }
  t.set({ party });
  // A Lure that draws nobody into the room still counts as holding still (the spiderweb)
  t.holdStill(arrivals.length > 0);
  // Whoever came in faces a stealth check
  t.stealth(arrivals);
  t.endTurn();
  return t.finish();
}

// ---------- Strike ----------

/** Whether a Strike has anything to strike: someone lured, a revealed rival here, or (under the fireworks) anyone here. */
export function canStrike(hunt: Hunt): boolean {
  return !!rivalInRoom(hunt.rivals, hunt.mimicRoom)?.revealed || strikeCandidates(hunt.party, hunt.mimicRoom, skyward(hunt)).length > 0;
}

/** Strike (see strike.ts for the rules). With nothing in reach it takes no turn. */
export function strike(hunt: Hunt, character: MimicCharacter, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const dice = strikeDice(t.stats.adhesion, character.currentAppearance);
  const { location, mimicRoom } = hunt;

  // A revealed rival mimic in the room comes first
  const rival = rivalInRoom(hunt.rivals, mimicRoom);
  if (rival?.revealed) {
    t.stir();
    t.set({ actionCount: 0 });
    strikeRival(t, rival, dice);
    t.endTurn();
    return t.finish();
  }

  // Under the fireworks, anyone in your room is staring at the sky: no need to lure them first
  const looking = skyward(hunt);
  const candidates = strikeCandidates(hunt.party, mimicRoom, looking);
  if (candidates.length === 0) {
    t.info("No adventurers are close enough to strike. Use Allure first.");
    return t.finish();
  }
  const form = t.form;
  if (!form) {
    t.alert("No active form!");
    return t.finish();
  }
  const target = pickStrikeTarget(candidates, location, mimicRoom, form, character.currentAppearance);
  if (!target) return t.finish();
  // A Strike that lands on someone stirs the mimic (the spiderweb starts over); one with nothing to strike takes no turn
  t.stir();
  t.set({ actionCount: 0 });
  if (!target.isAttracted) t.info(`🎆 ${target.name} is staring up at the fireworks, mouth open, right next to you.`);
  const seen = strikeWitnesses(hunt.party, target, mimicRoom, looking);
  t.react("strike", { excludeIds: [target.id] });
  // Heard lunging and found out: you flee before the attack lands
  if (t.over) return t.finish();

  // Minor mimics always bite; so does anyone facing a giant too big to swallow yet
  if (needsPartialBites(character, target)) strikeBite(t, target, form, dice, seen);
  else strikeSwallow(t, target, form, dice, seen, looking);
  t.endTurn();
  return t.finish();
}

/** Strike a revealed rival mimic: devour it, or it slips away and hides again. */
function strikeRival(t: Turn, rival: RivalMimic, dice: number) {
  const { location, mimicRoom, rivals, party } = t.hunt;
  const stats = RIVAL_STATS[rival.kind];
  const outcome = resolveRivalStrike(rival, dice, location, rivals, mimicRoom, t.random);
  if (!outcome.devoured) {
    t.escape(`The ${stats.name} slips your grasp — it is clever, as mimics are. It retreats deeper into ${the(location.name)}.`);
    t.patchRival(rival.id, { revealed: false, room: outcome.hidesIn });
    t.alert(`It has hidden itself once more somewhere in ${the(location.name)}. Track it down.`);
    t.raise(1);
    return;
  }
  if (rival.kind === "elder") {
    t.consume(`You tear into the Elder Mimic. It fights like a cornered god, then folds into you, century by century. +${outcome.ap} AP.`);
    t.system(`🕸 The nest falls silent. Whatever else hides here will scatter without its Elder. The hunt is over.`);
    // Easter egg: the porter she was searching for
    if (party.some(a => a.name === PORTER_SISTER)) t.info(PORTER_TOKEN_LINE);
  } else {
    t.consume(`You overwhelm the ${stats.name}! It writhes, loses cohesion, and is absorbed into your mass. +${outcome.ap} AP — and its stolen prey.`);
  }
  t.patchRival(rival.id, { consumed: true });
  t.noteMeal(RIVAL_MEAL_NAMES[rival.kind], outcome.ap);
  const mimicsConsumed = t.character.mimicsConsumed + 1;
  if (mimicsConsumed === CANNIBAL_MIMICS) {
    t.evolve(`🦷 Cannibal! You have devoured ${CANNIBAL_MIMICS} of your own kind.`);
  }
  t.feed(outcome.ap, {
    mimicsConsumed,
    biggestMeal: withBiggestMeal(t.character.biggestMeal, RIVAL_MEAL_NAMES[rival.kind], outcome.ap),
  });
}

// Spell or Sweet Street: eating someone shows who was under the costume
function revealCostume(t: Turn, member: PartyMember) {
  if (isTheRealThing(member)) {
    t.evolve(`😱 That wasn't a costume. It was a real ${member.trueName?.toLowerCase() ?? "monster"}!`);
  } else if (member.costume && member.trueName) {
    t.evolve(`🎭 Under the ${member.costume} costume: ${/^The /.test(member.trueName) ? the(member.trueName) : `a ${member.trueName}`}!`);
  }
}

// Elusive adventurers never leave the hunting ground: when they get away they bolt to another
// room instead (unattracted, and more wary).
function boltAway(t: Turn, target: PartyMember, extraSuspicion: number, hitsTaken?: number) {
  const room = escapeRoom(t.hunt.location, target.location, t.hunt.mimicRoom, t.random);
  t.escape(`${target.name} bolts for the ${room}!`);
  t.patchMember(target.id, a => ({ location: room, isAttracted: false, suspicion: a.suspicion + extraSuspicion, hitsTaken: hitsTaken ?? a.hitsTaken }));
}

/** A partial bite: tear a piece off, and maybe wear them down until they collapse (or run). */
function strikeBite(t: Turn, target: PartyMember, form: Form, dice: number, seen: Witnesses) {
  const { character } = t;
  if (target.group === "giantKin" && character.tier !== "Minor") {
    t.info(`${target.name} is far too large to swallow whole — you'll have to take it in bites. (Whole at mass ${target.wholeMealMass}+)`);
  }
  const bite = resolveBite(target, {
    dice, patience: t.stats.patience, form, knownMaterials: character.learnedMaterials, snowbound: !!t.hunt.location.snowbound, witnesses: seen,
  }, t.random);
  if (!bite.latched) {
    t.escape(`${target.name} sidesteps your lunge — your jaws snap shut on nothing!`);
    t.raise(bite.suspicion);
    t.patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + bite.targetSuspicion }));
    return;
  }
  t.say("attack", `You latch onto ${target.name}'s ${bite.part}!`);

  if (!bite.held) {
    t.escape(`${target.name} wrenches free before you can tear anything loose!`);
    t.raise(bite.suspicion);
    if (bite.ending === "bolts") boltAway(t, target, bite.targetSuspicion, bite.hits);
    else if (bite.ending === "trapped") {
      t.escape(`Badly shaken, ${target.name} runs for the door, but it won't budge under the drifts!`);
      boltAway(t, target, bite.targetSuspicion, bite.hits);
    } else if (bite.ending === "flees") {
      t.escape(`Badly shaken, ${target.name} turns and flees the building!`);
      t.patchMember(target.id, () => ({ isAlive: false, fled: true }));
    } else {
      t.patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + bite.targetSuspicion, hitsTaken: bite.hits }));
    }
    return;
  }

  const biteAp = bite.ending === "collapses" ? bite.ap - COLLAPSE_BONUS_AP : bite.ap;
  t.consume(`You tear free with a ${bite.scrap}! +${biteAp} AP. ${target.name} staggers back. (${bite.hits}/${bite.maxHits} hits taken)`);
  t.patchMember(target.id, a => ({ biteAp: (a.biteAp ?? 0) + biteAp }));
  if (bite.material) t.evolve(`New material absorbed from the bite: ${bite.material}!`);
  t.react("feed", { excludeIds: [target.id] });
  if (bite.loudCry) t.alert(`${target.name}'s cry turns every head in the room. (+${bite.crySuspicion} suspicion)`);

  // The bite (and, if it finishes them off, the rest of the meal) is fed in one go below
  let changes: Partial<MimicCharacter> = {
    learnedMaterials: bite.material ? [...character.learnedMaterials, bite.material] : character.learnedMaterials,
  };
  if (bite.ending === "bolts") {
    boltAway(t, target, bite.targetSuspicion, bite.hits);
  } else if (bite.ending === "trapped") {
    t.escape(`${target.name} has had enough and claws at the door, but the snow has sealed it shut!`);
    boltAway(t, target, bite.targetSuspicion, bite.hits);
  } else if (bite.ending === "flees") {
    t.escape(`${target.name} has had enough — they flee the building entirely!`);
    t.patchMember(target.id, () => ({ isAlive: false, isConsumed: false, fled: true }));
  } else if (bite.ending === "collapses") {
    t.consume(`${target.name} collapses from their wounds. You finish the meal. +${COLLAPSE_BONUS_AP} AP bonus.`);
    revealCostume(t, target);
    // The whole meal: every bite taken from them, this one's included, and the bonus
    const meal = (target.biteAp ?? 0) + bite.ap;
    t.noteMeal(target.name, meal);
    changes = {
      ...changes,
      adventurersEaten: withDiscovered(character.adventurersEaten, [unmask(target)]),
      partyMembersEaten: character.partyMembersEaten + 1,
      biggestMeal: withBiggestMeal(character.biggestMeal, unmask(target).name, meal),
    };
    t.patchMember(target.id, () => ({ isConsumed: true, isAlive: false }));
  } else {
    t.patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + bite.targetSuspicion, hitsTaken: bite.hits }));
  }
  t.raise(bite.suspicion);
  t.feed(bite.ap, changes);
}

const STRONGBOX_SHRUGS = [
  "The strongbox holds nothing you haven't tasted before. You keep it anyway. It's a nice box.",
  "Coins, a silver comb, a crystal stopper — all old flavors to you now. The box itself is the best part.",
  "You rattle the strongbox around inside you. Nothing new. The captain was clearly overpaying for security.",
];

/** Swallow them whole, treasure and all (or lunge, miss, and be seen). */
function strikeSwallow(t: Turn, target: PartyMember, form: Form, dice: number, seen: Witnesses, looking: boolean) {
  const { character } = t;
  const meal = resolveSwallow(target, character, { dice, form, witnesses: seen }, t.random);
  t.say(meal.swallowed ? "attack" : "escape", meal.narrative);

  if (!meal.swallowed) {
    t.raise(meal.suspicion);
    t.alert(`${target.name} saw you lunge — they've seen your true nature! (+${meal.suspicion} suspicion${meal.suspicion < 4 ? ", softened by your Dragonhide" : ""})`);
    if (meal.bolts) boltAway(t, target, 3);
    else t.patchMember(target.id, a => ({ isAttracted: false, suspicion: a.suspicion + 3 }));
    return;
  }

  const { learning } = meal;
  const total = meal.ap + meal.treasureAp;
  t.patchMember(target.id, () => ({ isConsumed: true, isAlive: false }));
  t.consume(`${target.name} has been consumed! +${meal.ap} Assimilation Points.`);
  revealCostume(t, target);
  if (target.treasure) {
    t.consume(`You swallow ${target.treasure.description} along with them. +${target.treasure.ap} AP.`);
    if (learning.prize) {
      t.evolve(`The ${target.treasure.noun ?? "strongbox"} ${target.treasure.noun ? "flares" : "cracks open"} inside you: ${learning.prize.name}! New ${learning.prize.kind} learned.`);
    } else if (target.treasure.noun) {
      t.info(`The ${target.treasure.noun} glows a moment inside you, then fades. Nothing you haven't tasted before.`);
    } else {
      t.info(t.pick(STRONGBOX_SHRUGS));
    }
  }
  if (meal.sankWithShip) t.evolve(`⚓ Down With the Ship! The captain never did abandon ship.`);

  if (seen.othersRemain) {
    // A party member vanished; anyone still in the room watched it happen
    const gain = meal.suspicion;
    t.raise(gain);
    if (seen.witnesses === 0 && looking && seen.inRoom > 0) {
      t.alert(`🎆 Right beside you, every face is turned to the sky. Nobody sees ${target.name} go. (+${gain} suspicion, once they're missed)`);
    } else if (seen.witnesses === 0) {
      t.alert(`One of the party has vanished — the others grow uneasy. (+${gain} suspicion)`);
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
      t.alert(t.pick(glimpses));
    }
  } else {
    t.consume(`The last of the party is gone. No one remains to grow suspicious.`);
  }
  t.react("feed", { excludeIds: [target.id] });
  if (learning.newMaterials.length > 0) t.evolve(`New materials absorbed: ${learning.newMaterials.join(", ")}!`);
  if (learning.newTraits.length > 0) t.evolve(`New traits assimilated: ${learning.newTraits.join(", ")}!`);
  if (learning.newMaterials.length === 0 && learning.newTraits.length === 0 && (learning.materials.length > 0 || learning.traits.length > 0)) {
    t.info(`The prey yields nothing new — you already know these materials.`);
  }
  if (meal.feastProgress) {
    t.evolve(`Giant consumed whole: ${meal.giantsConsumedWhole.length}/${TITANIC_FEAST_GIANTS.length} toward the Titanic Feast.`);
  }
  if (meal.feastComplete) t.evolve(`🍖 Titanic Feast! You have swallowed every giant of the Cloud Kingdom whole.`);

  t.noteMeal(target.name, total);
  t.feed(total, {
    learnedMaterials: [...new Set([...(character.learnedMaterials || []), ...learning.materials])],
    learnedTraits: [...new Set([...(character.learnedTraits || []), ...learning.traits])],
    giantsConsumedWhole: meal.giantsConsumedWhole,
    titanicFeastReached: character.titanicFeastReached || meal.feastComplete,
    downWithTheShipReached: character.downWithTheShipReached || meal.sankWithShip,
    adventurersEaten: withDiscovered(character.adventurersEaten, [unmask(target)]),
    partyMembersEaten: character.partyMembersEaten + 1,
    biggestMeal: withBiggestMeal(character.biggestMeal, unmask(target).name, total),
  });
}

// ---------- Wait ----------

/**
 * The chance a Wait lowers suspicion: roll effective Patience (after sickness and form-tier
 * penalties; Runestone adds a die) against a threshold set by base Patience, so penalties lower
 * the odds (~67–79% unpenalized). The threshold is capped so the dice actually rolled still
 * succeed at least WAIT_MIN_CHANCE of the time.
 */
export function waitSettles(
  character: Pick<MimicCharacter, "patience" | "currentAppearance">, patience: number, random: () => number = Math.random,
): boolean {
  const dice = patience + (hasMagic(character.currentAppearance, "Runestone") ? 1 : 0);
  const threshold = Math.min(character.patience * 3, maxTargetForChance(dice, WAIT_MIN_CHANCE));
  return rollDice(dice, random) >= threshold;
}

/** Hold still: maybe lower suspicion, while everyone else (adventurers and small creatures) moves. */
export function wait(hunt: Hunt, character: MimicCharacter, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const { location, mimicRoom } = hunt;
  t.countAction();
  if (t.over) return t.finish();
  if (waitSettles(character, t.stats.patience, t.random)) {
    t.set({ suspicion: Math.max(0, t.hunt.suspicion - 1) });
    t.say("stealth", `You wait in perfect stillness. Suspicion decreases.`);
  } else {
    t.info(`You wait. The adventurers continue their search.`);
  }

  // Everyone takes their turn (see moveParty): wandering, heading for a star, or door to door
  const form = t.form;
  const moves = moveParty(t.hunt.party, location, { mimicRoom, rivals: hunt.rivals, starFragment: hunt.starFragment, form }, t.random);
  for (const step of moves.steps) {
    if (step.vanishedInto) {
      // Walked into a rival: it eats them. Out of sight, all you hear is the silence; in your own
      // room, you watch it happen
      const rival = hunt.rivals.find(r => r.id === step.vanishedInto);
      t.alert(step.to === mimicRoom && rival
        ? rivalAteFirst(RIVAL_STATS[rival.kind].name, step.member.name)
        : t.pick(VANISHING_LINES)(step.member.name, step.to));
      t.patchRival(step.vanishedInto, { clueGiven: true });
    } else {
      t.info(`${step.member.name} moves from the ${step.from} to the ${step.to}.`);
    }
  }
  t.set({ party: moves.party });
  // Knock knock: the right shape hands out sweets and they come right up; any other gets pranked
  if (moves.knock?.answered) {
    moves.knock.callers.forEach(a => t.info(`🍬 ${a.name} knocks: "Spell or sweet!" They lean right up to the ${form?.name ?? "door"} for a sweet.`));
  } else if (moves.knock) {
    const callers = moves.knock.callers;
    t.alert(`🪄 ${callers.map(a => a.name).join(" and ")} ${plural(callers.length, "knocks", "knock")}: "Spell or sweet!" Nobody answers at the ${mimicRoom}. ${t.pick(PRANKS)} (+1 suspicion)`);
    t.raise(1);
  }
  if (moves.claimedStar) {
    t.set({ starFragment: null });
    t.info(`🌠 ${moves.claimedStar.name} scoops up the star fragment and pockets it, still glowing.`);
  }

  t.holdStill(moves.arrivals.length > 0);
  // Whoever wandered into the mimic's room faces a stealth check
  t.stealth(moves.arrivals);

  // Small creatures also wander (toward you, sometimes, if you wear Honeyamber)
  const honeyamber = hasMagic(character.currentAppearance, "Honeyamber");
  const critters = moveCreatures(hunt.creatures, location, mimicRoom, honeyamber, t.random);
  t.set({ creatures: critters.creatures });
  if (honeyamber) {
    critters.arrivals.forEach(c => t.info(`🍯 A ${c.name} creeps into the ${mimicRoom}, following a sweet smell only it can catch.`));
  }
  t.endTurn();
  return t.finish();
}

// ---------- meals in the room (no turn taken) ----------

/** Snap up a small creature in your room. */
export function eatCreature(hunt: Hunt, character: MimicCharacter, uid: string, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const creature = hunt.creatures.find(c => c.uid === uid && !c.isConsumed);
  if (!creature) return t.finish();
  t.consume(`You snap up the ${creature.name} — a modest feast. +${creature.ap} AP.`);
  t.set({ creatures: hunt.creatures.map(c => c.uid === uid ? { ...c, isConsumed: true } : c), actionCount: 0 });
  t.noteMeal(creature.name, creature.ap);
  t.feed(creature.ap);
  return t.finish();
}

// Anyone in the room sees a meal vanish from under their noses
function seenEating(t: Turn, line: (gain: number) => string) {
  const witnesses = t.active.filter(a => a.location === t.hunt.mimicRoom).length;
  if (witnesses === 0) return;
  const gain = consumeSuspicion(witnesses);
  t.alert(line(gain));
  t.raise(gain);
}

/**
 * Stargazers' Hill: a star fragment in your room can be swallowed before anyone else gets to
 * it. It's worth a little AP and may teach something; anyone watching sees it vanish.
 */
export function eatStar(hunt: Hunt, character: MimicCharacter, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  if (!hunt.starFragment || hunt.starFragment !== hunt.mimicRoom) return t.finish();
  t.set({ starFragment: null });
  const prize = pickTreasurePrize(STAR_FRAGMENT, character.learnedMaterials, character.learnedTraits, t.random);
  t.consume(`You swallow the star fragment whole. It's warm all the way down. +${STAR_FRAGMENT.ap} AP.`);
  if (prize) t.evolve(`The star fragment flares inside you: ${prize.name}! New ${prize.kind} learned.`);
  seenEating(t, gain => `Someone was reaching for the fragment when its glow simply went out. (+${gain} suspicion)`);
  t.noteMeal("Star Fragment", STAR_FRAGMENT.ap);
  t.feed(STAR_FRAGMENT.ap, {
    learnedMaterials: prize?.kind === "material" ? [...character.learnedMaterials, prize.name] : character.learnedMaterials,
    learnedTraits: prize?.kind === "trait" ? [...character.learnedTraits, prize.name] : character.learnedTraits,
  });
  return t.finish();
}

/**
 * The Snowbound Lodge: a frozen adventurer in your room is a cheap meal. Easy to take (no roll,
 * any size of mimic), but worth less, and it teaches nothing: the flavor is locked in the ice.
 */
export function eatFrozen(hunt: Hunt, character: MimicCharacter, id: string, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const body = hunt.party.find(a => a.id === id);
  if (!body?.isFrozen || body.isConsumed) return t.finish();
  const ap = frozenMealAp(body);
  t.consume(`You crack ${body.name} free of the ice and swallow them, stiff and cold. +${ap} AP.`);
  seenEating(t, gain => `Someone turns back to where ${body.name} stood frozen. There's nothing there now. (+${gain} suspicion)`);
  t.patchMember(body.id, () => ({ isConsumed: true }));
  t.noteMeal(body.name, ap);
  t.set({ actionCount: 0 });
  t.feed(ap, {
    adventurersEaten: withDiscovered(character.adventurersEaten, [unmask(body)]),
    partyMembersEaten: character.partyMembersEaten + 1,
    biggestMeal: withBiggestMeal(character.biggestMeal, unmask(body).name, ap),
  });
  return t.finish();
}

// ---------- changing shape mid-hunt ----------

/** Shift into another of your forms (Feywood makes it free; otherwise +1 suspicion). */
export function changeForm(hunt: Hunt, character: MimicCharacter, formIndex: number, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  t.stir();
  const formId = character.forms[formIndex]?.formId;
  t.update({ activeFormIndex: formIndex, formsUsed: withFormUsed(character.formsUsed, formId) });
  const name = ALL_FORMS.find(f => f.id === formId)?.name || "new shape";
  if (hasMagic(character.currentAppearance, "Feywood")) {
    t.info(`You flow seamlessly into the form of a ${name} — the Feywood makes the shift effortless.`);
  } else {
    t.info(`You shift into the form of a ${name}. (Takes 1 turn — stealth suspended.)`);
    t.raise(1);
  }
  t.react("formChange");
  return t.finish();
}

/**
 * Change your surface appearance. Thimblewood changes the mimic's size: forms that no longer fit
 * are dropped, and (like a tier-up) new ones have to be chosen (chooseForms in the result).
 */
export function changeAppearance(hunt: Hunt, character: MimicCharacter, appearance: Appearance, opts: TurnOptions = {}): TurnResult {
  const t = new Turn(hunt, character, opts);
  const resized = hasMagic(appearance, "Thimblewood") !== hasMagic(character.currentAppearance, "Thimblewood");
  if (resized) {
    const kept = formsStillAllowed(character.forms, formTier({ ...character, currentAppearance: appearance }), character.mass, character, t.now);
    const activeId = character.forms[character.activeFormIndex]?.formId;
    t.update({ forms: kept, activeFormIndex: Math.max(0, kept.findIndex(f => f.formId === activeId)) });
    t.evolve(hasMagic(appearance, "Thimblewood")
      ? "🪵 The Thimblewood draws you in. You are one size smaller now."
      : "🪵 You let the Thimblewood go and swell back to your full size.");
    const lost = character.forms.filter(f => !kept.includes(f)).map(f => f.name);
    if (lost.length > 0) t.evolve(`These forms no longer fit you and have been lost: ${lost.join(", ")}. Choose replacements.`);
    t.chooseForms = true;
  }
  t.update({ currentAppearance: appearance });
  t.info(`You adjust your surface appearance.`);
  // Soulglass senses a hidden rival when it's first put on
  if (hasMagic(appearance, "Soulglass") && !hasMagic(character.currentAppearance, "Soulglass")) t.senseRival();
  return t.finish();
}
