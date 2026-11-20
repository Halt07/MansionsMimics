// The home page (src/pages/Home.tsx), with React Testing Library and the in-memory database:
// the way in (create a mimic, read the Codex), your saved mimics and continuing one, deleting
// one (only after confirming), and the Peak of the Apex.
import { createElement } from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setup, saveMimic, withEmptyDb } from './screen.mjs';

export default async function ({ gameData: m, db: dbModule, storage, load, ok }) {
  const s = await setup(load);
  const { default: Home } = await load('/src/pages/Home.tsx');
  const { db } = dbModule;
  const user = userEvent.setup();
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  // Home loads the saved mimics when it opens; wait for that
  const open = async (expectMimics = true) => {
    s.show(() => createElement(MemoryRouter, null, createElement(Home)));
    if (expectMimics) await screen.findByRole('heading', { name: 'Your Mimics' });
    else await new Promise((r) => setTimeout(r, 20));
  };
  const cardOf = (name) => screen.getByRole('heading', { level: 3, name }).closest('.rounded-xl');
  const names = () => [...document.querySelectorAll('h3.truncate')].map((h) => h.textContent);
  const saved = async () => (await db.entities.MimicCharacter.list()).map((c) => c.name).sort();

  await withEmptyDb(storage, async () => {
    // ---------- no mimics yet ----------
    await open(false);
    ok(!has('Your Mimics') && !has('Peak of the Apex'), 'no mimics: no list, no hall of fame');
    ok(screen.getByRole('link', { name: 'Begin Your Hunger' }).getAttribute('href') === '/CharacterCreation', 'Begin Your Hunger makes a new mimic');
    ok(screen.getByRole('link', { name: 'Read the Codex' }).getAttribute('href') === '/Codex', 'Read the Codex opens it');
    ok(m.TIER_ORDER.every((t) => screen.getByText(t, { exact: true })), 'the path of growth, every tier');

    // ---------- your mimics ----------
    const gristle = await saveMimic(db, { name: 'Gristle', plausibility: 4, adhesion: 2, patience: 5 });
    await saveMimic(db, { name: 'Hatbox', tier: 'Standard', mass: 12, downWithTheShipReached: true });
    await open();
    ok(names().join() === 'Hatbox,Gristle', 'saved mimics are listed, newest first');
    ok(cardOf('Gristle').textContent.includes('PL: 4') && cardOf('Gristle').textContent.includes('AD: 2') && cardOf('Gristle').textContent.includes('PA: 5'), 'each shows its stats');
    ok(within(cardOf('Hatbox')).getByText('Standard') && cardOf('Hatbox').textContent.includes(m.TIER_CONFIG.Standard.description), '…its tier, described');
    const ship = m.ACHIEVEMENTS.find((a) => a.id === 'downWithTheShip');
    ok(within(cardOf('Hatbox')).getByTitle(ship.name).textContent === ship.icon && !within(cardOf('Gristle')).queryByTitle(ship.name), '…and the achievements it has earned');
    ok(within(cardOf('Gristle')).getByRole('link', { name: 'Continue' }).getAttribute('href') === `/Game?characterId=${gristle.id}`, 'Continue goes back to hunting with that mimic');

    // ---------- deleting ----------
    await user.click(screen.getByRole('button', { name: 'Delete Gristle' }));
    const dialog = await screen.findByRole('alertdialog');
    ok(within(dialog).getByRole('heading', { name: 'Delete Gristle?' }) && within(dialog).getByText("This can't be undone.", { exact: false }), 'deleting asks first, and says it is for good');
    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    await waitFor(() => { if (screen.queryByRole('alertdialog')) throw new Error('still open'); });
    ok(names().includes('Gristle') && (await saved()).includes('Gristle'), '"Keep it": nothing is deleted');

    await user.click(screen.getByRole('button', { name: 'Delete Gristle' }));
    await user.keyboard('{Escape}');
    await waitFor(() => { if (screen.queryByRole('alertdialog')) throw new Error('still open'); });
    ok((await saved()).includes('Gristle'), 'Escape backs out too');

    await user.click(screen.getByRole('button', { name: 'Delete Gristle' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => { if (names().includes('Gristle')) throw new Error('still listed'); });
    ok((await saved()).join() === 'Hatbox' && names().join() === 'Hatbox', 'confirming deletes that mimic (and only that one)');

    const remove = db.entities.MimicCharacter.delete;
    const logError = console.error;
    db.entities.MimicCharacter.delete = async () => { throw new Error('storage is locked'); };
    console.error = () => {}; // the page logs the failure; expected here
    try {
      await user.click(screen.getByRole('button', { name: 'Delete Hatbox' }));
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
      await screen.findByText('Could not delete Hatbox: storage is locked');
      ok(names().includes('Hatbox'), "if deleting fails, it says why and the mimic stays");
    } finally {
      db.entities.MimicCharacter.delete = remove;
      console.error = logError;
    }
  });

  // ---------- lots of mimics ----------
  await withEmptyDb(storage, async () => {
    for (let i = 1; i <= 6; i++) await saveMimic(db, { name: `Mimic ${i}` });
    await open();
    ok(names().length === 6 && cardOf('Mimic 1').parentElement.className.includes('overflow-x-auto'), 'more than five: the list becomes a row that scrolls');
  });

  // ---------- Peak of the Apex ----------
  await withEmptyDb(storage, async () => {
    for (const name of ['Old Titan', 'Colossus', 'Behemoth', 'Leviathan']) {
      await saveMimic(db, { name, tier: 'Apex', mass: 40, apexPeakReached: true, plausibility: 6 });
    }
    await saveMimic(db, { name: 'Small Fry' });
    await saveMimic(db, { name: 'Usurper', tier: 'Apex', mass: 100, apexPeakReached: true, branchTier: 'Sovereign' });
    await open();
    const hall = screen.getByRole('heading', { name: 'Peak of the Apex' }).parentElement;
    const legends = [...hall.querySelectorAll('h3')].map((h) => h.textContent);
    ok(legends.join() === 'Usurper,Leviathan,Behemoth', 'the hall of fame: the three latest to reach the peak');
    ok(hall.textContent.includes('Mass 40 · Apex Tier') && hall.textContent.includes('PL 6'), '…with their mass and stats');
    ok(hall.textContent.includes('Mass 100 · Sovereign Tier'), '…a branch mimic by its branch tier');
    const usurper = screen.getAllByRole('heading', { level: 3, name: 'Usurper' }).map((h) => h.closest('.rounded-xl')).find((c) => !hall.contains(c));
    ok(within(usurper).getByText('Sovereign') && usurper.textContent.includes(m.BRANCH_TIER_CONFIG.Sovereign.description) && !within(usurper).queryByText('Apex'),
      'its card shows the branch tier, described, not Apex');
    ok(!legends.includes('Small Fry'), '…and nobody who has not');
  });
}
