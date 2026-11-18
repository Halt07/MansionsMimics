// Strikes: who gets struck, rival mimics, partial bites and swallowing whole (src/data/strike.ts).
//
// Most checks use a constant random value, so every die rolls the same face (r = 0.5 → 4s,
// r = 0.7 → 5s): who wins a contest then depends only on how many dice each side has, and
// each extra roll (flee, material…) is just whether r is under its threshold.
export default async function ({ gameData: m, ok }) {
  const always = (r) => () => r;
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  const form = m.ALL_FORMS.find((f) => f.id === 'lesser_chest');
  const member = (name, over = {}) => ({
    id: name, name, type: 'Warrior', group: 'common', discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: 'touch',
    suspicion: 2, location: 'Library', isAlive: true, isConsumed: false, isAttracted: true,
    quirks: [], alluringQualities: { materials: [], traits: [], tags: [] }, perceptionAffinity: {},
    lootMaterials: ['Iron', 'Oak'], lootTraits: ['Etched'], partialLoot: ['a strap'], ...over,
  });
  const alone = { othersRemain: false, inRoom: 0, witnesses: 0 };
  const crowd = (n) => ({ othersRemain: true, inRoom: n, witnesses: n });

  // ---------- who gets struck ----------
  ok(m.strikeDice(3, {}) === 3 && m.strikeDice(3, { primaryMaterials: ['Bonesteel'] }) === 4, 'Bonesteel adds a strike die');
  ok(m.strikeDice(3, null) === 3 && m.strikeDice(3, undefined) === 3, 'no appearance: just your Adhesion');

  const lured = member('Lured');
  const idle = member('Idle', { isAttracted: false });
  const idleElsewhere = member('Far', { isAttracted: false, location: 'Wine Cellar' });
  const dead = member('Dead', { isAlive: false });
  const eaten = member('Eaten', { isConsumed: true, isAlive: false });
  const fledHere = member('Fled', { isAttracted: false, fled: true });
  const party = [lured, idle, idleElsewhere, dead, eaten, fledHere];
  const names = (xs) => xs.map((a) => a.name).join(',');
  ok(names(m.strikeCandidates(party, 'Library', false)) === 'Lured', 'normally only the lured can be struck');
  ok(names(m.strikeCandidates(party, 'Library', true)) === 'Lured,Idle', 'under the fireworks: anyone in your room too (not the fled, not anyone elsewhere)');
  ok(m.strikeCandidates([member('L', { isAttracted: true, isAlive: false, isFrozen: true })], 'Library', false).length === 0, 'the frozen can\'t be struck (eat them from the Frozen Solid panel)');

  const near = member('Near', { location: 'Drawing Room' });
  const here = member('Here', { location: 'Library' });
  ok(m.pickStrikeTarget([near, here], manor, 'Library', form, {})?.name === 'Here', 'the nearest gets struck first');
  const keen = member('Keen', { alluringQualities: { materials: [], traits: ['Iron-Banded'], tags: ['Storage'] } });
  const cold = member('Cold', { repelledBy: { tags: ['Storage'] } });
  ok(m.pickStrikeTarget([cold, keen], manor, 'Library', form, {})?.name === 'Keen', 'among the nearest, whoever likes your look most');
  ok(m.pickStrikeTarget([], manor, 'Library', form, {}) === null, 'nobody to strike: null');

  const t = member('Target');
  const w = m.strikeWitnesses([t, member('A'), member('B', { location: 'Wine Cellar' }), member('Gone', { fled: true }),
    member('Lost', { isDisappeared: true, isAlive: false }), member('Ice', { isAlive: false, isFrozen: true })], t, 'Library', false);
  ok(w.othersRemain && w.inRoom === 1 && w.witnesses === 1, 'witnesses: only others still hunting, in your room');
  ok(m.strikeWitnesses([t, member('A')], t, 'Library', true).witnesses === 0, 'under the fireworks nobody witnesses anything');
  ok(m.strikeWitnesses([t, member('A')], t, 'Library', true).inRoom === 1, '…though they\'re still in the room');
  ok(!m.strikeWitnesses([t, member('Gone', { fled: true })], t, 'Library', false).othersRemain, 'the target is the last one: nobody else remains');

  // ---------- rival mimics ----------
  const rival = (kind, over = {}) => ({ id: kind, kind, room: 'Library', revealed: true, consumed: false, clueGiven: false, ...over });
  const lone = rival('lone');
  const won = m.resolveRivalStrike(lone, 3, manor, [lone], 'Library', always(0.5));
  ok(won.devoured && won.ap === m.RIVAL_STATS.lone.ap, 'a tie with a rival goes to you: devoured for its AP');
  const lost = m.resolveRivalStrike(lone, 2, manor, [lone], 'Library', always(0.5));
  ok(!lost.devoured && lost.hidesIn !== 'Library' && manor.rooms.includes(lost.hidesIn), `fewer dice: it slips away and hides elsewhere (the ${lost.hidesIn})`);
  const elder = rival('elder');
  ok(!m.resolveRivalStrike(elder, 4, manor, [elder], 'Library', always(0.5)).devoured, 'the Elder rolls 5 dice: 4 isn\'t enough');
  ok(m.resolveRivalStrike(elder, 5, manor, [elder], 'Library', always(0.5)).ap === 18, '5 is: the Elder is worth 18 AP');

  // ---------- partial bites ----------
  const bite = (target, ctx = {}, r = 0.7) => m.resolveBite(target, {
    dice: 3, patience: 3, form, knownMaterials: [], snowbound: false, witnesses: crowd(0), ...ctx,
  }, always(r));
  // Dice: you roll `dice` vs their Discipline (+1 if elusive) to latch; then `patience` vs Discipline + 1 to hold
  const missed = bite(member('M', { discipline: 4 }));
  ok(!missed.latched && !missed.held && missed.ending === 'continues', 'outrolled: the jaws close on nothing');
  ok(missed.suspicion === 2 && missed.targetSuspicion === 2 && missed.hits === 0 && missed.ap === 0, '…+2 suspicion, they\'re warier, no hit counted');

  const wrench = bite(member('W', { discipline: 2 }), { patience: 2 });
  ok(wrench.latched && !wrench.held && wrench.ending === 'continues', 'latched, but too impatient to hold: they wrench free');
  ok(wrench.suspicion === 3 && wrench.targetSuspicion === 4 && wrench.hits === 1 && wrench.ap === 0, '…+3 suspicion, +4 on them, and the hit still counts');

  const held = bite(member('H', { discipline: 2 }));
  ok(held.latched && held.held && held.ending === 'continues' && held.hits === 1, 'held: a piece tears off, and they stagger on');
  ok(held.ap === 1 && held.scrap === 'a strap' && held.material === null, '…1 AP and a scrap (no material on this roll)');
  ok(held.suspicion === 2 && !held.loudCry, 'a bite is always noticed: +2');
  ok(m.ALL_FORMS && ['hand', 'forearm', 'boot', 'calf', 'pant leg', 'cloak edge', 'shirt sleeve'].includes(held.part), `bitten somewhere ordinary (${held.part})`);
  const loud = bite(member('H', { discipline: 2 }), { witnesses: crowd(3) });
  ok(loud.suspicion === 3 && loud.crySuspicion === 3 && loud.loudCry, 'a crowd of 3 watching: +3, and every head turns');
  ok(bite(member('H', { discipline: 2, partialLoot: [] })).scrap === 'scrap of cloth', 'no loot listed: a scrap of cloth');

  const giant = bite(member('G', { group: 'giantKin', discipline: 2 }), {}, 0.7);
  ok(giant.ap === 3 && ['ankle', 'bootlace, thick as rope', 'cloak hem', 'calloused toe', 'belt edge', 'trailing sleeve'].includes(giant.part), 'a giant: bigger bites (2–3 AP), and giant-sized body parts');
  ok(bite(member('G', { group: 'giantKin', discipline: 2 }), {}, 0.2).ap === 2, '…2 AP on a low roll');

  const learns = bite(member('L', { discipline: 1 }), { patience: 3 }, 0.2);
  ok(learns.held && learns.material === 'Iron', 'a lucky bite teaches one of their materials');
  ok(bite(member('L', { discipline: 1 }), { knownMaterials: ['Iron'], patience: 3 }, 0.2).material === null, '…but not one you already know');

  // Worn down: the hit that reaches their constitution
  const worn = (over, ctx = {}, r = 0.7) => bite(member('X', { constitution: 2, hitsTaken: 1, discipline: 2, ...over }), ctx, r);
  const collapse = worn({});
  ok(collapse.ending === 'collapses' && collapse.hits === 2 && collapse.ap === 1 + m.COLLAPSE_BONUS_AP, 'worn down: they collapse, and you finish the meal (+2 AP)');
  ok(collapse.suspicion === 2, '…with others still about, the bite is noticed');
  const lastMeal = worn({}, { witnesses: alone });
  ok(lastMeal.ending === 'collapses' && lastMeal.suspicion === 0, 'finishing off the last of them: no suspicion (nobody\'s left)');
  ok(worn({ discipline: 2 }, {}, 0.2).ending === 'collapses', 'Discipline under 3 never runs, whatever the roll');

  const tough = { discipline: 3 };
  const toughCtx = { dice: 4, patience: 5 };
  const flees = worn(tough, toughCtx, 0.4);
  ok(flees.ending === 'flees' && flees.suspicion === 2 + 3 && flees.crySuspicion === 2, 'Discipline 3+ and the flee roll: they run from the building (+3 more)');
  ok(flees.ap === 1, '…you keep the bite, but not the meal');
  ok(worn(tough, toughCtx, 0.7).ending === 'collapses', 'Discipline 3+ but the roll fails: they collapse anyway');
  const bolts = worn({ ...tough, behavior: 'elusive' }, { dice: 5, patience: 5 }, 0.4);
  ok(bolts.ending === 'bolts' && bolts.targetSuspicion === 2 && bolts.suspicion === 2, 'an elusive one bolts to another room instead of leaving');
  const trapped = worn(tough, { ...toughCtx, snowbound: true }, 0.4);
  ok(trapped.ending === 'trapped' && trapped.targetSuspicion === 3 && trapped.suspicion === 2, 'snowed in: they try to flee, but bolt to another room instead');
  ok(worn({ ...tough, behavior: 'elusive' }, { dice: 5, patience: 5, snowbound: true }, 0.4).ending === 'bolts', 'elusive and snowed in: just bolts');
  ok(worn({ constitution: undefined, hitsTaken: 2 }).ending === 'collapses', 'no constitution listed: 3 hits');
  ok(worn({ constitution: 0, hitsTaken: 2 }).maxHits === 3, '…and a constitution of 0 also counts as 3');

  // Worn down, but they wrenched free
  const wrenchWorn = (over, ctx = {}, r = 0.7) => bite(member('Y', { constitution: 2, hitsTaken: 1, discipline: 2, ...over }), { patience: 2, ...ctx }, r);
  ok(wrenchWorn({}, {}, 0.5).ending === 'flees', 'wrenched free with nothing left: the flee roll sends them running');
  ok(wrenchWorn({}, {}, 0.7).ending === 'continues' && wrenchWorn({}, {}, 0.7).hits === 2, '…or they stay, shaken, and the hit still counts');
  ok(wrenchWorn({ behavior: 'elusive' }, { dice: 3, patience: 2 }, 0.5).ending === 'bolts', '…an elusive one bolts');
  ok(wrenchWorn({}, { snowbound: true }, 0.5).ending === 'trapped', '…snowed in, they can\'t get out');
  ok(wrenchWorn({}, {}, 0.5).suspicion === 3, '…+3 suspicion either way');

  // ---------- swallowed whole ----------
  const mimic = (over = {}) => ({ currentAppearance: {}, learnedMaterials: [], learnedTraits: [], downWithTheShipReached: false, giantsConsumedWhole: [], titanicFeastReached: false, ...over });
  const swallow = (target, over = {}, ctx = {}, r = 0.5) => m.resolveSwallow(target, mimic(over), { dice: 3, form, witnesses: crowd(0), ...ctx }, always(r));

  const miss = swallow(member('S', { discipline: 4 }));
  ok(!miss.swallowed && miss.suspicion === 4 && !miss.bolts, 'outrolled: they saw you lunge (+4)');
  ok(swallow(member('S', { discipline: 4 }), { currentAppearance: { primaryMaterials: ['Dragonhide'] } }).suspicion === 3, 'Dragonhide softens it to +3');
  ok(swallow(member('S', { discipline: 3, behavior: 'elusive' })).bolts, 'an elusive target gets an extra die, and bolts when it slips you');
  ok(swallow(member('S', { discipline: 3 })).swallowed, '…the same dice against an ordinary target: swallowed');

  const meal = swallow(member('S', { type: 'Rogue' }));
  ok(meal.swallowed && meal.ap === m.AP_REWARDS.Rogue && meal.treasureAp === 0, 'swallowed: its usual AP, no treasure');
  ok(meal.suspicion === 1, 'others still about, nobody watching: +1 (someone\'s gone missing)');
  ok(swallow(member('S'), {}, { witnesses: crowd(1) }).suspicion === 2 && swallow(member('S'), {}, { witnesses: crowd(3) }).suspicion === 3, 'one witness: +2; a crowd of 3: +3');
  ok(swallow(member('S'), {}, { witnesses: alone }).suspicion === 0, 'the last of the party: nothing');
  ok(swallow(member('S'), {}, { witnesses: { othersRemain: true, inRoom: 2, witnesses: 0 } }).suspicion === 1, 'under the fireworks: just the +1 once they\'re missed');
  ok(swallow(member('S', { group: 'giantKin' })).ap === m.AP_REWARDS.Giant, 'a giant swallowed whole: the giant reward');
  ok(swallow(member('S', { isCompanion: true, apReward: 2 })).ap === 2, 'a companion: its own AP');

  // Treasure: the Captain and the strongbox
  const captain = m.ADVENTURER_TEMPLATES.find((a) => a.name === "Ship's Captain");
  const cap = (over) => member("Ship's Captain", { ...captain, ...over });
  const sank = swallow(cap({ discipline: 2, behavior: undefined }));
  ok(sank.swallowed && sank.treasureAp === captain.treasure.ap && sank.sankWithShip, 'the Captain: the strongbox comes too (+8), and Down With the Ship');
  ok(sank.learning.prize && [...captain.treasure.materials, ...captain.treasure.traits].includes(sank.learning.prize.name), `…with one new thing from the strongbox (${sank.learning.prize?.name})`);
  ok(!swallow(cap({ discipline: 2, behavior: undefined }), { downWithTheShipReached: true }).sankWithShip, 'Down With the Ship only counts the first time');
  const allKnown = swallow(cap({ discipline: 2, behavior: undefined }), { learnedMaterials: captain.treasure.materials, learnedTraits: captain.treasure.traits });
  ok(allKnown.learning.prize === null, 'a strongbox with nothing new in it: no prize');
  ok(swallow(member('S', { treasure: m.STAR_FRAGMENT })).treasureAp === m.STAR_FRAGMENT.ap, 'a pocketed star fragment is treasure too');

  // Titanic Feast
  const giants = m.TITANIC_FEAST_GIANTS;
  const g = (name, over = {}) => member(name, { group: 'giantKin', ...over });
  const first = swallow(g(giants[0]));
  ok(first.feastProgress && !first.feastComplete && first.giantsConsumedWhole.join() === giants[0], 'the first Cloud Kingdom giant swallowed whole: progress toward the Feast');
  ok(!swallow(g(giants[0]), { giantsConsumedWhole: [giants[0]] }).feastProgress, 'the same giant again doesn\'t count twice');
  const last = swallow(g(giants.at(-1)), { giantsConsumedWhole: giants.slice(0, -1) });
  ok(last.feastComplete && !last.feastProgress, 'the last of them: the Titanic Feast');
  ok(!swallow(g(giants.at(-1)), { giantsConsumedWhole: giants.slice(0, -1), titanicFeastReached: true }).feastComplete, '…only once');
  ok(!swallow(g(giants[0], { isCompanion: true })).feastProgress, 'a companion with a giant\'s name doesn\'t count');
  ok(!swallow(member('Half-Giant Mercenary', { group: 'giantKin' })).feastProgress, 'a giant from elsewhere doesn\'t count');

  // What a meal teaches
  const teacher = member('T', { lootMaterials: ['Iron', 'Oak', 'Silk'], lootTraits: ['Etched', 'Gilded'] });
  const lean = m.rollLearning(teacher, mimic(), always(0));
  ok(lean.materials.length === 1 && lean.traits.length === 1, 'a lean meal: at least one material, and one trait');
  const rich = m.rollLearning(teacher, mimic(), always(0.99));
  ok(rich.materials.length === 3 && rich.traits.length === 2, 'a rich one: everything they had');
  ok(m.rollLearning(teacher, mimic({ learnedMaterials: ['Iron', 'Oak', 'Silk'], learnedTraits: ['Etched', 'Gilded'] }), always(0.99)).newMaterials.length === 0, 'nothing new if you know it all');
  ok(m.rollLearning(member('N', { lootMaterials: [], lootTraits: [] }), mimic(), always(0.99)).materials.length === 0, 'nothing to learn from someone with nothing');
  const byType = m.rollLearning(member('N', { type: 'Wizard', lootMaterials: undefined, lootTraits: undefined }), mimic(), always(0.99));
  ok(byType.materials.length > 0 && byType.materials.every((x) => m.ADVENTURER_MATERIALS.Wizard.includes(x)), 'no loot listed: what their type usually carries');
  const withPrize = m.rollLearning(cap({}), mimic(), always(0.99));
  ok(withPrize.prize && !withPrize.newMaterials.includes(withPrize.prize.name) && (withPrize.materials.includes(withPrize.prize.name) || withPrize.traits.includes(withPrize.prize.name)),
    'the treasure\'s prize is learned, and announced on its own (not as an ordinary new material)');
}
