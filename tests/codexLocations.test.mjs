// The Codex's Hunt Locations section: groups, and what it reveals about each place.
export default async function ({ gameData: m, ok }) {
  const byId = (id) => m.LOCATIONS.find((l) => l.id === id);
  const group = (g) => m.LOCATIONS.filter((l) => m.locationGroup(l) === g).map((l) => l.id);

  ok(group('common').length === 5, `five common locations (${group('common').join(', ')})`);
  ok(group('giant').every((id) => byId(id).isGiantRealm) && group('giant').length === 2, 'the giant realm forms the Giant group');
  const giantCastle = byId('giants_castle');
  ok(group('advanced').every((id) => (byId(id).minMass ?? 0) <= giantCastle.minMass || byId(id).minTier !== 'Apex'), `Advanced grounds unlock before the Giant's Castle (${group('advanced').join(', ')})`);
  ok(group('adept').length > 0 && group('adept').every((id) => byId(id).minTier === 'Apex' && byId(id).minMass > giantCastle.minMass), `Adept grounds unlock after it (${group('adept').join(', ')})`);
  ok(group('rare').every((id) => byId(id).rare) && group('rare').length === m.LOCATIONS.filter((l) => l.rare).length, 'every rare location is in the Rare group');
  ok(m.LOCATIONS.every((l) => m.LOCATION_GROUPS.some((g) => g.id === m.locationGroup(l))), 'every location lands in a listed group');

  const mimic = (tier, mass, counts = {}) => ({ tier, mass, locationHuntCounts: counts });
  const know = (id, ...cs) => m.locationKnowledge(byId(id), cs);

  ok(know('manor') === 'known', 'with no mimics at all, the common grounds are still known');
  ok(know('hidden_grove') === 'unknown', 'with no mimics, advanced grounds are ???');
  ok(know('hidden_grove', mimic('Minor', 3)) === 'unknown', 'too small for an advanced ground: ???');
  ok(know('hidden_grove', mimic('Grand', 20)) === 'known', 'big enough for it: known, but unmapped');
  ok(know('giants_castle', mimic('Apex', 27)) === 'unknown' && know('giants_castle', mimic('Apex', 28)) === 'known', 'the Giant\'s Castle needs its mass');
  ok(know('sinking_ship', mimic('Apex', 99)) === 'unknown', 'a rare ground stays ??? however big you are');
  ok(know('sinking_ship', mimic('Lesser', 5, { sinking_ship: 1 })) === 'visited', 'hunting there once maps a rare ground');
  ok(know('manor', mimic('Minor', 3, { manor: 2 })) === 'visited', 'hunting in a common ground maps it');
  ok(know('hidden_grove', mimic('Minor', 3), mimic('Grand', 20)) === 'known', 'pooled over mimics, the best one counts');
  ok(m.locationHunts(byId('manor'), [mimic('Minor', 3, { manor: 2 }), mimic('Minor', 3, { manor: 3 })]) === 5, 'hunt counts add up over mimics');
  ok(know('manor', { tier: 'Minor', mass: 3 }) === 'known', 'an old save with no hunt counts still works');
}
