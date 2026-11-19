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

  // ---------- once the hunt ends, nothing more happens that turn ----------
  const walker = member('Walker', { location: 'Kitchen' });
  const leftOnWait = m.wait(hunt({ party: [walker], actionCount: m.ACTION_LIMIT - 1 }), mimic(), opts(m.STAY_CHANCE));
  ok(leftOnWait.hunt.ending === 'abandoned' && !said(leftOnWait, 'You wait') && !said(leftOnWait, 'moves from'), 'the party leaves on a Wait: the Wait itself goes no further (no settling, nobody moves)');
  const lurable = member('Lurable', { location: 'Library' });
  const leftOnLure = m.lure(hunt({ party: [lurable], actionCount: m.ACTION_LIMIT - 1 }), mimic(), opts(0));
  ok(leftOnLure.hunt.ending === 'abandoned' && !leftOnLure.hunt.party[0].isAttracted && !said(leftOnLure, 'drawn toward'), '…nor a Lure (nobody is drawn in)');
  const prey = member('Prey', { location: 'Library', isAttracted: true });
  const listener = member('Listener', { location: 'Library', behavior: 'keenHearing' });
  const heard = m.strike(hunt({ party: [prey, listener], suspicion: m.MAX_SUSPICION - 1 }), mimic({ adhesion: 6 }), opts(0));
  ok(heard.hunt.ending === 'discovered' && said(heard, 'found you out'), 'heard lunging at 9 suspicion: found out');
  ok(!heard.hunt.party[0].isConsumed && heard.character.partyMembersEaten === 0 && !heard.changes.assimilationPoints, '…and you flee before the attack lands: nobody eaten, nothing gained');

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
  const luredAtGate = member('Lured', { location: gate, isAttracted: true });
  const thrownOut = m.wait(hunt({ location: fair, mimicRoom: gate, party: [luredAtGate], turn: fair.fireworks.every - 1 }), crate, opts(0));
  ok(said(thrownOut, 'heave you out') && thrownOut.hunt.party[0].location === gate && !thrownOut.hunt.party[0].isAttracted, 'thrown out: whoever you had lured stays behind, no longer lured');
  ok(!m.canStrike(thrownOut.hunt) && said(m.strike(thrownOut.hunt, crate, opts(0)), 'No adventurers are close enough'), '…so a Strike from the next room can\'t reach them');
  const movedOff = m.relocate(hunt({ party: [member('Fan', { location: 'Library', isAttracted: true })] }), mimic(), 'Drawing Room', opts());
  ok(!movedOff.hunt.party[0].isAttracted, 'moving rooms yourself does the same');

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

  // ---------- Lure with nobody in reach ----------
  const manorLoc = loc('manor');
  const farRoom = manorLoc.rooms.find((r) => m.getRoomDistance(manorLoc, 'Library', r) >= 2);
  const lonely = m.lure(hunt({ party: [member('Faraway', { location: farRoom })] }), mimic(), opts());
  ok(said(lonely, 'within lure range (1 room).'), 'nobody in reach of a range-1 lure: "1 room"');

  // ---------- a found rival is still hungry ----------
  // A rival (found, so revealed) in the Library with you; on a Wait, Walker steps in from next door
  const libRival = { id: 'r', kind: 'lone', room: 'Library', revealed: true, consumed: false, clueGiven: false, disguise: { name: 'Barrel', icon: '🛢️' } };
  // The pinned roll that walks someone from `room` into the Library (a move, not a stay, and the Library picked)
  const stepIn = (room) => { const next = m.getAdjacentRooms(loc('manor'), room); return (next.indexOf('Library') + 0.5) / next.length; };
  const besideRoom = m.getAdjacentRooms(loc('manor'), 'Library').find((r) => stepIn(r) >= m.STAY_CHANCE);
  const roll = stepIn(besideRoom);
  const walkedIn = m.wait(hunt({ party: [member('Walker', { location: besideRoom })], rivals: [libRival] }), mimic(), opts(roll));
  ok(walkedIn.hunt.party[0].isDisappeared && !walkedIn.hunt.party[0].isAlive, 'walking into your room with a found rival there: the rival eats them');
  ok(said(walkedIn, 'The rival mimic snatched up the Walker before you could get to them.') && !said(walkedIn, 'does not emerge'), '…and you see it happen');
  const elsewhere = m.wait(hunt({ mimicRoom: 'Kitchen', party: [member('Walker', { location: besideRoom })], rivals: [libRival] }), mimic(), opts(roll));
  ok(elsewhere.hunt.party[0].isDisappeared && !said(elsewhere, 'before you could get to them'), 'a rival in another room: still eaten, but out of sight');

  const drawn = m.lure(hunt({ party: [member('Drawn', { location: besideRoom }), member('Already', { location: 'Library' })], rivals: [libRival] }), mimic({ baseAllure: 6 }), opts(0));
  const [drawnIn, already] = drawn.hunt.party;
  ok(said(drawn, 'Drawn is drawn into the Library') && said(drawn, 'The rival mimic snatched up the Drawn before you could get to them.'), 'luring someone into a room with a found rival: drawn in, then eaten by it');
  ok(drawnIn.isDisappeared && !drawnIn.isAttracted && !said(drawn, 'Drawn glances') && !said(drawn, 'Drawn pauses'), '…before they reach you (so no stealth check)');
  ok(already.isAttracted && !already.isDisappeared, 'someone already in the room is lured where they stand, as usual');

  // ---------- Strike ----------
  const idle = m.strike(hunt(), mimic(), opts());
  ok(idle.hunt.turn === 0 && said(idle, 'No adventurers are close enough'), 'Strike with nobody in reach: no turn taken');
  ok(!m.canStrike(hunt()) && m.canStrike(hunt({ party: [member('Lured', { isAttracted: true })] })), 'canStrike: only with someone lured (or a rival, or the fireworks)');

  // ---------- eaten in bites ----------
  const minor = mimic({ tier: 'Minor', startingType: 'Minor', mass: 3, adhesion: 6, patience: 6, forms: [ref('minor_book')] });
  const worn = member('Worn Down', { location: 'Library', isAttracted: true, constitution: 3, hitsTaken: 2, biteAp: 2 });
  const finished = m.strike(hunt({ party: [worn] }), minor, opts(0));
  const lastBite = finished.changes.assimilationPoints;
  ok(said(finished, 'collapses from their wounds') && finished.hunt.party[0].isConsumed, 'a Minor mimic bites someone until they collapse');
  ok(finished.changes.biggestMeal?.name === 'Worn Down' && finished.changes.biggestMeal.ap === 2 + lastBite, '…and the whole meal (every bite) is its biggest meal');
  ok(finished.hunt.biggestMeal?.name === 'Worn Down' && finished.hunt.biggestMeal.ap === 2 + lastBite, '…in the hunt\'s report too');
  const firstBite = m.strike(hunt({ party: [member('Fresh', { location: 'Library', isAttracted: true, constitution: 3 })] }), minor, opts(0));
  ok(!firstBite.hunt.party[0].isConsumed && firstBite.hunt.party[0].biteAp === firstBite.changes.assimilationPoints && !firstBite.changes.biggestMeal, 'a bite that doesn\'t finish them: counted toward the meal, not a meal yet');

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

  // ---------- changing form ----------
  const twoForms = mimic({ forms: [ref('lesser_chest'), ref('lesser_crate')], formsUsed: ['lesser_chest'] });
  const shifted = m.changeForm(hunt(), twoForms, 1, opts());
  ok(shifted.character.activeFormIndex === 1 && shifted.changes.activeFormIndex === 1, 'changing form wears the one picked (and saves it)');
  ok(shifted.hunt.suspicion === 1 && said(shifted, 'You shift into the form of a Crate'), '…costing a turn of stealth: +1 suspicion');
  ok(shifted.changes.formsUsed.includes('lesser_crate') && shifted.hunt.turn === 0, '…counted as a form used, without ending the turn');
  const fey = m.changeForm(hunt(), { ...twoForms, currentAppearance: { primaryMaterials: ['Feywood'] } }, 1, opts());
  ok(fey.hunt.suspicion === 0 && said(fey, 'the Feywood makes the shift effortless'), 'with Feywood, the shift is free');
  const sensitive = member('Seer', { location: 'Library', behavior: 'shapeSense' });
  const sensed = m.changeForm(hunt({ party: [sensitive] }), twoForms, 1, opts());
  ok(sensed.hunt.suspicion === 3 && said(sensed, 'something nearby just changed its shape'), 'shape sense nearby: they feel it (+2 more)');
  ok(m.changeForm(hunt({ party: [sensitive] }), { ...twoForms, currentAppearance: { primaryMaterials: ['Feywood'] } }, 1, opts()).hunt.suspicion === 0,
    '…unless Feywood hides it too');

  // ---------- changing appearance: Thimblewood and Soulglass ----------
  const look = (mats) => ({ primaryMaterials: mats, secondaryMaterials: [], surfaceTraits: [], symbolicTraits: [], conditionTraits: [], scentTraits: [] });
  const standardForm = m.getValidForms('Lesser', 6, { learnedMaterials: [], learnedTraits: [] }).find((f) => f.tier === 'Standard' && !f.variantOf);
  const wide = mimic({ forms: [ref('lesser_chest'), ref(standardForm.id)], activeFormIndex: 1 });
  const plainLook = m.changeAppearance(hunt(), wide, look(['Oak']), opts());
  ok(plainLook.changes.currentAppearance.primaryMaterials[0] === 'Oak' && !plainLook.chooseForms && plainLook.hunt.suspicion === 0, 'an ordinary new look: saved, no cost, nothing else to do');
  const shrunk = m.changeAppearance(hunt(), wide, look(['Thimblewood']), opts());
  ok(said(shrunk, 'You are one size smaller now') && shrunk.chooseForms, 'putting on Thimblewood shrinks the mimic, and new forms must be chosen');
  ok(shrunk.character.forms.map((f) => f.formId).join() === 'lesser_chest' && said(shrunk, `no longer fit you and have been lost: ${standardForm.id}`), '…a form two tiers up is dropped, and named');
  ok(shrunk.character.activeFormIndex === 0, '…and the mimic wears what it has left');
  const regrown = m.changeAppearance(hunt(), shrunk.character, look(['Oak']), opts());
  ok(said(regrown, 'swell back to your full size') && regrown.chooseForms && !said(regrown, 'have been lost'), 'taking it off: back to full size, forms to choose, nothing lost');
  ok(!m.changeAppearance(hunt(), shrunk.character, look(['Thimblewood', 'Oak']), opts()).chooseForms, 'keeping it on: no resize');

  const rival = (id, kind, room, over = {}) => ({ id, kind, room, revealed: false, consumed: false, clueGiven: false, disguise: { name: 'Barrel', icon: '🛢️' }, ...over });
  const lurking = hunt({ rivals: [rival('a', 'lone', 'Kitchen'), rival('b', 'elder', 'Cellar')] });
  ok(said(m.changeAppearance(lurking, mimic(), look(['Soulglass']), opts()), 'The Elder hides in the Cellar.'), 'putting on Soulglass senses a hidden rival, the Elder first');
  ok(said(m.changeAppearance(hunt({ rivals: [rival('a', 'lone', 'Kitchen')] }), mimic(), look(['Soulglass']), opts()), `The ${m.RIVAL_STATS.lone.name} hides in the Kitchen.`), '…or whichever is hiding');
  ok(!said(m.changeAppearance(lurking, mimic({ currentAppearance: look(['Soulglass']) }), look(['Soulglass', 'Oak']), opts()), 'Soulglass hums'), '…only when first put on');
  ok(!said(m.changeAppearance(hunt({ rivals: [rival('a', 'lone', 'Kitchen', { revealed: true })] }), mimic(), look(['Soulglass']), opts()), 'Soulglass hums'), '…and not for a rival already exposed');

  // ---------- the Sinking Ship ----------
  const ship = loc('sinking_ship');
  const sunk = m.wait(hunt({ location: ship, mimicRoom: ship.rooms[0], party: [member('Sailor', { location: ship.rooms[1] })], turn: ship.sinkingTurns - 1 }), mimic(), opts());
  ok(sunk.hunt.party[0].fled && said(sunk, 'slides beneath the waves'), 'the last turn of the ship: everyone left takes to the lifeboats');
  ok(sunk.hunt.recorded && sunk.character.huntsSurvived === 1, '…and the hunt is over, survived');
  const caughtAboard = m.relocate(hunt({ location: ship, mimicRoom: ship.rooms[0], party: [], suspicion: m.MAX_SUSPICION - 1, turn: ship.sinkingTurns - 1 }), mimic(), m.getAdjacentRooms(ship, ship.rooms[0])[0], opts());
  ok(caughtAboard.hunt.ending === 'discovered' && !said(caughtAboard, 'slides beneath the waves') && caughtAboard.character.huntsSurvived === 0,
    'found out on the last turn: you flee, and the ship does not then sink with you swimming ashore');

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
