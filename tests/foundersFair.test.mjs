// The Founders' Fair: a Founders' Day location open to every tier. Fireworks every few turns
// distract a room and its neighbors; a crate-shaped mimic under them gets opened and thrown out.
export default async function ({ gameData: m, ok }) {
  const fair = m.LOCATIONS.find((l) => l.id === 'founders_fair');
  ok(!!fair && fair.holiday === 'independence_day' && fair.fireworks?.every > 0, 'the Founders\' Fair is a Founders\' Day location with fireworks');

  const day = (mo, d) => new Date(2026, mo - 1, d);
  ok(m.isLocationAvailable(fair, 'Minor', 1, null, day(7, 4)), 'open to a Minor mimic on Jul 4');
  ok(!m.isLocationAvailable(fair, 'Apex', 40, null, day(7, 8)), 'closed on Jul 8');
  ok(m.locationGroup(fair) === 'seasonal', 'listed under Seasonal in the Codex');

  const natives = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('founders_fair')).map((t) => t.name);
  ok(natives.includes('Town Crier') && natives.includes('Fireworks Master') && natives.length >= 4, `its own fairgoers (${natives.join(', ')})`);
  ok(fair.alwaysIncludes.includes('Town Crier'), 'the Town Crier is always there');
  ok(fair.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK), 'every fair creature has its own emoji');
  ok(fair.locationCreatures.every((c) => !c.rooms || c.rooms.every((r) => fair.rooms.includes(r))), 'every creature room is a real room');

  // When they go off, and who's watching
  const every = fair.fireworks.every;
  ok(!m.fireworksDue(fair, 0) && m.fireworksDue(fair, every) && !m.fireworksDue(fair, every + 1) && m.fireworksDue(fair, every * 2), `a volley every ${every} turns`);
  ok(!m.fireworksDue(m.LOCATIONS.find((l) => l.id === 'manor'), every), 'and nowhere else');
  const watching = m.distractedRooms(fair, 'Village Green');
  ok(watching.includes('Village Green') && watching.includes('Bandstand') && !watching.includes('Riverbank'),
    `a volley over the green distracts it and its neighbors, not the far side (${watching.join(', ')})`);

  // Crates get opened
  const form = (id) => m.ALL_FORMS.find((f) => f.id === id);
  ok(m.fireworksRummage(fair, form('lesser_firework_crate')) === 2, 'a Firework Crate gets rummaged (+2 suspicion)');
  ok(m.fireworksRummage(fair, form('lesser_crate')) === 1, 'a plain Crate gets checked too (+1)');
  ok(m.fireworksRummage(fair, form('minor_picnic_basket')) === null, 'a picnic basket is left alone');
  ok(m.fireworksRummage(m.LOCATIONS.find((l) => l.id === 'manor'), form('lesser_firework_crate')) === null, 'nobody rummages anywhere else');
  ok(m.fireworksRummage(fair, { id: 'some_variant', variantOf: 'lesser_crate' }) === 1, 'a variant of a crate counts as a crate');

  // …and thrown out next door, into an empty room if there is one
  const next = m.getAdjacentRooms(fair, 'Village Green');
  ok(next.includes(m.tossRoom(fair, 'Village Green', [])), 'thrown into a neighboring room');
  ok(m.tossRoom(fair, 'Riverbank', ['Bandstand']) === 'Pie-Judging Tent', 'into the empty one, if one of them is busy');
  ok(['Bandstand', 'Pie-Judging Tent'].includes(m.tossRoom(fair, 'Riverbank', ['Bandstand', 'Pie-Judging Tent'])), 'into a busy one if there\'s no choice');
}
