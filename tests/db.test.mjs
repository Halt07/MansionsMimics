// Data layer (src/api/db.js): create/update/read/delete, schema validation,
// default-filling for older records, and skipping corrupt records.
export default async function ({ db: dbModule, storage, ok }) {
  // Reading the deliberately corrupt record below logs a warning; keep test output clean
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await run(dbModule, storage, ok);
  } finally {
    console.warn = originalWarn;
  }
}

async function run(dbModule, storage, ok) {
  storage.clear();
  const { db, ValidationError } = dbModule;
  const M = db.entities.MimicCharacter;
  const KEY = 'mm_entity_MimicCharacter';

  const a = await M.create({
    name: '  Chesty ', tier: 'Lesser', startingType: 'Lesser',
    forms: [{ formId: 'lesser_chest', name: 'Chest', tier: 'Lesser', learned: true }],
    currentAppearance: { primaryMaterials: ['Oak'], secondaryMaterials: [], surfaceTraits: [], symbolicTraits: [], conditionTraits: [] },
  });
  ok(a.id && a.created_date && a.mass === 2 && a.isActive === true && a.name === 'Chesty', 'create applies defaults, trims name, adds id/dates');
  const spaced = await M.create({ name: '  Old   Hatbox\t the  Third ' });
  ok(spaced.name === 'Old Hatbox the Third' && JSON.parse(storage.get(KEY)).find((r) => r.id === spaced.id).name === 'Old Hatbox the Third',
    'a name is saved with every run of spaces inside squeezed to one (and none at the ends)');
  ok((await M.update(spaced.id, { name: 'Gristle    Jr' })).name === 'Gristle Jr', '…renaming too');
  const recs0 = JSON.parse(storage.get(KEY));
  recs0.find((r) => r.id === spaced.id).name = 'From  An   Older Save';
  storage.set(KEY, JSON.stringify(recs0));
  ok((await M.get(spaced.id)).name === 'From An Older Save', '…and an older save with doubled spaces reads back tidied');
  await M.delete(spaced.id);
  const b = await M.create({ name: 'Second' });
  ok(b.currentAppearance.primaryMaterials.length === 0 && b.currentAppearance.secondaryMaterials.length === 0 && Array.isArray(b.learnedTraits), 'nested defaults filled');

  const u = await M.update(a.id, { assimilationPoints: 3, lastFedAt: new Date().toISOString() });
  ok(u.assimilationPoints === 3 && u.name === 'Chesty', 'partial update merges');

  for (const [bad, label] of [
    [{ mass: NaN }, 'NaN rejected'],
    [{ masss: 4 }, 'unknown key rejected'],
    [{ tier: 'Huge' }, 'bad enum rejected'],
    [{ forms: Array(4).fill({ formId: 'x', name: 'x', tier: 'Minor' }) }, 'more than 3 forms rejected'],
  ]) {
    try { await M.update(a.id, bad); ok(false, label); } catch (e) { ok(e instanceof ValidationError, label); }
  }
  try { await M.create({ name: '   ' }); ok(false, 'blank name rejected'); } catch (e) { ok(e instanceof ValidationError, 'blank name rejected'); }
  const tooMany = ['lesser_chest', 'lesser_crate', 'lesser_barrel', 'minor_book'].map((formId) => ({ formId, name: formId, tier: 'Lesser' }));
  try { await M.create({ name: 'Greedy', forms: tooMany }); ok(false, 'too many forms rejected'); }
  catch (e) { ok(e instanceof ValidationError && e.message.includes('at most 3 forms'), 'more forms than a mimic can hold (3) is rejected'); }
  ok((await M.get(a.id)).assimilationPoints === 3, 'failed updates did not persist');

  ok((await M.filter({ id: a.id }))[0]?.name === 'Chesty', 'filter by id');
  ok((await M.list('-created_date', 1)).length === 1, 'list limit');
  await M.update(b.id, { apexPeakReached: true });
  ok((await M.filter({ apexPeakReached: true }, '-updated_date', 3)).map((r) => r.id).join() === b.id, 'filter by flag');

  // A record missing fields, plus one that can't be repaired
  const t = new Date().toISOString();
  const recs = JSON.parse(storage.get(KEY));
  recs.push({ id: 'old1', name: 'Oldie', tier: 'Minor', created_date: t, updated_date: t });
  recs.push({ id: 'bad1', tier: 'Minor', created_date: t, updated_date: t }); // no name: can't be fitted
  storage.set(KEY, JSON.stringify(recs));
  const old = await M.get('old1');
  ok(old.mass === 2 && old.forms.length === 0 && old.currentAppearance.surfaceTraits.length === 0, 'record missing fields loads with defaults');
  const all = await M.list();
  ok(all.length === 3 && !all.some((r) => r.id === 'bad1'), 'corrupt record skipped in list');
  try { await M.get('bad1'); ok(false, 'get corrupt record'); } catch (e) { ok(e instanceof ValidationError, 'get corrupt record throws ValidationError'); }

  await M.delete(a.id);
  ok((await M.list()).length === 2, 'delete');

  // Appearance shape
  try { await M.update(b.id, { currentAppearance: { primaryMaterial: 'Oak' } }); ok(false, 'singular primaryMaterial'); } catch (e) { ok(e instanceof ValidationError, 'singular primaryMaterial key rejected'); }
  const two = await M.update(b.id, { currentAppearance: { primaryMaterials: ['Oak', 'Iron'], secondaryMaterials: ['Cotton', 'Silk'] } });
  ok(two.currentAppearance.primaryMaterials.length === 2 && two.currentAppearance.secondaryMaterials.length === 2, 'multiple primary/secondary materials stored');
  try { await M.update(b.id, { currentAppearance: { magicalMaterials: ['Feywood'] } }); ok(false, 'magicalMaterials'); } catch (e) { ok(e instanceof ValidationError, 'magicalMaterials key rejected (no separate magic slot)'); }

  // Names must be real game names
  for (const [bad, label] of [
    [{ forms: [{ formId: 'f1', name: 'Fake', tier: 'Lesser' }] }, 'unknown form id rejected'],
    [{ learnedMaterials: ['scrap of leather armor'] }, 'unknown material rejected (e.g. old bite scraps)'],
    [{ learnedTraits: ['Shiny'] }, 'unknown trait rejected'],
    [{ currentAppearance: { primaryMaterials: ['Oak'], surfaceTraits: ['Cracked'] } }, 'condition trait in the surface slot rejected'],
  ]) {
    try { await M.update(b.id, bad); ok(false, label); } catch (e) { ok(e instanceof ValidationError, label); }
  }

  // An older save that no longer quite fits (a field since removed, a form since renamed, a
  // material or place no longer in the game): what doesn't fit is dropped, the mimic is kept
  storage.clear();
  const when = new Date().toISOString();
  storage.set(KEY, JSON.stringify([{
    id: 'old', name: 'Old Timer', tier: 'Nope', created_date: when, updated_date: when, retiredField: 7,
    forms: [{ formId: 'renamed_form', name: 'Gone', tier: 'Lesser' }, { formId: 'lesser_chest', name: 'Chest', tier: 'Lesser' }, { formId: 'lesser_crate', name: 'Crate', tier: 'Lesser' }],
    activeFormIndex: 2, formsUsed: ['lesser_chest', 'renamed_form'], formHuntCounts: { renamed_form: 2, lesser_chest: 1 },
    locationHuntCounts: { atlantis: 3, manor: 2 }, learnedMaterials: ['Oak', 'Unobtainium'],
    currentAppearance: { primaryMaterials: ['Unobtainium'], surfaceTraits: ['Polished'], retiredSlot: [] },
    burnedForms: [{ formId: 'renamed_form', huntsLeft: 1 }, { formId: 'lesser_chest', huntsLeft: 2 }], rareLocation: { id: 'atlantis', huntsLeft: 2 },
  }]));
  const repairWarnings = [];
  console.warn = (msg) => repairWarnings.push(msg);
  const [oldSave] = await M.list();
  ok(oldSave?.name === 'Old Timer', 'an older save that no longer quite fits still loads');
  ok(oldSave.forms.map((f) => f.formId).join() === 'lesser_chest,lesser_crate' && oldSave.activeFormIndex === 1, '…a renamed form is dropped, and the form being worn stays worn');
  ok(oldSave.formsUsed.join() === 'lesser_chest' && JSON.stringify(oldSave.formHuntCounts) === '{"lesser_chest":1}' && oldSave.burnedForms.map((b) => b.formId).join() === 'lesser_chest',
    '…and it\'s dropped from the forms used, the counts and the burns');
  ok(JSON.stringify(oldSave.locationHuntCounts) === '{"manor":2}' && oldSave.rareLocation === null, '…a place no longer in the game is dropped too');
  ok(oldSave.learnedMaterials.join() === 'Oak' && oldSave.currentAppearance.primaryMaterials.length === 0 && oldSave.currentAppearance.surfaceTraits.join() === 'Polished',
    '…and so is a material no longer in the game, wherever it was');
  ok(oldSave.tier === 'Minor' && !('retiredField' in oldSave) && !('retiredSlot' in oldSave.currentAppearance), '…a field since removed goes; an unknown value goes back to its default');
  ok(repairWarnings.some((w) => w.includes('MimicCharacter old') && ['forms.0', 'retiredField', 'learnedMaterials.1', 'rareLocation'].every((d) => w.includes(d))), '…and the console says what was dropped');
  ok((await M.get('old')).forms.length === 2, 'get fits it the same way');
  const tidied = await M.update('old', { assimilationPoints: 4 });
  const rawTidied = JSON.parse(storage.get(KEY))[0];
  ok(tidied.assimilationPoints === 4 && rawTidied.forms.length === 2 && !('retiredField' in rawTidied), 'updating it saves the tidied version');
  try { await M.update('old', { retiredField: 1 }); ok(false, 'writing stays strict'); } catch (e) { ok(e instanceof ValidationError, 'writing stays strict: a field the game doesn\'t have is still refused'); }
  console.warn = () => {};

  // limit
  ok((await M.list(undefined, 0)).length === 0 && (await M.list(undefined, 1)).length === 1 && (await M.list()).length === 1, 'a limit of 0 returns none (not all)');

  // Damaged saved data: reads as empty (the game still opens), but is backed up before
  // anything is written over it, so it can be recovered
  for (const [damaged, label] of [['{"name": "Gristle", "mass": 9', 'unparseable'], ['{"not": "a list"}', 'not a list']]) {
    storage.clear();
    storage.set(KEY, damaged);
    const logError = console.error;
    const logged = [];
    console.error = (msg) => logged.push(msg);
    try {
      ok((await M.list()).length === 0, `${label}: reads as no mimics`);
      ok(storage.get(KEY) === damaged, `${label}: …and reading leaves it alone`);
      await M.create({ name: 'Fresh' });
      const backups = [...storage.keys()].filter((k) => k.startsWith(`${KEY}.unreadable-`));
      ok(backups.length === 1 && storage.get(backups[0]) === damaged, `${label}: saving a new mimic first keeps the old data under a backup key`);
      ok(logged.length === 1 && logged[0].includes(backups[0]), `${label}: …and says where it went`);
      ok((await M.list()).map((c) => c.name).join() === 'Fresh', `${label}: then saves normally`);
      await M.create({ name: 'Another' });
      ok([...storage.keys()].filter((k) => k.startsWith(`${KEY}.unreadable-`)).length === 1, `${label}: (once: later saves don't back up again)`);
    } finally {
      console.error = logError;
    }
  }
  storage.clear();
}
