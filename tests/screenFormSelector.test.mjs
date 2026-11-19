// Choosing forms (src/components/game/FormSelector.tsx), clicked through with React Testing
// Library: which forms are offered at the mimic's size, which variants are locked and how to unlock
// them, choosing and un-choosing, the one-form-above rule and the three-form limit, seasonal forms
// in season, and what Confirm and Keep Current hand back. The date is pinned.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic, onDate } from './screen.mjs';

export default async function ({ gameData: m, load, storage, ok }) {
  const s = await setup(load);
  const { default: FormSelector } = await load('/src/components/game/FormSelector.tsx');
  const user = userEvent.setup();
  const ref = (id) => { const f = m.ALL_FORMS.find((x) => x.id === id); return { formId: id, name: f.name, tier: f.tier, learned: true }; };
  const open = (character, onConfirm = spy(), onSkip = spy()) => s.show(FormSelector, { character, onConfirm, onSkip }).container;
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  // A form's card (a button), by the form's name
  const cardFor = (name) => screen.getAllByRole('button').find((b) => b.querySelector('.font-cinzel')?.textContent === name);
  const cardNames = () => screen.getAllByRole('button').map((b) => b.querySelector('.font-cinzel')?.textContent).filter(Boolean);
  const chosen = (name) => cardFor(name).textContent.includes('✓');
  const greyed = (name) => cardFor(name).className.includes('cursor-not-allowed');
  const selected = () => document.body.textContent.match(/Selected: (\d) \/ 3/)?.[1];
  const nothing = { learnedMaterials: [], learnedTraits: [] };

  try {
    onDate(storage, '5-15');

    // ---------- what's offered ----------
    open(mimic());
    const offered = m.getValidForms('Lesser', 6, nothing);
    ok(offered.length > 0 && offered.every((f) => cardFor(f.name)) && cardNames().length === offered.length, 'every form a Lesser mimic can take has a card, and no others');
    ok(has('Minor Tier (Below — simpler forms, –1 Patience)') && has('Lesser Tier (Current)')
      && has(`Standard Tier (Above — ambitious forms, –2 Plausibility, max ${m.MAX_FORMS_ABOVE_TIER})`), 'grouped by tier: below, current and above, with what each costs');
    ok(!has('Greater Tier'), 'nothing two tiers up');

    // ---------- variants ----------
    const locked = m.getLockedVariants('Lesser', 6, nothing);
    const v = locked[0];
    const base = m.ALL_FORMS.find((f) => f.id === v.variantOf).name;
    ok(locked.length > 0 && has(`🔒 ${v.name}`) && has(`— variant of ${base}`) && !cardFor(v.name), 'a variant not yet unlocked is shown locked, and is not a choice');
    ok(has(`Learn ${v.unlockedBy.join(', ').replace(/, ([^,]*)$/, ' or $1')} to unlock.`), '…saying what to learn');
    const key = v.unlockedBy[0];
    open(mimic(m.ALL_MATERIALS.includes(key) ? { learnedMaterials: [key] } : { learnedTraits: [key] }));
    ok(cardFor(v.name)?.textContent.includes(`🗝️ Variant of ${base}`) && !has(`🔒 ${v.name}`), 'once learned, it can be chosen');

    // ---------- choosing ----------
    const lesser = offered.filter((f) => f.tier === 'Lesser' && !f.variantOf && f.id !== 'lesser_chest');
    const standard = offered.filter((f) => f.tier === 'Standard' && !f.variantOf);
    open(mimic());
    ok(selected() === '1' && chosen('Chest'), "the mimic's current forms start chosen");
    await user.click(cardFor(lesser[0].name));
    ok(selected() === '2' && chosen(lesser[0].name), 'clicking a form chooses it');
    await user.click(cardFor(lesser[0].name));
    ok(selected() === '1' && !chosen(lesser[0].name), 'clicking it again puts it back');

    await user.click(cardFor(standard[0].name));
    ok(chosen(standard[0].name) && greyed(standard[1].name), 'one form from the tier above: the others there are greyed out');
    ok(cardFor(standard[1].name).textContent.includes('You already have a form from the tier above.'), '…saying why');
    await user.click(cardFor(standard[1].name));
    ok(!chosen(standard[1].name) && selected() === '2', '…and clicking one does nothing');
    ok(!greyed(lesser[0].name), '…the rest of the tiers are still open');

    await user.click(cardFor(lesser[0].name));
    ok(selected() === '3' && greyed(lesser[1].name), 'three chosen: everything else is greyed out');
    ok(!cardFor(standard[1].name).textContent.includes('already have a form from the tier above'), "…and with all three chosen, it's the limit in the way, so the tier-above rule isn't blamed");
    await user.click(cardFor(lesser[1].name));
    ok(selected() === '3' && !chosen(lesser[1].name), '…a fourth click does nothing');

    // ---------- handing back the choice ----------
    const onConfirm = spy();
    const onSkip = spy();
    open(mimic(), onConfirm, onSkip);
    await user.click(cardFor(lesser[0].name));
    await user.click(screen.getByRole('button', { name: 'Confirm Forms (2)' }));
    ok(onConfirm.calls.length === 1 && onConfirm.calls[0][0].map((f) => f.id).join() === `lesser_chest,${lesser[0].id}`, 'Confirm hands back the chosen forms, in the order chosen');
    await user.click(screen.getByRole('button', { name: 'Keep Current' }));
    ok(onSkip.calls.length === 1, 'Keep Current keeps what the mimic has');

    open(mimic({ forms: [] }));
    ok(screen.getByRole('button', { name: 'Confirm Forms (0)' }).disabled && screen.getByRole('button', { name: 'Keep Current' }).disabled, 'no forms: nothing to confirm or keep');
    ok(screen.getByRole('button', { name: 'Keep Current' }).title.startsWith('You have no forms left to keep'), '…and Keep Current says why');

    // ---------- burns and Thimblewood ----------
    open(mimic({ burnedForms: [{ formId: 'lesser_chest', huntsLeft: 1 }] }));
    ok(cardFor('Chest').textContent.includes('🔥 Discovered'), 'a burned form says so');
    open(mimic({ currentAppearance: { primaryMaterials: ['Thimblewood'] } }));
    ok(has("Thimblewood shrank you: you're choosing forms as a Minor mimic, not a Lesser."), 'Thimblewood: forms are chosen a tier down');
    ok(!has('Standard Tier') && has('Lesser Tier (Above'), '…so the tiers shift down with it');
    open(mimic());
    ok(!has('✨ Seasonal'), 'out of season: no seasonal forms');

    // ---------- in season ----------
    onDate(storage, '10-31');
    open(mimic());
    const seasonal = m.getSeasonalForms('Lesser', new Date(2026, 9, 31));
    ok(has('✨ Seasonal (count as your own tier, no penalty)') && seasonal.length > 0 && seasonal.every((f) => cardFor(f.name)), "on All Hallows' Eve, its forms are offered");
    ok(cardFor(seasonal[0].name).textContent.includes(`${m.HOLIDAYS.halloween.icon} ${m.HOLIDAYS.halloween.name} · until ${m.seasonEnd('halloween')}`), '…with how long they last');
  } finally {
    onDate(storage, null);
  }
}
