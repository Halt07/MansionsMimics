// Party movement on a Wait (moveParty) and the small creatures' turn (moveCreatures).
export default async function ({ gameData: m, ok }) {
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
  const member = (name, location, over = {}) => ({ id: name, name, location, isAlive: true, isConsumed: false, isAttracted: false, constitution: 3, ...over });
  const manor = loc('manor');
  const ctx = { mimicRoom: 'Wine Cellar', rivals: [] };

  // Ordinary wandering: half the time they stay, otherwise a step to a neighboring room
  const stay = m.moveParty([member('A', 'Library', { isAttracted: true })], manor, ctx, seq(0.1));
  ok(stay.steps.length === 0 && stay.party[0].location === 'Library' && stay.party[0].isAttracted, 'a stay roll: nobody moves, nothing changes');
  const go = m.moveParty([member('A', 'Library', { isAttracted: true })], manor, ctx, seq(0.9, 0));
  ok(go.steps.length === 1 && m.getAdjacentRooms(manor, 'Library').includes(go.party[0].location), `a wander roll: one step next door (to the ${go.party[0].location})`);
  ok(!go.party[0].isAttracted, 'and wandering off breaks the lure');
  const stats = Array.from({ length: 4000 }, () => m.moveParty([member('A', 'Library')], manor, ctx).steps.length).reduce((a, b) => a + b, 0) / 4000;
  ok(stats > 0.4 && stats < 0.6, `about half the time they move (${(stats * 100).toFixed(0)}%)`);

  // Who doesn't move
  ok(m.moveParty([member('A', 'Library', { isAlive: false, isFrozen: true })], manor, ctx, seq(0.9, 0)).steps.length === 0, 'the frozen (and the dead) stay where they are');
  ok(m.moveParty([member('A', 'Library', { isConsumed: true })], manor, ctx, seq(0.9, 0)).steps.length === 0, 'the eaten don\'t wander');
  ok(m.moveParty([member('G', 'Library', { behavior: 'stoneWatch' })], manor, ctx, seq(0.9, 0)).steps.length === 0, 'a gargoyle on stone watch never moves');

  // Arriving in your room
  const into = m.moveParty([member('A', 'Library')], manor, ctx, seq(0.9, 0.99));
  const reachedCellar = into.party[0].location === 'Wine Cellar';
  ok(!reachedCellar || (into.arrivals.length === 1 && into.arrivals[0].name === 'A'), 'whoever walks into your room is an arrival (stealth checks follow)');
  const fromCellar = m.getAdjacentRooms(manor, 'Wine Cellar')[0];
  const sure = m.moveParty([member('A', fromCellar)], { ...manor, roomGraph: { ...manor.roomGraph, [fromCellar]: ['Wine Cellar'] } }, ctx, seq(0.9, 0));
  ok(sure.arrivals.length === 1 && sure.arrivals[0].location === 'Wine Cellar', 'a step into your room is an arrival');

  // A hidden rival
  const rival = { id: 'r1', kind: 'lone', room: 'Wine Cellar', revealed: false, consumed: false };
  const eaten = m.moveParty([member('A', fromCellar)], { ...manor, roomGraph: { ...manor.roomGraph, [fromCellar]: ['Wine Cellar'] } }, { mimicRoom: 'Library', rivals: [rival] }, seq(0.9, 0));
  ok(eaten.steps[0]?.vanishedInto === 'r1' && eaten.party[0].isDisappeared && !eaten.party[0].isAlive, 'walking into a hidden rival\'s room: vanished');
  ok(eaten.arrivals.length === 0, 'and they don\'t count as arriving anywhere');
  ok(m.VANISHING_LINES.every((line) => line('Bard', 'Cellar').includes('Bard') && line('Bard', 'Cellar').includes('Cellar')), 'every vanishing line names who and where');

  // A fallen star: everyone heads for it, the first there pockets it
  const hill = loc('stargazers_hill');
  const starMove = m.moveParty([member('A', 'Observatory Dome'), member('B', 'Hilltop Lawn')], hill,
    { mimicRoom: 'Lens Workshop', rivals: [], starFragment: 'Stone Circle' }, seq(0.1));
  ok(starMove.party[0].location === 'Stair Hall' && starMove.party[1].location === 'Stone Circle', 'with a star down, everyone takes a step toward it (no stay rolls)');
  ok(starMove.claimedStar?.name === 'B' && starMove.party[1].treasure === m.STAR_FRAGMENT, 'and whoever gets there first pockets it');

  // Door to door
  const street = loc('spell_or_sweet_street');
  const order = street.procession.order;
  const walkers = [member('A', order[0]), member('B', order[0]), member('C', order[3])];
  const door = m.ALL_FORMS.find((f) => f.id === 'standard_door');
  const barrel = m.ALL_FORMS.find((f) => f.id === 'lesser_barrel');
  const walk = m.moveParty(walkers, street, { mimicRoom: order[1], rivals: [], form: door }, seq(0.1));
  ok(walk.party.every((a, i) => a.location === order[(order.indexOf(walkers[i].location) + 1) % order.length]), 'door to door: everyone moves on to the next house, always');
  ok(walk.knock?.answered && walk.knock.callers.map((a) => a.name).join() === 'A,B', 'the two who reach your house knock together');
  ok(walk.party.filter((a) => a.isAttracted).map((a) => a.name).join() === 'A,B', 'a Door answers with sweets: they come right up (attracted)');
  const prank = m.moveParty(walkers, street, { mimicRoom: order[1], rivals: [], form: barrel }, seq(0.1));
  ok(prank.knock && !prank.knock.answered && !prank.party.some((a) => a.isAttracted), 'a barrel doesn\'t answer: no sweets, no lure (a prank instead)');
  ok(m.moveParty(walkers, street, { mimicRoom: 'Village Green', rivals: [], form: door }, seq(0.1)).knock === null, 'nobody knocks on the village green');
  const lured = m.moveParty([member('L', 'Village Green')], street, { mimicRoom: order[0], rivals: [] }, seq(0));
  ok(m.getAdjacentRooms(street, 'Village Green').includes(lured.party[0].location), 'someone lured onto the green rejoins the loop next to it');

  // Small creatures
  const lodge = loc('snowbound_lodge');
  const deer = { id: 'reindeer', name: 'Reindeer', rooms: ['Woodshed', 'Snowed-In Courtyard'], location: 'Snowed-In Courtyard', isConsumed: false };
  const deerRooms = new Set(Array.from({ length: 500 }, () => m.moveCreatures([deer], lodge, 'Great Hearth', false).creatures[0].location));
  ok([...deerRooms].every((r) => deer.rooms.includes(r)), `a creature never wanders out of its rooms (${[...deerRooms].join(', ')})`);
  const mouse = { id: 'mouse', name: 'Larder Mouse', location: 'Kitchen & Larder', isConsumed: false };
  const crept = m.moveCreatures([mouse], lodge, 'Boot Room', true, seq(0.1, 0.1));
  ok(crept.creatures[0].location === 'Boot Room' && crept.arrivals.length === 1, 'Honeyamber: a lured critter creeps into your room, and is listed as arriving');
  ok(m.moveCreatures([{ ...mouse, isConsumed: true }], lodge, 'Boot Room', true, seq(0.1, 0.1)).creatures[0].location === 'Kitchen & Larder', 'eaten creatures stay eaten');
}
