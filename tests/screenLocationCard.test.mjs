// A hunting ground in the Codex (src/components/game/codex/LocationCard.tsx), rendered: what the
// card gives away before you've found the place, once you know of it, and once you've hunted
// there. Rendered without a browser, so only the closed card (it opens on a click).
import { screen, text, count } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await screen(load);
  const { default: LocationCard } = await load('/src/components/game/codex/LocationCard.tsx');
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const card = (id, knowledge, hunts = 0) => s.render(LocationCard, { location: loc(id), knowledge, hunts });

  // ---------- not found yet ----------
  const unknown = text(card('hidden_grove', 'unknown'));
  ok(unknown.startsWith('???') && unknown.includes("You haven't found this place yet."), 'an unfound ground is just "???"');
  ok(!unknown.includes(loc('hidden_grove').name) && !unknown.includes(loc('hidden_grove').description), '…giving away neither its name nor its description');
  ok(text(card('spell_or_sweet_street', 'unknown')).includes("It only opens in its season, and this isn't it."), 'a seasonal one out of season says why');

  // ---------- known, not hunted ----------
  const known = card('hidden_grove', 'known');
  ok(text(known).includes(loc('hidden_grove').name) && text(known).includes(loc('hidden_grove').description), 'a known ground shows its name and description');
  ok(text(known).includes('Grand+') && text(known).includes('Not yet hunted'), '…the tier it needs, and that you have not hunted there');
  ok(known.includes('aria-expanded="false"') && count(known, 'room-cell') === 0, '…closed, with no floor plan until opened');
  const massive = m.LOCATIONS.find((l) => l.minMass && !l.holiday);
  ok(!massive || text(card(massive.id, 'known')).includes(`${massive.minTier}+ · Mass ${massive.minMass}+`), 'a ground that needs a minimum mass says so');

  // ---------- hunted ----------
  const once = text(card('manor', 'visited', 1));
  ok(once.includes('Hunted 1 time') && !once.includes('Hunted 1 times'), 'hunted once: "1 time"');
  ok(text(card('manor', 'visited', 3)).includes('Hunted 3 times'), '…more: "3 times"');

  // ---------- seasonal ----------
  const street = text(card('spell_or_sweet_street', 'known'));
  ok(street.includes(`${m.HOLIDAYS.halloween.icon} ${m.HOLIDAYS.halloween.name} · ${m.seasonRange('halloween')} · all tiers`), 'a seasonal ground shows its season, open to all tiers');
  ok(!street.includes('Minor+'), '…instead of a tier');
}
