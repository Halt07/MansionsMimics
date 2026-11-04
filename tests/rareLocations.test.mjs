// Rare locations (opening, expiring, availability) and the Hollow Reliquary's Devotion.
export default async function ({ gameData: m, ok, log }) {
  const { LOCATIONS, ADVENTURER_TEMPLATES: T } = m;
  const reliquary = LOCATIONS.find((l) => l.id === 'hollow_reliquary');
  const manor = LOCATIONS.find((l) => l.id === 'manor');
  const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

  // ── Availability ──
  ok(reliquary.rare, 'the Reliquary is a rare location');
  ok(!m.isLocationAvailable(reliquary, 'Greater', 15, null), 'rare locations are hidden unless open');
  ok(m.isLocationAvailable(reliquary, 'Standard', 9, { id: 'hollow_reliquary', huntsLeft: 2 }), 'an open rare location is shown');
  ok(!m.isLocationAvailable(reliquary, 'Lesser', 6, { id: 'hollow_reliquary', huntsLeft: 2 }), 'tier requirements still apply to rare locations');
  ok(m.isLocationAvailable(manor, 'Minor', 2, null), 'ordinary locations are unaffected');

  // ── Opening ──
  ok(m.advanceRareLocation(null, 'manor', 'Standard', 9, seq(0.5)).state === null, 'a roll of 15% or more opens nothing');
  const opened = m.advanceRareLocation(null, 'manor', 'Standard', 9, seq(0.1, 0));
  ok(opened.opened?.id === 'hollow_reliquary' && opened.state?.huntsLeft === m.RARE_LOCATION_HUNTS, 'a successful roll opens a qualifying rare location for 2 hunts');
  ok(m.advanceRareLocation(null, 'manor', 'Lesser', 6, seq(0.1, 0)).state === null, 'nothing opens if the mimic qualifies for no rare location');
  let opens = 0;
  for (let i = 0; i < 20000; i++) if (m.advanceRareLocation(null, 'manor', 'Standard', 9).opened) opens++;
  ok(Math.abs(opens / 20000 - 0.15) < 0.015, `about 15% of hunts open a rare location (${((opens / 20000) * 100).toFixed(1)}%)`);

  // ── Expiring / only one at a time ──
  const open2 = { id: 'hollow_reliquary', huntsLeft: 2 };
  const after1 = m.advanceRareLocation(open2, 'manor', 'Standard', 9, seq(0));
  ok(after1.state?.huntsLeft === 1 && !after1.opened, 'hunting elsewhere uses up one hunt, and nothing new rolls while one is open');
  ok(m.advanceRareLocation(after1.state, 'manor', 'Standard', 9, seq(0)).state === null, 'it closes after its last hunt');
  ok(m.advanceRareLocation(open2, 'hollow_reliquary', 'Standard', 9, seq(0)).state === null, 'visiting it closes it');

  // ── Roster ──
  const roster = T.filter((t) => m.isTemplateEligible(t, reliquary, 'Apex', 40)).map((t) => t.name).sort();
  ok(roster.length === 5 && roster.includes('Wide-Eyed Pilgrim'), `the Reliquary has its own five adventurers (${roster.join(', ')})`);
  ok(T.filter((t) => t.locations?.includes('hollow_reliquary')).every((t) => !m.isTemplateEligible(t, manor, 'Apex', 40)), 'Reliquary adventurers never appear elsewhere');
  ok(reliquary.alwaysIncludes.includes('Wide-Eyed Pilgrim'), 'every Reliquary party includes the pilgrim');
  ok(m.isHiddenBehavior('devotion') && !m.isHiddenBehavior('keenHearing'), 'Devotion is hidden; other behaviors are not');

  // ── Devotion ──
  const member = (id, extra = {}) => ({ id, name: id, isAlive: true, isConsumed: false, ...extra });
  const pilgrim = member('pilgrim', { behavior: 'devotion' });
  ok(m.findDevotee([pilgrim, member('guard'), member('elder')]) === null, 'no conversion while others remain');
  const lastStanding = [pilgrim, member('guard', { isAlive: false, isConsumed: true }), member('elder', { isAlive: false, fled: true })];
  ok(m.findDevotee(lastStanding)?.id === 'pilgrim', 'the pilgrim converts once it is the last one left (consumed or fled)');
  ok(m.findDevotee([{ ...pilgrim, isConverted: true, isAlive: false }, member('guard', { isAlive: false, isConsumed: true })]) === null, 'a convert only converts once');
  ok(m.findDevotee([member('guard'), member('elder', { isAlive: false, isConsumed: true })]) === null, 'an ordinary last survivor does nothing');
  ok(m.findDevotee([pilgrim]) === null, 'a party of one does not convert');

  const offerings = m.rollOfferings(reliquary);
  ok(offerings.length >= 4 && offerings.length <= 5, `the convert brings 4–5 offerings (${offerings.map((c) => c.name).join(', ')})`);
  ok(offerings.every((c) => reliquary.locationCreatures.includes(c)), 'offerings are the shrine’s own small creatures');

  // Zealot names
  const devotees = T.filter((t) => t.behavior === 'devotion');
  ok(devotees.every((t) => t.convertedName?.endsWith('Zealot')), `every devotee has a zealot name (${devotees.map((t) => `${t.name} → ${t.convertedName}`).join(', ')})`);
  ok(m.findDevotee([member('elder', { behavior: 'devotion' }), member('guard', { isAlive: false, isConsumed: true })])?.id === 'elder', 'the Pilgrim Elder can convert too');
  ok(m.findDevotee([pilgrim, member('elder', { behavior: 'devotion' }), member('guard', { isAlive: false, isConsumed: true })]) === null, 'two devotees left alive: neither converts until one is gone');
}
