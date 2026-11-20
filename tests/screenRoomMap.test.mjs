// The room map (src/components/game/RoomMap.tsx), with React Testing Library: where everyone is
// drawn, what the tooltips say, and which rooms are flagged for styling (in lure range, under
// the fireworks).
import { screen, within } from '@testing-library/react';
import { setup } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: RoomMap, MysteryMap } = await load('/src/components/game/RoomMap.tsx');
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  const here = manor.rooms[0];
  const next = m.getAdjacentRooms(manor, here)[0];
  const far = manor.rooms.find((r) => m.getRoomDistance(manor, here, r) >= 2);
  const adv = (name, type, room, over = {}) => ({ id: name, name, type, location: room, isAlive: true, isConsumed: false, isAttracted: false, ...over });
  // The map's cells, by the room named in each
  const cells = (container) => Object.fromEntries([...container.querySelectorAll('.room-cell')].map((c) => [c.querySelector('.room-name').textContent, c]));
  const titles = (cell) => [...cell.querySelectorAll('[title]')].map((e) => e.title);

  // ---------- the floor plan ----------
  const bare = cells(s.show(RoomMap, { location: manor }).container);
  ok(Object.keys(bare).length === manor.rooms.length && manor.rooms.every((r) => bare[r]), 'one cell per room, each labelled');
  ok(!screen.queryByText('You') && Object.values(bare).every((c) => !c.dataset.inRange), 'a bare plan (the Codex) has no mimic and no lure range');

  // ---------- you, and your lure range ----------
  const map = cells(s.show(RoomMap, { location: manor, mimicRoom: here, lureRange: 1, formName: 'Chest' }).container);
  ok(map[here].dataset.here === 'true' && within(map[here]).getByText('You').title === 'You (Chest)', 'your room is marked, and "You" names your form');
  ok(map[next].dataset.inRange === 'true', 'a room next door is in lure range');
  ok(!map[here].dataset.inRange && !map[far].dataset.inRange, '…but not your own room, nor one two rooms away');

  // ---------- who's where ----------
  const at = cells(s.show(RoomMap, {
    location: manor, mimicRoom: here, lureRange: 1,
    adventurers: [
      adv('Mimic Hunter', 'Warrior', next, { isAttracted: true }),
      adv('Monk', 'Cleric', far),
      adv('Werewolf', 'Monster', far, { costume: 'Werewolf' }),
    ],
    creatures: [{ uid: 'c1', name: 'Estate Cat', location: here }],
    remains: [{ id: 'f', name: 'Frail Scholar', location: far }, { id: 'r', name: 'Cave Painter', location: next, isRoasted: true }],
    rivals: [
      { id: 'r1', kind: 'lone', room: next, revealed: true, consumed: false, disguise: { name: 'Barrel', icon: '🛢️' } },
      { id: 'r2', kind: 'lone', room: far, revealed: false, consumed: false, disguise: { name: 'Crate', icon: '📦' } },
    ],
    distracted: [next],
    markers: [{ room: far, icon: '🌠', title: 'A fallen star fragment' }],
  }).container);
  const hunter = within(at[next]).getByTitle('Mimic Hunter (Warrior) — attracted');
  ok(hunter.textContent === 'MH', 'an adventurer shows initials, and the tooltip says who and that they are attracted');
  ok(hunter.dataset.attracted === 'true' && hunter.dataset.type === 'Warrior', '…flagged for styling by type and attraction');
  ok(within(at[far]).getByTitle('Monk (Cleric)').textContent === 'Mo', 'a one-word name shows its first two letters');
  const masked = within(at[far]).getByTitle('Someone dressed as a Werewolf');
  ok(masked && !masked.dataset.type, 'a costume hides who it is, even from the styling');
  ok(within(at[here]).getByTitle('Estate Cat').textContent === m.creatureEmoji('Estate Cat'), 'small creatures show as their emoji');
  ok(within(at[far]).getByTitle('Frail Scholar, frozen solid').textContent === '🧊', 'a frozen adventurer is still on the map, as ice');
  ok(within(at[next]).getByTitle('Cave Painter, roasted in the eruption').textContent === '🍖', '…and a roasted one, as a roast');
  ok(titles(at[next]).some((t) => t.includes('posing as a Barrel')), 'an exposed rival shows its disguise');
  ok(!at[far].textContent.includes('📦') && !titles(at[far]).some((t) => t.includes('Crate')), '…a hidden one does not show at all');
  ok(at[next].dataset.distracted === 'true' && !at[here].dataset.distracted, 'rooms under the fireworks are flagged (they glow)');
  ok(within(at[far]).getByTitle('A fallen star fragment').textContent === '🌠', 'markers (a fallen star) appear in their room');

  // ---------- a place nobody has mapped ----------
  const { container: fog } = s.show(MysteryMap, {});
  ok(screen.getByRole('img', { name: 'Unmapped. Hunt here to learn its rooms.' }) && !manor.rooms.some((r) => fog.textContent.includes(r)),
    'an unmapped location shows a fogged plan with no room names');
}
