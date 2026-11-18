// The Snowbound Lodge: a Midwinter location open to every tier, where nobody can leave and the cold
// freezes the party one by one.
export default async function ({ gameData: m, ok }) {
  const lodge = m.LOCATIONS.find((l) => l.id === 'snowbound_lodge');
  ok(!!lodge && lodge.holiday === 'christmas', 'the Snowbound Lodge is a Midwinter location');
  const { hearth, cold } = lodge.snowbound;
  ok([hearth, ...cold].every((r) => lodge.rooms.includes(r)), 'its hearth and cold rooms are real rooms');

  // Open to every tier, only in season
  const day = (mo, d) => new Date(2026, mo - 1, d);
  ok(m.isLocationAvailable(lodge, 'Minor', 1, null, day(12, 15)), 'open to a Minor mimic on Dec 15');
  ok(m.isLocationAvailable(lodge, 'Apex', 40, null, day(12, 30)), 'open to an Apex mimic on Dec 30');
  ok(!m.isLocationAvailable(lodge, 'Apex', 40, null, day(11, 17)), 'closed on Nov 17');
  ok(!m.isLocationAvailable(lodge, 'Minor', 1, null, day(12, 31)), 'closed on Dec 31');

  // Codex
  const mimic = (counts = {}) => ({ tier: 'Minor', mass: 1, locationHuntCounts: counts });
  ok(m.locationGroup(lodge) === 'seasonal', 'listed under Seasonal in the Codex');
  ok(m.locationKnowledge(lodge, [], day(12, 15)) === 'known', 'known while in season');
  ok(m.locationKnowledge(lodge, [mimic()], day(6, 1)) === 'unknown', '??? out of season');
  ok(m.locationKnowledge(lodge, [mimic({ snowbound_lodge: 1 })], day(6, 1)) === 'visited', 'mapped for good once hunted there');

  // Who's snowed in
  const natives = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('snowbound_lodge')).map((t) => t.name);
  ok(natives.includes('Lodgekeeper') && natives.filter((n) => n.startsWith('Gnome')).length >= 3, `the Lodgekeeper and the gnomes live here (${natives.join(', ')})`);
  ok(lodge.alwaysIncludes.includes('Lodgekeeper') && lodge.nativeShare >= 1, 'the Lodgekeeper is always there, and at least one more local');
  const gnome = m.ADVENTURER_TEMPLATES.find((t) => t.name === 'Gnome Courier');
  ok(!m.isTemplateEligible(gnome, m.LOCATIONS.find((l) => l.id === 'manor'), 'Minor', 1), 'gnome couriers stay at the lodge');
  ok(m.isTemplateEligible(m.ADVENTURER_TEMPLATES.find((t) => t.name === 'Greedy Rogue'), lodge, 'Minor', 1), 'ordinary adventurers get snowed in too');

  // Creatures that keep to certain rooms
  const reindeer = lodge.locationCreatures.find((c) => c.name === 'Reindeer');
  ok(reindeer?.rooms?.every((r) => cold.includes(r)), 'the reindeer stays out in the woodshed and courtyard');
  ok(reindeer?.max === 1, 'only one reindeer per hunt');
  ok(lodge.locationCreatures.every((c) => !c.rooms || c.rooms.every((r) => lodge.rooms.includes(r))), 'every creature room is a real room');
  ok(lodge.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK), 'every lodge creature has its own emoji');

  // Warmth
  ok(m.startingWarmth(2, () => 0) === 8 && m.startingWarmth(2, () => 0.99) === 8 + m.WARMTH_JITTER, 'starting warmth: 4 per constitution, plus 0–2');
  const member = (over) => ({ id: over.name, name: over.name, constitution: 3, location: hearth, isAlive: true, isConsumed: false, isAttracted: false, ...over });
  const [warm] = m.withWarmth([member({ name: 'A', constitution: 2 })], lodge, () => 0);
  ok(warm.warmth === 8 && warm.maxWarmth === 8 && warm.warmthRoom === hearth, 'the party starts warm, in its starting room');
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  ok(m.withWarmth([member({ name: 'A' })], manor)[0].warmth === undefined, 'nobody gets cold anywhere else');

  const tick = (over) => m.chillParty([member({ warmth: 6, maxWarmth: 8, warmthRoom: 'Boot Room', ...over })], lodge);
  ok(tick({ name: 'stay', location: 'Boot Room' }).party[0].warmth === 5, 'staying put: -1 a turn');
  ok(tick({ name: 'hearth', location: hearth }).party[0].warmth === 6, 'walking into the hearth room: +1, so the turn costs nothing');
  ok(tick({ name: 'full', location: hearth, warmth: 8 }).party[0].warmth === 7, 'the hearth can\'t warm anyone past where they started');
  ok(tick({ name: 'cold', location: cold[0] }).party[0].warmth === 4, 'walking into the cold: -2 that turn');
  ok(tick({ name: 'stay cold', location: cold[0], warmthRoom: cold[0] }).party[0].warmth === 5, 'staying out in the cold: just the usual -1');
  ok(tick({ name: 'stay hearth', location: hearth, warmthRoom: hearth }).party[0].warmth === 5, 'staying by the hearth: just the usual -1');

  const numb = tick({ name: 'numb', location: 'Boot Room', warmth: m.FROST_WARNING + 1 });
  ok(numb.numb.length === 1 && numb.frozen.length === 0, 'a warning as they get close to freezing');
  ok(tick({ name: 'numb2', location: 'Boot Room', warmth: m.FROST_WARNING }).numb.length === 0, '…only once');
  const ice = tick({ name: 'ice', location: 'Boot Room', warmth: 1 });
  ok(ice.frozen.length === 1 && ice.party[0].isFrozen && !ice.party[0].isAlive, 'at 0 they freeze solid and are out of the hunt');
  ok(m.chillParty(ice.party, lodge).frozen.length === 0, 'the frozen don\'t freeze again');
  ok(m.chillParty([member({ name: 'gone', warmth: 1, isConsumed: true, isAlive: false })], lodge).frozen.length === 0, 'the eaten don\'t freeze');

  // Different constitutions freeze on different turns
  let party = m.withWarmth([2, 3, 4].map((c) => member({ name: `con${c}`, constitution: c, location: 'Boot Room' })), lodge, () => 0);
  const frozeOn = {};
  for (let turn = 1; turn <= 20; turn++) {
    const r = m.chillParty(party, lodge);
    r.frozen.forEach((a) => { frozeOn[a.name] = turn; });
    party = r.party;
  }
  ok(frozeOn.con2 < frozeOn.con3 && frozeOn.con3 < frozeOn.con4, `the frail go first (turns ${frozeOn.con2}, ${frozeOn.con3}, ${frozeOn.con4})`);

  // A cheap frozen meal
  ok(m.frozenMealAp({ type: 'Commoner' }) === 1 && m.frozenMealAp({ type: 'Artificer' }) === 2 && m.frozenMealAp({ type: 'Hunter' }) === 4, 'a frozen meal is worth half, rounded up');
  ok(m.uneatenFrozen(ice.party).length === 1 && m.uneatenFrozen([{ ...ice.party[0], isConsumed: true }]).length === 0, 'eating a frozen body takes it off the table');

  // The report counts the frozen as lost, not as survivors
  const report = m.buildHuntReport({
    ending: 'cleared', seed: 1, locationName: lodge.name, lastRoom: hearth, formName: 'Wrapped Present', tier: 'Minor',
    mimicName: 'Test', bounty: false, peakSuspicion: 2, biggestMeal: null, mimicsDevoured: 0, sank: false,
    party: [{ name: 'Lodgekeeper', isConsumed: false, isFrozen: true }, { name: 'Gnome Courier', isConsumed: true, isFrozen: true }],
  });
  ok(report.kind === 'missing', 'a party lost to the cold leaves nobody to sing about it');
}
