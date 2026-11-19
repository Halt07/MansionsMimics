// Dice odds helpers and the Wait action's minimum success chance.
export default async function ({ gameData: m, ok, log }) {
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  ok(close(m.diceSuccessChance(1, 4), 0.5), '1d6 ≥ 4 is 50%');
  ok(close(m.diceSuccessChance(2, 7), 21 / 36), '2d6 ≥ 7 is 21/36');
  ok(m.diceSuccessChance(3, 3) === 1 && m.diceSuccessChance(3, 19) === 0, 'impossible/certain targets');

  // Wait: capped threshold keeps every dice count at ≥ 40%, and never past the base target
  for (let base = 1; base <= 6; base++) {
    for (let dice = 1; dice <= base + 1; dice++) {
      const t = Math.min(base * 3, m.maxTargetForChance(dice, 0.4));
      const p = m.diceSuccessChance(dice, t);
      ok(p >= 0.4, `wait: base ${base}, ${dice} dice → ${(p * 100).toFixed(0)}%`);
    }
  }
  for (let n = 1; n <= 7; n++) {
    const t = m.maxTargetForChance(n, 0.4);
    ok(m.diceSuccessChance(n, t + 1) < 0.4 || t === n * 6, `${n} dice: ${t} is the highest ≥40% target`);
    log(`${n} dice: cap ${t} (${(m.diceSuccessChance(n, t) * 100).toFixed(0)}%)`);
  }

  // ---------- shuffling ----------
  const items = ['a', 'b', 'c'];
  const counts = {};
  for (let i = 0; i < 6000; i++) { const k = m.shuffle(items).join(''); counts[k] = (counts[k] ?? 0) + 1; }
  const orders = Object.values(counts);
  ok(orders.length === 6 && orders.every((n) => n > 800 && n < 1200), `shuffle: all six orders of three, about equally often (${JSON.stringify(counts)})`);
  ok(items.join('') === 'abc' && m.shuffle(items, () => 0).join('') === 'bca', '…a copy (the list is left alone), and the same for the same rolls');
}
