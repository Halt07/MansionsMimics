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
  ok((await M.get(a.id)).assimilationPoints === 3, 'failed updates did not persist');

  ok((await M.filter({ id: a.id }))[0]?.name === 'Chesty', 'filter by id');
  ok((await M.list('-created_date', 1)).length === 1, 'list limit');
  await M.update(b.id, { apexPeakReached: true });
  ok((await M.filter({ apexPeakReached: true }, '-updated_date', 3)).map((r) => r.id).join() === b.id, 'filter by flag');

  // A record missing fields, plus one that can't be repaired
  const t = new Date().toISOString();
  const recs = JSON.parse(storage.get(KEY));
  recs.push({ id: 'old1', name: 'Oldie', tier: 'Minor', created_date: t, updated_date: t });
  recs.push({ id: 'bad1', name: 'Broken', tier: 'Nope', created_date: t, updated_date: t });
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
}
