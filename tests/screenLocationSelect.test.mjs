// Choosing where to hunt (src/components/game/hunt/LocationSelect.tsx), with React Testing
// Library: which grounds are offered on a given day, what each card says (seasons, rare grounds,
// burns), and what clicking a ground, the seasonal hint, or a room hands back. The date is pinned
// as the dev build's mm.debugDate does, so the seasonal grounds don't depend on today.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic, onDate } from './screen.mjs';

export default async function ({ gameData: m, load, storage, ok }) {
  const s = await setup(load);
  const { LocationSelect, RoomSelect } = await load('/src/components/game/hunt/LocationSelect.tsx');
  const user = userEvent.setup();
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const choose = (character) => {
    const handlers = { onChoose: spy(), onChooseForms: spy() };
    s.showInHunt(LocationSelect, handlers, s.huntState(character, null));
    return handlers;
  };
  // The grounds offered, in the order their cards appear
  const offered = () => screen.getAllByRole('heading', { level: 3 }).map((h) => m.LOCATIONS.find((l) => l.name === h.textContent)?.id);
  // A ground's card (every Card is .rounded-xl)
  const cardOf = (id) => screen.getByRole('heading', { level: 3, name: loc(id).name }).closest('.rounded-xl');

  try {
    // ---------- an ordinary day ----------
    onDate(storage, '5-15');
    const lesser = choose(mimic());
    const expected = m.LOCATIONS.filter((l) => !l.holiday && !l.rare && m.meetsLocationRequirements(l, 'Lesser', 6)).map((l) => l.id);
    ok(expected.length > 0 && offered().join() === expected.join(), 'a Lesser mimic is offered every ground its size allows, and nothing bigger, seasonal or rare');
    ok(has('Wilderness territories unlock at Grand tier and beyond.'), 'below Grand: a hint that the wilderness comes later');
    ok(cardOf('manor').textContent.includes(`${loc('manor').partySize[0]}–${loc('manor').partySize[1]} adventurers`), 'each card shows the party size');
    await user.click(screen.getByRole('heading', { name: loc('manor').name }));
    ok(lesser.onChoose.calls.length === 1 && lesser.onChoose.calls[0][0].id === 'manor', 'clicking a ground chooses it');
    const keyed = choose(mimic());
    ok(cardOf('manor').getAttribute('role') === 'button' && cardOf('manor').tabIndex === 0, 'each ground is a button that the keyboard can reach');
    cardOf('manor').focus();
    await user.tab();
    await user.keyboard('{Enter}');
    ok(keyed.onChoose.calls.length === 1 && keyed.onChoose.calls[0][0].id === offered()[1], '…Tab moves to the next, and Enter chooses it');
    choose(mimic({ tier: 'Grand', mass: 60 }));
    ok(!has('Wilderness territories unlock') && offered().includes('hidden_grove'), 'at Grand: the wilderness is open');

    // ---------- a rare ground ----------
    choose(mimic({ tier: 'Standard', mass: 12, rareLocation: { id: 'hollow_reliquary', huntsLeft: 2 } }));
    ok(offered()[0] === 'hollow_reliquary', 'an open rare ground comes first');
    ok(has('✦ Rare · leaves after 2 more hunts elsewhere'), '…saying how long it stays');
    choose(mimic({ tier: 'Standard', mass: 12, rareLocation: { id: 'hollow_reliquary', huntsLeft: 1 } }));
    ok(has('leaves after 1 more hunt elsewhere'), '…in the singular too');

    // ---------- a burned ground ----------
    choose(mimic({ burnedLocations: [{ id: 'manor', huntsLeft: 2 }] }));
    ok(cardOf('manor').textContent.includes(`🔥 Discovered · +${m.BURN_SUSPICION} starting suspicion`) && cardOf('manor').textContent.includes('lingers for 2 more hunts'), 'a burned ground says so, and for how long');
    ok(screen.getAllByText('🔥 Discovered', { exact: false }).length === 1, '…only that one');

    // ---------- All Hallows' Eve ----------
    onDate(storage, '10-31');
    const halloween = choose(mimic());
    ok(offered()[0] === 'spell_or_sweet_street', 'in season, the seasonal ground comes first');
    ok(has(`${m.HOLIDAYS.halloween.icon} ${m.HOLIDAYS.halloween.name} · open to all until ${m.seasonEnd('halloween')}`), '…open to all, until the season ends');
    const hint = screen.getByRole('button', { name: /you could take the shape of/ });
    ok(hint.textContent.includes("a Jack-o'-Lantern or a Haunted Tree. Choose forms →"), "the season's new shapes are suggested");
    await user.click(hint);
    ok(halloween.onChooseForms.calls.length === 1 && halloween.onChoose.calls.length === 0, '…and clicking the suggestion goes to choosing forms');
    const carrying = mimic({ forms: [{ formId: 'lesser_chest', name: 'Chest', tier: 'Lesser', learned: true }, ...m.SEASONAL_FORMS
      .filter((f) => f.holiday === 'halloween' && f.holidayTiers.includes('Lesser')).map((f) => ({ formId: f.id, name: f.name, tier: 'Lesser', learned: true }))] });
    choose(carrying);
    ok(!has('you could take the shape of'), '…unless the mimic already carries them');
  } finally {
    onDate(storage, null);
  }

  // ---------- then the room ----------
  const manor = loc('manor');
  const handlers = { onConfirm: spy(), onBack: spy() };
  s.showInHunt(RoomSelect, handlers, s.huntState(mimic(), null, { location: manor }));
  ok(manor.rooms.every((r) => screen.getByRole('heading', { name: r }).nextElementSibling.textContent === `Adjacent: ${m.getAdjacentRooms(manor, r).join(', ')}`), 'choosing a room: each one, with its neighbours');
  await user.click(screen.getByRole('heading', { name: manor.rooms[1] }));
  ok(handlers.onConfirm.calls.length === 1 && handlers.onConfirm.calls[0][0] === manor.rooms[1] && handlers.onConfirm.calls[0][1].id === 'manor', 'clicking a room starts the hunt there');
  const roomCard = screen.getByRole('heading', { name: manor.rooms[2] }).closest('.rounded-xl');
  roomCard.focus();
  await user.keyboard(' ');
  ok(handlers.onConfirm.calls.length === 2 && handlers.onConfirm.calls[1][0] === manor.rooms[2], '…or by keyboard: Space on a room starts there');
  await user.click(screen.getByRole('button', { name: '← Back to location select' }));
  ok(handlers.onBack.calls.length === 1, 'Back returns to the grounds');
}
