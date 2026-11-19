// Making a new mimic (src/pages/CharacterCreation.tsx), clicked through with React Testing Library:
// origin, name, two starting forms, a starting look, then saving it (to the in-memory db) and
// going to the game. Each step's Continue only opens once the step is done. The date is pinned.
import { createElement, Fragment } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { setup, onDate } from './screen.mjs';

export default async function ({ gameData: m, db: dbModule, storage, load, ok }) {
  const s = await setup(load);
  const { default: CharacterCreation } = await load('/src/pages/CharacterCreation.tsx');
  const { Toaster } = await load('/src/components/ui/toaster.tsx');
  const { db } = dbModule;
  const user = userEvent.setup();
  const saved = new Map(storage);

  // The page inside a router, with the game page standing in as where you land, and the toasts
  const Landed = () => createElement('p', null, `In the game: ${useLocation().search}`);
  const App = () => createElement(Fragment, null,
    createElement(MemoryRouter, { initialEntries: ['/CharacterCreation'] },
      createElement(Routes, null,
        createElement(Route, { path: '/CharacterCreation', element: createElement(CharacterCreation) }),
        createElement(Route, { path: '/Game', element: createElement(Landed) }))),
    createElement(Toaster));

  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const button = (name) => screen.getByRole('button', { name });
  const next = () => button(/Continue/);
  const back = () => button(/Back/);
  const heading = (name) => screen.getByRole('heading', { name });
  const formNames = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
  const formCard = (name) => heading(name).closest('.rounded-xl');
  const origin = (type) => screen.getByText(`${type} Mimic`, { selector: '.font-cinzel' });
  const picked = (b) => b.className.includes('bg-primary/10');
  const baseForms = (tiers) => tiers.flatMap((t) => m.MASTER_FORMS[t]).filter((f) => !f.variantOf);

  try {
    onDate(storage, '5-15');
    s.show(App);

    // ---------- origin ----------
    ok(next().disabled && back().disabled, 'to begin: no origin chosen, so nothing to continue to (or back to)');
    ok(origin('Minor') && origin('Lesser'), 'two origins to choose from');
    const originCard = (type) => origin(type).closest('[role="button"]');
    ok(originCard('Minor').getAttribute('aria-pressed') === 'false' && originCard('Minor').tabIndex === 0, 'each origin is a button the keyboard can reach, not yet chosen');
    originCard('Lesser').focus();
    await user.keyboard('{Enter}');
    ok(originCard('Lesser').getAttribute('aria-pressed') === 'true' && !next().disabled, '…Enter chooses one (announced as chosen)');
    await user.click(origin('Minor'));
    ok(!next().disabled && originCard('Minor').getAttribute('aria-pressed') === 'true' && originCard('Lesser').getAttribute('aria-pressed') === 'false', 'choosing the other swaps them, and Continue stays open');

    // ---------- name ----------
    await user.click(next());
    const nameBox = screen.getByPlaceholderText("Enter your mimic's name...");
    await user.type(nameBox, ' H ');
    ok(next().disabled, 'a name needs two letters (spaces around it do not count)');
    await user.clear(nameBox);
    await user.type(nameBox, 'Hatbox');
    ok(!next().disabled, '…then Continue opens');

    // ---------- forms (Minor) ----------
    await user.click(next());
    const minorForms = baseForms(['Minor', 'Lesser']).map((f) => f.name);
    ok(formNames().join() === minorForms.join(), 'Minor: base forms from its own tier and the one above (no variants, nothing in season today)');
    ok(next().disabled, 'no forms chosen: Continue stays shut');
    const [minorA, minorB, minorC] = m.MASTER_FORMS.Minor.filter((f) => !f.variantOf);
    const [lesserA, lesserB] = m.MASTER_FORMS.Lesser.filter((f) => !f.variantOf);
    ok(formCard(lesserA.name).textContent.includes('–2 Plaus.') && !formCard(minorA.name).textContent.includes('–2 Plaus.'), 'a form from the tier above is marked with its penalty');
    await user.click(heading(lesserA.name));
    ok(formCard(lesserB.name).className.includes('cursor-not-allowed') && formCard(lesserB.name).textContent.includes('You already chose a form from the tier above.'), 'one from the tier above: the others there are blocked, saying why');
    await user.click(heading(lesserB.name));
    ok(next().disabled, '…clicking one does nothing (still only one chosen)');
    await user.click(heading(minorA.name));
    ok(!next().disabled && has(`✓ ${lesserA.name} & ${minorA.name} selected`), 'two chosen: Continue opens, and the pair is named');
    await user.click(heading(minorB.name));
    ok(!formCard(minorB.name).textContent.includes('You already chose') && formCard(minorB.name).className.includes('cursor-not-allowed'), 'a third is blocked by the limit (not blamed on the tier rule)');
    ok(formCard(minorB.name).getAttribute('aria-disabled') === 'true' && formCard(minorA.name).getAttribute('aria-pressed') === 'true', '…and screen readers hear which are chosen and which unavailable');
    formCard(minorA.name).focus();
    await user.keyboard(' ');
    ok(next().disabled && formCard(minorA.name).getAttribute('aria-pressed') === 'false', 'Space on a chosen form puts it back');
    await user.keyboard('{Enter}');
    ok(!next().disabled, '…Enter picks it again');

    // ---------- appearance ----------
    await user.click(next());
    ok(has(`As a Minor mimic you start with: ${m.STARTING_MATERIALS.Minor.join(', ')}.`), 'the starting materials named are the ones a Minor mimic has');
    ok(m.STARTING_MATERIALS.Minor.every((mat) => button(mat)) && has('Select at least a primary material to continue.') && next().disabled, 'a primary material is required');
    await user.click(button('Pine'));
    await user.click(button('Iron'));
    ok(picked(button('Iron')) && !picked(button('Pine')) && !next().disabled, 'one primary material: a second pick swaps it');
    await user.click(button('Polished'));
    await user.click(button('Smooth'));
    ok(picked(button('Polished')) && !picked(button('Smooth')), 'one surface trait: a second is ignored until the first is taken off');
    await user.click(button('Worn'));

    // ---------- changing your mind about the origin ----------
    await user.click(back());
    await user.click(back());
    await user.click(back());
    await user.click(origin('Lesser'));
    await user.click(next());
    await user.click(next());
    ok(formNames().join() === baseForms(['Minor', 'Lesser', 'Standard']).map((f) => f.name).join(), 'switching to Lesser: forms from a tier either side');
    ok(next().disabled, '…and the forms chosen for the old origin are cleared');
    ok(formCard(minorA.name).textContent.includes('–1 Pat.'), 'a form from the tier below is marked with its penalty');
    await user.click(heading(minorC.name));
    await user.click(heading(lesserB.name));
    await user.click(next());
    ok(has(`As a Lesser mimic you start with: ${m.STARTING_MATERIALS.Lesser.join(', ')}.`), "the materials named are now the Lesser mimic's");
    ok(picked(button('Iron')) && !next().disabled, 'a material both origins know (Iron) stays chosen');

    // ---------- confirming ----------
    await user.click(next());
    ok(heading('Hatbox') && has('Lesser Mimic') && has(m.TIER_CONFIG.Lesser.lore), 'the summary: name, origin and lore');
    ok(has(`${minorC.name}`) && has(`${lesserB.name}`) && has('Iron, Polished, Worn'), '…the forms and the look');
    const before = (await db.entities.MimicCharacter.list()).length;
    await user.click(button('Begin the Hunt'));
    const all = await db.entities.MimicCharacter.list();
    const made = all.find((c) => c.name === 'Hatbox');
    ok(all.length === before + 1 && made, 'Begin the Hunt saves the new mimic');
    ok(made && made.tier === 'Lesser' && made.mass === m.STARTING_STATS.Lesser.mass && made.plausibility === m.STARTING_STATS.Lesser.plausibility, '…as a Lesser mimic, with its starting stats');
    ok(made && made.forms.map((f) => f.formId).join() === `${minorC.id},${lesserB.id}` && made.activeFormIndex === 0, '…its two forms, the first one worn');
    ok(made && made.learnedMaterials.join() === m.STARTING_MATERIALS.Lesser.join() && made.currentAppearance.primaryMaterials.join() === 'Iron'
      && made.currentAppearance.surfaceTraits.join() === 'Polished' && made.currentAppearance.conditionTraits.join() === 'Worn', '…knowing its starting materials, and wearing the look chosen');
    ok(made && has(`In the game: ?characterId=${made.id}`), '…then goes to the game, with that mimic');
    ok(has(m.nameFlavor('Hatbox')), 'a name with a remark gets one');

    // ---------- when saving fails ----------
    const create = db.entities.MimicCharacter.create;
    db.entities.MimicCharacter.create = async () => { throw new Error('the disk is full'); };
    const logError = console.error;
    console.error = () => {}; // the page logs the failure; expected here
    try {
      s.show(App);
      await user.click(origin('Minor'));
      await user.click(next());
      await user.type(screen.getByPlaceholderText("Enter your mimic's name..."), 'Plain');
      await user.click(next());
      await user.click(heading(minorA.name));
      await user.click(heading(minorB.name));
      await user.click(next());
      await user.click(button('Pine'));
      await user.click(next());
      await user.click(button('Begin the Hunt'));
      ok(has('Could not create your mimic: the disk is full') && !has('In the game'), "if saving fails, it says why and stays put");
      ok(!button('Begin the Hunt').disabled, '…ready to try again');
    } finally {
      db.entities.MimicCharacter.create = create;
      console.error = logError;
    }
  } finally {
    onDate(storage, null);
    storage.clear();
    for (const [k, v] of saved) storage.set(k, v);
  }
}
