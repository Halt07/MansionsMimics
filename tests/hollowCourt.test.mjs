// The Hollow Court: Sovereign's own ground (groundwork: the place itself; its crusade and the siege
// are still to come). Above all, it's the Long After's court before it fell: the same plan, room for
// room, under the names the Long After has lost, and with the moat it no longer has.
export default async function ({ gameData: m, ok }) {
  const court = m.LOCATIONS.find((l) => l.id === 'hollow_court');
  const ruin = m.LOCATIONS.find((l) => l.id === 'the_long_after');

  // ---------- the place ----------
  ok(court && court.branch === 'Sovereign' && court.minTier === 'Apex' && court.name === 'The Hollow Court', "the Hollow Court: Sovereign's own ground");
  ok(court.rooms.length === 10 && ['Gatehouse', 'Courtyard', 'Great Hall', 'Shrine'].every((r) => court.rooms.includes(r)), '…its rooms under their own names');
  const MOAT = ['Western Moat', 'Eastern Moat'];
  ok(MOAT.every((r) => court.roomGraph[r].join() === 'Gatehouse') && MOAT.every((r) => court.roomGraph.Gatehouse.includes(r)), 'a moat either side of the Gatehouse, reached only from it');

  // ---------- the same court as the Long After ----------
  // What time renamed (everything else kept its name)
  const AFTER = { Gatehouse: 'Toppled Arch', Courtyard: 'Jungle Camp', 'Great Hall': 'Old Hall', Shrine: 'Derelict Shrine' };
  const later = (r) => AFTER[r] ?? r;
  // The moat silted up long ago: the one thing the Long After doesn't have
  const kept = court.rooms.filter((r) => !MOAT.includes(r));
  ok(kept.every((r) => ruin.rooms.includes(later(r))) && ruin.rooms.length === kept.length && !MOAT.some((r) => ruin.rooms.includes(r)),
    'every room of the court is still there in the Long After, except the moat (long since silted up)');
  ok(['Treasury', 'Royal Chambers', 'Throne Hall', 'Barracks'].every((r) => ruin.rooms.includes(r)), '…the Treasury, Royal Chambers, Throne Hall and Barracks under the same names');
  const cell = (loc) => Object.fromEntries(m.floorPlan(loc).cells.map((c) => [c.room, `${c.col},${c.row}`]));
  const now = cell(court), then = cell(ruin);
  ok(kept.every((r) => now[r] === then[later(r)]), 'room for room, in the same places on the same plan');
  ok(kept.every((r) => court.roomGraph[r].filter((x) => !MOAT.includes(x)).map(later).sort().join() === [...ruin.roomGraph[later(r)]].sort().join()),
    '…with the same doors between them (the moat aside)');
  ok(m.floorPlan(court).cells.every((c) => c.stairsTo.length === 0) && now['Throne Hall'] === '1,0' && now.Gatehouse === '1,3', 'the Throne Hall at the top, the Gatehouse at the bottom');

  // ---------- who it opens to ----------
  ok(!m.isLocationAvailable(court, 'Apex', 200, null), 'never offered on size alone');
  const apex = (branchTier) => ({ tier: 'Apex', mass: 100, branchTier, timeTearCounter: 0 });
  ok(m.branchLocationOpen(court, apex('Sovereign')) && !m.branchLocationOpen(court, apex(null)) && !m.branchLocationOpen(court, apex('Eternal')) && !m.branchLocationOpen(court, apex('Primordial')),
    'open to a Sovereign mimic, and to no one else');
  ok(!m.codexLocations([{ locationHuntCounts: {} }]).includes(court) && m.locationGroup(court) === 'beyond', 'kept out of the Codex until hunted, then under Beyond the Apex');

  // ---------- the crusade ----------
  const roster = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('hollow_court'));
  ok(roster.map((t) => t.name).sort().join() === 'Crusade Archmage,Crusader Knight,Dragon-Slayer,Herald,Mimic-Slayer,Moat Serpent,Royal Sapper,The Siege Champion' && roster.every(m.isHiddenAdventurer),
    'its own eight, all hidden (Beyond the Apex)');
  ok(court.exclusiveRoster, '…only them: this is your court, and they have come to end you');
  const regulars = roster.filter((t) => !['The Siege Champion', 'Moat Serpent'].includes(t.name)).map((t) => m.strikeResistDice(t));
  ok(regulars.reduce((a, b) => a + b, 0) / regulars.length >= 4.3 && Math.min(...regulars) === 3, 'as hard as the other branch grounds (the Herald the easy meal)');
  const { materials, traits } = m.obtainableMaterialsAndTraits();
  ok(roster.every((t) => t.lootMaterials.every((x) => materials.has(x)) && t.lootTraits.every((x) => traits.has(x))), 'they teach only what can be learned elsewhere');
  const drawn = new Set(); for (let i = 0; i < 300; i++) m.generateParty(court, 'Apex', 100).forEach((p) => drawn.add(p.name));
  ok(!drawn.has('The Siege Champion') && !drawn.has('Moat Serpent') && drawn.has('Herald'), 'neither the Champion nor the Serpents come in the ordinary party');
  const begin = (random) => m.startHunt({ tier: 'Apex', mass: 100, branchTier: 'Sovereign', forms: [], activeFormIndex: 0, currentAppearance: {}, plausibility: 3, adhesion: 3, patience: 3,
    rareLocation: null, burnedLocations: [], burnedForms: [], adventurersMet: [], formsUsed: [], formHuntCounts: {}, locationHuntCounts: {} }, court, 'Throne Hall', random);
  const begun = begin(() => 0);
  ok(!begun.bounty && begun.rivals.length === 0, '…no bounty hunters or rival mimics: this is your court');

  // ---------- the Moat Serpents ----------
  const serpentsIn = (random) => begin(random).party.filter((p) => p.name === 'Moat Serpent').map((p) => p.location);
  const counts = new Set(Array.from({ length: 60 }, (_, i) => serpentsIn(() => (i % 10) / 10).length));
  ok(counts.has(1) && counts.has(2) && !counts.has(0) && !counts.has(3), 'one or two Moat Serpents are in the moats from the start');
  ok(Array.from({ length: 60 }, (_, i) => serpentsIn(() => (i % 10) / 10)).every((rooms) => new Set(rooms).size === rooms.length && rooms.every((r) => MOAT.includes(r))), '…never two in the same moat');
  const serpent = roster.find((t) => t.name === 'Moat Serpent');
  ok(serpent.stationary && m.isStationary(serpent) && serpent.alluringQualities.traits.includes('Briny'), '…they never leave it (like the Gargoyle, without its watching), and they like Briny');

  // ---------- the siege ----------
  ok(court.siege.every === 5 && court.siege.waves === 5 && court.siege.size.join() === '2,3' && court.siege.entry === 'Gatehouse', 'a wave every 5 turns, 5 in all, 2–3 crusaders each, through the Gatehouse');
  const wave1 = m.siegeWave(court, 1, () => 0);
  ok(wave1.length === 2 && wave1.every((p) => p.location === 'Gatehouse' && !['The Siege Champion', 'Moat Serpent'].includes(p.name)), 'an ordinary wave: crusaders at the Gatehouse');
  const last = m.siegeWave(court, 5, () => 0.5);
  ok(last.length === 5 && last[0].name === 'The Siege Champion' && last.filter((p) => p.name === 'The Siege Champion').length === 1, 'the last wave: the Siege Champion and four more');
  ok(m.waveDue(court, 5, 0) && !m.waveDue(court, 4, 0) && !m.waveDue(court, 30, 5), 'they come every 5 turns, until all five have');

  // ---------- the Siege Champion ----------
  const champion = roster.find((t) => t.name === 'The Siege Champion');
  ok(m.strikeResistDice(champion) === 7 && champion.behavior === 'unshakeable', 'seven dice against a Strike, and unshakeable');
  // ---------- in play ----------
  const sovereign = { id: 'mimic', name: 'Testy', startingType: 'Minor', tier: 'Apex', mass: 100, branchTier: 'Sovereign', sovereignReached: true, timeTearCounter: 0,
    plausibility: 3, adhesion: 6, patience: 3, baseAllure: 6, digestiveCapacity: 8, assimilationPoints: 0, forms: [{ formId: 'apex_watchtower', name: 'Watchtower', tier: 'Apex', learned: true }],
    activeFormIndex: 0, currentAppearance: {}, learnedMaterials: [], learnedTraits: [], rareLocation: null, burnedLocations: [], burnedForms: [], adventurersMet: [], adventurersEaten: [],
    formsUsed: [], formHuntCounts: {}, locationHuntCounts: {}, huntsSurvived: 0, huntsFailed: 0, closestCall: 0, conversions: 0, mimicsConsumed: 0, partyMembersEaten: 0,
    biggestMeal: null, giantsConsumedWhole: [], titanicFeastReached: false, downWithTheShipReached: false, lifetimeApEarned: 0 };
  const still = { random: () => m.STAY_CHANCE / 2, now: new Date('2026-11-20T12:00:00Z') };
  const start = m.beginHunt(sovereign, court, 'Throne Hall', still).hunt;
  const member = (name, location, over = {}) => { const t = roster.find((r) => r.name === name); return { ...t, id: `${name}_${location}`, suspicion: t.baseSuspicion, isAlive: true, isConsumed: false, isAttracted: false, location, ...over }; };
  const at = (party, over = {}) => ({ ...start, party, creatures: [], ...over });

  const arrived = m.wait(at([member('Herald', 'Treasury')], { turn: 4 }), sovereign, still);
  ok(arrived.hunt.wavesArrived === 1 && arrived.hunt.party.filter((p) => p.id.startsWith('wave1_')).length >= 2 && arrived.log.some((l) => l.message.includes('wave 1 of 5 storms the Gatehouse')),
    'turn 5: the first wave storms the Gatehouse');
  ok(arrived.hunt.suspicion === start.suspicion + 1 && court.siege.suspicion === 1, '…and every wave puts the court on alert (+1 suspicion)');
  ok(!m.huntCleared(at([{ ...member('Herald', 'Treasury'), isConsumed: true, isAlive: false }], { wavesArrived: 4 })), 'eating everyone doesn\'t end the hunt while a wave is still to come…');
  ok(m.huntCleared(at([{ ...member('Herald', 'Treasury'), isConsumed: true, isAlive: false }], { wavesArrived: 5 })), '…once all five have come and gone, it does');
  const finale = m.wait(at([], { turn: 24, wavesArrived: 4 }), sovereign, still);
  ok(finale.hunt.party.some((p) => p.name === 'The Siege Champion') && finale.log.some((l) => l.message.includes('The Siege Champion at its head')), 'turn 25: the last wave, the Siege Champion at its head');

  // The Champion: never lured, but in your room you can go for them; miss, and the crusade rallies
  const champ = member('The Siege Champion', 'Great Hall');
  // (rolls that would draw in anyone else: the Herald beside them comes; the Champion doesn't)
  const regal = { ...sovereign, currentAppearance: { primaryMaterials: ['Gold'], secondaryMaterials: ['Mithril'], symbolicTraits: ['Heraldic Crest', 'Sacred Symbol'], surfaceTraits: [], conditionTraits: [] } };
  const lured = m.lure(at([champ, member('Herald', 'Great Hall')], { mimicRoom: 'Great Hall' }), regal, { ...still, random: () => 0.99 });
  ok(lured.hunt.party[1].isAttracted && !lured.hunt.party[0].isAttracted, 'the Champion can\'t be lured, however tempting you look');
  ok(m.canStrike(at([champ], { mimicRoom: 'Great Hall' })) && !m.canStrike(at([champ], { mimicRoom: 'Courtyard' })), '…but in your room, you can go for them without luring; from anywhere else, you can\'t');
  const crowd = [champ, member('Herald', 'Courtyard'), member('Crusader Knight', 'Treasury'), member('Dragon-Slayer', 'Gatehouse')];
  const missed = m.strike(at(crowd, { mimicRoom: 'Great Hall' }), { ...sovereign, adhesion: 1 }, { ...still, random: () => 0.99 });
  const where = (n) => missed.hunt.party.find((p) => p.name === n).location;
  ok(m.stillInHunt(missed.hunt.party[0]) && where('Herald') === 'Great Hall' && where('Crusader Knight') === 'Great Hall', 'miss them, and they rally the crusade: everyone next door comes running in…');
  ok(where('Dragon-Slayer') === 'Gatehouse' && missed.log.some((l) => l.message.includes('sounds the rally')), '…(only next door: the Gatehouse is too far to hear)');
  ok(m.branchMealRecords(sovereign, { name: 'The Siege Champion', type: 'Paladin' }).championEaten && m.ACHIEVEMENTS.find((x) => x.id === 'longLiveTheKing').isEarned({ championEaten: true }),
    'eating them: Long Live the King');

  // The Moat Serpents: never leave the moat
  const coiled = member('Moat Serpent', 'Western Moat');
  ok(m.wait(at([coiled]), sovereign, { ...still, random: () => 0.9 }).hunt.party[0].location === 'Western Moat', 'a Moat Serpent never leaves its moat');
  ok(!m.lure(at([coiled], { mimicRoom: 'Gatehouse' }), sovereign, { ...still, random: () => 0 }).hunt.party[0].isAttracted, '…can\'t be drawn out of it');
  ok(m.lure(at([coiled], { mimicRoom: 'Western Moat' }), sovereign, { ...still, random: () => 0 }).hunt.party[0].isAttracted, '…but can be lured where it is, if you go into the moat');

  // Getting at a Serpent: a Relocate can slip into its moat (it doesn't notice), and back out
  const moatParty = [member('Moat Serpent', 'Western Moat')];
  ok(m.relocateRooms(start.location, moatParty, 'Gatehouse').includes('Western Moat'), 'a Relocate can slip into a moat with a Serpent in it (down in the murky water, it never notices)');
  ok(m.relocateRooms(start.location, moatParty, 'Western Moat').includes('Gatehouse'), '…and back out again: the Serpent doesn\'t count as company');
  ok(!m.relocateRooms(start.location, [...moatParty, member('Herald', 'Western Moat')], 'Gatehouse').includes('Western Moat'), '…but anyone else in the moat would notice');
  ok(m.relocateRooms(start.location, [member('Herald', 'Gatehouse')], 'Courtyard').every((r) => r !== 'Gatehouse')
    && m.relocateRooms(start.location, [member('Herald', 'Courtyard')], 'Courtyard').length === 0, 'everywhere else, as ever: only into empty rooms, and not with someone in yours');
  const slipped = m.relocate(at(moatParty, { mimicRoom: 'Gatehouse' }), sovereign, 'Western Moat', still);
  ok(slipped.hunt.mimicRoom === 'Western Moat' && slipped.hunt.suspicion === start.suspicion + 1 && !slipped.log.some((l) => l.message.includes('notices')),
    '…at the usual cost (+1 suspicion), and the Serpent never gets a look at you');

  // ---------- the breach ----------
  ok(court.breach.turn === 10 && court.breach.walls['Western Moat'] === 'Barracks' && court.breach.walls['Eastern Moat'] === 'Shrine' && court.breach.extra.join() === '1,2',
    'on turn 10 a Serpent batters through the wall beside its moat: the Western Moat into the Barracks, the Eastern Moat into the Shrine');
  const westOnly = [member('Moat Serpent', 'Western Moat')];
  const before = m.wait(at(westOnly, { turn: 8 }), sovereign, still);
  ok(!before.hunt.breached && !m.getAdjacentRooms(before.hunt.location, 'Barracks').includes('Western Moat'), 'turn 9: the walls still hold');
  const broke = m.wait(at(westOnly, { turn: 9, wavesArrived: 1 }), sovereign, still);
  ok(broke.hunt.breached?.join() === 'Western Moat' && m.getAdjacentRooms(broke.hunt.location, 'Barracks').includes('Western Moat') && m.getAdjacentRooms(broke.hunt.location, 'Western Moat').includes('Barracks'),
    'turn 10: the wall comes down: the moat and the Barracks are joined');
  ok(!m.getAdjacentRooms(broke.hunt.location, 'Shrine').includes('Eastern Moat') && broke.log.some((l) => l.message.includes('batters through the wall of the Western Moat into the Barracks')),
    '…only where there\'s a Serpent (no Serpent in the Eastern Moat, so the Shrine\'s wall holds)');
  ok(m.floorPlan(broke.hunt.location).cells.find((c) => c.room === 'Barracks').doorDown, '…and the map shows the new door');
  const both = m.wait(at([member('Moat Serpent', 'Western Moat'), member('Moat Serpent', 'Eastern Moat')], { turn: 9 }), sovereign, still);
  ok([...both.hunt.breached].sort().join() === 'Eastern Moat,Western Moat', 'with a Serpent in each moat, both walls fall');
  const eaten = m.wait(at([{ ...member('Moat Serpent', 'Western Moat'), isConsumed: true, isAlive: false }], { turn: 9 }), sovereign, still);
  ok(!eaten.hunt.breached, 'eat the Serpent first, and its wall holds');
  ok(m.wait({ ...broke.hunt, turn: 19 }, sovereign, still).hunt.breached.join() === 'Western Moat', 'it only happens once');
  const wave2 = broke.hunt.party.filter((p) => p.id.startsWith('wave2_'));
  ok(wave2.filter((p) => p.location === 'Western Moat').length >= 1 && wave2.filter((p) => p.location === 'Gatehouse').length >= 2,
    'the wave arriving the same turn already comes through it: 2–3 at the Gatehouse, and 1–2 more through the moat');
  const twoWalls = m.siegeWave(court, 3, () => 0.99, ['Western Moat', 'Eastern Moat']);
  ok(twoWalls.filter((p) => p.location === 'Western Moat').length === 2 && twoWalls.filter((p) => p.location === 'Eastern Moat').length === 2 && twoWalls.filter((p) => p.location === 'Gatehouse').length === 3,
    'with both walls down, a wave can be 3 at the gate and 2 through each moat');
  ok(m.siegeWave(court, 3, () => 0, ['Western Moat']).filter((p) => p.location === 'Western Moat').length === 1, '…at least 1 through each broken wall');

  // ---------- dressing for it ----------
  const fits = (form, room) => m.getRoomContextMod(form, 'hollow_court', room).plausibility;
  ok(fits('giant_throne', 'Throne Hall') > 0 && fits('apex_castle_gate', 'Gatehouse') > 0 && fits('grand_vault', 'Treasury') > 0, 'your throne in the Throne Hall, a gate at the Gatehouse, a vault in the Treasury');
  ok(court.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK), 'moat eels, castle bats, court mice and gilded beetles');
}
