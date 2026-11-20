// The character sheet (src/components/game/CharacterSheet.tsx, with the achievement list), with
// React Testing Library: who the mimic is, its stats and progress, its forms, what it has learned
// and is wearing, its lifetime record and its achievements.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: CharacterSheet } = await load('/src/components/game/CharacterSheet.tsx');
  const user = userEvent.setup();
  const ref = (id) => { const f = m.ALL_FORMS.find((x) => x.id === id); return { formId: id, name: f.name, tier: f.tier, learned: true }; };
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const sheet = (over, onClose) => s.show(CharacterSheet, { character: mimic({ digestiveCapacity: 4, ...over }), onClose }).container;
  // A labelled value: a stat bar, a tile (Mass, Capacity, AP) or a lifetime stat
  const valueOf = (label) => {
    const el = screen.getByText(label, { exact: true });
    return (el.nextElementSibling ?? el.previousElementSibling ?? el.parentElement.nextElementSibling)?.textContent;
  };

  // ---------- who it is ----------
  sheet({ name: 'Hatbox' });
  ok(screen.getByText('Hatbox', { exact: true }) && has(m.nameFlavor('Hatbox')), 'its name, with any remark on it');
  ok(has('Lesser Origin · Lesser Tier') && has(m.TIER_CONFIG.Lesser.lore), 'its origin, tier and lore');
  sheet({ tier: 'Apex', mass: 60, branchTier: 'Primordial' });
  ok(has('Lesser Origin · Primordial Tier') && has(m.BRANCH_TIER_CONFIG.Primordial.lore) && !has('Apex Tier'), 'a branch mimic shows its branch tier and lore, not Apex');
  sheet({ name: 'Grendel' });
  ok(!has('legend in no time'), 'an unremarkable name gets no remark');

  // ---------- stats and progress ----------
  sheet({ plausibility: 4, adhesion: 2, patience: 5, baseAllure: 3, mass: 7, assimilationPoints: 9 });
  ok(valueOf('Plausibility') === '4/6' && valueOf('Adhesion') === '2/6' && valueOf('Patience') === '5/6' && valueOf('Allure Base') === '3/6', 'the four stats, out of 6');
  ok(valueOf('Mass') === '7' && valueOf('Capacity') === '4' && valueOf('AP') === '9', 'mass, capacity and AP');
  ok(has(`9 / ${m.TIER_CONFIG.Lesser.apToEvolve} AP`), 'and how far to the next upgrade');

  // ---------- forms ----------
  sheet({ forms: [ref('lesser_chest'), ref('lesser_crate')], activeFormIndex: 1 });
  const formBox = (name) => screen.getByText(name, { exact: true }).closest('[class*="rounded border"]');
  ok(formBox('Crate').textContent.includes('Active') && !formBox('Chest').textContent.includes('Active'), 'its forms, the one being worn marked Active');
  sheet({ tier: 'Standard', mass: 12, forms: [ref('lesser_haunted_tree')] });
  ok(formBox('Haunted Tree').textContent.includes('Standard'), "a seasonal form shows the tier it counts as, the mimic's own");
  sheet({ forms: [] });
  ok(!has('Known Forms'), 'no forms: no forms list');

  // ---------- what it knows and wears ----------
  sheet({ learnedMaterials: ['Oak', 'Silver', 'Feywood'], learnedTraits: ['Runescript'],
    currentAppearance: { primaryMaterials: ['Silver'], secondaryMaterials: ['Oak'], surfaceTraits: ['Polished'], symbolicTraits: ['Runescript'], conditionTraits: ['Worn'], scentTraits: ['Smoky'] } });
  ok(has('Known Materials (3)') && ['Oak', 'Silver', 'Feywood'].every((x) => screen.getAllByText(x, { exact: true }).length > 0), 'every material it knows, counted');
  const known = screen.getByText('Known Materials (3)').nextElementSibling;
  const chip = (mat) => [...known.children].find((c) => c.textContent === mat).className;
  ok(chip('Oak') !== chip('Silver') && chip('Silver') !== chip('Feywood'), '…coloured by rarity (mundane, valuable, magic)');
  ok(screen.getByText('Known Traits').nextElementSibling.textContent === 'Runescript', 'the traits it has learned');
  const worn = screen.getByText('Current Appearance').nextElementSibling.textContent;
  ok(worn.includes('Primary: Silver') && worn.includes('Secondary: Oak'), 'what it is wearing: its materials');
  ok(worn.includes('Surface: Polished') && worn.includes('Symbolic: Runescript') && worn.includes('Condition: Worn') && worn.includes('Scent: Smoky'), '…and every kind of trait');
  sheet({ learnedMaterials: [], learnedTraits: [] });
  ok(!has('Known Materials') && !has('Known Traits'), 'nothing learned: no empty lists');

  // ---------- its lifetime record ----------
  sheet({ huntsSurvived: 0, huntsFailed: 0 });
  ok(valueOf('Closest call') === '—' && valueOf('Biggest meal') === '—' && valueOf('Favorite form') === '—', 'no hunts yet: a blank record');
  sheet({
    huntsSurvived: 4, huntsFailed: 1, partyMembersEaten: 6, mimicsConsumed: 2, formsUsed: ['lesser_chest', 'lesser_crate'], closestCall: 8,
    biggestMeal: { name: 'Ship\'s Captain', ap: 9 }, lifetimeApEarned: 61, formHuntCounts: { lesser_chest: 3, lesser_crate: 2 }, locationHuntCounts: { manor: 4, sinking_ship: 1 },
  });
  ok(valueOf('Hunts survived') === '4' && valueOf('Hunts failed') === '1' && valueOf('Hunts total') === '5', 'hunts survived, failed and in all');
  ok(valueOf('Entities eaten') === '8' && valueOf('Forms used') === '2' && valueOf('Lifetime AP earned') === '61', 'everything eaten (people and mimics), forms used, AP earned');
  ok(valueOf('Closest call') === '8/10 suspicion' && valueOf('Biggest meal') === "Ship's Captain (9 AP)", 'its closest call and biggest meal');
  ok(valueOf('Favorite form') === 'Chest (3)' && valueOf('Favorite hunting ground') === 'Abandoned Manor (4)', 'its favourite form and hunting ground');

  // ---------- achievements ----------
  sheet();
  const ordinary = m.ACHIEVEMENTS.filter((a) => !a.hidden).length;
  ok(has(`Achievements (0/${ordinary})`) && has('None yet. The Codex lists what to aim for.'), 'no achievements yet: says so (counting only the ones not kept secret)');
  sheet({ name: 'Bilge', downWithTheShipReached: true });
  const ship = m.ACHIEVEMENTS.find((a) => a.id === 'downWithTheShip');
  ok(has(`Achievements (1/${ordinary})`) && screen.getByText(ship.name) && has(ship.flavor('Bilge')), 'an earned one: named, in its words, with the mimic in it');
  sheet({ name: 'Rex', tier: 'Apex', mass: 60, branchTier: 'Primordial' });
  ok(has(`Achievements (1/${ordinary + 1})`) && screen.getByText('Primordial', { selector: '.font-cinzel' }) && has(m.ACHIEVEMENTS.find((a) => a.id === 'primordial').flavor('Rex')),
    'a hidden one, once earned: listed, and counted in the total');

  // ---------- one frame: the header stays put, the body scrolls inside it ----------
  const framed = sheet({}, spy());
  const viewport = framed.querySelector('[data-radix-scroll-area-viewport]');
  ok(viewport && viewport.textContent.includes('Lifetime Stats') && viewport.textContent.includes('Achievements'), 'the body scrolls, inside the card');
  ok(!viewport.contains(screen.getByRole('button', { name: 'Close' })) && !viewport.contains(screen.getByText('Testy', { exact: true })), "…the name and Close stay put above it");

  // ---------- closing ----------
  const onClose = spy();
  sheet({}, onClose);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  ok(onClose.calls.length === 1, 'Close closes it');
  sheet();
  ok(screen.queryByRole('button', { name: 'Close' }) === null, '…and given nothing to close it with, it shows no Close button');
}
