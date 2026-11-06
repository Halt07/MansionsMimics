// Variant forms: unlocking, availability, shared burns and room modifiers, Curiosity Cabinet.
export default async function ({ gameData: m, ok, log }) {
  const { VARIANT_FORMS, ALL_FORMS } = m;
  const byId = (id) => ALL_FORMS.find((f) => f.id === id);
  const none = { learnedMaterials: [], learnedTraits: [] };

  ok(VARIANT_FORMS.length === 10, `ten variant forms (${VARIANT_FORMS.map((f) => f.name).join(', ')})`);
  for (const v of VARIANT_FORMS) {
    const base = byId(v.variantOf);
    ok(base && !base.variantOf && base.tier === v.tier, `${v.name} is a variant of ${base?.name}, in the same tier`);
    ok((v.unlockedBy ?? []).length > 0, `${v.name} has something that unlocks it`);
  }

  // Nothing a mimic starts with may unlock a variant
  const starting = new Set([...m.STARTING_MATERIALS.Minor, ...m.STARTING_MATERIALS.Lesser, ...m.ALL_STARTING_TRAITS]);
  const freebies = VARIANT_FORMS.flatMap((v) => v.unlockedBy.filter((x) => starting.has(x)).map((x) => `${v.name}: ${x}`));
  ok(freebies.length === 0, `no variant is unlocked by a starting material or trait${freebies.length ? ` — ${freebies.join(', ')}` : ''}`);
  // ...and everything that unlocks one can actually be learned
  const { materials, traits } = m.obtainableMaterialsAndTraits();
  const unlearnable = VARIANT_FORMS.flatMap((v) => v.unlockedBy.filter((x) => !materials.has(x) && !traits.has(x)).map((x) => `${v.name}: ${x}`));
  ok(unlearnable.length === 0, `every unlock can be learned from some adventurer${unlearnable.length ? ` — ${unlearnable.join(', ')}` : ''}`);

  // Availability
  const grimoire = byId('minor_grimoire');
  const names = (forms) => forms.map((f) => f.name);
  ok(!names(m.getValidForms('Minor', 2)).includes('Grimoire'), 'without knowledge (e.g. character creation), no variants are offered');
  ok(!names(m.getValidForms('Minor', 2, none)).includes('Grimoire') && names(m.getLockedVariants('Minor', 2, none)).includes('Grimoire'), 'a locked variant is listed as locked, not offered');
  const glow = { learnedMaterials: [], learnedTraits: ['Faint Glow'] };
  ok(names(m.getValidForms('Minor', 2, glow)).includes('Grimoire') && !names(m.getLockedVariants('Minor', 2, glow)).includes('Grimoire'), 'learning Faint Glow unlocks the Grimoire');
  ok(m.isVariantUnlocked(byId('greater_gargoyle'), { learnedMaterials: ['Basalt'], learnedTraits: [] }), 'materials unlock variants too (Basalt → Gargoyle)');
  ok(!names(m.getValidForms('Apex', 40, glow)).includes('Grimoire'), 'variants follow their base form’s tier range');

  // Burns and room modifiers are shared with the base form
  const burned = m.burnAfterDiscovery({ burnedLocations: [], burnedForms: [] }, 'manor', 'minor_grimoire');
  ok(m.formBurn(burned, 'minor_book') > 0 && m.formBurn(burned, 'minor_grimoire') > 0, 'caught as a Grimoire: the Book is burned too');
  const burnedBook = m.burnAfterDiscovery({ burnedLocations: [], burnedForms: [] }, 'manor', 'minor_book');
  ok(m.formBurn(burnedBook, 'minor_grimoire') > 0 && burnedBook.burnedForms.length === 1, 'caught as a Book: the Grimoire is burned too (one shared burn)');
  ok(m.formFamily('minor_grimoire') === 'minor_book' && m.formFamily('minor_book') === 'minor_book', 'formFamily maps variants to their base');

  // Curiosity Cabinet
  const cab = m.ACHIEVEMENTS.find((a) => a.id === 'curiosityCabinet');
  const fresh = { formsUsed: [] };
  ok(!cab.isEarned({ ...fresh, formsUsed: VARIANT_FORMS.slice(1).map((f) => f.id) }), 'Curiosity Cabinet needs every variant');
  ok(cab.isEarned({ ...fresh, formsUsed: [...VARIANT_FORMS.map((f) => f.id), 'minor_book'] }), 'hunting in every variant earns Curiosity Cabinet');
  log(VARIANT_FORMS.map((v) => `${v.name} ← ${v.unlockedBy.join('/')}`).join(' | '));

  // The Cathedral takes the Chapel's grandeur; the Chapel stays humble
  const chapel = byId('apex_chapel'), cathedral = byId('apex_cathedral');
  ok(!chapel.builtInTraits.includes('Radiant') && !chapel.builtInTraits.includes('Arched'), 'the Chapel no longer has Radiant or Arched');
  ok(['Radiant', 'Arched', 'Ornate'].every((t) => cathedral.builtInTraits.includes(t)) && cathedral.unlockedBy.join() === 'Stained Glass', 'the Cathedral is Radiant, Arched and Ornate, unlocked by Stained Glass');
  ok(['Ornate', 'Rustic'].every((t) => byId('grand_antler_chandelier').builtInTraits.includes(t)), 'the Antler Chandelier is both Ornate and Rustic');
  ok(m.formFamily('apex_cathedral') === 'apex_chapel' && m.ROOM_FORM_IDS.has(m.formFamily('apex_cathedral')) && m.ROOM_FORM_IDS.has(m.formFamily('grand_atheneum')), 'room-form variants count as their base room type');

  // Room modifiers: the Hidden Grove's Ancient Altar suits statues (and the Gargoyle, as a Statue variant)
  ok(m.getRoomContextMod('greater_statue', 'hidden_grove', 'Ancient Altar').plausibility === 1, 'a Statue is more plausible at the Ancient Altar');
  ok(m.getRoomContextMod('greater_gargoyle', 'hidden_grove', 'Ancient Altar').plausibility === 1, 'so is its Gargoyle variant');
  ok(m.getRoomContextMod('minor_book', 'hidden_grove', 'Ancient Altar').plausibility === 0, 'other forms are unaffected there');
}
