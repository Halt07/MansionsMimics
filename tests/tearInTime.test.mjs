// The Tear in Time: Primordial's own hunting ground. Who it opens to, who's there (its own
// roster, a lost stray, and rarely the Time Caster), becoming Primordial by hunting there, and
// how it's kept secret from everyone else (the Codex, Connoisseur, Master of Disguise).
export default async function ({ gameData: m, ok }) {
  const tear = m.LOCATIONS.find((l) => l.id === 'tear_in_time');
  const ref = (formId) => ({ formId, name: formId, tier: m.ALL_FORMS.find((f) => f.id === formId).tier, learned: true });
  const apex = (over = {}) => ({
    id: 'mimic', name: 'Testy', startingType: 'Minor', tier: 'Apex', mass: 60, branchTier: null, sovereignReached: false,
    timeTearCounter: 50, timeCasterEaten: false, plausibility: 3, adhesion: 3, patience: 3, baseAllure: 3, digestiveCapacity: 8,
    assimilationPoints: 0, forms: [ref('apex_watchtower')], activeFormIndex: 0, currentAppearance: {},
    learnedMaterials: [], learnedTraits: [], rareLocation: null, burnedLocations: [], burnedForms: [],
    adventurersMet: [], adventurersEaten: [], formsUsed: [], formHuntCounts: {}, locationHuntCounts: {},
    huntsSurvived: 0, huntsFailed: 0, closestCall: 0, conversions: 0, mimicsConsumed: 0, partyMembersEaten: 0,
    biggestMeal: null, giantsConsumedWhole: [], titanicFeastReached: false, downWithTheShipReached: false, lifetimeApEarned: 0,
    ...over,
  });

  // ---------- the place ----------
  ok(tear && tear.branch === 'Primordial' && tear.minTier === 'Apex' && tear.minMass === m.TIME_TEAR_MASS && tear.exclusiveRoster, 'the Tear in Time: Primordial\'s ground, Apex and 50 mass, its own roster');
  ok(m.LOCATIONS.filter((l) => l.branch).length === 1, '…the only branch location so far');

  // ---------- who it opens to ----------
  ok(!m.isLocationAvailable(tear, 'Apex', 200, null), 'never offered on tier and mass alone');
  ok(!m.branchLocationOpen(tear, apex({ timeTearCounter: 49 })) && !m.branchLocationOpen(tear, apex({ mass: 48 })), 'closed short of 50 magic users or 50 mass');
  ok(m.branchLocationOpen(tear, apex()), 'open once both are met');
  ok(m.branchLocationOpen(tear, apex({ branchTier: 'Primordial', timeTearCounter: 0 })), 'always open to a Primordial mimic, its own ground');
  ok(!m.branchLocationOpen(tear, apex({ branchTier: 'Eternal' })) && !m.branchLocationOpen(tear, apex({ branchTier: 'Sovereign', mass: 100 })), 'closed for good to one that took another branch');
  ok(!m.branchLocationOpen(m.LOCATIONS.find((l) => l.id === 'manor'), apex()), 'an ordinary location is never a branch location');

  // ---------- who's there ----------
  const roster = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('tear_in_time'));
  ok(roster.length === 7 && roster.every((t) => m.isHiddenAdventurer(t)), 'its own seven adventurers, all hidden (Beyond the Apex)');
  ok(roster.some((t) => t.name === m.TIME_CASTER && t.type === 'Wizard'), '…the Time Caster among them, a magic user');
  const hunter = roster.find((t) => t.name === 'Cave Hunter');
  ok(hunter.companion?.options.map((o) => o.nameSuffix).join() === "'s Wolf" && hunter.companion.chance > 0, 'a Cave Hunter may bring a half-tamed wolf');
  const named = (n) => roster.find((t) => t.name === n);
  const resist = roster.filter((t) => t.name !== m.TIME_CASTER).map((t) => m.strikeResistDice(t));
  ok(resist.reduce((n, d) => n + d, 0) / resist.length >= 4.3, `a hard place to hunt: its people resist a Strike with ${(resist.reduce((n, d) => n + d, 0) / resist.length).toFixed(1)} dice on average (the starter grounds, 3.3)`);
  ok(m.strikeResistDice(named('Firekeeper')) === 3 && Math.min(...resist) === 3, '…but the Firekeeper is still an easier meal');
  ok(named('Raptor').behavior === 'elusive' && named('Raptor').discipline === 4, 'the Raptor is elusive: an extra die, and it bolts if it slips a Strike');
  ok(named('Raptor').alluringQualities.traits.includes('Foul') && named('Cave Hunter').repelledBy.traits.includes('Foul'),
    'Foul: a Raptor follows the smell of rot, and a Cave Hunter keeps clear of it');
  ok(named('Cave Painter').alluringQualities.traits.includes('Earthy'), 'a Cave Painter is drawn to the smell of earth (the ochre and clay they paint with)');
  ok(tear.locationCreatures.some((c) => c.name === 'Compsognathus') && m.creatureEmoji('Compsognathus') === '🦖', 'compsognathuses scurry about (as little dinosaurs)');
  const drawn = new Set();
  for (let i = 0; i < 300; i++) m.generateParty(tear, 'Apex', 60).forEach((p) => drawn.add(p.name));
  ok([...drawn].every((n) => roster.some((t) => t.name === n) || n.includes("'s")) && !drawn.has(m.TIME_CASTER),
    'the usual party comes only from its roster (and their companions), never the Time Caster');
  ok(tear.realMonsters.names.join() === m.TIME_CASTER && tear.realMonsters.chance < 0.1, 'the Time Caster turns up only rarely (under 1 hunt in 10)');
  const start = (random, over) => m.startHunt(apex(over), tear, 'The Tear', random);
  const lucky = start(() => 0);
  ok(!lucky.bounty && lucky.rivals.length === 0, 'no bounty hunters and no rival mimics: there are no other mimics yet');
  ok(lucky.party.some((p) => p.name === m.TIME_CASTER), 'when the odds allow, the Time Caster is there');
  ok(lucky.stray && !lucky.stray.locations && !m.isHiddenAdventurer(lucky.stray) && lucky.party.includes(lucky.stray), '…and a stray: an ordinary adventurer, lost');
  const usual = start(() => 0.99);
  ok(!usual.stray && !usual.party.some((p) => p.name === m.TIME_CASTER), 'most hunts: neither');
  ok(!m.startHunt(apex(), m.LOCATIONS.find((l) => l.id === 'manor'), 'Library', () => 0).stray, 'strays only wander into places that have them');

  // ---------- becoming Primordial ----------
  const first = m.beginHunt(apex(), tear, 'The Tear', { random: () => 0.99 });
  ok(first.character.branchTier === 'Primordial' && first.changes.branchTier === 'Primordial', 'hunting through the Tear: Primordial');
  ok(first.log.some((l) => l.message === m.BRANCH_TIER_LINES.Primordial), '…and told it is the very first mimic in history');
  const again = m.beginHunt(apex({ branchTier: 'Primordial', timeTearCounter: 0 }), tear, 'The Tear', { random: () => 0.99 });
  ok(!('branchTier' in again.changes) && !again.log.some((l) => l.message === m.BRANCH_TIER_LINES.Primordial), 'back again as Primordial: nothing more to become');
  const withStray = m.beginHunt(apex(), tear, 'The Tear', { random: () => 0 });
  const stray = withStray.hunt.party.find((p) => p.id.startsWith('stray_'));
  ok(stray && withStray.log.some((l) => l.message === `The ${stray.name} looks badly lost. They must have stumbled through the Tear after you.`), 'a stray is pointed out: lost, and following you through');

  // ---------- the Time Caster ----------
  ok(m.branchMealRecords(apex(), { name: m.TIME_CASTER, type: 'Wizard' }).timeCasterEaten === true, 'eating the Time Caster is remembered');
  ok(!('timeCasterEaten' in m.branchMealRecords(apex(), { name: 'Cave Hunter', type: 'Hunter' })), '…eating anyone else isn\'t');
  ok(m.branchMealRecords(apex({ forms: [ref('apex_clocktower')] }), { name: m.TIME_CASTER, type: 'Wizard' }).timeTearCounter === 51, '…and in a time form, it counts toward the Tear like any magic user');
  ok(m.ACHIEVEMENTS.find((a) => a.id === 'stitchInTime').isEarned({ timeCasterEaten: true }), 'A Stitch in Time');

  // ---------- kept secret ----------
  ok(!m.codexLocations([apex()]).includes(tear) && m.codexLocations([apex({ locationHuntCounts: { tear_in_time: 1 } })]).includes(tear),
    'the Codex lists the Tear only once one of its mimics has hunted there');
  ok(m.locationGroup(tear) === 'beyond' && m.LOCATION_GROUPS.find((g) => g.id === 'beyond').description === "What else don't you know?", '…under Beyond the Apex: "What else don\'t you know?"');
  ok(m.locationKnowledge(tear, [apex()]) === 'unknown', '…and doesn\'t count it found just because it\'s open');
  const none = m.pooledDiscoveries([apex()]);
  const metHunter = m.pooledDiscoveries([apex({ adventurersMet: ['Cave Hunter'] })]);
  ok(!m.codexAdventurers(none).some((t) => m.isHiddenAdventurer(t)), 'its adventurers are left out of the Codex until met…');
  ok(m.codexAdventurers(metHunter).filter((t) => m.isHiddenAdventurer(t)).map((t) => t.name).join() === 'Cave Hunter', '…then only the ones met (the Time Caster stays a surprise)');
  const everyoneElse = m.ADVENTURER_TEMPLATES.filter((t) => !m.isHiddenAdventurer(t)).map((t) => t.name);
  ok(m.ACHIEVEMENTS.find((a) => a.id === 'connoisseur').isEarned({ adventurersEaten: everyoneElse }), 'Connoisseur doesn\'t need them: only one branch can ever meet them');
  const { materials, traits } = m.obtainableMaterialsAndTraits();
  ok(roster.every((t) => t.lootMaterials.every((x) => materials.has(x)) && t.lootTraits.every((x) => traits.has(x))),
    '…and they teach only what can be learned elsewhere, so Master of Disguise doesn\'t need them either');

  // ---------- dressing for it: the Primordial forms where they belong ----------
  const fits = (formId, room) => m.getRoomContextMod(formId, 'tear_in_time', room).plausibility;
  ok(fits('apex_volcano', 'Smoking Slopes') > 0 && fits('apex_cave', 'Cave Mouth') > 0 && fits('apex_trex_carcass', 'Tar Pits') > 0 && fits('apex_colossus', 'The Tear') > 0,
    'each Primordial form has somewhere it fits in: the Volcano on the slopes, the Cave at the cave mouth, the carcass in the tar pits, the Colossus by the Tear');
  ok(fits('apex_roadside_inn', 'The Tear') < 0, '…unlike an inn');

  // ---------- the eruption ----------
  const seq = (...values) => { let i = 0; return () => values[Math.min(i++, values.length - 1)]; };
  ok(tear.eruption.chance === 0.5 && tear.eruption.crater === 'Smoking Slopes', 'half of all hunts at the Tear see the volcano erupt, from the Smoking Slopes');
  ok(m.rollEruption(tear, seq(0.4, 0)) === tear.eruption.turns[0] && m.rollEruption(tear, seq(0.4, 0.999)) === tear.eruption.turns[1], '…on a turn rolled when the hunt starts, within its window');
  ok(m.rollEruption(tear, () => 0.6) === null && m.rollEruption(m.LOCATIONS.find((l) => l.id === 'manor'), () => 0) === null, '…or not at all (and never anywhere else)');
  const zone = m.eruptionZone(tear);
  ok(zone.crater === 'Smoking Slopes' && [...zone.edge].sort().join() === 'Cave Mouth,Tar Pits', 'it reaches the Smoking Slopes and the rooms next to them (the Tar Pits and the Cave Mouth)');
  ok(m.startHunt(apex(), tear, 'The Tear', () => 0).eruptionTurn === tear.eruption.turns[0] && m.startHunt(apex(), tear, 'The Tear', () => 0.99).eruptionTurn === null, 'a hunt rolls its eruption when it starts');

  const person = (name, location, over = {}) => ({
    id: name, name, type: 'Hunter', group: 'beyondApex', discipline: 2, baseSuspicion: 1, suspicion: 1, constitution: 3,
    interactionStyle: 'touch', location, isAlive: true, isConsumed: false, isAttracted: false, quirks: [],
    alluringQualities: { materials: [], traits: [], tags: [] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 0, social: 0, spatial: 0, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: [], lootTraits: [], partialLoot: [], ...over,
  });
  const atTear = (over = {}) => ({
    location: tear, mimicRoom: 'The Tear', rivals: [], suspicion: 0, bounty: false, sickness: null, actionCount: 0,
    starFragment: null, fireworksRoom: null, ending: null, stillTurns: 0, catsThatKnow: [], peakSuspicion: 0, biggestMeal: null, seed: 1, recorded: false,
    party: [person('Slope Walker', 'Smoking Slopes'), person('Tar Wader', 'Tar Pits'), person('Cave Dweller', 'Cave Mouth'), person('Far Off', 'Fern Thicket')],
    creatures: [{ uid: 'c1', name: 'Fern Lizard', location: 'Tar Pits', rooms: ['Tar Pits'], ap: 2, discipline: 3, isConsumed: false }, { uid: 'c2', name: 'Dawn Horse', location: 'The Tear', rooms: ['The Tear'], ap: 3, discipline: 2, isConsumed: false }],
    ...over,
  });
  // Waiting with everyone staying put (random above STAY_CHANCE... below it, nobody moves)
  const still = { random: () => m.STAY_CHANCE / 2, now: new Date('2026-11-20T12:00:00Z') };
  const rumble = m.wait(atTear({ turn: 3, eruptionTurn: 5 }), apex(), still);
  ok(rumble.log.some((l) => l.message.includes('The ground shudders')) && rumble.hunt.party.every((a) => m.stillInHunt(a)), 'the turn before: the ground shudders (a warning), and nothing happens yet');
  const boom = m.wait(atTear({ turn: 4, eruptionTurn: 5 }), apex(), still);
  const who = (n) => boom.hunt.party.find((a) => a.name === n);
  ok(boom.log.some((l) => l.message.includes('The mountain erupts')), 'then it erupts');
  ok(who('Slope Walker').isBurned && !who('Slope Walker').isRoasted && !m.uneatenRemains(boom.hunt.party).some((a) => a.name === 'Slope Walker'), 'whoever was on the Smoking Slopes is gone: nothing left to eat');
  ok(who('Tar Wader').isRoasted && who('Cave Dweller').isRoasted && m.uneatenRemains(boom.hunt.party).length === 2, 'whoever was next to them is roasted: a meal, lying where they fell');
  ok(m.stillInHunt(who('Far Off')), 'anyone further away is untouched');
  ok(boom.hunt.creatures.map((c) => c.name).join() === 'Dawn Horse', 'small creatures in the blast are gone too (the lizard in the Tar Pits; the horse at the Tear is fine)');
  ok(boom.hunt.eruptionTurn === null && !m.wait(boom.hunt, apex(), still).log.some((l) => l.message.includes('erupts')), 'once per hunt: it doesn\'t go again');
  ok(!boom.hunt.ending && !m.huntCleared({ ...boom.hunt, party: boom.hunt.party.filter((a) => a.name !== 'Far Off') }), 'roasted meals left uneaten keep the hunt going');

  // A mimic caught in it
  ok(!('mass' in boom.changes) && !('adhesion' in boom.changes), 'a mimic well clear of it pays nothing');
  const caught = m.wait(atTear({ turn: 4, eruptionTurn: 5, mimicRoom: 'Tar Pits' }), apex({ adhesion: 4, plausibility: 4, patience: 4 }), { ...still, random: seq(m.STAY_CHANCE / 2, m.STAY_CHANCE / 2, m.STAY_CHANCE / 2, m.STAY_CHANCE / 2, m.STAY_CHANCE / 2, 0.1) });
  ok(caught.log.some((l) => l.message.startsWith('🔥 The eruption catches you too.')), 'a mimic caught at the edge is hurt…');
  const volcano = m.wait(atTear({ turn: 4, eruptionTurn: 5, mimicRoom: 'Tar Pits' }), apex({ forms: [ref('apex_volcano')], branchTier: 'Primordial' }), still);
  ok(volcano.log.some((l) => l.message.includes('You are the mountain')) && !volcano.log.some((l) => l.message.includes('catches you')), '…unless it\'s wearing the Volcano: it is the mountain');
  const massHit = m.eruptionToll({ mass: 60, plausibility: 3, adhesion: 3, patience: 3 }, () => 0.1);
  ok(massHit.changes.mass === 59 && Object.keys(massHit.changes).join() === 'mass', 'the toll, one time in four: 1 mass');
  const statHit = m.eruptionToll({ mass: 60, plausibility: 4, adhesion: 4, patience: 4 }, seq(0.5, 0.99, 0, 0, 0));
  const lostPoints = ['plausibility', 'adhesion', 'patience'].reduce((n, st) => n + (4 - (statHit.changes[st] ?? 4)), 0);
  ok(lostPoints === 3 && statHit.changes.plausibility === 1 && !('mass' in statHit.changes), 'otherwise 2–3 stat points, each from a random stat (here all three from one)');
  const spread = m.eruptionToll({ mass: 60, plausibility: 4, adhesion: 4, patience: 4 }, seq(0.5, 0.99, 0, 0.5, 0.99));
  ok(['plausibility', 'adhesion', 'patience'].every((st) => spread.changes[st] === 3), '…or spread across them');
  const floor = m.eruptionToll({ mass: 60, plausibility: 1, adhesion: 1, patience: 2 }, seq(0.5, 0.99, 0, 0, 0));
  ok(floor.changes.patience === 1 && !('plausibility' in floor.changes) && !('adhesion' in floor.changes), 'nothing goes below 1');
  ok(m.eruptionToll({ mass: 1, plausibility: 1, adhesion: 1, patience: 1 }, () => 0.1).changes.mass === 1, '…mass included');

  // Eating the roasted
  const roast = who('Tar Wader');
  const feast = m.eatRemains({ ...boom.hunt, mimicRoom: 'Tar Pits' }, apex(), roast.id, still);
  ok(feast.hunt.party.find((a) => a.id === roast.id).isConsumed && feast.character.assimilationPoints === m.remainsMealAp(roast), 'a roasted adventurer is a cheap meal (half the usual)');
  ok(feast.log.some((l) => l.message.includes("still warm from the mountain's fire")), '…still warm');
  const burnedUp = who('Slope Walker');
  ok(m.eatRemains({ ...boom.hunt, mimicRoom: 'Smoking Slopes' }, apex(), burnedUp.id, still).log.length === 0, 'there\'s nothing to eat of anyone burned up');
}
