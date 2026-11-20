// Seasonal forms: offered only in their holiday's window, only to their tiers, and always
// counted as the mimic's own tier.
export default async function ({ gameData: m, ok, log }) {
  const day = (month, d) => new Date(2026, month - 1, d);
  const byId = (id) => m.ALL_FORMS.find((f) => f.id === id);
  const names = (forms) => forms.map((f) => f.name);
  const has = (forms, id) => forms.some((f) => f.id === id);

  // ── Date windows (inclusive, local time) ──
  ok(m.isInSeason('halloween', day(10, 3)) && m.isInSeason('halloween', day(11, 1)), 'All Hallows\' Eve runs Oct 3 through Nov 1');
  ok(!m.isInSeason('halloween', day(10, 2)) && !m.isInSeason('halloween', day(11, 2)), '…and not a day either side');
  ok(m.isInSeason('christmas', day(12, 10)) && m.isInSeason('christmas', day(12, 30)), 'Midwinter runs Dec 10 through Dec 30');
  // Lunar New Year moves (Jan 21 – Feb 20), so its season covers every date it can fall on (see DECISIONS.md)
  ok(m.isInSeason('lunar_new_year', day(1, 21)) && m.isInSeason('lunar_new_year', day(2, 20)), 'the Lantern Festival runs Jan 21 through Feb 20');
  ok(!m.isInSeason('lunar_new_year', day(1, 20)) && !m.isInSeason('lunar_new_year', day(2, 21)), '…and not a day either side');
  const newYears = [[2026, 2, 17], [2027, 2, 6], [2028, 1, 26], [2029, 2, 13], [2030, 2, 3], [2031, 1, 23], [2033, 1, 31]];
  ok(newYears.every(([y, mo, d]) => m.isInSeason('lunar_new_year', new Date(y, mo - 1, d))), '…so it always includes Lunar New Year (2026 to 2033, early and late)');
  ok(!m.isInSeason('christmas', day(12, 9)) && !m.isInSeason('christmas', day(12, 31)), '…and not a day either side');
  const [ts, te] = [m.HOLIDAYS.thanksgiving.start, m.HOLIDAYS.thanksgiving.end];
  ok(m.isInSeason('thanksgiving', day(...ts)) && m.isInSeason('thanksgiving', day(...te)) && !m.isInSeason('thanksgiving', day(ts[0], ts[1] - 1)), `Harvest Feast runs ${m.seasonRange('thanksgiving')}`);
  ok(m.isInSeason('new_year', day(12, 31)) && m.isInSeason('new_year', day(1, 6)) && !m.isInSeason('new_year', day(1, 7)) && !m.isInSeason('new_year', day(12, 30)), "the Year's Turning wraps past New Year (Dec 31 – Jan 6)");
  ok(m.activeHolidays(day(5, 15)).length === 0 && m.activeHolidays(day(7, 20)).length === 0, 'nothing is in season in mid-May or late July');

  // Breathing room: seasons don't run into each other (Midwinter into the Year's Turning is the one exception)
  const ordered = Object.values(m.HOLIDAYS);
  const dayOfYear = ([mo, d]) => Math.round((new Date(2026, mo - 1, d) - new Date(2026, 0, 1)) / 864e5);
  const tight = [];
  for (const a of ordered) {
    const next = ordered.map((b) => ({ b, gap: (dayOfYear(b.start) - dayOfYear(a.end) - 1 + 365) % 365 }))
      .filter(({ b }) => b !== a).sort((x, y) => x.gap - y.gap)[0];
    if (next.gap < 5 && !(a.id === 'christmas' && next.b.id === 'new_year')) tight.push(`${a.name} → ${next.b.name} (${next.gap}d)`);
  }
  ok(tight.length === 0, `at least 5 days between seasons (${tight.join(', ')})`);
  let quiet = 0;
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) if (!m.activeHolidays(d).length) quiet++;
  ok(quiet >= 170, `about half the year has no seasonal forms (${quiet} quiet days)`);
  const overlaps = [];
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
    if (m.activeHolidays(d).length > 1) overlaps.push(d.toDateString());
  }
  ok(overlaps.length === 0, `no two holidays overlap (${overlaps.slice(0, 3).join(', ')})`);

  // ── Every seasonal form is well-formed ──
  ok(m.SEASONAL_FORMS.length === 30, `30 seasonal forms (${names(m.SEASONAL_FORMS).join(', ')})`);
  for (const h of Object.keys(m.HOLIDAYS)) {
    ok(m.SEASONAL_FORMS.some((f) => f.holiday === h), `${m.HOLIDAYS[h].name} has at least one form`);
  }
  for (const f of m.SEASONAL_FORMS) {
    ok(f.holiday in m.HOLIDAYS && (f.holidayTiers ?? []).length > 0, `${f.name} has a holiday and tiers`);
    ok(f.holidayTiers.includes(f.tier), `${f.name} is listed under one of its own tiers`);
  }

  // ── Offered by date and tier ──
  const halloween = day(10, 31);
  const minorOct = m.getValidForms('Minor', 1, undefined, halloween);
  ok(has(minorOct, 'minor_jack_o_lantern'), 'a Minor mimic can be a Jack-o\'-Lantern at Halloween');
  ok(!has(minorOct, 'lesser_haunted_tree'), '…but not a Haunted Tree (Lesser and up)');
  ok(!has(minorOct, 'minor_wrapped_present'), '…and no Christmas forms in October');
  ok(!has(m.getValidForms('Minor', 1, undefined, day(7, 4)), 'minor_jack_o_lantern'), 'no Jack-o\'-Lantern in July');
  ok(!has(m.getValidForms('Minor', 1), 'minor_jack_o_lantern'), 'no date given: no seasonal forms');
  ok(!has(m.getValidForms('Greater', 13, undefined, halloween), 'minor_jack_o_lantern'), 'a Greater mimic is too big for a Jack-o\'-Lantern (no "tier below" for seasonal forms)');
  ok(has(m.getValidForms('Greater', 13, undefined, halloween), 'lesser_haunted_tree') && !has(m.getValidForms('Grand', 17, undefined, halloween), 'lesser_haunted_tree'), 'the Haunted Tree goes up to Greater; a Grand mimic gets the Haunted Mansion');

  const dec = day(12, 20);
  ok(['Minor', 'Lesser', 'Standard'].every((t) => has(m.getSeasonalForms(t, dec), 'minor_wrapped_present')), 'Wrapped Present: Minor, Lesser and Standard');
  ok(['Standard', 'Greater', 'Grand'].every((t) => has(m.getSeasonalForms(t, dec), 'standard_festive_tree'))
    && !has(m.getSeasonalForms('Lesser', dec), 'standard_festive_tree'), 'Festive Tree: Standard, Greater and Grand');

  const nov = day(...te);
  ok(has(m.getSeasonalForms('Lesser', nov), 'lesser_scarecrow') && has(m.getSeasonalForms('Greater', nov), 'standard_feast_table'), 'Harvest: Scarecrow and Harvest Feast Table');

  ok(['Greater', 'Grand', 'Apex'].every((t) => has(m.getSeasonalForms(t, day(6, 21)), 'greater_bonfire')), 'Bonfire: Greater, Grand and Apex');
  ok(has(m.getSeasonalForms('Apex', day(1, 1)), 'greater_midnight_orb') && !has(m.getSeasonalForms('Standard', day(1, 1)), 'greater_midnight_orb'), 'Midnight Orb: Greater and up');
  ok(m.formFamily('lesser_festival_keg') === 'lesser_barrel', "the Festival Keg is a seasonal variant of the Barrel");

  // Every tier past Minor has something in every season (so A Mimic for All Seasons is always
  // reachable, Apex included); Minor is a short first stage and misses two
  const gaps = [];
  for (const tier of m.TIER_ORDER) {
    for (const h of Object.keys(m.HOLIDAYS)) {
      if (!m.SEASONAL_FORMS.some((f) => f.holiday === h && f.holidayTiers.includes(tier))) gaps.push(`${tier}: ${m.HOLIDAYS[h].name}`);
    }
  }
  ok(gaps.join() === 'Minor: Midsummer Revel,Minor: Harvest Feast', `only Minor has seasons without a form (${gaps.join(', ')})`);
  ok(has(m.getSeasonalForms('Lesser', day(6, 20)), 'lesser_maypole'), 'a Lesser mimic can be a Maypole');
  ok(has(m.getSeasonalForms('Apex', day(10, 31)), 'grand_haunted_mansion') && !has(m.getSeasonalForms('Apex', day(10, 31)), 'lesser_haunted_tree'), 'Apex at Halloween: the Haunted Mansion, not the Haunted Tree');
  ok(has(m.getSeasonalForms('Apex', day(12, 20)), 'grand_gingerbread_house') && !has(m.getSeasonalForms('Apex', day(12, 20)), 'standard_festive_tree'), 'Apex at Midwinter: the Gingerbread House, not the Festive Tree');

  // ── No tier penalty, never "above" ──
  const present = byId('minor_wrapped_present');
  ok(m.effectiveFormTier(present, 'Standard') === 'Standard', 'a Minor-listed seasonal form counts as Standard for a Standard mimic');
  const p = m.getFormTierPenalties(m.effectiveFormTier(present, 'Standard'), 'Standard');
  ok(p.plausibility === 0 && p.patience === 0, '…so no Patience penalty');
  const tree = byId('standard_festive_tree');
  ok(!m.isFormAboveTier(tree, 'Standard'), 'seasonal forms never count as "from the tier above"');
  const greaterForm = m.MASTER_FORMS.Greater[0];
  ok(m.canAddForm([greaterForm], tree, 'Standard'), 'so one can be taken alongside a real tier-above form');
  ok(m.effectiveFormTier(m.MASTER_FORMS.Greater[0], 'Standard') === 'Greater', 'ordinary forms keep their own tier');

  // ── Lost when the season ends ──
  const knowledge = { learnedMaterials: [], learnedTraits: [] };
  const carried = [{ formId: 'minor_pillow' }, { formId: 'minor_jack_o_lantern' }, { formId: 'minor_book' }];
  ok(m.dropExpiredSeasonalForms(carried, 1, day(10, 20)) === null, 'in season: nothing is lost');
  const dropped = m.dropExpiredSeasonalForms(carried, 2, day(11, 2));
  ok(dropped && dropped.forms.map((f) => f.formId).join() === 'minor_pillow,minor_book', 'the day after: the Jack-o\'-Lantern is gone, the others stay in order');
  ok(dropped.forms[dropped.activeFormIndex].formId === 'minor_book', 'the active form stays active');
  ok(m.dropExpiredSeasonalForms(carried, 1, day(11, 2)).activeFormIndex === 0, 'if the lost form was active, the first remaining form becomes active');
  ok(/All Hallows' Eve is over\. Your Jack-o'-Lantern shape slips away until next Oct 3\./.test(dropped.message), `the player is told (${dropped.message})`);
  const onlySeasonal = m.dropExpiredSeasonalForms([{ formId: 'minor_wrapped_present' }], 0, day(1, 2));
  ok(onlySeasonal.forms.length === 0 && /Choose new forms/.test(onlySeasonal.message), 'losing every form asks for new ones');
  ok(!m.formsStillAllowed([{ formId: 'minor_jack_o_lantern' }], 'Minor', 2, knowledge, day(11, 2)).length, 'out of season, a tier change doesn\'t keep it either');
  ok(m.formsStillAllowed([{ formId: 'minor_jack_o_lantern' }], 'Lesser', 5, knowledge, halloween).length === 1, 'in season, a tier-up within its tiers keeps it');
  ok(!m.formsStillAllowed([{ formId: 'minor_jack_o_lantern' }], 'Greater', 13, knowledge, halloween).length, '…but outgrowing its tiers loses it');

  // ── The Harvest Feast Table is a seasonal variant of the Dining Table ──
  const feast = byId('standard_feast_table');
  ok(m.formFamily(feast.id) === 'standard_dining_table', 'it shares the Dining Table\'s burns and room modifiers');
  ok(!m.VARIANT_FORMS.some((f) => f.holiday), 'seasonal variants don\'t count toward Curiosity Cabinet');
  ok(!m.getLockedVariants('Standard', 9, knowledge).some((f) => f.holiday), '…and are never shown as "locked"');
  ok(!m.SEASONAL_FORMS.some(m.isFormMassGated), 'seasonal forms aren\'t mass-gated');

  // ── Achievements ──
  const ach = (id) => m.ACHIEVEMENTS.find((x) => x.id === id);
  const used = (formsUsed) => ({ formsUsed });
  ok(!ach('festive').isEarned(used(['minor_pillow', 'minor_grimoire'])), 'Festive: not for ordinary or variant forms');
  ok(ach('festive').isEarned(used(['minor_pillow', 'minor_jack_o_lantern'])), 'Festive: hunting in any seasonal form earns it');
  const onePerSeason = Object.keys(m.HOLIDAYS).map((h) => m.SEASONAL_FORMS.find((f) => f.holiday === h).id);
  ok(ach('forAllSeasons').isEarned(used(onePerSeason)), 'A Mimic for All Seasons: one form from every season earns it');
  ok(!ach('forAllSeasons').isEarned(used(onePerSeason.slice(1))), '…missing any one season does not');
  ok(!ach('forAllSeasons').isEarned(used(m.SEASONAL_FORMS.filter((f) => f.holiday === 'halloween').map((f) => f.id))), '…and many forms from one season does not');

  // Seasonal Traveler: a hunt at every seasonal location
  const seasonalPlaces = m.LOCATIONS.filter((l) => l.holiday).map((l) => l.id);
  const huntedAt = (ids) => ({ ...used([]), locationHuntCounts: Object.fromEntries(ids.map((id) => [id, 1])) });
  ok(seasonalPlaces.length >= 4, `there are seasonal locations to travel to (${seasonalPlaces.join(', ')})`);
  ok(ach('seasonedTraveler').isEarned(huntedAt(seasonalPlaces)), 'Seasonal Traveler: a hunt at every seasonal location earns it');
  ok(!ach('seasonedTraveler').isEarned(huntedAt(seasonalPlaces.slice(1))), '…missing any one does not');
  ok(!ach('seasonedTraveler').isEarned(huntedAt(['manor', 'wizard_tower'])) && !ach('seasonedTraveler').isEarned(used([])), '…and ordinary hunting grounds don\'t count');

  log(m.SEASONAL_FORMS.map((f) => `${f.name} [${m.HOLIDAYS[f.holiday].name}: ${f.holidayTiers.join('/')}]`).join(' | '));
}
