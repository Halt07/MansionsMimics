// Luring (resolveLure) and the stealth checks anyone coming into the mimic's room faces
// (resolveStealth). A constant random value makes every die the same face, so a check is won
// on dice counts alone: the mimic's dice against the adventurer's.
export default async function ({ gameData: m, ok }) {
  const always = (r) => () => r;
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  const form = (id) => m.ALL_FORMS.find((f) => f.id === id);
  const chest = form('lesser_chest');
  const member = (name, over = {}) => ({
    id: name, name, type: 'Warrior', group: 'common', discipline: 2, baseSuspicion: 2, suspicion: 2, constitution: 3,
    interactionStyle: 'touch', location: 'Library', isAlive: true, isConsumed: false, isAttracted: false,
    quirks: [], alluringQualities: { materials: [], traits: [], tags: [] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 0, social: 0, spatial: 0, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: [], lootTraits: [], partialLoot: [], ...over,
  });
  const keen = (name, over) => member(name, { discipline: 0, suspicion: 0, ...over });   // can't resist
  const stubborn = (name, over) => member(name, { discipline: 20, ...over });          // can't be lured
  const lureCtx = (over = {}) => ({
    location: manor, mimicRoom: 'Library', range: 1, form: chest, mimic: { baseAllure: 3, currentAppearance: {} }, plausibility: 4, ...over,
  });
  const lure = (party, over, r = 0.5) => m.resolveLure(party, lureCtx(over), always(r));
  const near = m.getAdjacentRooms(manor, 'Library')[0];
  const far = manor.rooms.find((r) => m.getRoomDistance(manor, 'Library', r) === 2);

  // ---------- the Lure ----------
  const drawn = lure([keen('Next door', { location: near })]);
  ok(drawn.attempts.length === 1 && drawn.attempts[0].drawnIn && drawn.party[0].isAttracted && drawn.party[0].location === 'Library',
    'falls for it next door: lured, and comes into your room');
  ok(drawn.arrivals.length === 1 && drawn.arrivals[0].name === 'Next door', '…and arrives (a stealth check follows)');
  const here = lure([keen('Here')]);
  ok(here.party[0].isAttracted && !here.attempts[0].drawnIn && here.arrivals.length === 0, 'already in your room: lured where they stand, no arrival');
  const resisted = lure([stubborn('Wary', { location: near })]);
  ok(!resisted.attempts[0].result.success && !resisted.party[0].isAttracted && resisted.party[0].location === near, 'resists: stays put, unlured');
  ok(lure([keen('Far', { location: far })]).attempts.length === 0, 'two rooms away, with a range of 1: out of reach');
  ok(lure([keen('Far', { location: far })], { range: 2 }).attempts.length === 1, '…a range of 2 reaches them');
  const skipped = [keen('Lured', { isAttracted: true }), keen('Dead', { isAlive: false }), keen('Eaten', { isConsumed: true }), keen('Ice', { isAlive: false, isFrozen: true })];
  ok(lure(skipped).attempts.length === 0, 'the already lured, the dead, the eaten and the frozen aren\'t tried');
  ok(lure([]).attempts.length === 0 && lure([]).suspicion === 0, 'nobody about: no attempts');

  const putOff = lure([member('Picky', { discipline: 3, suspicion: 0, location: near, repelledBy: { tags: ['Storage'], traits: ['Locked'] } })]);
  ok(putOff.attempts[0].result.disliked.join() === 'Locked,Storage' && putOff.attempts[0].result.aversion === 2, 'dislikes are named, and each costs a die');
  const fan = member('Fan', { discipline: 0, suspicion: 0, alluringQualities: { materials: [], traits: ['Iron-Banded', 'Heavy-Lidded', 'Locked'], tags: ['Storage', 'Valuable'] } });
  ok(lure([fan], { plausibility: 4 }).suspicion === 1, 'liking more about you than your Plausibility can sell: +1 suspicion');
  ok(lure([fan], { plausibility: 5 }).suspicion === 0, '…a believable amount of liking is fine');
  ok(lure([fan, { ...fan, id: 'Fan2', name: 'Fan2' }], { plausibility: 2 }).suspicion === 2, '…and it adds up, one per adventurer');
  const barrelRoom = m.getRoomContextMod('lesser_barrel', 'manor', 'Wine Cellar');
  ok(lure([], { form: form('lesser_barrel'), mimicRoom: 'Wine Cellar' }).roomMod.allure === barrelRoom.allure, 'the room\'s allure bonus for your form comes back for the log');
  const party = [keen('A', { location: near })];
  const snap = JSON.stringify(party);
  lure(party);
  ok(JSON.stringify(party) === snap, 'the party passed in is never changed');

  // ---------- stealth ----------
  // Stealth dice: Plausibility (after a form-tier penalty and the room), + Patience / 2.
  // Against: Discipline + suspicion. Plausibility 3 or less also exposes 1–2 flaws to check.
  const mimic = (over = {}) => ({ tier: 'Lesser', currentAppearance: {}, ...over });
  const stealthCtx = (over = {}) => ({ location: manor, mimicRoom: 'Drawing Room', form: chest, mimic: mimic(), plausibility: 4, patience: 2, ...over });
  const sneak = (arrivals, over, r = 0.5) => m.resolveStealth(arrivals, stealthCtx(over), always(r));

  ok(sneak([]).checks.length === 0 && sneak([]).suspicion === 0, 'nobody came in: nothing to check');
  const passed = sneak([member('Easy', { discipline: 2, suspicion: 2 })]);
  ok(passed.checks[0].result.success && passed.suspicion === 0, '5 stealth dice against 4: passed, no suspicion');
  const failed = sneak([member('Sharp', { discipline: 4, suspicion: 2 })]);
  ok(!failed.checks[0].result.success && failed.suspicion === 1 && failed.checks[0].result.detectedFlaws.length === 0, '5 against 6: failed, +1 (no flaws at Plausibility 4)');
  const flawed = sneak([member('Keen-eyed', { discipline: 4, suspicion: 2 })], { plausibility: 2 });
  ok(!flawed.checks[0].result.success && flawed.checks[0].result.detectedFlaws.length === 2 && flawed.suspicion === 3,
    'Plausibility 2: two flaws exposed, both spotted, and a fail: +3');
  const spottedButPassed = sneak([member('Noticing', { discipline: 4, suspicion: 0, perceptionAffinity: Object.fromEntries(Object.keys(member('x').perceptionAffinity).map((k) => [k, 5])) })], { plausibility: 3, patience: 6 });
  ok(spottedButPassed.checks[0].result.success && spottedButPassed.checks[0].result.detectedFlaws.length === 1 && spottedButPassed.suspicion === 0,
    'a flaw spotted on a check you still pass costs nothing');
  ok(sneak([member('Two', { discipline: 4, suspicion: 2 }), member('Three', { discipline: 4, suspicion: 2 })]).suspicion === 2, 'each failed check adds up');
  ok(!sneak([member('Easy', { discipline: 2, suspicion: 2 })], { form: form('standard_door') }).checks[0].result.success,
    'a form from the tier above costs 2 Plausibility: the same newcomer now catches you');
  const ghost = sneak([member('Ghoul', { type: 'Undead', discipline: 9, suspicion: 9 })], { mimic: mimic({ currentAppearance: { primaryMaterials: ['Gravecloth'] } }), plausibility: 1 });
  ok(ghost.checks[0].result.success && ghost.suspicion === 0, 'Gravecloth: the undead take you for one of their own');

  // Quirks
  const quirky = member('Quirky', { appliedQuirk: '{name} pokes the {form}.' });
  const tries = (r) => Array.from({ length: 20 }, () => sneak([quirky], {}, r).checks[0].quirk);
  ok(tries(0.1).every((q) => q === 'Quirky pokes the Chest.'), 'now and then a newcomer acts out a quirk on your form (a low roll: every time)');
  ok(tries(0.9).every((q) => q === null) && sneak([member('Plain')], {}, 0.1).checks[0].quirk === null, '…a high roll: never; and never if it has none');

  // A second room of the same kind
  const library = form('grand_personal_library');
  const grand = mimic({ tier: 'Grand' });
  const second = sneak([member('Easy', { discipline: 1, suspicion: 0 })], { form: library, mimic: grand, mimicRoom: 'Drawing Room' });
  ok(second.duplicateRoom === 'Library' && second.suspicion === m.DUPLICATE_ROOM_SUSPICION, `a Personal Library in a manor that already has a Library: +${m.DUPLICATE_ROOM_SUSPICION}`);
  ok(sneak([member('Easy', { discipline: 1, suspicion: 0 })], { form: library, mimic: grand, mimicRoom: 'Library' }).duplicateRoom === null, '…unless you\'re standing in for that Library');
  ok(sneak([], { form: library, mimic: grand }).duplicateRoom === null, '…and only once someone comes in to notice');
  ok(sneak([member('Easy', { discipline: 1, suspicion: 0 })]).duplicateRoom === null, 'an ordinary form is never a second room');
  ok(sneak([member('A')], { form: form('lesser_bookshelf_small'), mimicRoom: 'Library' }).roomMod.plausibility === 1, 'the room\'s Plausibility bonus for your form comes back for the log');
}
