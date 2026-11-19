// Choosing where to hunt (src/components/game/hunt/LocationSelect.tsx), rendered: which grounds
// are offered on a given day, and what each card says (seasons, rare grounds, burns). The date is
// pinned as the dev build's mm.debugDate does, so the seasonal grounds don't depend on today.
import { screen, mimic, onDate, text, count } from './screen.mjs';

export default async function ({ gameData: m, load, storage, ok }) {
  const s = await screen(load);
  const { LocationSelect, RoomSelect } = await load('/src/components/game/hunt/LocationSelect.tsx');
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const offered = (character) => s.inHunt(LocationSelect, { onChoose() {}, onChooseForms() {} }, s.huntState(character, null));
  // The grounds offered, in the order their cards appear
  const names = (html) => {
    const shown = text(html);
    return m.LOCATIONS.filter((l) => shown.includes(l.name)).sort((a, b) => shown.indexOf(a.name) - shown.indexOf(b.name)).map((l) => l.id);
  };

  try {
    // ---------- an ordinary day ----------
    onDate(storage, '5-15');
    const lesser = offered(mimic());
    const expected = m.LOCATIONS.filter((l) => !l.holiday && !l.rare && m.meetsLocationRequirements(l, 'Lesser', 6)).map((l) => l.id);
    ok(expected.length > 0 && expected.every((id) => names(lesser).includes(id)), 'a Lesser mimic is offered every ground its size allows');
    ok(!names(lesser).includes('hidden_grove') && !names(lesser).some((id) => loc(id).holiday || loc(id).rare), '…and nothing bigger, seasonal or rare');
    ok(text(lesser).includes('Wilderness territories unlock at Grand tier and beyond.'), 'below Grand: a hint that the wilderness comes later');
    ok(!text(offered(mimic({ tier: 'Grand', mass: 60 }))).includes('Wilderness territories unlock'), '…not at Grand');
    ok(text(lesser).includes(`${loc('manor').partySize[0]}–${loc('manor').partySize[1]} adventurers`), 'each card shows the party size');

    // ---------- a rare ground ----------
    const withRare = offered(mimic({ tier: 'Standard', mass: 12, rareLocation: { id: 'hollow_reliquary', huntsLeft: 2 } }));
    ok(names(withRare)[0] === 'hollow_reliquary', 'an open rare ground comes first');
    ok(text(withRare).includes('✦ Rare · leaves after 2 more hunts elsewhere'), '…saying how long it stays');
    ok(text(offered(mimic({ tier: 'Standard', mass: 12, rareLocation: { id: 'hollow_reliquary', huntsLeft: 1 } }))).includes('leaves after 1 more hunt elsewhere'), '…in the singular too');

    // ---------- a burned ground ----------
    const burned = offered(mimic({ burnedLocations: [{ id: 'manor', huntsLeft: 2 }] }));
    ok(text(burned).includes(`🔥 Discovered · +${m.BURN_SUSPICION} starting suspicion lingers for 2 more hunts`), 'a burned ground says so, and for how long');
    ok(count(burned, '🔥 Discovered') === 1, '…only that one');

    // ---------- All Hallows' Eve ----------
    onDate(storage, '10-31');
    const halloween = offered(mimic());
    ok(names(halloween)[0] === 'spell_or_sweet_street', 'in season, the seasonal ground comes first');
    ok(text(halloween).includes(`${m.HOLIDAYS.halloween.icon} ${m.HOLIDAYS.halloween.name} · open to all until ${m.seasonEnd('halloween')}`), '…open to all, until the season ends');
    ok(text(halloween).includes("you could take the shape of a Jack-o'-Lantern or a Haunted Tree. Choose forms →"), "the season's new shapes are suggested");
    const carrying = mimic({ forms: [{ formId: 'lesser_chest', name: 'Chest', tier: 'Lesser', learned: true }, ...m.SEASONAL_FORMS
      .filter((f) => f.holiday === 'halloween' && f.holidayTiers.includes('Lesser')).map((f) => ({ formId: f.id, name: f.name, tier: 'Lesser', learned: true }))] });
    ok(!text(offered(carrying)).includes('you could take the shape of'), '…unless the mimic already carries them');
  } finally {
    onDate(storage, null);
  }

  // ---------- then the room ----------
  const manor = loc('manor');
  const rooms = s.inHunt(RoomSelect, { onConfirm() {}, onBack() {} }, s.huntState(mimic(), null, { location: manor }));
  ok(manor.rooms.every((r) => text(rooms).includes(`${r} Adjacent: ${m.getAdjacentRooms(manor, r).join(', ')}`)), 'choosing a room: each one, with its neighbours');
}
