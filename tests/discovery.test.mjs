// Codex discovery: met / eaten tracking, pooled across mimics.
export default async function ({ gameData: m, db: dbModule, ok }) {
  const a = { adventurersMet: ['Mimic Hunter', 'Wide-Eyed Pilgrim'], adventurersEaten: ['Wide-Eyed Pilgrim'] };
  const b = { adventurersMet: ['Gargoyle'], adventurersEaten: ['Ghoul'] };
  const d = m.pooledDiscoveries([a, b]);
  ok(m.discoveryLevel(d, 'Wide-Eyed Pilgrim') === 'eaten', 'eaten adventurers are fully revealed');
  ok(m.discoveryLevel(d, 'Mimic Hunter') === 'met' && m.discoveryLevel(d, 'Gargoyle') === 'met', 'met adventurers are described, from any mimic');
  ok(m.discoveryLevel(d, 'Ghoul') === 'eaten', 'eating counts as meeting');
  ok(m.discoveryLevel(d, 'Giant Lord') === 'unknown', 'everyone else is unknown');
  ok(m.discoveryLevel(m.pooledDiscoveries([]), 'Gargoyle') === 'unknown', 'no mimics: nothing is known');

  const party = [
    { name: 'Mimic Hunter' },
    { name: "Mimic Hunter's Bloodhound", isCompanion: true },
    { name: 'Not A Real Template' },
  ];
  const met = m.withDiscovered(['Gargoyle', 'Mimic Hunter'], party);
  ok(met.length === 2 && met.includes('Gargoyle') && met.includes('Mimic Hunter'), 'recording a party skips companions, non-templates and duplicates');

  // Saved characters start with nothing discovered
  const saved = await dbModule.db.entities.MimicCharacter.create({ name: 'Scout', tier: 'Minor', startingType: 'Minor', forms: [] });
  ok(Array.isArray(saved.adventurersMet) && saved.adventurersMet.length === 0 && saved.adventurersEaten.length === 0, 'new mimics have empty discovery lists');
}
