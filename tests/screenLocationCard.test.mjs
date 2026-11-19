// A hunting ground in the Codex (src/components/game/codex/LocationCard.tsx): what the card gives
// away before you've found the place, once you know of it, and once you've hunted there, closed
// and opened (React Testing Library: it opens on a click).
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: LocationCard } = await load('/src/components/game/codex/LocationCard.tsx');
  const user = userEvent.setup();
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const card = (id, knowledge, hunts = 0) => s.show(LocationCard, { location: loc(id), knowledge, hunts });
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const toggle = (id) => screen.getByRole('button', { name: new RegExp(loc(id).name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });

  // ---------- not found yet ----------
  const { container: unknown } = card('hidden_grove', 'unknown');
  ok(unknown.textContent.startsWith('???') && has("You haven't found this place yet."), 'an unfound ground is just "???"');
  ok(!has(loc('hidden_grove').name) && !has(loc('hidden_grove').description), '…giving away neither its name nor its description');
  ok(screen.queryByRole('button') === null, '…and there is nothing to open');
  card('spell_or_sweet_street', 'unknown');
  ok(has("It only opens in its season, and this isn't it."), 'a seasonal one out of season says why');

  // ---------- known, not hunted ----------
  card('hidden_grove', 'known');
  ok(has(loc('hidden_grove').name) && has(loc('hidden_grove').description), 'a known ground shows its name and description');
  ok(has('Grand+') && has('Not yet hunted'), '…the tier it needs, and that you have not hunted there');
  ok(toggle('hidden_grove').getAttribute('aria-expanded') === 'false' && !has('Floor Plan'), '…closed to begin with');
  await user.click(toggle('hidden_grove'));
  ok(toggle('hidden_grove').getAttribute('aria-expanded') === 'true' && has('Floor Plan'), 'a click opens it');
  ok(screen.getByRole('img', { name: 'Unmapped. Hunt here to learn its rooms.' }) && !loc('hidden_grove').rooms.some((r) => has(r)), '…but the floor plan stays fogged until you hunt there');
  ok(has('Hunt here to learn what scurries about.') && !loc('hidden_grove').locationCreatures.some((c) => has(c.name)), '…and so do its creatures');
  ok(loc('hidden_grove').advantageTags.every((t) => has(t)), '…the forms at home there are known, though');
  await user.click(toggle('hidden_grove'));
  ok(!has('Floor Plan'), 'a second click closes it');
  const massive = m.LOCATIONS.find((l) => l.minMass && !l.holiday);
  if (massive) { card(massive.id, 'known'); ok(has(`${massive.minTier}+ · Mass ${massive.minMass}+`), 'a ground that needs a minimum mass says so'); }

  // ---------- hunted ----------
  card('manor', 'visited', 1);
  ok(has('Hunted 1 time') && !has('Hunted 1 times'), 'hunted once: "1 time"');
  card('manor', 'visited', 3);
  ok(has('Hunted 3 times'), '…more: "3 times"');
  const { container: manor } = card('manor', 'visited', 3);
  await user.click(toggle('manor'));
  ok(manor.querySelectorAll('.room-cell').length === loc('manor').rooms.length && loc('manor').rooms.every((r) => has(r)), 'hunted there: the whole floor plan, every room named');
  ok(loc('manor').locationCreatures.every((c) => has(`${c.name}`) && has(`+${c.ap}`)), '…and the creatures you can find, with their AP');

  // ---------- each location's twist, once hunted ----------
  const twists = [
    ['sinking_ship', `Sinks after: ${loc('sinking_ship').sinkingTurns} turns`],
    ['snowbound_lodge', 'Snowbound:'],
    ['spell_or_sweet_street', 'Door to door:'],
    ['founders_fair', `Every ${loc('founders_fair').fireworks.every} turns: anyone below can be struck unseen`],
    ['stargazers_hill', `Every ${loc('stargazers_hill').starfall.every} turns a star lands`],
    ['mimic_nest', `${loc('mimic_nest').rivalNest[0]}–${loc('mimic_nest').rivalNest[1]}, one of them the Elder`],
  ];
  for (const [id, line] of twists) {
    const { container } = card(id, 'known');
    await user.click(toggle(id));
    const knownText = container.textContent;
    const { container: visited } = card(id, 'visited', 1);
    await user.click(toggle(id));
    ok(visited.textContent.includes(line) && !knownText.includes(line), `${loc(id).name}: its twist is told only once you've hunted there`);
  }

  // ---------- seasonal ----------
  card('spell_or_sweet_street', 'known');
  ok(has(`${m.HOLIDAYS.halloween.icon} ${m.HOLIDAYS.halloween.name} · ${m.seasonRange('halloween')} · all tiers`), 'a seasonal ground shows its season, open to all tiers');
  ok(!has('Minor+'), '…instead of a tier');
}
