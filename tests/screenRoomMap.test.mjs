// The room map (src/components/game/RoomMap.tsx), rendered: where everyone is drawn, what the
// tooltips say, and which rooms are flagged for styling (in lure range, under the fireworks).
import { setup, roomCells, attrs, count, text } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: RoomMap, MysteryMap } = await load('/src/components/game/RoomMap.tsx');
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  const here = manor.rooms[0];
  const next = m.getAdjacentRooms(manor, here)[0];
  const far = manor.rooms.find((r) => m.getRoomDistance(manor, here, r) >= 2);
  const adv = (name, type, room, over = {}) => ({ id: name, name, type, location: room, isAlive: true, isConsumed: false, isAttracted: false, ...over });

  // ---------- the floor plan ----------
  const bare = s.markup(RoomMap, { location: manor });
  const bareCells = roomCells(bare);
  ok(Object.keys(bareCells).length === manor.rooms.length && manor.rooms.every((r) => bareCells[r]), 'one cell per room, each labelled');
  ok(count(bare, 'occupant-you') === 0 && !bare.includes('data-in-range'), 'a bare plan (the Codex) has no mimic and no lure range');

  // ---------- you, and your lure range ----------
  const map = s.markup(RoomMap, { location: manor, mimicRoom: here, lureRange: 1, formName: 'Chest' });
  const cells = roomCells(map);
  ok(cells[here].tag.includes('data-here="true"') && attrs(cells[here].html, 'title').includes('You (Chest)'), 'your room is marked, and "You" names your form');
  ok(cells[next].tag.includes('data-in-range="true"'), 'a room next door is in lure range');
  ok(!cells[here].tag.includes('data-in-range') && !cells[far].tag.includes('data-in-range'), '…but not your own room, nor one two rooms away');

  // ---------- who's where ----------
  const busy = s.markup(RoomMap, {
    location: manor, mimicRoom: here, lureRange: 1,
    adventurers: [
      adv('Mimic Hunter', 'Warrior', next, { isAttracted: true }),
      adv('Monk', 'Cleric', far),
      adv('Werewolf', 'Monster', far, { costume: 'Werewolf' }),
    ],
    creatures: [{ uid: 'c1', name: 'Estate Cat', location: here }],
    frozen: [{ id: 'f', name: 'Frail Scholar', location: far }],
    rivals: [
      { id: 'r1', kind: 'lone', room: next, revealed: true, consumed: false, disguise: { name: 'Barrel', icon: '🛢️' } },
      { id: 'r2', kind: 'lone', room: far, revealed: false, consumed: false, disguise: { name: 'Crate', icon: '📦' } },
    ],
    distracted: [next],
    markers: [{ room: far, icon: '🌠', title: 'A fallen star fragment' }],
  });
  const at = roomCells(busy);
  ok(text(at[next].html).includes('MH') && attrs(at[next].html, 'title').includes('Mimic Hunter (Warrior) — attracted'), 'an adventurer shows initials, and the tooltip says who and that they are attracted');
  ok(at[next].html.includes('data-attracted="true"') && at[next].html.includes('data-type="Warrior"'), '…flagged for styling by type and attraction');
  ok(text(at[far].html).includes('Mo'), 'a one-word name shows its first two letters');
  ok(attrs(at[far].html, 'title').includes('Someone dressed as a Werewolf') && !/data-type="Monster"/.test(at[far].html), 'a costume hides who it is, even from the styling');
  ok(attrs(at[here].html, 'title').includes('Estate Cat') && at[here].html.includes(m.creatureEmoji('Estate Cat')), 'small creatures show as their emoji');
  ok(attrs(at[far].html, 'title').includes('Frail Scholar, frozen solid'), 'a frozen adventurer is still on the map, as ice');
  ok(attrs(at[next].html, 'title').some((t) => t.includes('posing as a Barrel')), 'an exposed rival shows its disguise');
  ok(!at[far].html.includes('📦'), '…a hidden one does not show at all');
  ok(at[next].tag.includes('data-distracted="true"') && !at[here].tag.includes('data-distracted'), 'rooms under the fireworks are flagged (they glow)');
  ok(attrs(at[far].html, 'title').includes('A fallen star fragment'), 'markers (a fallen star) appear in their room');

  // ---------- a place nobody has mapped ----------
  const fog = s.markup(MysteryMap, {});
  ok(fog.includes('role="img"') && text(fog).includes('Unmapped. Hunt here to learn its rooms.') && !manor.rooms.some((r) => fog.includes(r)),
    'an unmapped location shows a fogged plan with no room names');
}
