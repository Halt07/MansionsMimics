// The end of a hunt and the upgrade screen (src/components/game/hunt/EndScreens.tsx, with the
// hunt report from HuntReport.tsx), clicked through with React Testing Library: winning, being
// found out or left, and spending AP on growth or a stat.
import { createElement } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setup, spy, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { HuntOverPanel, EvolveScreen, GameOverScreen } = await load('/src/components/game/hunt/EndScreens.tsx');
  const user = userEvent.setup();
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const button = (name) => screen.getByRole('button', { name });
  const report = (ending, party) => m.buildHuntReport({
    ending, party, seed: 42, locationName: 'Abandoned Manor', lastRoom: 'Grand Foyer', formName: 'Chest', tier: 'Lesser',
    mimicName: 'Testy', bounty: false, peakSuspicion: 4, biggestMeal: null, mimicsDevoured: 0, sank: false,
  });
  // GameOverScreen links home, so it needs a router
  const Routed = (props) => createElement(MemoryRouter, null, createElement(GameOverScreen, props));

  // ---------- the hunt is won ----------
  const won = report('cleared', [{ name: 'Greedy Rogue', isConsumed: true }, { name: 'Naive Bard', fled: true }]);
  const over = { onChooseForms: spy(), onHuntAgain: spy() };
  s.show(HuntOverPanel, { report: won, ...over });
  ok(has('The hunt is over.'), 'the hunt is over');
  const figure = screen.getByRole('figure', { name: `${won.heading}: ${won.title}` });
  ok(figure && within(figure).getByRole('heading', { name: won.title }), "…with the world's report on it, named for screen readers by its heading and title");
  ok(won.body.every((p) => figure.textContent.includes(p)) && within(figure).getByText(won.postedAt), '…all of it, and where it was posted');
  await user.click(button('Choose New Forms'));
  await user.click(button('Hunt Again (Keep Forms)'));
  ok(over.onChooseForms.calls.length === 1 && over.onHuntAgain.calls.length === 1, 'then: choose new forms, or hunt again as you are');
  s.show(HuntOverPanel, { report: null, ...over });
  ok(screen.queryByRole('figure') === null && has('The hunt is over.'), 'no report: just the buttons');
  const tablet = m.buildHuntReport({ ending: 'discovered', party: [{ name: 'Firekeeper' }], seed: 3, locationName: 'The Tear in Time', locationId: 'tear_in_time',
    lastRoom: 'Tar Pits', formName: 'Volcano', tier: 'Apex', mimicName: 'Rex', bounty: false, peakSuspicion: 10, biggestMeal: null, mimicsDevoured: 0, sank: false, erupted: true });
  const { container: stone } = s.show(HuntOverPanel, { report: tablet, ...over });
  const slab = stone.querySelector('.report-paper');
  ok(slab.classList.contains('report-paper--stone') && stone.querySelector('.report-wall--cave') && slab.dataset.scorched === 'true', 'at the Tear: a stone tablet on a cave wall, sooty after an eruption');
  ok(!stone.querySelector('.report-nail') && !stone.querySelector('.report-seal') && stone.querySelector('.report-crack'), '…cracked, leaning (no nails), and no Guild seal');
  ok(!tablet.quote || stone.textContent.includes(`— ${tablet.quote.by} say`), '…the witness "say"s, rather than giving a statement');
  const placard = m.buildHuntReport({ ending: 'discovered', party: [{ name: 'Jungle Guide' }], seed: 3, locationName: 'The Long After', locationId: 'the_long_after',
    lastRoom: 'Treasury', formName: 'Colossus', tier: 'Apex', mimicName: 'Ever', bounty: false, peakSuspicion: 10, biggestMeal: null, mimicsDevoured: 0, sank: false });
  const { container: museum } = s.show(HuntOverPanel, { report: placard, ...over });
  ok(museum.querySelector('.report-paper--placard') && museum.querySelector('.report-wall--museum') && !museum.querySelector('.report-nail') && !museum.querySelector('.report-seal'),
    'at the Long After: a museum placard on a gallery wall (no nails, no Guild seal)');
  ok(!placard.quote || museum.textContent.includes(`— recorded from ${placard.quote.by}`), '…its witness "recorded from", like a museum label');
  const crowned = m.buildHuntReport({ ending: 'cleared', party: [{ name: 'Herald', isConsumed: true }], seed: 3, locationName: 'The Hollow Court', locationId: 'hollow_court',
    lastRoom: 'Throne Hall', formName: 'Throne', tier: 'Apex', mimicName: 'K', bounty: false, peakSuspicion: 2, biggestMeal: null, mimicsDevoured: 0, sank: false });
  const { container: crown } = s.show(HuntOverPanel, { report: crowned, ...over });
  ok(crown.querySelector('.report-seal.report-seal--emblem')?.textContent === '👑', 'by order of the Crown: a crown pressed into the wax seal');
  const guildNotice = report('discovered', [{ name: 'Greedy Rogue' }]);
  ok(!guildNotice.seal && s.show(HuntOverPanel, { report: guildNotice, ...over }).container.querySelector('.report-seal')?.textContent === 'G', '…the Guild\'s notices keep their G');

  // ---------- found out ----------
  const caught = report('discovered', [{ name: 'Greedy Rogue' }]);
  const lost = { onChooseForms: spy(), onHuntAgain: spy() };
  s.show(Routed, { reason: 'discovered', report: caught, ...lost });
  ok(screen.getByRole('heading', { name: 'Discovered' }) && has('this lair is burned'), 'found out: Discovered, and the lair is burned');
  ok(has(`burned for ${m.BURN_HUNTS} hunts`) && has(`(+${m.BURN_SUSPICION} each)`), '…for how long, and what it costs');
  ok(screen.getByRole('figure', { name: `${caught.heading}: ${caught.title}` }), "…with the report of the incident");
  ok(screen.getByRole('link', { name: 'Return Home' }).getAttribute('href') === '/Home', 'Return Home goes home');
  await user.click(button('Change Forms & Hunt Again'));
  await user.click(button('Hunt Again (Keep Forms)'));
  ok(lost.onChooseForms.calls.length === 1 && lost.onHuntAgain.calls.length === 1, 'or: change forms, or hunt again as you are');

  // ---------- left ----------
  s.show(Routed, { reason: 'abandoned', report: report('abandoned', [{ name: 'Naive Bard' }]), ...lost });
  ok(screen.getByRole('heading', { name: 'They Left' }) && has('found nothing of interest'), 'the party gave up: They Left');
  ok(!has('burned'), '…and nothing is burned');

  // ---------- brought into view once, when it appears ----------
  const proto = window.Element.prototype;
  const scrollIntoView = proto.scrollIntoView;
  const scrolls = [];
  proto.scrollIntoView = function (opts) { scrolls.push({ el: this, opts }); };
  try {
    const { rerender } = s.show(HuntOverPanel, { report: won, ...over });
    ok(scrolls.length === 1 && scrolls[0].el.textContent.startsWith('The hunt is over.') && scrolls[0].opts.block === 'start',
      'the hunt-over panel scrolls into view when it appears, its top at the top of the screen');
    rerender(createElement(HuntOverPanel, { report: won, ...over }));
    ok(scrolls.length === 1, '…once (it never fights the player scrolling back up)');
    scrolls.length = 0;
    s.show(Routed, { reason: 'discovered', report: caught, ...lost });
    ok(scrolls.length === 1 && scrolls[0].el.textContent.includes('Discovered'), 'so does the game-over screen');
  } finally {
    proto.scrollIntoView = scrollIntoView;
  }

  // ---------- evolving ----------
  const cfg = m.TIER_CONFIG.Lesser;
  const upgrade = (character) => {
    const handlers = { onChoose: spy(), onSkip: spy() };
    s.showInHunt(EvolveScreen, handlers, s.huntState(character, null));
    return handlers;
  };
  const choice = (label) => screen.getByRole('heading', { name: label });
  const card = (label) => choice(label).closest('.rounded-xl');
  let picks = upgrade(mimic({ assimilationPoints: cfg.apToEvolve + 2, plausibility: 3 }));
  ok(has('Assimilation Threshold Reached') && has(`(${cfg.apToEvolve + 2} / ${cfg.apToEvolve} AP)`), 'enough AP: the threshold, and how much there is');
  ok(card('Increase Mass').textContent.includes(`Cost: ${cfg.apToEvolve} AP`) && card('+1 Plausibility').textContent.includes(`Cost: ${cfg.apToUpgrade} AP (3/${m.STAT_CAP})`),
    'growing costs the full threshold; a stat costs less, and shows where it stands');
  await user.click(choice('+1 Plausibility'));
  ok(picks.onChoose.calls.length === 1 && picks.onChoose.calls[0][0] === 'plausibility', 'clicking a choice spends on it');
  await user.click(choice('Increase Mass'));
  ok(picks.onChoose.calls[1]?.[0] === 'mass', '…growing too');

  picks = upgrade(mimic({ assimilationPoints: cfg.apToEvolve, adhesion: m.STAT_CAP }));
  ok(card('+1 Adhesion').textContent.includes('MAX — cannot increase further') && card('+1 Adhesion').className.includes('cursor-not-allowed'), 'a stat at the cap is shown maxed out');
  await user.click(choice('+1 Adhesion'));
  ok(picks.onChoose.calls.length === 0, '…and clicking it does nothing');
  await user.click(button('Not Now — Continue Hunting'));
  ok(picks.onSkip.calls.length === 1, 'or put it off and keep hunting');

  // ---------- by keyboard ----------
  ok(screen.getByRole('button', { name: '+1 Plausibility', description: `Improve deception. Cost: ${cfg.apToUpgrade} AP (3/${m.STAT_CAP})` }) &&
    screen.getByRole('button', { name: '+1 Adhesion', description: 'MAX — cannot increase further' }), 'each choice is heard by what it does, then its cost (or that it\'s maxed out)');
  ok(card('+1 Adhesion').getAttribute('role') === 'button' && card('+1 Adhesion').getAttribute('aria-disabled') === 'true', 'each choice is a button to screen readers, a maxed one marked unavailable');
  card('+1 Adhesion').focus();
  await user.keyboard('{Enter}');
  ok(picks.onChoose.calls.length === 0, '…pressing Enter on a maxed one does nothing');
  await user.tab();
  ok(document.activeElement === card('+1 Patience'), 'Tab moves to the next choice');
  await user.keyboard(' ');
  ok(picks.onChoose.calls.length === 1 && picks.onChoose.calls[0][0] === 'patience', '…and Space chooses it');
}
