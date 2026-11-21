// The Long After: Eternal's own ground, the Hollow Court lost to time. Who it opens to, its roster
// (age is the disguise here), the dig opening sealed rooms, and the absurdly lucky Curator.
export default async function ({ gameData: m, ok }) {
  const ruin = m.LOCATIONS.find((l) => l.id === 'the_long_after');
  const ref = (formId) => ({ formId, name: formId, tier: m.ALL_FORMS.find((f) => f.id === formId).tier, learned: true });
  const eternal = (over = {}) => ({
    id: 'mimic', name: 'Testy', startingType: 'Minor', tier: 'Apex', mass: 60, branchTier: 'Eternal', timeTearCounter: 0, curatorEaten: false,
    plausibility: 3, adhesion: 6, patience: 3, baseAllure: 3, digestiveCapacity: 8, assimilationPoints: 0, forms: [ref('apex_watchtower')], activeFormIndex: 0,
    currentAppearance: {}, learnedMaterials: [], learnedTraits: [], rareLocation: null, burnedLocations: [], burnedForms: [],
    adventurersMet: [], adventurersEaten: [], formsUsed: [], formHuntCounts: {}, locationHuntCounts: {}, huntsSurvived: 0, huntsFailed: 0, closestCall: 0,
    conversions: 0, mimicsConsumed: 0, partyMembersEaten: 0, biggestMeal: null, giantsConsumedWhole: [], titanicFeastReached: false, downWithTheShipReached: false, lifetimeApEarned: 0,
    ...over,
  });
  const still = { random: () => m.STAY_CHANCE / 2, now: new Date('2026-11-20T12:00:00Z') };
  const OPEN = ['Toppled Arch', 'Jungle Camp', 'Barracks', 'Derelict Shrine'];

  // ---------- the place ----------
  ok(ruin && ruin.branch === 'Eternal' && ruin.minTier === 'Apex' && ruin.exclusiveRoster, "the Long After: Eternal's own ground, with its own roster");
  const plan = m.floorPlan(ruin);
  const at = Object.fromEntries(plan.cells.map((c) => [c.room, `${c.col},${c.row}`]));
  ok(plan.cols === 3 && plan.rows === 4 && at['Throne Hall'] === '1,0' && at['Toppled Arch'] === '1,3' && plan.cells.every((c) => c.stairsTo.length === 0),
    'the Hollow Court\'s plan: the Throne Hall at the top, the Toppled Arch at the bottom, every connection a door');
  ok(['Treasury', 'Royal Chambers', 'Throne Hall'].every((r) => ruin.roomGraph[r].join() === 'Old Hall'), 'the Old Hall is the only way into the rest of the court');

  // ---------- who it opens to ----------
  ok(!m.isLocationAvailable(ruin, 'Apex', 200, null), 'never offered on size alone');
  ok(m.branchLocationOpen(ruin, eternal()) && !m.branchLocationOpen(ruin, eternal({ branchTier: null })) && !m.branchLocationOpen(ruin, eternal({ branchTier: 'Primordial' })),
    'open to an Eternal mimic, and to no one else');

  // ---------- who's there ----------
  const roster = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('the_long_after'));
  ok(roster.map((t) => t.name).sort().join() === 'Archaeologist,Jungle Guide,Lorekeeper,Relic-Digger,Scavenger,The Curator,Tomb Automaton' && roster.every(m.isHiddenAdventurer),
    'its own seven, all hidden (Beyond the Apex): the Jungle Guide among them');
  const OLD = ['Worn', 'Weathered', 'Dusty', 'Mossy'];
  ok(roster.every((t) => t.alluringQualities.traits.some((x) => OLD.includes(x)) && t.repelledBy?.traits?.some((x) => ['Pristine', 'Polished'].includes(x))),
    'age is the disguise: every one of them likes something old, and distrusts something new-looking');
  const resist = roster.filter((t) => t.name !== m.CURATOR).map((t) => m.strikeResistDice(t));
  ok(resist.reduce((a, b) => a + b, 0) / resist.length >= 4.3 && Math.min(...resist) === 3, 'as hard to Strike at as the Tear (the Relic-Digger the easy meal)');
  const { materials, traits } = m.obtainableMaterialsAndTraits();
  ok(roster.every((t) => t.lootMaterials.every((x) => materials.has(x)) && t.lootTraits.every((x) => traits.has(x))), 'they teach only what can be learned elsewhere');

  // ---------- the dig ----------
  ok([...m.openRooms(ruin)].sort().join() === [...OPEN].sort().join(),
    'four rooms open when the hunt begins (the rest are buried or overgrown)');
  const start = m.beginHunt(eternal(), ruin, 'Jungle Camp', { ...still, random: () => 0.99 });
  ok([...start.hunt.location.rooms].sort().join() === [...OPEN].sort().join() && start.hunt.sealedRooms.length === 4, 'the hunt starts with the four, and four sealed');
  ok(start.hunt.party.every((a) => OPEN.includes(a.location)) && start.hunt.creatures.every((c) => OPEN.includes(c.location)), '…everyone starts in the open rooms');
  ok(!m.getAdjacentRooms(start.hunt.location, 'Jungle Camp').includes('Old Hall'), '…and nobody can get into a sealed one');
  const opened = [];
  let hunt = { ...start.hunt, party: [], creatures: [] };
  for (const t of [4, 8, 12, 16]) {
    const before = hunt.sealedRooms.length;
    const quiet = m.wait({ ...hunt, turn: t - 2 }, eternal(), still);
    ok(quiet.hunt.sealedRooms.length === before, `turn ${t - 1}: nothing opens yet`);
    const r = m.wait({ ...hunt, turn: t - 1 }, eternal(), still);
    hunt = r.hunt;
    opened.push(...r.hunt.location.rooms.filter((x) => !OPEN.includes(x) && !opened.includes(x)));
  }
  ok(opened[0] === 'Old Hall' && [...opened.slice(1, 3)].sort().join() === 'Royal Chambers,Treasury' && opened[3] === 'Throne Hall',
    'every 4 turns, a room opens: the Old Hall first, then the Treasury and Royal Chambers (in either order), the Throne Hall last');
  ok(hunt.sealedRooms.length === 0 && hunt.location.rooms.length === 8, '…until the whole court is open');
  const orders = new Set(Array.from({ length: 40 }, (_, i) => m.nextOpened(ruin, ['Treasury', 'Royal Chambers', 'Throne Hall'], () => i / 40)));
  ok(orders.has('Treasury') && orders.has('Royal Chambers') && !orders.has('Throne Hall'), '(which of the two buried rooms comes first is up to chance)');
  const cutFree = m.wait({ ...start.hunt, party: [], creatures: [], turn: 3 }, eternal(), still);
  ok(cutFree.log.some((l) => l.message.includes('hack through the curtain of vines')), 'the overgrown rooms are cut free…');
  ok(ruin.dig.buried.sort().join() === 'Royal Chambers,Treasury' && ruin.dig.opened.Treasury.includes('Shovels'), '…the buried ones dug out');

  // ---------- what comes out of the opened rooms ----------
  const opening = (sealed, random) => m.wait({ ...start.hunt, party: [], creatures: [], rivals: [], sealedRooms: sealed, location: m.sealedView(ruin, sealed), turn: 7 }, eternal(), { ...still, random });
  const woke = opening(['Treasury', 'Throne Hall'], () => 0);
  const small = woke.hunt.rivals[0];
  ok(small && small.kind === 'small' && small.room === 'Treasury' && small.revealed && m.RIVAL_STATS.small.ap === 6, 'opening the Treasury may wake a small mimic, dormant in the gold since the court fell…');
  ok(woke.log.some((l) => l.message.includes('blinks awake')) && woke.hunt.creatures.length === 0, '…out in the open, for you to go and eat (and nothing else comes out of the Treasury)');
  ok(m.canStrike({ ...woke.hunt, mimicRoom: 'Treasury' }), '…a Strike can reach it once you\'re in there');
  ok(opening(['Treasury', 'Throne Hall'], () => 0.99).hunt.rivals.length === 0, '…or, more often, not');
  const critter = opening(['Royal Chambers', 'Throne Hall'], () => 0).hunt.creatures;
  ok(critter.length === 1 && critter[0].location === 'Royal Chambers' && ruin.locationCreatures.some((c) => c.id === critter[0].id), 'any other room may let out one of the ruins\' creatures');
  ok(opening(['Royal Chambers', 'Throne Hall'], () => 0.99).hunt.creatures.length === 0 && ruin.dig.emerges.creatureChance === 0.6 && ruin.dig.emerges.rival.chance === 0.4,
    '…or not (a creature 60% of the time; the small mimic 40%)');

  // ---------- the Curator ----------
  const curator = roster.find((t) => t.name === m.CURATOR);
  ok(ruin.realMonsters.names.join() === m.CURATOR && ruin.realMonsters.chance === 1 / 12, 'the Curator oversees the dig only now and then (1 hunt in 12)');
  ok(curator.discipline === 5 && curator.behavior === 'lucky' && m.strikeResistDice(curator) === 6, '…with Discipline 5 and absurd luck (an extra die)');
  const member = (t, location, over = {}) => ({ ...t, id: t.name, suspicion: t.baseSuspicion, isAlive: true, isConsumed: false, isAttracted: false, location, ...over });
  const withCurator = (over) => ({ ...start.hunt, creatures: [], party: [member(curator, 'Jungle Camp', over), member(roster[0], 'Barracks')], mimicRoom: 'Jungle Camp' });
  const miss = m.strike(withCurator({ isAttracted: true }), eternal({ adhesion: 1 }), { ...still, random: () => 0.99 });
  const after = miss.hunt.party.find((a) => a.name === m.CURATOR);
  ok(m.stillInHunt(after) && after.location === 'Jungle Camp' && !after.isAttracted, 'a miss: the Curator doesn\'t run, just wanders off, oblivious');
  const luck = m.LUCKY_ESCAPES.map((line) => line.replaceAll('{name}', m.CURATOR).replaceAll('{form}', 'Watchtower'));
  ok(miss.hunt.suspicion === 1 && miss.log.some((l) => luck.includes(l.message)) && miss.log.some((l) => l.message.includes('never noticed a thing')) && !miss.log.some((l) => l.message.includes('saw you lunge')),
    '…a stroke of absurd luck, and only the commotion to worry about (+1 suspicion)');
  ok(!miss.log.some((l) => l.message.includes('strolls off')), '…and, this time, stays in the room (the other half of the time, see below)');
  // Rolls: 1 die for the mimic and 6 for the Curator (all miss), the luck line, then the wander roll and where to
  let n = 0; const wanders = () => (n++ < 8 ? 0.99 : 0.1);
  const strolled = m.strike(withCurator({ isAttracted: true }), eternal({ adhesion: 1 }), { ...still, random: wanders });
  const away = strolled.hunt.party.find((a) => a.name === m.CURATOR);
  ok(m.LUCKY_WANDER_CHANCE === 0.5 && away.location !== 'Jungle Camp' && m.getAdjacentRooms(strolled.hunt.location, 'Jungle Camp').includes(away.location) && !away.isAttracted,
    'half the time, after a miss, the Curator ambles off into a room next door…');
  ok(strolled.log.some((l) => l.message === `${m.CURATOR} strolls off toward the ${away.location}, humming.`) && strolled.hunt.suspicion === 1 && m.stillInHunt(away),
    '…humming, none the wiser: no bolting, no extra suspicion, still in the hunt');
  const leaving = m.wait({ ...withCurator(), sealedRooms: ['Throne Hall'], location: m.sealedView(ruin, ['Throne Hall']), turn: 15 }, eternal(), still);
  ok(leaving.hunt.party.find((a) => a.name === m.CURATOR).fled && leaving.log.some((l) => l.message.includes('declares the dig a triumph')), 'the last room opens: the Curator leaves for the museum');
  ok(m.branchMealRecords(eternal(), { name: m.CURATOR, type: 'Nobility' }).curatorEaten === true && m.ACHIEVEMENTS.find((a) => a.id === 'closingTime').isEarned({ curatorEaten: true }),
    'eating them before then: Closing Time');

  // ---------- dressing for it ----------
  const fits = (form, room) => m.getRoomContextMod(form, 'the_long_after', room).plausibility;
  ok(fits('giant_throne', 'Throne Hall') > 0 && fits('grand_vault', 'Treasury') > 0 && fits('apex_colossus', 'Old Hall') > 0 && fits('apex_lighthouse', 'Jungle Camp') < 0,
    'a throne in the Throne Hall, a vault in the Treasury, the Colossus in the Old Hall; not a lighthouse in the jungle');
  ok(ruin.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK), 'monkeys, snakes, glow beetles, tree frogs and parrots');
}
