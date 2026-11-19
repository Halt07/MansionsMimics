// The party card (src/components/game/hunt/PartyCard.tsx), rendered from real hunts: the list
// of who's where and in what state, or the room map, whichever the mimic last chose.
import { screen, mimic, text, roomCells, attrs } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await screen(load);
  const { default: PartyCard } = await load('/src/components/game/hunt/PartyCard.tsx');
  const opts = { random: () => 0.5, now: new Date('2026-05-15T12:00:00Z') };
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const card = (character, hunt) => s.inHunt(PartyCard, { onToggle() {} }, s.huntState(character, hunt));
  const patch = (hunt, i, over) => ({ ...hunt, party: hunt.party.map((a, j) => (j === i ? { ...a, ...over } : a)) });

  const manor = loc('manor');
  const { hunt } = m.beginHunt(mimic(), manor, manor.rooms[0], opts);
  const [first, second] = hunt.party;

  // ---------- the list ----------
  const listed = card(mimic({ sidebarView: 'party' }), hunt);
  ok(text(listed).includes(`Party (${hunt.party.length} active / 0 consumed)`), 'the list is headed with how many are active and eaten');
  ok(hunt.party.every((a) => text(listed).includes(a.name)), 'everyone in the party is listed');
  const dist = m.getRoomDistance(manor, hunt.mimicRoom, first.location);
  ok(text(listed).includes(`${first.location} (${dist})`), "each shows the room they're in and how far it is");
  ok(listed.includes('aria-label="Show the room map"'), 'clicking the list switches to the map');

  const eaten = patch(patch(hunt, 0, { isAlive: false, isConsumed: true }), 1, { isAttracted: true, hitsTaken: 1, constitution: 3 });
  const after = text(card(mimic({ sidebarView: 'party' }), eaten));
  ok(after.includes(`Party (${hunt.party.length - 1} active / 1 consumed)`), '…and the counts follow the meals');
  ok(after.includes(`${first.name} Consumed`), 'an eaten adventurer is marked Consumed');
  ok(after.includes('Attracted') && after.includes('2/3hp'), 'a lured, bitten one shows Attracted and what health is left');

  const gone = text(card(mimic({ sidebarView: 'party' }), patch(patch(hunt, 0, { isAlive: false, fled: true }), 1, { isAlive: false, isDisappeared: true })));
  ok(gone.includes(`${first.name} Fled`) && gone.includes(`${second.name} Disappeared`), 'fled and vanished adventurers say so');

  // ---------- the header above it: who's left, and how far the lure reaches ----------
  const { default: HuntHeader } = await load('/src/components/game/hunt/HuntHeader.tsx');
  const header = (character, h) => text(s.inHunt(HuntHeader, { canLeave: true, onNewHunt() {}, onToggleForms() {}, onToggleAppearance() {} }, s.huntState(character, h)));
  ok(header(mimic(), hunt).includes(`${hunt.party.length} adventurers remain`), 'the header counts the adventurers left');
  const lastOne = { ...hunt, party: hunt.party.map((a, i) => (i === 0 ? a : { ...a, isAlive: false, isConsumed: true })) };
  ok(header(mimic(), lastOne).includes('1 adventurer remains'), '…down to the last one (singular)');
  ok(header(mimic({ baseAllure: 3 }), hunt).includes('Lure range: 1 room') && !header(mimic({ baseAllure: 3 }), hunt).includes('1 rooms'), 'lure range 1: "1 room"');
  ok(header(mimic({ baseAllure: 5 }), hunt).includes('Lure range: 2 rooms'), 'lure range 2: "2 rooms"');

  // ---------- the map ----------
  const mapped = card(mimic({ sidebarView: 'map' }), hunt);
  ok(text(mapped).includes(`${manor.name} (${hunt.party.length} active / 0 consumed)`), 'the map is headed with the location');
  ok(Object.keys(roomCells(mapped)).length === manor.rooms.length, '…and shows the whole floor plan');
  ok(attrs(mapped, 'title').includes('You (Chest)'), '…with you in it, in your form');
  ok(mapped.includes('aria-label="Show the party list"'), 'clicking the map switches to the list');

  // ---------- the Snowbound Lodge: warmth and the frozen ----------
  const lodge = loc('snowbound_lodge');
  const snowed = m.beginHunt(mimic(), lodge, lodge.rooms[0], opts).hunt;
  const cold = text(card(mimic({ sidebarView: 'party' }), snowed));
  ok(snowed.party.every((a) => cold.includes(`❄️ ${a.warmth}`)), 'snowed in, each adventurer shows their warmth');
  const iced = patch(snowed, 0, { isAlive: false, isFrozen: true, warmth: 0 });
  ok(text(card(mimic({ sidebarView: 'party' }), iced)).includes(`🧊 Frozen · ${snowed.party[0].location}`), 'a frozen one shows where they froze');
  ok(attrs(card(mimic({ sidebarView: 'map' }), iced), 'title').includes(`${snowed.party[0].name}, frozen solid`), '…and stays on the map as ice');

  // ---------- Spell or Sweet Street: costumes ----------
  const street = loc('spell_or_sweet_street');
  const masked = m.beginHunt(mimic(), street, street.rooms[0], opts).hunt;
  const guest = masked.party.find((a) => a.costume && a.trueName && a.trueName !== a.costume);
  if (guest) {
    const i = masked.party.indexOf(guest);
    const before = text(card(mimic({ sidebarView: 'party' }), masked));
    ok(before.includes(guest.costume) && !before.includes(guest.trueName), 'in costume, only the costume is shown');
    const unmasked = text(card(mimic({ sidebarView: 'party' }), patch(masked, i, { isAlive: false, isConsumed: true })));
    ok(unmasked.includes(`${guest.trueName} (the ${guest.costume})`), 'eaten, you learn who was under it');
  } else {
    ok(false, 'the street party has someone in costume');
  }
  const real = masked.party.findIndex((a) => a.costume);
  const wolf = patch(masked, real, { trueName: masked.party[real].costume, name: masked.party[real].costume, isAlive: false, isConsumed: true });
  ok(text(card(mimic({ sidebarView: 'party' }), wolf)).includes(`${masked.party[real].costume} (a real one!)`), 'a costume that was the real thing says so');
}
