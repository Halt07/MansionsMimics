// The party card (src/components/game/hunt/PartyCard.tsx), from real hunts with React Testing
// Library: the list of who's where and in what state, or the room map, whichever the mimic last
// chose, and switching between them by click or keyboard.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: PartyCard } = await load('/src/components/game/hunt/PartyCard.tsx');
  const user = userEvent.setup();
  const opts = { random: () => 0.5, now: new Date('2026-05-15T12:00:00Z') };
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const show = (view, hunt, onToggle = spy()) => s.showInHunt(PartyCard, { onToggle }, s.huntState(mimic({ sidebarView: view }), hunt)).container;
  const patch = (hunt, i, over) => ({ ...hunt, party: hunt.party.map((a, j) => (j === i ? { ...a, ...over } : a)) });
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  // One adventurer's line in the list: their name, then their state and room
  const row = (name) => screen.getByText(name, { exact: true }).parentElement;
  const says = (name, t) => within(row(name)).queryAllByText(t, { exact: false }).length > 0;

  const manor = loc('manor');
  const { hunt } = m.beginHunt(mimic(), manor, manor.rooms[0], opts);
  const [first, second] = hunt.party;

  // ---------- the list ----------
  show('party', hunt);
  ok(has(`Party (${hunt.party.length} active / 0 consumed)`), 'the list is headed with how many are active and eaten');
  ok(hunt.party.every((a) => row(a.name)), 'everyone in the party is listed');
  const dist = m.getRoomDistance(manor, hunt.mimicRoom, first.location);
  ok(row(first.name).textContent.endsWith(`${first.location} (${dist})`), "each shows the room they're in and how far it is");

  show('party', patch(patch(hunt, 0, { isAlive: false, isConsumed: true }), 1, { isAttracted: true, hitsTaken: 1, constitution: 3 }));
  ok(has(`Party (${hunt.party.length - 1} active / 1 consumed)`), '…and the counts follow the meals');
  ok(says(first.name, 'Consumed') && !row(first.name).textContent.includes(`(${dist})`), 'an eaten adventurer is marked Consumed (and no longer has a distance)');
  ok(says(second.name, 'Attracted') && says(second.name, '2/3hp'), 'a lured, bitten one shows Attracted and what health is left');

  show('party', patch(patch(hunt, 0, { isAlive: false, fled: true }), 1, { isAlive: false, isDisappeared: true }));
  ok(says(first.name, 'Fled') && says(second.name, 'Disappeared'), 'fled and vanished adventurers say so');

  // ---------- switching views ----------
  const onToggle = spy();
  show('party', hunt, onToggle);
  const card = screen.getByRole('button', { name: 'Show the room map' });
  await user.click(card);
  ok(onToggle.calls.length === 1, 'clicking the list asks for the map');
  card.focus();
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  ok(onToggle.calls.length === 3, '…so do Enter and Space, with it focused');

  // ---------- the map ----------
  const mapped = show('map', hunt);
  ok(has(`(${hunt.party.length} active / 0 consumed)`) && screen.getByText(manor.name, { exact: false }), 'the map is headed with the location');
  ok(mapped.querySelectorAll('.room-cell').length === manor.rooms.length, '…and shows the whole floor plan');
  ok(screen.getByTitle('You (Chest)'), '…with you in it, in your form');
  ok(screen.getByRole('button', { name: 'Show the party list' }), 'clicking the map switches to the list');

  // ---------- the Snowbound Lodge: warmth and the frozen ----------
  const lodge = loc('snowbound_lodge');
  const snowed = m.beginHunt(mimic(), lodge, lodge.rooms[0], opts).hunt;
  show('party', snowed);
  ok(snowed.party.every((a) => says(a.name, `❄️ ${a.warmth}`)), 'snowed in, each adventurer shows their warmth');
  const iced = patch(snowed, 0, { isAlive: false, isFrozen: true, warmth: 0 });
  show('party', iced);
  ok(says(snowed.party[0].name, `🧊 Frozen · ${snowed.party[0].location}`), 'a frozen one shows where they froze');
  show('map', iced);
  ok(screen.getByTitle(`${snowed.party[0].name}, frozen solid`), '…and stays on the map as ice');

  // ---------- Spell or Sweet Street: costumes ----------
  const street = loc('spell_or_sweet_street');
  const masked = m.beginHunt(mimic(), street, street.rooms[0], opts).hunt;
  const guest = masked.party.find((a) => a.costume && a.trueName && a.trueName !== a.costume);
  ok(!!guest, 'the street party has someone in costume');
  if (guest) {
    show('party', masked);
    ok(row(guest.costume) && !has(guest.trueName), 'in costume, only the costume is shown');
    show('party', patch(masked, masked.party.indexOf(guest), { isAlive: false, isConsumed: true }));
    ok(has(`${guest.trueName} (the ${guest.costume})`), 'eaten, you learn who was under it');
  }
  const real = masked.party.findIndex((a) => a.costume);
  show('party', patch(masked, real, { trueName: masked.party[real].costume, name: masked.party[real].costume, isAlive: false, isConsumed: true }));
  ok(has(`${masked.party[real].costume} (a real one!)`), 'a costume that was the real thing says so');
}
