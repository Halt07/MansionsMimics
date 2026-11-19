// The hunt's status cards (src/components/game/hunt/StatusPanel.tsx, with StatBar and
// SuspicionMeter), from real hunts with React Testing Library: the form you're wearing, your
// look, your stats with whatever is pulling them down (hover for why), suspicion and AP.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: StatusPanel } = await load('/src/components/game/hunt/StatusPanel.tsx');
  const user = userEvent.setup();
  const opts = { random: () => 0.5, now: new Date('2026-05-15T12:00:00Z') };
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  const { hunt } = m.beginHunt(mimic(), manor, manor.rooms[0], opts);
  const ref = (id) => { const f = m.ALL_FORMS.find((x) => x.id === id); return { formId: id, name: f.name, tier: f.tier, learned: true }; };
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const show = (character, h = hunt) => s.showInHunt(StatusPanel, {}, s.huntState(character, h));
  // A stat's row: its label, then its value (and, hovered, why it's lower)
  const stat = (label) => screen.getByText(label, { exact: true }).parentElement.parentElement;
  const value = (label) => stat(label).querySelector('.font-bold').textContent;

  // ---------- the form and the look ----------
  const chest = m.ALL_FORMS.find((f) => f.id === 'lesser_chest');
  show(mimic({ currentAppearance: { primaryMaterials: ['Oak'], surfaceTraits: ['Polished'], conditionTraits: ['Worn'] } }));
  ok(has('Active Form') && has('Chest') && has(chest.description), 'the form being worn, and what it is');
  ok(chest.builtInTraits.length > 0 && screen.getByText(chest.builtInTraits.join(', '), { exact: true }), "…and the traits it can't take off");
  ok(['Oak', 'Polished', 'Worn'].every((t) => screen.getByText(t, { exact: true })), 'the look: materials and every kind of trait');
  show(mimic({ forms: [] }));
  ok(has('None'), 'no form: None');

  // ---------- stats, as they are ----------
  show(mimic({ plausibility: 4, adhesion: 3, patience: 5 }));
  ok(value('Plausibility') === '4/6' && value('Adhesion') === '3/6' && value('Patience') === '5/6', 'each stat out of 6, when nothing is pulling it down');
  await user.hover(stat('Plausibility'));
  ok(!has('penalty') && !has('form tier'), "…and hovering shows nothing, since there's nothing to explain");

  // ---------- …and what pulls them down ----------
  show(mimic({ plausibility: 4, mass: 4 }));
  ok(value('Plausibility') === '3 (4-1)', 'small for its tier: Plausibility shows what it is, and why');
  await user.hover(stat('Plausibility'));
  ok(has('–1 mass penalty') && has("Your mass is below your tier's minimum."), '…hovering explains: a mass penalty');
  await user.unhover(stat('Plausibility'));
  ok(!has('–1 mass penalty'), '…which goes when the pointer leaves');

  const above = m.MASTER_FORMS.Standard.find((f) => !f.variantOf);
  show(mimic({ plausibility: 4, forms: [ref(above.id)] }));
  ok(value('Plausibility') === '2 (4-2)', 'a form from the tier above: –2 Plausibility');
  await user.hover(stat('Plausibility'));
  ok(has('–2 form tier') && has("Your form is from the tier above — you can't quite match its appearance"), '…explained on hover');
  const below = m.MASTER_FORMS.Minor.find((f) => !f.variantOf);
  show(mimic({ patience: 4, forms: [ref(below.id)] }));
  ok(value('Patience') === '3 (4-1)' && value('Plausibility') === '3/6', 'a form from the tier below: –1 Patience instead');

  const sickness = m.SICKNESSES.find((x) => Object.values(x.penalties).some((v) => v > 0));
  const [sickStat, sickBy] = Object.entries(sickness.penalties).find(([, v]) => v > 0);
  const label = { plausibility: 'Plausibility', adhesion: 'Adhesion', patience: 'Patience' }[sickStat];
  const sick = mimic({ plausibility: 4, adhesion: 4, patience: 4 });
  show(sick, { ...hunt, sickness });
  ok(value(label) === `${4 - sickBy} (4-${sickBy})`, `sick (${sickness.name}): ${label} is lowered`);
  await user.hover(stat(label));
  ok(has(`–${sickBy} ${sickness.name}`) && has('This penalty lasts the current hunt only.'), '…explained on hover, as lasting this hunt only');

  // ---------- suspicion and AP ----------
  // Each level covers two points; the odd ones are the last of each (where rounding would go wrong)
  const levels = [[0, 'Unsuspecting'], [1, 'Unsuspecting'], [2, 'Curious'], [3, 'Curious'], [4, 'Wary'], [5, 'Wary'],
    [6, 'Alert'], [7, 'Alert'], [8, 'HUNT MODE'], [9, 'HUNT MODE'], [10, 'HUNT MODE']];
  const shown = [];
  for (const [suspicion, word] of levels) {
    show(mimic(), { ...hunt, suspicion });
    shown.push(has(word) && has(`${suspicion}/10`));
  }
  ok(shown.every(Boolean), 'suspicion: out of 10, from Unsuspecting to HUNT MODE');
  const ap = m.TIER_CONFIG.Lesser.apToEvolve;
  show(mimic({ assimilationPoints: 7 }));
  ok(has('7 AP') && has(`7 / ${ap} AP`), 'AP, and how far to the next upgrade');
}
