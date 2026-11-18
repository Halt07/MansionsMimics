// Mass decay: 1 mass per MASS_DECAY_DAYS days unfed, charged once (reloading doesn't charge it again).
export default async function ({ gameData: m, ok }) {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date('2026-11-20T12:00:00Z');
  const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();

  ok(m.massDecay(10, ago(2), now) === null, 'under 3 days away: nothing lost');
  const nine = m.massDecay(10, ago(9.5), now);
  ok(nine?.massLost === 3 && nine.mass === 7 && nine.daysAway === 9, '9½ days away: 3 mass lost');
  ok(m.massDecay(nine.mass, nine.lastFedAt, now) === null, 'loading again straight after takes nothing more');
  const later = m.massDecay(nine.mass, nine.lastFedAt, new Date(now.getTime() + 2.6 * DAY));
  ok(later?.massLost === 1, 'the leftover half day still counts toward the next loss');
  ok(m.massDecay(3, ago(30), now)?.mass === 1, 'never below 1 mass');
  ok(m.massDecay(1, ago(30), now) === null, 'nothing to lose at mass 1');
  ok(m.massDecay(10, undefined, now) === null, 'a mimic that has never fed doesn\'t decay');
}
