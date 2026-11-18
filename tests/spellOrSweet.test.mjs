// Spell or Sweet Street: an All Hallows' Eve loop of houses. The costumed party goes door to door;
// the right shape hands out sweets, any other gets pranked; nobody knows who's who until eaten.
export default async function ({ gameData: m, ok }) {
  const street = m.LOCATIONS.find((l) => l.id === 'spell_or_sweet_street');
  ok(!!street && street.holiday === 'halloween' && street.costumes, 'Spell or Sweet Street is an All Hallows\' Eve location, in costume');
  const day = (mo, d) => new Date(2026, mo - 1, d);
  ok(m.isLocationAvailable(street, 'Minor', 1, null, day(10, 31)), 'open to a Minor mimic on Oct 31');
  ok(!m.isLocationAvailable(street, 'Apex', 40, null, day(11, 2)), 'closed on Nov 2');
  ok(street.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK), 'every street creature has its own emoji');

  // The loop
  const order = street.procession.order;
  ok(order.length === 8 && order.every((r) => street.rooms.includes(r)), 'eight houses on the loop');
  ok(street.rooms.length === 9 && !order.includes('Village Green'), 'plus the village green in the middle, off the loop');
  ok([...m.getAdjacentRooms(street, 'Village Green')].sort().join() === ['Empty Lot', "Widow's Cottage", 'Pumpkin Farmhouse', "Mayor's House"].sort().join(),
    'the green reaches the four houses straight across, not the corners');
  const plan = m.floorPlan(street);
  const at = (room) => plan.cells.find((c) => c.room === room);
  ok(at('Village Green').col === 1 && at('Village Green').row === 1 && at('Empty Lot').col === 1 && at('Empty Lot').row === 0, 'the green sits in the middle, with the empty lot top middle');
  ok(plan.cells.every((c) => c.stairsTo.length === 0), 'every connection is a door between neighbors (no stairs)');
  ok(m.getAdjacentRooms(street, m.nextHouse(street, 'Village Green')).includes('Village Green'), 'someone lured onto the green rejoins the loop at a house next to it');
  ok(order.every((r, i) => m.getAdjacentRooms(street, r).includes(order[(i + 1) % order.length])), 'each house leads to the next, all the way round');
  ok(m.nextHouse(street, order[7]) === order[0], 'after the last house comes the first');
  ok(m.housesAway(street, "Mayor's House", "Baker's House") === 3, 'three houses from the Mayor\'s to the Baker\'s, going round');
  ok(m.housesAway(street, 'Village Green', "Baker's House") === Infinity, 'the green isn\'t on the way to anywhere');
  ok(order.includes('Empty Lot'), 'one of them is the empty lot');

  // Starting houses: a few together, the rest spread out, nobody at your house
  const member = (name, over = {}) => ({ id: name, name, location: order[0], isAlive: true, isConsumed: false, isAttracted: false, constitution: 3, ...over });
  const party = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => member(n));
  for (let run = 0; run < 50; run++) {
    const placed = m.placeProcession(party, street, 'Empty Lot');
    const counts = Object.values(placed.reduce((acc, a) => ({ ...acc, [a.location]: (acc[a.location] ?? 0) + 1 }), {})).sort((x, y) => y - x);
    if (placed.some((a) => a.location === 'Empty Lot') || counts[0] < 2 || counts[0] > 3 || counts.slice(1).some((n) => n > 1)) {
      ok(false, `bad start: ${placed.map((a) => a.location).join(', ')}`);
      break;
    }
    if (run === 49) ok(true, 'two or three start together, everyone else at their own house, nobody at yours');
  }

  // Who answers the door
  const form = (id) => m.ALL_FORMS.find((f) => f.id === id);
  ok(['standard_door', 'minor_jack_o_lantern', 'lesser_chest', 'greater_gargoyle'].every((id) => m.answersDoor(street, form(id))), 'a Door, Jack-o\'-Lantern, Chest or Gargoyle hands out sweets');
  const chestVariant = m.ALL_FORMS.find((f) => f.variantOf === 'lesser_chest');
  ok(!chestVariant || m.answersDoor(street, chestVariant), `so does a variant of the Chest${chestVariant ? ` (${chestVariant.name})` : ''}`);
  ok(!m.answersDoor(street, form('lesser_barrel')), 'a barrel doesn\'t (and gets pranked)');
  ok(!m.answersDoor(m.LOCATIONS.find((l) => l.id === 'manor'), form('standard_door')), 'nobody knocks anywhere else');
  ok(m.PRANKS.length >= 5, 'plenty of pranks to pick from');

  // Costumes
  const dressed = m.dressParty(party);
  ok(new Set(dressed.map((a) => a.name)).size === party.length && dressed.every((a) => a.costume === a.name && m.COSTUMES.includes(a.costume)), 'everyone gets a different costume, and that\'s all anyone sees');
  ok(dressed.every((a, i) => a.trueName === party[i].name), 'who they really are is kept');
  const real = m.ADVENTURER_TEMPLATES[0].name;
  const werewolf = { name: 'Werewolf', costume: 'Werewolf', trueName: real };
  ok(m.withDiscovered([], [werewolf]).length === 0, 'meeting someone in a Werewolf costume doesn\'t mean you\'ve met a Werewolf');
  ok(m.withDiscovered([], [m.unmask(werewolf)])[0] === real, 'eating them records who they really were');
  const big = m.dressParty(Array.from({ length: m.COSTUMES.length + 2 }, (_, i) => member(`P${i}`)));
  ok(new Set(big.map((a) => a.name)).size === big.length, 'even a huge party gets distinct costume names');

  // Sometimes it isn't a costume
  const realMonsters = street.realMonsters;
  ok(realMonsters.chance > 0 && realMonsters.chance < 1, `a ${Math.round(realMonsters.chance * 100)}% chance per hunt of a real monster`);
  const templates = realMonsters.names.map((n) => m.ADVENTURER_TEMPLATES.find((t) => t.name === n));
  ok(templates.every(Boolean), `every real monster is an adventurer (${realMonsters.names.join(', ')})`);
  ok(realMonsters.names.every((n) => m.COSTUMES.includes(n)), 'every real monster is also a costume people wear, so you can\'t tell them apart');
  ok(templates.every((t) => t.locations?.includes('spell_or_sweet_street')), 'the Codex lists the street for each of them');

  const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
  const base = ['A', 'B', 'C'].map((n) => member(n));
  ok(m.addRealMonster(base, street, 'Apex', 40, seq(0.99)).length === 3, 'most hunts: no real monster');
  const withOne = m.addRealMonster(base, street, 'Apex', 40, seq(0.01, 0, 0));
  ok(withOne.length === 4 && realMonsters.names.includes(withOne[3].name), `a lucky hunt: one joins (${withOne[3]?.name})`);
  const minorPicks = new Set(Array.from({ length: 200 }, () => m.addRealMonster(base, street, 'Minor', 2, seq(0, Math.random(), 0))[3]?.name));
  ok([...minorPicks].every((n) => n === 'Skeleton'), `a Minor mimic only ever meets the Skeleton (${[...minorPicks].join(', ')})`);
  ok(m.addRealMonster(base, m.LOCATIONS.find((l) => l.id === 'manor'), 'Apex', 40, seq(0)).length === 3, 'no real monsters anywhere else');

  const dressedReal = m.dressParty(withOne);
  const monster = dressedReal[3];
  ok(monster.name === withOne[3].name && m.isTheRealThing(monster), 'a real monster looks like its own costume');
  ok(dressedReal.slice(0, 3).every((a) => !m.isTheRealThing(a)), 'everyone else is in an actual costume');
  // Anyone named like a costume shows up as the real thing, so only the real monsters may be
  const costumeNamed = m.ADVENTURER_TEMPLATES.filter((t) => m.COSTUMES.includes(t.name)).map((t) => t.name);
  ok(costumeNamed.every((n) => realMonsters.names.includes(n)), `the only adventurers named like a costume are the real monsters (${costumeNamed.join(', ')})`);
  ok(dressedReal.slice(0, 3).every((a) => a.costume !== monster.name), 'and nobody else is wearing that costume');
  ok(m.withDiscovered([], [monster]).length === 0 && m.withDiscovered([], [m.unmask(monster)])[0] === monster.name, 'met only once eaten, like everyone else');
}
