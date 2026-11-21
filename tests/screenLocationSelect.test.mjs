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
    const manorCard = screen.getByRole('button', { name: loc('manor').name, description: (d) => d.includes(loc('manor').description) && d.includes(`${loc('manor').partySize[0]}–${loc('manor').partySize[1]} adventurers`) });
    ok(manorCard === cardOf('manor') && !manorCard.getAttribute('aria-describedby').split(' ').some((part) => document.getElementById(part)?.textContent.includes(loc('manor').flavorText)),
      'screen readers hear its name, then what it is and how many adventurers (not the whole card)');
    cardOf('manor').focus();
    await user.tab();
    ok(document.activeElement === screen.getByRole('button', { name: `Hide ${loc('manor').name}` }), '…Tab reaches its hide button…');
    await user.tab();
    await user.keyboard('{Enter}');
    ok(keyed.onChoose.calls.length === 1 && keyed.onChoose.calls[0][0].id === offered()[1], '…then the next ground, and Enter chooses it');

    // ---------- hiding grounds you aren't interested in ----------
    choose(mimic());
    const before = offered();
    await user.click(screen.getByRole('button', { name: `Hide ${loc('manor').name}` }));
    ok(!offered().includes('manor') && offered().length === before.length - 1, 'hiding a ground takes its card out of the list');
    ok(screen.getByRole('button', { name: `Show ${loc('manor').name}` }) && has('Hidden:'), '…to a "Hidden" row, by name');
    ok(JSON.parse(storage.get('locations.hidden')).includes('manor'), '…and it stays hidden (remembered in this browser)');
    choose(mimic({ name: 'Another' }));
    ok(!offered().includes('manor'), '…for every mimic');
    await user.click(screen.getByRole('button', { name: `Show ${loc('manor').name}` }));
    ok(offered().join() === before.join() && !has('Hidden:'), 'clicking it brings it back, in its place');
    storage.set('locations.hidden', 'not json');
    choose(mimic());
    ok(offered().join() === before.join(), 'a garbled setting just shows everything');
    storage.delete('locations.hidden');
    choose(mimic({ tier: 'Grand', mass: 60 }));
    ok(!has('Wilderness territories unlock') && offered().includes('hidden_grove'), 'at Grand: the wilderness is open');

    // ---------- the Tear in Time ----------
    choose(mimic({ tier: 'Apex', mass: 60, timeTearCounter: 49 }));
    ok(!offered().includes('tear_in_time') && !document.getElementById('tear-rip'), 'not yet earned: no Tear, not even its filter');
    choose(mimic({ tier: 'Apex', mass: 60, timeTearCounter: 50 }));
    ok(offered()[0] === 'tear_in_time' && cardOf('tear_in_time').classList.contains('tear-card'), 'once earned: the Tear comes first, with its own torn, glowing card');
    ok(document.getElementById('tear-rip')?.tagName === 'filter', '…and the filter that tears its edge');
    ok(cardOf('tear_in_time').textContent.includes('step through and you become Primordial. The other paths close behind you'), '…warning that going through is a choice for good');
    choose(mimic({ tier: 'Apex', mass: 60, branchTier: 'Primordial' }));
    ok(offered()[0] === 'tear_in_time' && cardOf('tear_in_time').textContent.includes('where it all began'), 'a Primordial mimic: always open, its own ground');
    choose(mimic({ tier: 'Apex', mass: 60, timeTearCounter: 50, branchTier: 'Eternal' }));
    ok(!offered().includes('tear_in_time'), 'an Eternal one never sees it');
    ok(offered()[0] === 'the_long_after' && cardOf('the_long_after').classList.contains('ruin-card') && cardOf('the_long_after').textContent.includes('where everything ends up'),
      '…it has the Long After instead: its own overgrown card, and its own words');
    ok(!document.getElementById('tear-rip'), '…(no torn edge: that\'s the Tear\'s)');

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
    ok(screen.getByRole('button', { name: loc('manor').name, description: (d) => d.startsWith('🔥 Discovered') }), '…and screen readers hear that first');

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
  ok(screen.getByRole('button', { name: manor.rooms[0], description: `Adjacent: ${m.getAdjacentRooms(manor, manor.rooms[0]).join(', ')}` }),
    'a room is heard by its name, then the rooms next to it');
  await user.click(screen.getByRole('button', { name: '← Back to location select' }));
  ok(handlers.onBack.calls.length === 1, 'Back returns to the grounds');
  const ruin = loc('the_long_after');
  s.showInHunt(RoomSelect, { onConfirm: spy(), onBack: spy() }, s.huntState(mimic({ tier: 'Apex', mass: 60, branchTier: 'Eternal' }), null, { location: ruin }));
  const startable = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent).sort();
  ok(startable.join() === ['Barracks', 'Derelict Shrine', 'Jungle Camp', 'Toppled Arch'].sort().join(), 'the Long After: you can only start in a room the dig has already opened');
  ok(screen.getByRole('heading', { name: 'Jungle Camp' }).nextElementSibling.textContent === 'Adjacent: Barracks, Derelict Shrine, Toppled Arch', '…and the sealed ones aren\'t next door to anything yet');
}
