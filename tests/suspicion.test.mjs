// Suspicion from consuming a party member in front of witnesses.
export default async function ({ gameData: m, ok }) {
  const expected = [[0, 1], [1, 2], [2, 2], [3, 3], [4, 3], [6, 3]];
  for (const [witnesses, gain] of expected) {
    ok(m.consumeSuspicion(witnesses) === gain, `${witnesses} witness(es) → +${gain} suspicion`);
  }
}
