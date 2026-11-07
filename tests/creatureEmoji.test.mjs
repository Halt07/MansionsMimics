// Small creatures: every one shown in a hunt gets its own emoji rather than the fallback.
export default async function ({ gameData: m, ok }) {
  const names = [...new Set(m.LOCATIONS.flatMap((l) => l.locationCreatures.map((c) => c.name)))];
  const unmatched = names.filter((n) => m.creatureEmoji(n) === m.CREATURE_EMOJI_FALLBACK);
  ok(unmatched.length === 0, `every location creature has an emoji${unmatched.length ? ` — missing: ${unmatched.join(', ')}` : ''}`);
  ok(m.creatureEmoji('Temple Cat') === '🐈' && m.creatureEmoji("Ship's Cat") === '🐈', 'cats are cats');
  ok(m.creatureEmoji('Zombie Cat') !== m.creatureEmoji('Zombie Guest'), 'the zombie cat is still a cat');
  ok(m.creatureEmoji('Bell-Loft Bat') === '🦇' && m.creatureEmoji('Church Mouse') === '🐁', 'whole words only (no "Rat" in "Bat")');
  ok(m.creatureEmoji('Something Unheard Of') === m.CREATURE_EMOJI_FALLBACK, 'unknown creatures get the fallback');
}
