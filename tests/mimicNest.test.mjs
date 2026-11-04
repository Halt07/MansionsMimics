// The Mimic Nest: rival placement, nest makeup, escapes, and the Elder ending the hunt.
export default async function ({ gameData: m, ok }) {
  const { LOCATIONS, ADVENTURER_TEMPLATES: T, RIVAL_STATS } = m;
  const nest = LOCATIONS.find((l) => l.id === 'mimic_nest');
  const manor = LOCATIONS.find((l) => l.id === 'manor');

  ok(nest.rare && nest.minTier === 'Greater', 'the Mimic Nest is a rare Greater+ location');
  ok(m.isLocationAvailable(nest, 'Greater', 13, { id: 'mimic_nest', huntsLeft: 2 }) && !m.isLocationAvailable(nest, 'Standard', 9, { id: 'mimic_nest', huntsLeft: 2 }), 'it needs Greater tier');
  const roster = T.filter((t) => m.isTemplateEligible(t, nest, 'Apex', 40)).map((t) => t.name);
  ok(roster.length === 4, `it has its own small roster (${roster.join(', ')})`);

  // Nest makeup: 3–4 mimics, exactly one Elder, each in its own room, never the start room
  const sizes = new Set();
  let placementOk = true;
  for (let i = 0; i < 500; i++) {
    const kinds = m.rollNestKinds(nest);
    sizes.add(kinds.length);
    if (kinds.filter((k) => k === 'elder').length !== 1) placementOk = false;
    const rivals = m.placeRivals(nest, 'Loading Dock', kinds);
    const rooms = rivals.map((r) => r.room);
    if (rivals.length !== kinds.length || new Set(rooms).size !== rooms.length || rooms.includes('Loading Dock')) placementOk = false;
  }
  ok(placementOk, 'every nest has one Elder, and each mimic hides in a different room away from the mimic');
  ok([...sizes].sort().join() === '3,4', 'nests hold 3 or 4 mimics');
  ok(m.rollNestKinds(manor).length === 0, 'ordinary locations have no nest');

  // The Elder is the toughest and most rewarding
  ok(RIVAL_STATS.elder.dice > RIVAL_STATS.nest.dice && RIVAL_STATS.elder.ap > RIVAL_STATS.nest.ap, 'the Elder resists harder and is worth more than a nest mimic');
  ok(RIVAL_STATS.lone.dice === 3 && RIVAL_STATS.lone.ap === 12, 'the lone rival on ordinary hunts is unchanged (3 dice, 12 AP)');

  // Escapes avoid the mimic and the other rivals
  const rivals = m.placeRivals(nest, 'Loading Dock', ['elder', 'nest', 'nest', 'nest']);
  const escapee = rivals[1];
  let escapeOk = true;
  for (let i = 0; i < 200; i++) {
    const room = m.rivalEscapeRoom(nest, rivals, escapee, escapee.room);
    if (room === escapee.room || rivals.some((r) => r.id !== escapee.id && r.room === room)) escapeOk = false;
  }
  ok(escapeOk, 'an escaping rival hides away from the mimic and the other rivals');
  ok(m.rivalInRoom(rivals, rivals[2].room)?.id === rivals[2].id, 'rivalInRoom finds the mimic hiding in a room');
  ok(m.rivalInRoom(rivals.map((r) => ({ ...r, consumed: true })), rivals[2].room) === undefined, 'eaten rivals no longer hide anywhere');

  // Winning
  ok(!m.isNestCleared(rivals), 'the nest is not cleared at the start');
  ok(!m.isNestCleared(rivals.map((r) => (r.kind === 'nest' ? { ...r, consumed: true } : r))), 'eating every young mimic is not enough');
  ok(m.isNestCleared(rivals.map((r) => (r.kind === 'elder' ? { ...r, consumed: true } : r))), 'devouring the Elder clears the nest, even with others left');
}
