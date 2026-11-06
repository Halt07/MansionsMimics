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
}
