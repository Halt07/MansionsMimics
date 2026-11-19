// Whole turns (src/data/hunt.ts and turns.ts): each action takes the hunt and the character to the
// next ones, with the log and what to save. A constant random value pins the dice and the picks.
export default async function ({ gameData: m, ok }) {
  const always = (r) => () => r;
  const now = new Date('2026-11-18T12:00:00Z');
  const opts = (r = 0.5) => ({ random: always(r), now });
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const ref = (formId) => ({ formId, name: formId, tier: m.ALL_FORMS.find((f) => f.id === formId).tier, learned: true });
  const mimic = (over = {}) => ({
    id: 'mimic', name: 'Testy', startingType: 'Lesser', tier: 'Lesser', mass: 6, plausibility: 3, adhesion: 3, patience: 3, baseAllure: 3,
    assimilationPoints: 0, forms: [ref('lesser_chest')], activeFormIndex: 0, currentAppearance: {},
    learnedMaterials: [], learnedTraits: [], rareLocation: null, burnedLocations: [], burnedForms: [],
    adventurersMet: [], adventurersEaten: [], formsUsed: [], formHuntCounts: {}, locationHuntCounts: {},
    huntsSurvived: 0, huntsFailed: 0, closestCall: 0, conversions: 0, mimicsConsumed: 0, partyMembersEaten: 0,
    biggestMeal: null, giantsConsumedWhole: [], titanicFeastReached: false, downWithTheShipReached: false, lifetimeApEarned: 0,
    ...over,
  });
  const member = (name, over = {}) => ({
    id: name, name, type: 'Warrior', group: 'common', discipline: 2, baseSuspicion: 2, suspicion: 2, constitution: 3,
    interactionStyle: 'touch', location: 'Library', isAlive: true, isConsumed: false, isAttracted: false,
    quirks: [], alluringQualities: { materials: [], traits: [], tags: [] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 0, social: 0, spatial: 0, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: [], lootTraits: [], partialLoot: [], ...over,
  });
  const hunt = (over = {}) => ({
    location: loc('manor'), mimicRoom: 'Library', party: [member('Bystander', { location: 'Kitchen' })], creatures: [], rivals: [],
    suspicion: 0, bounty: false, sickness: null, actionCount: 0, turn: 0, starFragment: null, fireworksRoom: null, ending: null,
    stillTurns: 0, catsThatKnow: [], peakSuspicion: 0, biggestMeal: null, seed: 1, recorded: false, ...over,
  });
  const said = (result, text) => result.log.some((l) => l.message.includes(text));

  // ---------- starting ----------
  const begun = m.beginHunt(mimic(), loc('manor'), 'Library', opts());
  ok(begun.hunt.mimicRoom === 'Library' && begun.hunt.turn === 0 && !begun.hunt.ending && !begun.hunt.recorded, 'a hunt begins: in the chosen room, turn 0, still on');
  ok(begun.hunt.seed === Math.floor(0.5 * 2 ** 31), 'its report seed comes from the random source');
  ok(said(begun, 'You settle into the Library') && begun.changes.locationHuntCounts.manor === 1, 'written up, and counted for the location');
  ok(begun.character.locationHuntCounts.manor === 1, '…on the character too');

  // Locations that bring their own "The" don't get a second one
  const aboard = m.beginHunt(mimic(), loc('sinking_ship'), loc('sinking_ship').rooms[0], opts());
  ok(said(aboard, 'of the Sinking Ship') && !aboard.log.some((l) => /the The/.test(l.message)), 'no "the The Sinking Ship" in the log');
  const shipRoom = loc('sinking_ship').rooms[0];
  const burned = m.relocate(hunt({ location: loc('sinking_ship'), mimicRoom: shipRoom, party: [], suspicion: m.MAX_SUSPICION - 1 }), mimic(), m.getAdjacentRooms(loc('sinking_ship'), shipRoom)[0], opts());
  ok(said(burned, 'The Sinking Ship is burned') && !burned.log.some((l) => /The The|the The/.test(l.message)), '…nor when it burns');

  // ---------- nothing is changed in place ----------
  const before = hunt({ suspicion: 3 });
  const snapshot = JSON.stringify(before);
  const character = mimic();
  const charSnapshot = JSON.stringify(character);
  m.relocate(before, character, 'Hall', opts());
  m.wait(before, character, opts());
  m.lure(before, character, opts());
  ok(JSON.stringify(before) === snapshot && JSON.stringify(character) === charSnapshot, 'a turn returns new values and leaves its inputs alone');

  // ---------- Relocate ----------
  const moved = m.relocate(hunt({ stillTurns: 4 }), mimic(), m.getAdjacentRooms(loc('manor'), 'Library')[0], opts());
  ok(moved.hunt.mimicRoom !== 'Library' && moved.hunt.suspicion === 1, 'Relocate: into the next room, for 1 suspicion');
  ok(moved.hunt.turn === 1 && moved.hunt.actionCount === 1 && moved.hunt.stillTurns === 0, '…a full turn, counted, and the spiderweb starts over');

  // ---------- Wait ----------
  const nobody = { party: [] };
  const calm = m.wait(hunt({ ...nobody, suspicion: 3 }), mimic(), opts(0.99));
  ok(calm.hunt.suspicion === 2 && said(calm, 'perfect stillness'), 'Wait: a good Patience roll lowers suspicion');
  const restless = m.wait(hunt({ ...nobody, suspicion: 3 }), mimic(), opts(0));
  ok(restless.hunt.suspicion === 3 && said(restless, 'continue their search'), '…a poor one doesn\'t');
  ok(m.waitSettles(mimic(), 3, always(0.99)) && !m.waitSettles(mimic(), 3, always(0)), 'waitSettles: the roll itself');

  // ---------- the spiderweb ----------
  let still = hunt(nobody);
  let webs = 0;
  for (let i = 0; i < m.STILLNESS_TURNS + 3; i++) {
    const r = m.lure(still, mimic(), opts());
    if (said(r, m.STILLNESS_LINE)) webs += 1;
    still = r.hunt;
  }
  ok(webs === 1 && still.stillTurns === m.STILLNESS_TURNS + 3, `${m.STILLNESS_TURNS} quiet turns in a row spin the web, once`);

  // ---------- found out ----------
  const caught = m.relocate(hunt({ suspicion: 9 }), mimic(), 'Hall', opts());
  ok(caught.hunt.ending === 'discovered' && caught.hunt.suspicion === 10, 'reaching 10 suspicion: found out');
  ok(caught.character.huntsFailed === 1 && caught.hunt.recorded, '…counted as a failed hunt');
  ok(caught.changes.burnedLocations.some((b) => b.id === 'manor') && caught.changes.burnedForms.some((b) => b.formId === 'lesser_chest'),
    '…and the location and the form are burned (and saved)');
  const again = m.relocate(caught.hunt, caught.character, 'Library', opts());
  ok(again.character.huntsFailed === 1 && !said(again, 'found you out'), 'already found out: not counted or announced twice');
  const emptied = m.eatStar({ ...caught.hunt, party: [member('Eaten', { isAlive: false, isConsumed: true })] }, caught.character, opts());
  ok(emptied.character.huntsSurvived === 0 && emptied.character.huntsFailed === 1, '…nor also counted as survived when nobody is left');

  // ---------- bored adventurers ----------
  const bored = m.wait(hunt({ ...nobody, actionCount: m.ACTION_LIMIT - 1, peakSuspicion: 6 }), mimic(), opts());
  ok(bored.hunt.ending === 'abandoned' && bored.character.huntsSurvived === 1, `${m.ACTION_LIMIT} actions without a meal: the party leaves, and you survived`);
  ok(bored.character.closestCall === 6, '…your closest call is kept');
  const snowedIn = m.wait(hunt({ ...nobody, location: loc('snowbound_lodge'), mimicRoom: loc('snowbound_lodge').rooms[0], actionCount: m.ACTION_LIMIT - 1 }), mimic(), opts());
  ok(!snowedIn.hunt.ending, '…but nobody can leave the snowed-in lodge');

  // ---------- the cold (no more waiting for an effect) ----------
  const lodge = loc('snowbound_lodge');
  const quiet = lodge.rooms.find((r) => r !== lodge.snowbound.hearth && !lodge.snowbound.cold.includes(r));
  const cleric = member('Cleric', { type: 'Cleric', location: quiet, warmth: 1, maxWarmth: 5, warmthRoom: quiet });
  // random() below STAY_CHANCE: everyone stays put this turn
  const frozen = m.wait(hunt({ location: lodge, mimicRoom: lodge.snowbound.hearth, party: [cleric] }), mimic(), opts(m.STAY_CHANCE / 2));
  const ice = frozen.hunt.party[0];
  ok(ice.isFrozen && !ice.isAlive && said(frozen, 'Frozen solid'), 'a Wait at the Lodge freezes the cleric, in the same turn');
  ok(said(frozen, 'The lodge falls silent') && !frozen.hunt.recorded, 'the lodge falls silent, but the hunt isn\'t over while a frozen meal is left');
  const meal = m.eatFrozen(frozen.hunt, frozen.character, ice.id, opts());
  ok(meal.hunt.party[0].isConsumed && meal.character.assimilationPoints === m.frozenMealAp(ice), 'eating the frozen cleric: a cheap meal');
  ok(meal.hunt.recorded && meal.character.huntsSurvived === 1 && m.huntCleared(meal.hunt), '…and with nobody left, the hunt is won and counted');
  const warm = m.wait(hunt({ party: [member('Warrior', { location: 'Kitchen', warmth: 1, warmthRoom: 'Kitchen' })] }), mimic(), opts());
  ok(!warm.hunt.party[0].isFrozen, 'nowhere else is cold');

  // ---------- the Founders' Fair (the rummage reads the room you're in now) ----------
  const fair = loc('founders_fair');
  const gate = fair.rooms[0]; // where the volley goes up with random() = 0
  const nextToGate = m.getAdjacentRooms(fair, gate)[0];
  const crate = mimic({ forms: [ref('lesser_crate')] });
  const tossed = m.relocate(hunt({ location: fair, mimicRoom: nextToGate, party: [], turn: fair.fireworks.every - 1 }), crate, gate, opts(0));
  ok(tossed.hunt.fireworksRoom === gate && said(tossed, 'heave you out'), 'a crate that moves under the volley is rummaged and thrown out');
  ok(tossed.hunt.mimicRoom !== gate && tossed.hunt.suspicion === 1 + fair.fireworks.crates.lesser_crate, '…into another room, for the move and the rummage');
  ok(m.skyward({ ...tossed.hunt, mimicRoom: gate }), 'skyward: everyone under the volley is looking up');
  const slipped = m.relocate(hunt({ location: fair, mimicRoom: gate, party: [], turn: fair.fireworks.every - 1 }), crate, nextToGate, opts(0));
  ok(slipped.hunt.fireworksRoom === gate && slipped.hunt.mimicRoom === nextToGate && slipped.hunt.suspicion === 1, '…but one that just slipped out from under it isn\'t');

  // ---------- Stargazers' Hill (a star claimed this turn: the sky waits for the next one) ----------
  const hill = loc('stargazers_hill');
  const [hillMimic, hillStar] = hill.rooms;
  const stargazer = member('Stargazer', { location: hillStar });
  const starHunt = (over) => hunt({ location: hill, mimicRoom: hillMimic, party: [stargazer], turn: hill.starfall.every - 1, ...over });
  const skyFalls = m.wait(starHunt({ starFragment: null }), mimic(), opts(m.STAY_CHANCE / 2));
  ok(skyFalls.hunt.starFragment !== null && said(skyFalls, '🌠 The sky splits open'), 'on the due turn, a star lands');
  const pocketed = m.wait(starHunt({ starFragment: hillStar }), mimic(), opts(m.STAY_CHANCE / 2));
  ok(said(pocketed, 'scoops up the star fragment'), '…someone pockets the one lying about');
  ok(pocketed.hunt.starFragment === null && !said(pocketed, 'The sky splits open'), '…and no new one falls that same turn');

  // ---------- Strike ----------
  const idle = m.strike(hunt(), mimic(), opts());
  ok(idle.hunt.turn === 0 && said(idle, 'No adventurers are close enough'), 'Strike with nobody in reach: no turn taken');
  ok(!m.canStrike(hunt()) && m.canStrike(hunt({ party: [member('Lured', { isAttracted: true })] })), 'canStrike: only with someone lured (or a rival, or the fireworks)');

  // ---------- meals and evolving ----------
  const mouse = { uid: 'm1', id: 'mouse', name: 'Mouse', ap: 3, discipline: 1, description: '', location: 'Library', isConsumed: false };
  const hungry = mimic({ assimilationPoints: m.TIER_CONFIG.Lesser.apToEvolve - 2 });
  const snack = m.eatCreature(hunt({ creatures: [mouse], actionCount: 7 }), hungry, 'm1', opts());
  ok(snack.hunt.creatures[0].isConsumed && snack.hunt.actionCount === 0, 'a small creature: eaten, and the party\'s boredom resets');
  ok(snack.evolve && said(snack, 'reached the threshold'), 'enough AP: the upgrade screen opens');
  ok(snack.changes.lastFedAt === now.toISOString() && snack.hunt.biggestMeal?.name === 'Mouse', '…noted as fed (when), and as the biggest meal so far');

  // ---------- the cat knows ----------
  const cat = { ...mouse, uid: 'c1', name: 'Fair Cat' };
  const stare = m.eatStar(hunt({ creatures: [cat] }), mimic(), opts());
  ok(stare.log.filter((l) => l.message === m.CAT_KNOWS_LINE).length === 1, 'a cat in your room stares, after any action');
  ok(!said(m.eatStar(stare.hunt, mimic(), opts()), m.CAT_KNOWS_LINE), '…once per hunt');

  // ---------- the Sinking Ship ----------
  const ship = loc('sinking_ship');
  const sunk = m.wait(hunt({ location: ship, mimicRoom: ship.rooms[0], party: [member('Sailor', { location: ship.rooms[1] })], turn: ship.sinkingTurns - 1 }), mimic(), opts());
  ok(sunk.hunt.party[0].fled && said(sunk, 'slides beneath the waves'), 'the last turn of the ship: everyone left takes to the lifeboats');
  ok(sunk.hunt.recorded && sunk.character.huntsSurvived === 1, '…and the hunt is over, survived');

  // ---------- Devotion ----------
  const shrine = loc('hollow_reliquary');
  const pilgrim = member('Pilgrim', { location: 'Nave', behavior: 'devotion', convertedName: 'Zealot' });
  const gone = member('Eaten', { isAlive: false, isConsumed: true });
  const pair = hunt({ location: shrine, mimicRoom: 'Nave', party: [pilgrim, gone] });
  ok(m.devotion(hunt({ location: shrine, mimicRoom: 'Nave', party: [pilgrim, member('Friend', { location: 'Nave' })] }), mimic()) === null,
    'no ceremony while anyone else is still about');
  const rite = m.devotion(pair, mimic({ assimilationPoints: 1 }), opts(0));
  const convert = rite.start.hunt.party[0];
  ok(convert.isConverted && !convert.isAlive && convert.name === 'Zealot', 'the last pilgrim converts');
  ok(rite.start.character.conversions === 1 && rite.start.changes.conversions === 1, '…counted (and saved) straight away');
  ok(rite.start.hunt.recorded && rite.start.character.huntsSurvived === 1, '…and the hunt is won');
  const offered = rite.steps.reduce((sum, s) => sum + s.ap, 0);
  ok(offered === m.OFFERING_COUNT[0] * shrine.locationCreatures[0].ap && rite.changes.assimilationPoints === 1 + offered,
    'the offerings add up, and their AP is saved at the end');
  ok(m.devotion(rite.start.hunt, rite.start.character) === null, 'one ceremony per pilgrim');
  ok(m.devotion({ ...pair, ending: 'discovered' }, mimic()) === null, 'no ceremony once you\'ve been found out');
}
