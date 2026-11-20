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
}
