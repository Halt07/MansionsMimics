// Choosing what to wear in an appearance slot (toggleChoice in src/data/gameData.ts), shared by
// the appearance editor and character creation.
export default async function ({ gameData: m, ok }) {
  const t = m.toggleChoice;
  ok(t(['Oak'], 'Oak', 1).length === 0 && t(['Oak', 'Iron'], 'Oak', 2).join() === 'Iron', 'clicking a chosen one takes it off');
  ok(t([], 'Oak', 1).join() === 'Oak' && t(['Oak'], 'Iron', 2).join() === 'Oak,Iron', 'clicking another puts it on, while there is room');
  ok(t(['Oak', 'Iron'], 'Pine', 2).join() === 'Oak,Iron', 'a full slot ignores another pick');
  ok(t(['Oak'], 'Iron', 1, { swap: true }).join() === 'Iron', 'a slot of one that swaps (materials) replaces its choice');
  ok(t(['Polished'], 'Smooth', 1).join() === 'Polished', '…one that doesn\'t (traits) ignores the new pick');
  ok(t(['Oak', 'Iron'], 'Pine', 2, { swap: true }).join() === 'Oak,Iron', 'swapping is only for a slot of one');
  const before = ['Oak'];
  t(before, 'Iron', 2);
  ok(before.join() === 'Oak', 'the list it was given is left alone');
}
