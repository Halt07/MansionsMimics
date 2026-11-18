// Effective stats: what a mimic's Plausibility, Adhesion and Patience are worth after mass,
// sickness and form-tier penalties.
export default async function ({ gameData: m, ok }) {
  const mimic = (over = {}) => ({ tier: 'Standard', mass: 10, plausibility: 4, adhesion: 4, patience: 4, currentAppearance: {}, forms: [], activeFormIndex: 0, ...over });
  const form = (id) => m.ALL_FORMS.find((f) => f.id === id);

  // Mass penalty (Standard is mass 9–12; Lesser starts at 5)
  ok(m.massPenalty(mimic({ mass: 9 })) === 0, 'at the tier\'s minimum mass: no penalty');
  ok(m.massPenalty(mimic({ mass: 8 })) === 1 && m.massPenalty(mimic({ mass: 5 })) === 1, 'below the tier\'s minimum: -1');
  ok(m.massPenalty(mimic({ mass: 4 })) === 2, 'below the tier under it too: -2');
  ok(m.massPenalty(mimic({ tier: 'Minor', mass: 1 })) === 0, 'a Minor mimic can\'t be too small');
  // The decay case: back from -2 to -1 once mass climbs past the lower tier's minimum
  const decayed = m.effectiveStats(mimic({ mass: 4 }), null, null);
  const regrown = m.effectiveStats(mimic({ mass: 6 }), null, null);
  ok(decayed.plausibility === 2 && decayed.penalties.mass === 2 && regrown.plausibility === 3 && regrown.penalties.mass === 1,
    'a decayed Standard mimic: 4-2 at mass 4, 4-1 once it grows back to 6');

  // Sickness
  const sick = { penalties: { plausibility: 1, adhesion: 2 } };
  const s = m.effectiveStats(mimic(), sick, null);
  ok(s.plausibility === 3 && s.adhesion === 2 && s.patience === 4, 'a sickness takes its penalties off each stat');
  ok(s.penalties.sickness.patience === 0, 'and leaves the others alone');

  // Form tier: one above costs Plausibility (in stealth checks), one below costs Patience
  const above = m.effectiveStats(mimic(), null, form('greater_gargoyle'));
  ok(above.penalties.formTier.plausibility === 2 && above.plausibility === 4, 'a form from the tier above: -2 Plausibility, applied by the stealth check');
  const below = m.effectiveStats(mimic(), null, form('lesser_chest'));
  ok(below.penalties.formTier.patience === 1 && below.patience === 3, 'a form from the tier below: -1 Patience');
  ok(m.effectiveStats(mimic(), null, form('standard_door')).patience === 4, 'a form of its own tier: no penalty');

  // Never below 1
  const worst = m.effectiveStats(mimic({ mass: 1, plausibility: 1, adhesion: 1, patience: 1 }), { penalties: { plausibility: 3, adhesion: 3, patience: 3 } }, form('lesser_chest'));
  ok(worst.plausibility === 1 && worst.adhesion === 1 && worst.patience === 1, 'stats never drop below 1');

  // The active form
  const wearing = mimic({ forms: [{ formId: 'standard_door' }, { formId: 'lesser_chest' }], activeFormIndex: 1 });
  ok(m.getActiveForm(wearing)?.id === 'lesser_chest', 'the active form is the one at activeFormIndex');
  ok(m.getActiveForm(mimic()) === null && m.getActiveForm(null) === null, 'no forms, no active form');
  ok(m.STAT_CAP === 6, 'stats cap at 6');
}
