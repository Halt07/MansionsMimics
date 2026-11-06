// Easter eggs: name remarks at creation and the rival wearing your shape.
export default async function ({ gameData: m, ok }) {
  ok(m.nameFlavor('Hatbox') === "Hatbox the mimic, eh? You'll be a legend in no time.", 'Hatbox');
  ok(m.nameFlavor('  hatbox ') !== null, 'names are matched ignoring case and surrounding spaces');
  ok(m.nameFlavor('Mimic') === 'Mimic… how original.', 'Mimic');
  ok(m.nameFlavor('Tiny') === 'Tiny, how cute!' && m.nameFlavor('puny') === 'puny, how cute!', 'small names are cute (keeping the player’s spelling)');
  ok(m.nameFlavor('Rex') === "Rex? You're a mimic, not a dog." && m.nameFlavor('Rover') !== null, 'dog names');
  ok(m.nameFlavor('Chesty') === null && m.nameFlavor('Tinybox') === null, 'other names get no remark');
  ok(m.RIVAL_SAME_SHAPE_CHANCE === 0.2 && m.RIVAL_SAME_SHAPE_LINE.includes('wearing your shape'), 'the rival wears your shape 20% of the time');

  // The extended list
  ok(m.nameFlavor('Jaws') === "A little on the nose for something that's meant to look harmless.", 'too-honest names');
  ok(m.nameFlavor('not   a  MIMIC') === 'Very convincing. No notes.', 'multi-word names ignore case and extra spaces');
  ok(m.nameFlavor('Chest') === 'A chest named Chest. Subtle.' && m.nameFlavor('Trunk') === 'A trunk named Trunk. Subtle.', 'furniture names');
  ok(m.nameFlavor('Gary')?.includes('perfectly ordinary') && m.nameFlavor('Steve') === m.nameFlavor('Bob'), 'ordinary names');
  ok(m.nameFlavor('Elder')?.includes('Elder Mimic') && m.nameFlavor('Thimble')?.includes('Thimblewood'), 'nods to the game');
  ok(['Treasure', 'Snack', 'Hero', 'Captain', 'Gargoyle', 'Pandora', 'Luggage', 'Trap', 'Hungry', 'Barrel'].every((n) => m.nameFlavor(n)), 'every group has a remark');

  // Quirks acted out in hunts
  const T = m.ADVENTURER_TEMPLATES;
  const missing = T.filter((t) => !t.appliedQuirk || !t.appliedQuirk.includes('{name}')).map((t) => t.name);
  ok(missing.length === 0, `every adventurer has an applied quirk naming itself${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`);
  const placeholders = T.flatMap((t) => (t.appliedQuirk.match(/\{[^}]*\}/g) ?? []).filter((x) => x !== '{name}' && x !== '{form}').map((x) => `${t.name}: ${x}`));
  ok(placeholders.length === 0, `applied quirks only use {name} and {form}${placeholders.length ? ` — ${placeholders.join(', ')}` : ''}`);
  const hunter = T.find((t) => t.name === 'Mimic Hunter');
  ok(m.quirkLine(hunter, 'Chest', () => 0) === 'Mimic Hunter raps twice on the Chest, listening.', 'the line names the adventurer and your form');
  ok(m.quirkLine(hunter, 'Chest', () => 0.5) === null, 'and only shows up some of the time');
  ok(m.QUIRK_LINE_CHANCE === 0.3, 'about 30% of the time');
  ok(m.quirkLine({ name: 'Nobody', appliedQuirk: undefined }, 'Chest', () => 0) === null, 'no line for anyone without one (e.g. companions)');

  // The names these easter eggs look for must be real adventurers, in the right places
  const where = (name) => T.find((t) => t.name === name)?.locations ?? [];
  ok(where(m.PORTER_SISTER).includes('mimic_nest') && m.PORTER_TOKEN_LINE.includes("porter's token"), "the porter's sister hunts the Mimic Nest, where the Elder is");
  ok(where(m.DOUBTING_SCHOLAR).includes('hollow_reliquary') && m.SCHOLAR_NOTES_LINE.endsWith('it was real.'), 'the Doubting Scholar visits the Reliquary, where pilgrims convert');

  // Hatbox callback on From Hatbox to Legend
  const hatbox = m.ACHIEVEMENTS.find((a) => a.id === 'hatboxToLegend');
  ok(hatbox.flavor('Hatbox') === 'Told you. Hatbox, the legend.' && hatbox.flavor('Chesty').includes('small enough to overlook'), 'a mimic named Hatbox gets the callback banner line');

  // The cat knows: every cat-type small creature counts, nothing else does
  const creatures = m.LOCATIONS.flatMap((l) => l.locationCreatures);
  const cats = [...new Set(creatures.filter((c) => m.isCat(c)).map((c) => c.name))];
  ok(cats.length >= 6 && !m.isCat({ name: 'Bat' }) && !m.isCat({ name: 'Catfish' }), `cats: ${cats.join(', ')}`);

  ok(m.STILLNESS_TURNS === 15 && m.STILLNESS_LINE.includes('spider'), 'the spiderweb after 15 quiet Waits in a row');
}
