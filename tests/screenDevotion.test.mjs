// A Devotion ceremony in the real game screen (src/pages/Game.tsx), with React Testing Library:
// at the Hollow Reliquary, once a devoted pilgrim is the last one left, they bring offerings one
// at a time. Each offering's AP is saved as it's accepted, so leaving partway keeps what was
// given, and lifetime AP never runs ahead of it. The dice are pinned (at 0.85, one Lure from the Nave
// and three Strikes leave a devoted pilgrim alone), and the
// ceremony's 2-second steps are sped up twenty times.
import { createElement } from 'react';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setup, saveMimic, withEmptyDb, onDate } from './screen.mjs';

export default async function ({ db: dbModule, storage, load, ok }) {
  const s = await setup(load);
  const { default: Game } = await load('/src/pages/Game.tsx');
  const { db } = dbModule;
  const user = userEvent.setup();
  const log = () => [...document.querySelectorAll('.log-line')].map((l) => l.textContent);
  const logged = (t) => log().filter((l) => l.includes(t)).length;
  const until = (check, what) => waitFor(() => { if (!check()) throw new Error(`waiting for ${what}`); }, { timeout: 4000 });
  const action = (label) => screen.getAllByRole('button').find((b) => b.querySelector('.font-cinzel')?.textContent === label);
  const stored = (id) => db.entities.MimicCharacter.get(id);

  // Up to the moment the last devotee is alone, and the ceremony begins
  const toTheCeremony = async () => {
    const mimic = await saveMimic(db, {
      name: 'Idol', tier: 'Standard', mass: 12, plausibility: 6, adhesion: 6, patience: 6, baseAllure: 6, rareLocation: { id: 'hollow_reliquary', huntsLeft: 2 },
    });
    window.history.pushState({}, '', `/Game?characterId=${mimic.id}`);
    s.show(() => createElement(MemoryRouter, null, createElement(Game)));
    await screen.findByRole('heading', { name: 'Choose Your Hunting Ground' });
    await user.click(screen.getByRole('heading', { level: 3, name: 'The Hollow Reliquary' }));
    await user.click(screen.getByRole('heading', { level: 3, name: 'Nave' }));
    await user.click(action('Lure'));
    await user.click(action('Strike!'));
    await user.click(action('Strike!'));
    // The last Strike starts the ceremony, which schedules its steps (seconds apart) all at once:
    // only those are sped up, twenty times
    globalThis.setTimeout = (fn, ms, ...args) => realTimeout(fn, ms >= 1000 ? ms / 20 : ms, ...args);
    try {
      await user.click(action('Strike!'));
    } finally {
      globalThis.setTimeout = realTimeout;
    }
    await until(() => logged('falls to their knees before you') === 1, 'the ceremony to begin');
    return mimic;
  };

  const random = Math.random;
  const realTimeout = globalThis.setTimeout;
  try {
    onDate(storage, '5-15');
    Math.random = () => 0.85;

    // ---------- leaving partway through ----------
    await withEmptyDb(storage, async () => {
      const mimic = await toTheCeremony();
      const beforeOfferings = (await stored(mimic.id)).assimilationPoints;
      ok(action('Wait').disabled && screen.getByRole('button', { name: /Change Form/ }).disabled, 'mid-ceremony, the hunt waits');
      await until(() => logged('You accept the') >= 2, 'two offerings');
      cleanup(); // the player goes Home before it's over
      await new Promise((r) => realTimeout(r, 300)); // (anything still scheduled would land now)
      const left = await stored(mimic.id);
      ok(left.assimilationPoints > beforeOfferings, 'leaving partway: the offerings accepted so far are kept');
      ok(left.lifetimeApEarned === left.assimilationPoints, '…and lifetime AP counts exactly what was kept');
      ok(left.conversions === 1 && left.huntsSurvived === 1, '…the convert and the hunt won were counted when it began');
    });

    // ---------- the whole ceremony ----------
    await withEmptyDb(storage, async () => {
      const mimic = await toTheCeremony();
      await until(() => logged('backs out of the shrine') === 1, 'the last offering');
      ok(await screen.findByText('The hunt is over.'), 'the whole ceremony plays out, and the hunt is over');
      const offered = log().filter((l) => l.includes('You accept the')).map((l) => Number(l.match(/\+(\d+) AP/)[1])).reduce((a, b) => a + b, 0);
      const after = await stored(mimic.id);
      ok(log().some((l) => l.includes(`(+${offered} AP in offerings)`)) && offered > 0, '…every offering, then the total');
      ok(after.lifetimeApEarned === after.assimilationPoints && after.assimilationPoints >= offered, '…all saved, and lifetime AP agrees');
    });
  } finally {
    Math.random = random;
    globalThis.setTimeout = realTimeout;
    onDate(storage, null);
    window.history.pushState({}, '', '/');
  }
}
