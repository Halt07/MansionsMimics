// Upgrades (applyUpgrade): what spending AP at the threshold does. Growing (+2 mass, and a
// tier-up past the tier's top mass) or a stat (+1, up to the cap).
export default async function ({ gameData: m, ok }) {
  const T = m.TIER_CONFIG;
  const always = (r) => () => r;
  const halloween = new Date(2026, 9, 31);
  const june = new Date(2026, 5, 1);
  const ref = (formId) => ({ formId, name: formId, tier: m.ALL_FORMS.find((f) => f.id === formId).tier, learned: true });
  const mimic = (over = {}) => ({
    name: 'Testy', startingType: 'Lesser', tier: 'Lesser', mass: 6, plausibility: 3, adhesion: 3, patience: 3,
    assimilationPoints: 100, forms: [ref('lesser_chest')], activeFormIndex: 0,
    currentAppearance: {}, learnedMaterials: [], learnedTraits: [], hatboxToLegendReached: false, apexPeakReached: false,
    ...over,
  });
  const up = (c, choice, r = 0) => m.applyUpgrade(c, choice, june, always(r));

  // ---------- stats ----------
  const plaus = up(mimic(), 'plausibility');
  ok(plaus.kind === 'stat' && plaus.value === 4 && plaus.changes.plausibility === 4, 'a stat upgrade: +1');
  ok(plaus.changes.assimilationPoints === 100 - T.Lesser.apToUpgrade, `…for the tier's upgrade cost (${T.Lesser.apToUpgrade} AP at Lesser)`);
  ok(Object.keys(plaus.changes).sort().join() === 'assimilationPoints,plausibility', '…and nothing else changes');
  ok(up(mimic({ tier: 'Apex', mass: 30 }), 'adhesion').changes.assimilationPoints === 100 - T.Apex.apToUpgrade, 'the cost scales with the tier');
  ok(up(mimic({ patience: 5 }), 'patience').value === m.STAT_CAP, 'up to the cap');
  const capped = up(mimic({ adhesion: m.STAT_CAP }), 'adhesion');
  ok(capped.kind === 'capped' && capped.stat === 'adhesion' && !('changes' in capped), 'at the cap: refused, no AP spent');

  // ---------- growing within a tier ----------
  const grew = up(mimic({ mass: 5 }), 'mass');
  ok(grew.kind === 'grew' && grew.mass === 7 && grew.changes.mass === 7 && grew.changes.tier === 'Lesser', 'growing: +2 mass, same tier');
  ok(grew.changes.assimilationPoints === 100 - T.Lesser.apToEvolve, `…for the tier's evolve cost (${T.Lesser.apToEvolve} AP at Lesser)`);
  ok(!grew.apexPeak && !('apexPeakReached' in grew.changes), '…no Peak of the Apex below Apex');
  const top = T.Lesser.massRange[1];
  ok(up(mimic({ mass: top - 2 }), 'mass').kind === 'grew', `landing exactly on the tier's top mass (${top}) isn't a tier-up`);
  const decayed = up(mimic({ tier: 'Standard', mass: 4 }), 'mass');
  ok(decayed.kind === 'grew' && decayed.mass === 6 && decayed.changes.tier === 'Standard', 'a decayed mimic below its tier grows back, and keeps its tier');

  // ---------- tier-ups ----------
  const evolved = up(mimic({ mass: top - 1 }), 'mass');
  ok(evolved.kind === 'evolved' && evolved.tier === 'Standard', `past the top mass (${top}): on to the next tier`);
  ok(evolved.mass === T.Standard.massRange[0] && evolved.changes.mass === T.Standard.massRange[0], `…starting at its lowest mass (${T.Standard.massRange[0]}), not the overflow`);
  ok(evolved.changes.assimilationPoints === 100 - T.Lesser.apToEvolve, '…paid at the old tier\'s cost');
  const overflow = up(mimic({ mass: top }), 'mass');
  ok(overflow.kind === 'evolved' && overflow.mass === T.Standard.massRange[0], `growing ${top} → ${top + 2} still lands on Standard's lowest mass (${T.Standard.massRange[0]}): the overflow is lost`);
  ok(m.applyUpgrade(mimic({ tier: 'Minor', startingType: 'Minor', mass: 3, forms: [] }), 'mass', june, always(0)).tier === 'Lesser', 'Minor (top mass 4): 3 → 5 is a tier-up to Lesser');

  // The strain of growth
  const strained = up(mimic({ mass: top, plausibility: 5, adhesion: 3, patience: 2 }), 'mass');
  ok(strained.weakened.stat === 'plausibility' && strained.weakened.value === 4 && strained.changes.plausibility === 4, 'the highest stat loses a point');
  ok(strained.changes.adhesion === undefined && strained.changes.patience === undefined, '…only that one');
  const tieLow = up(mimic({ mass: top, plausibility: 4, adhesion: 4, patience: 2 }), 'mass', 0);
  const tieHigh = up(mimic({ mass: top, plausibility: 4, adhesion: 4, patience: 2 }), 'mass', 0.99);
  ok(tieLow.weakened.stat === 'plausibility' && tieHigh.weakened.stat === 'adhesion', 'tied for highest: one of them, at random');
  ok(up(mimic({ mass: top, plausibility: 1, adhesion: 1, patience: 1 }), 'mass').weakened.value === 1, 'never below 1');

  // Forms that no longer fit
  const book = 'minor_book';
  const outgrown = up(mimic({ mass: top, forms: [ref(book), ref('lesser_chest')], activeFormIndex: 1 }), 'mass');
  ok(outgrown.formsLost && outgrown.changes.forms.map((f) => f.formId).join() === 'lesser_chest', 'Lesser → Standard: a Minor form (two tiers down now) is lost');
  ok(outgrown.changes.activeFormIndex === 0, '…the form being worn (now first) is still worn');
  const wearingCrate = up(mimic({ mass: top, forms: [ref('lesser_chest'), ref(book), ref('lesser_crate')], activeFormIndex: 2 }), 'mass');
  ok(wearingCrate.changes.forms.map((f) => f.formId).join() === 'lesser_chest,lesser_crate' && wearingCrate.changes.activeFormIndex === 1, '…wherever it ends up in the list (still the Crate)');
  const wearingBook = up(mimic({ mass: top, forms: [ref('lesser_chest'), ref(book)], activeFormIndex: 1 }), 'mass');
  ok(wearingBook.changes.activeFormIndex === 0, "…and if it's the one lost, the first form left");
  const keeps = up(mimic({ mass: top, forms: [ref('lesser_chest')] }), 'mass');
  ok(!keeps.formsLost && !('forms' in keeps.changes) && !('activeFormIndex' in keeps.changes), 'nothing lost: the forms are left alone');
  const shrunk = up(mimic({ mass: top, forms: [ref(book)], currentAppearance: { primaryMaterials: ['Thimblewood'] } }), 'mass');
  ok(!shrunk.formsLost, 'Thimblewood still shrinks you a tier, so that Minor form still fits');
  const lantern = mimic({ tier: 'Minor', startingType: 'Minor', mass: 3, forms: [ref('minor_jack_o_lantern')] });
  ok(!m.applyUpgrade(lantern, 'mass', halloween, always(0)).formsLost, 'a seasonal form in season survives a tier-up it fits');
  ok(m.applyUpgrade(lantern, 'mass', june, always(0)).formsLost, '…out of season it doesn\'t');

  // Achievements on the way
  const grand = (over) => mimic({ tier: 'Grand', mass: T.Grand.massRange[1], forms: [], ...over });
  const legend = up(grand({ startingType: 'Minor' }), 'mass');
  ok(legend.kind === 'evolved' && legend.tier === 'Apex' && legend.hatboxToLegend && legend.changes.hatboxToLegendReached, 'Minor-born, reaching Apex: From Hatbox to Legend');
  ok(!up(grand({ startingType: 'Lesser' }), 'mass').hatboxToLegend, 'Lesser-born: not a Hatbox story');
  ok(!up(grand({ startingType: 'Minor', hatboxToLegendReached: true }), 'mass').hatboxToLegend, 'only once');
  ok(!up(mimic({ tier: 'Minor', startingType: 'Minor', mass: 3, forms: [] }), 'mass').hatboxToLegend, 'not for reaching any other tier');
  ok(!legend.changes.apexPeakReached, 'evolving into Apex (at 26) is no Peak');

  const apex = (mass, over = {}) => mimic({ tier: 'Apex', mass, forms: [], ...over });
  const peak = up(apex(m.APEX_PEAK_MASS - 2), 'mass');
  ok(peak.kind === 'grew' && peak.apexPeak && peak.changes.apexPeakReached, `Apex, reaching ${m.APEX_PEAK_MASS} mass: Peak of the Apex`);
  ok(up(apex(m.APEX_PEAK_MASS - 1), 'mass').apexPeak, '…crossing over it counts too');
  ok(!up(apex(m.APEX_PEAK_MASS), 'mass').apexPeak && !up(apex(m.APEX_PEAK_MASS + 5), 'mass').apexPeak, '…but not once you\'re already past it');
  const huge = up(apex(98), 'mass');
  ok(huge.kind === 'grew' && huge.mass === 100 && huge.changes.tier === 'Apex', 'Apex has nowhere to evolve: it just keeps growing');

  // ---------- no side effects ----------
  const original = mimic({ mass: top, forms: [ref(book), ref('lesser_chest')], plausibility: 5 });
  const snapshot = JSON.stringify(original);
  up(original, 'mass'); up(original, 'plausibility');
  ok(JSON.stringify(original) === snapshot, 'the character passed in is never changed');
}
