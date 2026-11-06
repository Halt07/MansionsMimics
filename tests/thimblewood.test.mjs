// Thimblewood: shrinks the mimic one tier for every form rule while worn.
export default async function ({ gameData: m, ok }) {
  const wearing = { primaryMaterials: ['Thimblewood'] };
  const standard = { tier: 'Standard', currentAppearance: {} };
  const shrunk = { tier: 'Standard', currentAppearance: wearing };

  ok(m.isMagicMaterial('Thimblewood') && m.MAGIC_EFFECTS.Thimblewood.length > 0, 'Thimblewood is a magic material with an effect');
  ok(m.formTier(standard) === 'Standard' && m.formTier(shrunk) === 'Lesser', 'wearing it, a Standard mimic is judged as Lesser');
  ok(m.formTier({ tier: 'Minor', currentAppearance: wearing }) === 'Minor', 'it never shrinks below Minor');

  // Form range: two tiers below to its own tier
  const tiers = (forms) => [...new Set(forms.map((f) => f.tier))].sort().join();
  ok(tiers(m.getValidForms(m.formTier(standard), 9)) === 'Greater,Lesser,Standard', 'normally a Standard mimic sees Lesser–Greater');
  ok(tiers(m.getValidForms(m.formTier(shrunk), 9)) === 'Lesser,Minor,Standard', 'shrunk, it sees Minor–Standard (the Book is back)');

  // Penalties, judged at the shrunk size
  const pen = (formTier) => m.getFormTierPenalties(formTier, m.formTier(shrunk));
  ok(pen('Minor').patience === 1 && pen('Minor').plausibility === 0, 'two tiers below: −1 Patience');
  ok(pen('Lesser').patience === 0 && pen('Lesser').plausibility === 0, 'one tier below: no penalty');
  ok(pen('Standard').plausibility === 2, 'its own tier: −2 Plausibility (counts as one above)');

  // Forms it may keep after putting Thimblewood on (one-above limit now covers its own tier)
  const refs = [{ formId: 'standard_wardrobe' }, { formId: 'standard_bookshelf' }, { formId: 'greater_statue' }, { formId: 'lesser_chest' }];
  const none = { learnedMaterials: [], learnedTraits: [] };
  const kept = m.formsStillAllowed(refs, m.formTier(shrunk), 9, none).map((r) => r.formId);
  ok(kept.join() === 'standard_wardrobe,lesser_chest', `shrunk: keeps one own-tier form and the lower one, loses the rest (${kept.join(', ')})`);
  ok(m.formsStillAllowed(refs, m.formTier(standard), 13, none).length === 4, 'full size: all four forms are allowed');

  // Teachers
  const teaches = (name) => m.ADVENTURER_TEMPLATES.find((t) => t.name === name).lootMaterials.includes('Thimblewood');
  ok(teaches('Fey Changeling') && teaches('Wandering Druid'), 'taught by the Fey Changeling and the Wandering Druid');
  ok(!m.ADVENTURER_TEMPLATES.find((t) => t.name === 'Wandering Druid').lootMaterials.includes('Feywood'), 'the Wandering Druid no longer teaches Feywood');
}
