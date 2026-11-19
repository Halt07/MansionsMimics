// The whole game screen (src/pages/Game.tsx), played by clicking and typing with React Testing
// Library, from a mimic saved in the in-memory database. The pieces have their own tests; these
// check how Game wires them together: each action reaches the rules, the screen follows the
// result, and the character is saved. The dice are pinned (Math.random) so every run is the same:
// at 0, every die rolls a 1, so whoever rolls more dice wins (and ties go to the mimic), and in the
// Abandoned Manor the whole party and its rats start in the Grand Foyer.
import { createElement } from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setup, saveMimic, withEmptyDb, onDate } from './screen.mjs';

export default async function ({ gameData: m, db: dbModule, storage, load, ok }) {
  const s = await setup(load);
  const { default: Game } = await load('/src/pages/Game.tsx');
  const { db } = dbModule;
  const user = userEvent.setup();
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const reads = (t) => document.body.textContent.includes(t);
  const stored = async (id) => db.entities.MimicCharacter.get(id);
  const log = () => [...document.querySelectorAll('.log-line')].map((l) => l.textContent);
  const action = (label) => screen.getAllByRole('button').find((b) => b.querySelector('.font-cinzel')?.textContent === label);
  const until = (check, what) => waitFor(() => { if (!check()) throw new Error(`waiting for ${what}`); });

  // Game reads the mimic from the address, like the browser
  const play = async (id) => {
    window.history.pushState({}, '', `/Game?characterId=${id}`);
    s.show(() => createElement(MemoryRouter, null, createElement(Game)));
    await until(() => !reads('Awakening...'), 'the mimic to load');
  };
  const huntAt = async (locationName, room) => {
    await user.click(screen.getByRole('heading', { level: 3, name: locationName }));
    await user.click(screen.getByRole('heading', { level: 3, name: room }));
    await until(() => has(`You: ${room}`), 'the hunt to start');
  };

  const random = Math.random;
  try {
    onDate(storage, '5-15');
    Math.random = () => 0;
    const manor = m.LOCATIONS.find((l) => l.id === 'manor');
    const rat = manor.locationCreatures.find((c) => c.name === 'Rat');
    const lesser = m.TIER_CONFIG.Lesser;

    // ---------- a hunt, from start to supper ----------
    await withEmptyDb(storage, async () => {
      // Adhesion 6: enough dice to hold whoever it strikes (the most interested: a Minotaur, with 4)
      const mimic = await saveMimic(db, { name: 'Gristle', adhesion: 6, assimilationPoints: lesser.apToEvolve - rat.ap });
      await play(mimic.id);
      ok(screen.getByRole('heading', { name: 'Choose Your Hunting Ground' }) && reads('Gristle'), 'a saved mimic opens on choosing where to hunt');
      ok(screen.getByRole('link', { name: 'Home' }).getAttribute('href') === '/Home', 'the Home link is named for screen readers, and goes home');

      await huntAt(manor.name, 'Grand Foyer');
      ok(log().some((l) => l.includes(`You settle into the Grand Foyer of the ${manor.name}`)), 'choosing a ground and a room starts the hunt there, in the log');
      const started = await stored(mimic.id);
      ok(started.locationHuntCounts.manor === 1 && started.formHuntCounts.lesser_chest === 1 && started.adventurersMet.length > 0,
        '…and the start is saved: a hunt here, in this form, and everyone met');

      // A meal lying about: eating it reaches the threshold, and the upgrade screen opens
      await user.click(screen.getAllByRole('button').find((b) => b.textContent.includes('Rat') && b.textContent.includes(`+${rat.ap} AP`)));
      await until(() => has('Assimilation Threshold Reached'), 'the upgrade screen');
      ok((await stored(mimic.id)).assimilationPoints === lesser.apToEvolve, 'eating the rat: its AP saved, and the upgrade screen opens');
      ok(log().some((l) => l.includes('You snap up the Rat')), '…the meal is in the log');
      await user.click(screen.getByRole('heading', { name: '+1 Plausibility' }));
      await until(() => !has('Assimilation Threshold Reached'), 'back to the hunt');
      const upgraded = await stored(mimic.id);
      ok(upgraded.plausibility === 4 && upgraded.assimilationPoints === lesser.apToEvolve - lesser.apToUpgrade, 'choosing +1 Plausibility: saved, and paid for');
      ok(action('Wait') && reads('You: Grand Foyer'), '…and back to the hunt, where it was');

      // Lure and Strike someone
      const turnsBefore = log().length;
      await user.click(action('Lure'));
      await until(() => log().length > turnsBefore, 'the lure');
      ok(log().slice(turnsBefore).some((l) => l.includes('is drawn toward the Chest')), 'Lure: the party in reach is drawn in');
      await user.click(action('Strike!'));
      await waitFor(async () => { if ((await stored(mimic.id)).partyMembersEaten !== 1) throw new Error('not eaten yet'); });
      ok((await stored(mimic.id)).partyMembersEaten === 1, 'Strike: someone is eaten, and it is saved');

      // The keyboard does the same
      const before = log().length;
      await user.keyboard('w');
      await until(() => log().length > before, 'the wait');
      ok(log().slice(before).some((l) => l.includes('You wait')), "pressing W waits");
      await user.keyboard('r');
      ok(action('Relocate').disabled && !has('Relocate — Choose Destination'), "with the party in the room, Relocate is greyed out, and R doesn't open it");

      // The character sheet, over the top
      await user.click(screen.getByRole('button', { name: /Sheet/ }));
      ok(screen.getByRole('button', { name: 'Close' }) && reads('Lifetime Stats'), 'Sheet opens the character sheet');
      const whileOpen = log().length;
      await user.keyboard('w');
      ok(log().length === whileOpen, '…where the hunt keys do nothing');
      await user.click(screen.getByRole('button', { name: 'Close' }));
      ok(!reads('Lifetime Stats'), '…and Close puts it away');
    });

    // ---------- a hunt where nothing happens: the party gets bored and leaves ----------
    await withEmptyDb(storage, async () => {
      const mimic = await saveMimic(db, { name: 'Patience' });
      await play(mimic.id);
      await huntAt(manor.name, 'Trophy Hall');
      await user.keyboard('r');
      ok(has('Relocate — Choose Destination'), 'alone in the room: pressing R opens the move panel');
      const next = within(screen.getByText('Relocate — Choose Destination').parentElement).getAllByRole('button')[0].querySelector('.font-cinzel').textContent;
      await user.keyboard('1');
      await until(() => reads(`You: ${next}`), 'the move');
      ok(log().some((l) => l.includes(`You silently flow toward the ${next}`)) && !has('Relocate — Choose Destination'), '…and 1 moves to the first room listed');
      for (let i = 0; i < m.ACTION_LIMIT && !has('They Left'); i++) {
        // (the move above was an action too)
        if (i === m.ACTION_LIMIT - m.ACTION_WARNING - 1) ok(has(`⏳ ${m.ACTION_WARNING} actions remaining`), 'the party grows restless as the actions run out');
        await user.click(action('Wait'));
      }
      await until(() => has('They Left'), 'the party to leave');
      ok(screen.getByRole('heading', { name: 'They Left' }) && screen.getByRole('figure'), `${m.ACTION_LIMIT} actions without a meal: they leave, and the world has its say`);
      const after = await stored(mimic.id);
      ok(after.huntsSurvived === 1 && after.huntsFailed === 0 && after.burnedLocations.length === 0, '…counted as a hunt survived, with nothing burned');
      await user.click(screen.getByRole('button', { name: 'Hunt Again (Keep Forms)' }));
      ok(screen.getByRole('heading', { name: 'Choose Your Hunting Ground' }), 'Hunt Again goes back to choosing where');
    });

    // ---------- winning: nothing more to do in this hunt ----------
    // At 0 the Cursed Chapel's party starts in the Narthex; a mimic with every stat at 6 lures
    // them all from the Cemetery next door and eats them one by one, unseen enough to win
    await withEmptyDb(storage, async () => {
      const chapel = m.LOCATIONS.find((l) => l.id === 'cursed_chapel');
      const mimic = await saveMimic(db, { name: 'Victor', plausibility: 6, adhesion: 6, patience: 6, baseAllure: 6 });
      await play(mimic.id);
      await huntAt(chapel.name, 'Cemetery');
      await user.keyboard('r');
      ok(has('Relocate — Choose Destination'), 'alone in the Cemetery: the move panel opens');
      await user.click(action('Lure'));
      await until(() => !has('Relocate — Choose Destination'), 'the panel to close');
      ok(action('Relocate').disabled, 'the party drawn into the room: Relocate greys out, and its open panel closes with it');

      await user.click(screen.getByRole('button', { name: /Change Form/ }));
      ok(has('Select Active Form'), 'Change Form opens its panel mid-hunt');
      for (let i = 0; i < 6 && !has('The hunt is over.'); i++) await user.click(action('Strike!'));
      await until(() => has('The hunt is over.'), 'the hunt to be won');
      ok(!has('Select Active Form'), 'once the hunt is won, the open form panel goes');
      ok(screen.getByRole('button', { name: /Change Form/ }).disabled && screen.getByRole('button', { name: /Appearance/ }).disabled, '…and Change Form and Appearance are greyed out');
      const won = await stored(mimic.id);
      const logged = log().length;
      await user.keyboard('w');
      await user.keyboard('l');
      ok(log().length === logged && (await stored(mimic.id)).huntsFailed === 0, '…and nothing else can happen in this hunt');
      ok(won.huntsSurvived === 1, '(the win itself is saved)');

      // Back to choosing a ground: the last hunt's suspicion doesn't come too
      await user.click(screen.getByRole('button', { name: 'Hunt Again (Keep Forms)' }));
      ok(screen.getByRole('heading', { name: 'Choose Your Hunting Ground' }) && has('Unsuspecting') && has('0/10'), 'Hunt Again: suspicion back to nothing');
    });

    // ---------- coming back hungry, and a mimic that isn't there ----------
    await withEmptyDb(storage, async () => {
      const lastFedAt = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const mimic = await saveMimic(db, { name: 'Away', mass: 7, lastFedAt });
      await play(mimic.id);
      ok(has('Mass Decay') && has('You have been away for 7 days without feeding. Your mass has diminished by 2 (now 5).'), 'away a week unfed: told how much mass was lost');
      await waitFor(async () => { if ((await stored(mimic.id)).mass !== 5) throw new Error('not saved'); });
      ok((await stored(mimic.id)).mass === 5, '…and the loss is saved');
      await user.click(screen.getByRole('button', { name: 'Dismiss' }));
      ok(!has('Mass Decay'), '…until dismissed');

      await play('no-such-mimic');
      ok(has('Character not found.') && screen.getByRole('link', { name: 'Create a Mimic' }).getAttribute('href') === '/CharacterCreation', 'an unknown mimic: not found, with a way to make one');
    });
  } finally {
    Math.random = random;
    onDate(storage, null);
    window.history.pushState({}, '', '/');
  }
}
