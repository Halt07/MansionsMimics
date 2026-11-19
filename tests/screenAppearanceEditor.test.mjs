// Adjusting the mimic's appearance (src/components/game/AppearanceEditor.tsx), clicked through with
// React Testing Library: material slots per tier (a slot of one swaps, a material fills one slot at
// a time), the magic-material cap, traits offered only once known, the Thimblewood warning, and
// what Apply hands back.
import { createElement, Fragment } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: AppearanceEditor } = await load('/src/components/game/AppearanceEditor.tsx');
  const { Toaster } = await load('/src/components/ui/toaster.tsx');
  const user = userEvent.setup();
  // The editor with the app's toasts beside it (Thimblewood warns with one)
  const WithToasts = (props) => createElement(Fragment, null, createElement(AppearanceEditor, props), createElement(Toaster));
  const open = (over) => {
    const handlers = { onSave: spy(), onClose: spy() };
    s.show(WithToasts, { character: mimic(over), ...handlers });
    return handlers;
  };
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  // For sentences with a styled word inside (getByText matches one element's own text)
  const reads = (t) => document.body.textContent.includes(t);
  // A material's button in a slot (0: primary, 1: secondary), or a trait's button
  const slot = (mat, i = 0) => screen.queryAllByRole('button', { name: mat })[i];
  const on = (b) => b.className.includes('bg-primary/10') || b.className.includes('bg-purple-400/10');
  const blocked = (b) => b.getAttribute('aria-disabled') === 'true';

  // ---------- nothing learned yet ----------
  open({ learnedMaterials: [] });
  ok(has('No materials learned yet.'), 'no materials learned: says so');

  // ---------- a Lesser mimic: one primary material, no secondary ----------
  open({ learnedMaterials: ['Oak', 'Iron'] });
  ok(has('Primary Material — learned only') && !has('Secondary'), 'Lesser: one primary material slot, and no secondary');
  await user.click(slot('Oak'));
  ok(on(slot('Oak')), 'clicking a material wears it');
  ok(slot('Oak').getAttribute('aria-pressed') === 'true' && slot('Iron').getAttribute('aria-pressed') === 'false', '…announced as pressed (worn), the rest not');
  await user.click(slot('Iron'));
  ok(on(slot('Iron')) && !on(slot('Oak')), '…a slot of one swaps it for the next one clicked');
  await user.click(slot('Iron'));
  ok(!on(slot('Iron')), '…clicking it again takes it off');

  // ---------- a Standard mimic: primary and secondary ----------
  open({ tier: 'Standard', mass: 12, learnedMaterials: ['Oak', 'Iron'] });
  ok(has('Secondary Material') && screen.getAllByRole('button', { name: 'Oak' }).length === 2, 'Standard: a secondary slot too, offering the same materials');
  await user.click(slot('Oak', 0));
  ok(blocked(slot('Oak', 1)) && slot('Oak', 1).title === 'Already used in your other material slot.', 'a material in one slot is greyed out in the other, saying why');
  await user.click(slot('Oak', 1));
  ok(!on(slot('Oak', 1)), '…and clicking it there does nothing');
  await user.click(slot('Iron', 1));
  ok(on(slot('Oak', 0)) && on(slot('Iron', 1)), 'one material in each slot');

  // ---------- magic materials ----------
  open({ tier: 'Standard', mass: 12, learnedMaterials: ['Oak', 'Feywood', 'Shadowwood'] });
  ok(has('0/1') && has('in use'), 'magic learned: how many can be worn (one, at Standard)');
  ok(slot('Feywood').title === m.MAGIC_EFFECTS.Feywood, "a magic material's button says what it does");
  await user.click(slot('Feywood', 0));
  ok(has('1/1') && reads(`Feywood: ${m.MAGIC_EFFECTS.Feywood}`) && has('arcane residue'), 'wearing one: counted, its effect shown, and the residue warned of');
  ok(blocked(slot('Shadowwood', 1)) && slot('Shadowwood', 1).title === 'You are unable to imitate any more magic materials at one time.', 'at the cap: another magic material is greyed out in the other slot');
  ok(!blocked(slot('Shadowwood', 0)), '…but not in the same slot, where it would replace the first');
  await user.click(slot('Shadowwood', 0));
  ok(on(slot('Shadowwood', 0)) && !on(slot('Feywood', 0)) && has('1/1'), '…and picking it there swaps one magic material for the other');
  ok(!blocked(slot('Oak', 1)), 'ordinary materials are never capped');

  open({ tier: 'Greater', mass: 20, learnedMaterials: ['Feywood', 'Shadowwood'] });
  await user.click(slot('Feywood', 0));
  await user.click(slot('Shadowwood', 1));
  ok(on(slot('Feywood', 0)) && on(slot('Shadowwood', 1)) && has('2/2'), 'Greater: two magic materials at once');

  open({ tier: 'Minor', mass: 3, learnedMaterials: ['Feywood'] });
  ok(reads("Your tier can't wear magical materials yet.") && blocked(slot('Feywood')) && slot('Feywood').title === 'Your tier is too inexperienced to imitate magic materials.', "Minor: magic can't be worn at all");

  // ---------- traits ----------
  open({ learnedTraits: [] });
  ok(m.STARTING_TRAITS.surface.every((t) => slot(t)) && !slot('Gilded'), 'surface traits: the ones every mimic knows, not ones it has to learn');
  open({ learnedTraits: ['Gilded'] });
  ok(slot('Gilded'), '…a learned one is offered too');
  open({ learnedTraits: [], currentAppearance: { surfaceTraits: ['Gilded'] } });
  ok(slot('Gilded') && on(slot('Gilded')), '…and one worn but not known (an older save) stays, so it can be taken off');

  open();
  await user.click(slot('Polished'));
  await user.click(slot('Smooth'));
  ok(on(slot('Polished')) && !on(slot('Smooth')), "Lesser wears one surface trait: a second click doesn't swap, it's ignored");
  ok(slot('Polished').getAttribute('aria-pressed') === 'true' && slot('Smooth').getAttribute('aria-pressed') === 'false', '…traits announce whether they are worn too');
  ok(has('No scents learned yet.') && !has('Symbolic Traits'), 'no scents learned: says so; and no symbolic traits until Standard');
  open({ tier: 'Standard', mass: 12 });
  ok(has('No symbolic traits learned yet.'), 'Standard: symbolic traits, once learned');
  open({ tier: 'Standard', mass: 12, learnedTraits: ['Runescript', 'Smoky'] });
  ok(slot('Runescript') && slot('Smoky') && !slot('Guild Mark'), '…offering only the learned ones (and learned scents)');

  // ---------- Thimblewood ----------
  open({ learnedMaterials: ['Oak', 'Thimblewood'] });
  await user.click(slot('Thimblewood'));
  ok(has('🪵 Thimblewood will shrink you') && has('Applying this appearance will take you to choose your forms.'), 'picking Thimblewood warns that it will shrink you');
  await user.click(slot('Oak'));
  ok(has('🪵 Removing Thimblewood will restore your size'), '…swapping it out warns that you will grow back');

  // ---------- applying ----------
  const handlers = open({ tier: 'Standard', mass: 12, learnedMaterials: ['Oak', 'Iron'], currentAppearance: { conditionTraits: ['Worn'] } });
  await user.click(slot('Oak', 0));
  await user.click(slot('Polished'));
  await user.click(screen.getByRole('button', { name: /Apply Appearance/ }));
  const saved = handlers.onSave.calls[0]?.[0];
  ok(saved && saved.primaryMaterials.join() === 'Oak' && saved.surfaceTraits.join() === 'Polished' && saved.conditionTraits.join() === 'Worn' && saved.secondaryMaterials.length === 0,
    'Apply hands back the whole look: what was clicked, and what was already worn');
  await user.click(screen.getByRole('button', { name: 'Close' }));
  ok(handlers.onClose.calls.length === 1, 'the ✕ closes the editor');
}
