// Honeyamber: small creatures wander more often, and half their moves head toward the mimic.
export default async function ({ gameData: m, ok, log }) {
  const loc = m.LOCATIONS.find((l) => l.id === 'manor');
  const dist = (a, b) => m.getRoomDistance(loc, a, b);
  // A creature room two or more steps from the mimic, so "closer" means something
  const [from, mimic] = loc.rooms.flatMap((a) => loc.rooms.map((b) => [a, b])).find(([a, b]) => dist(a, b) >= 2);
  const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

  ok(m.MATERIALS.magic.includes('Honeyamber') && m.MAGIC_EFFECTS.Honeyamber, 'Honeyamber is a magic material with an effect');
  const teachers = m.ADVENTURER_TEMPLATES.filter((t) => t.lootMaterials.includes('Honeyamber')).map((t) => t.name);
  ok(teachers.includes('Rat-Catcher') && teachers.includes('Wandering Druid'), `the Rat-Catcher and the Wandering Druid can teach it (${teachers.join(', ')})`);

  // Wander chance: 40% normally, 50% with Honeyamber
  ok(m.wanderCreature(loc, from, mimic, false, seq(0.39, 0)) !== from, 'normally: a roll under 40% wanders');
  ok(m.wanderCreature(loc, from, mimic, false, seq(0.41)) === from, 'normally: a roll of 41% stays put');
  ok(m.wanderCreature(loc, from, mimic, true, seq(0.45, 0.9, 0)) !== from, 'Honeyamber: a roll of 45% wanders');
  ok(m.wanderCreature(loc, from, mimic, true, seq(0.55)) === from, 'Honeyamber: a roll of 55% stays put');

  // When the lure roll succeeds, the step is toward the mimic
  const closer = m.wanderCreature(loc, from, mimic, true, seq(0.1, 0.1, 0.99));
  ok(dist(closer, mimic) === dist(from, mimic) - 1, `a successful lure roll steps one room closer (${from} → ${closer}, toward ${mimic})`);
  ok(m.wanderCreature(loc, mimic, mimic, true, seq(0.1, 0.1)) === mimic, 'in your room, a successful lure roll stays put');
  const neighbours = m.getAdjacentRooms(loc, mimic);
  const leaves = m.wanderCreature(loc, mimic, mimic, true, seq(0.1, 0.9, 0));
  ok(neighbours.includes(leaves), `in your room, a failed lure roll can still wander off (to the ${leaves})`);
  ok(neighbours.includes(m.wanderCreature(loc, mimic, null, true, seq(0.1, 0.1, 0))), 'no mimic room yet: just a random step');

  // Over many turns, Honeyamber pulls creatures in
  const N = 20000;
  const avg = (honey) => { let total = 0; for (let i = 0; i < N; i++) total += dist(m.wanderCreature(loc, from, mimic, honey), mimic); return total / N; };
  const plain = avg(false), honey = avg(true);
  ok(honey < plain, `average distance after one turn is lower with Honeyamber (${honey.toFixed(2)} vs ${plain.toFixed(2)})`);
  log(`from ${from} to ${mimic}: ${plain.toFixed(3)} without, ${honey.toFixed(3)} with`);
}
