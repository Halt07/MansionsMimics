// Who's at a location when a hunt starts: generateParty and spawnSmallCreatures.
export default async function ({ gameData: m, ok }) {
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const runs = (n, f) => Array.from({ length: n }, f);
  const templateNames = (party) => party.filter((a) => !a.isCompanion).map((a) => a.name);

  // Party size and rooms
  const manor = loc('manor');
  const parties = runs(200, () => m.generateParty(manor, 'Greater', 14));
  ok(parties.every((p) => { const n = p.filter((a) => !a.isCompanion).length; return n >= manor.partySize[0] && n <= manor.partySize[1]; }),
    `party size stays within the manor's ${manor.partySize.join('–')} (companions on top)`);
  ok(parties.every((p) => p.every((a) => manor.rooms.includes(a.location))), 'everyone starts in one of its rooms');
  ok(parties.every((p) => new Set(templateNames(p)).size === templateNames(p).length), 'nobody turns up twice');
  ok(parties.every((p) => templateNames(p).every((n) => m.isTemplateEligible(m.ADVENTURER_TEMPLATES.find((t) => t.name === n), manor, 'Greater', 14))),
    'only adventurers allowed there for this mimic');

  // Guaranteed adventurers and locals
  const lodge = loc('snowbound_lodge');
  const lodgeParties = runs(100, () => templateNames(m.generateParty(lodge, 'Minor', 3)));
  ok(lodgeParties.every((p) => p.includes('Lodgekeeper')), 'the Lodgekeeper is always at the lodge');
  const locals = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('snowbound_lodge') && t.name !== 'Lodgekeeper').map((t) => t.name);
  ok(lodgeParties.every((p) => p.some((n) => locals.includes(n))), 'and at least one more local (nativeShare)');

  // Real monsters never come through the normal draw
  const street = loc('spell_or_sweet_street');
  const streetNames = runs(300, () => templateNames(m.generateParty(street, 'Apex', 40))).flat();
  ok(!streetNames.some((n) => street.realMonsters.names.includes(n)), 'the street\'s real monsters never join the normal way');

  // …but elsewhere they join like anyone else: the Swamp Hag haunts the Lonely Moor
  const moorNames = runs(300, () => templateNames(m.generateParty(loc('lonely_moor'), 'Apex', 30))).flat();
  ok(moorNames.includes('Swamp Hag'), 'the Swamp Hag turns up on the Lonely Moor through the normal draw');

  // A seeded roll gives the same party
  const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ok(templateNames(m.generateParty(manor, 'Grand', 20, seeded(7))).join() === templateNames(m.generateParty(manor, 'Grand', 20, seeded(7))).join(),
    'the same random rolls give the same party');

  // Small creatures
  const spawns = runs(300, () => m.spawnSmallCreatures(lodge));
  ok(spawns.every((c) => c.length >= 3 && c.length <= 5), '3–5 small creatures');
  ok(spawns.every((cs) => cs.every((c) => !c.rooms || c.rooms.includes(c.location))), 'each in a room it\'s allowed in');
  ok(spawns.every((cs) => cs.filter((c) => c.id === 'reindeer').length <= 1), 'never more than one reindeer');
  ok(spawns.every((cs) => new Set(cs.map((c) => c.uid)).size === cs.length), 'each with its own id');
}
