// Room modifiers: keyed by location, variant overrides, and only for forms that can be worn there.
export default async function ({ gameData: m, ok, log }) {
  const { ROOM_FORM_MODIFIERS: MODS, LOCATIONS, ALL_FORMS, TIER_ORDER } = m;
  const mod = (form, loc, room) => m.getRoomContextMod(form, loc, room);

  // Same room name, different locations
  ok(mod('giant_throne', 'giants_castle', 'Great Hall').plausibility === 2 && mod('giant_throne', 'abandoned_castle', 'Great Hall').plausibility === -2,
    'a Giant Throne suits the Giant\'s Castle Great Hall but not the Abandoned Castle\'s');
  ok(mod('giant_throne', 'abandoned_castle', 'Dungeon').plausibility === -2, 'a throne in the Abandoned Castle dungeon is suspicious');

  // Variant-only modifiers override the base form
  ok(mod('grand_antler_chandelier', 'haunted_inn', 'Common Room').plausibility === 1 && mod('grand_chandelier', 'haunted_inn', 'Common Room').plausibility === -1,
    'at the inn, the Antler Chandelier fits and the crystal Chandelier does not');
  ok(mod('greater_gargoyle', 'hidden_grove', 'Ancient Altar').plausibility === 1, 'a variant with no entry of its own uses its base form\'s');

  // Every room exists in its location, and every form could actually be worn there
  let problems = 0;
  let count = 0;
  for (const [locId, rooms] of Object.entries(MODS)) {
    const loc = LOCATIONS.find((l) => l.id === locId);
    if (!loc) { ok(false, `unknown location ${locId}`); problems++; continue; }
    const minIdx = TIER_ORDER.indexOf(loc.minTier);
    for (const [room, forms] of Object.entries(rooms)) {
      if (!loc.rooms.includes(room)) { ok(false, `${loc.name} has no room "${room}"`); problems++; }
      for (const formId of Object.keys(forms)) {
        count++;
        const form = ALL_FORMS.find((f) => f.id === formId);
        // Wearable if some tier the mimic can have here is within one tier of the form's. Thimblewood
        // shrinks a mimic one tier, so the lowest reachable form tier is two below the location's minimum.
        if (!form || TIER_ORDER.indexOf(form.tier) < minIdx - 2) { ok(false, `${loc.name} / ${room}: ${form?.name ?? formId} can never be worn here`); problems++; }
      }
    }
  }
  ok(problems === 0, `all ${count} room modifiers name real rooms and wearable forms`);
  const covered = Object.keys(MODS).length;
  ok(covered === LOCATIONS.length, `every location has room modifiers (${covered}/${LOCATIONS.length})`);
  log(LOCATIONS.filter((l) => !MODS[l.id]).map((l) => l.name).join(', ') || 'all covered');

  // Thimblewood makes a Throne reachable in the Apex-only Abandoned Castle (an Apex mimic shrinks to Grand)
  ok(m.getValidForms(m.formTier({ tier: 'Apex', currentAppearance: { primaryMaterials: ['Thimblewood'] } }), 35).some((f) => f.id === 'greater_throne'),
    'a shrunk Apex mimic can wear a Throne, so the Abandoned Castle dungeon Throne modifier can apply');

  // Among hundreds of candles, a Candlestick hides well but draws no one in
  const candle = m.getRoomContextMod('minor_candlestick', 'hollow_reliquary', 'Candle Gallery');
  ok(candle.plausibility === 2 && candle.allure === -1, 'a Candlestick in the Candle Gallery: +2 plausibility, −1 allure');
}
