// The four hunt actions (src/components/game/hunt/ActionBar.tsx), clicked with React Testing
// Library: each shows its key and what it does, is only pressable when the game allows it, and
// asks the game to do it. (The keys themselves are handled by Game.)
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy } from './screen.mjs';

export default async function ({ load, ok }) {
  const s = await setup(load);
  const { default: ActionBar } = await load('/src/components/game/hunt/ActionBar.tsx');
  const user = userEvent.setup();
  const actions = [
    ['Relocate', 'R', 'Slip to empty room', 'canRelocate', 'onRelocate'],
    ['Lure', 'L', 'Attract adventurers', 'canLure', 'onLure'],
    ['Strike!', 'S', 'Consume attracted prey', 'canStrike', 'onStrike'],
    ['Wait', 'W', 'Rest & reduce suspicion', 'canWait', 'onWait'],
  ];
  const bar = (allowed) => {
    const props = {};
    for (const [, , , can, on] of actions) { props[can] = allowed.includes(can); props[on] = spy(); }
    s.show(ActionBar, props);
    return props;
  };
  const button = (label) => screen.getAllByRole('button').find((b) => b.querySelector('.font-cinzel')?.textContent === label);

  // ---------- what each one is ----------
  const all = bar(actions.map((a) => a[3]));
  ok(screen.getAllByRole('button').length === 4, 'four actions');
  ok(actions.every(([label, key, detail]) => button(label).querySelector('kbd')?.textContent === key && button(label).textContent.includes(detail)), 'each shows its key and what it does');

  // ---------- pressing them ----------
  for (const [label, , , , on] of actions) await user.click(button(label));
  ok(actions.every(([, , , , on]) => all[on].calls.length === 1), 'each one, clicked, asks the game to do it');

  // ---------- only when allowed ----------
  for (const [label, , , can, on] of actions) {
    const props = bar(actions.map((a) => a[3]).filter((c) => c !== can));
    await user.click(button(label));
    ok(button(label).disabled && props[on].calls.length === 0 && actions.filter((a) => a[3] !== can).every(([l]) => !button(l).disabled),
      `${label} not allowed: only it is greyed out, and clicking it does nothing`);
  }
  const none = bar([]);
  ok(actions.every(([label]) => button(label).disabled), 'mid-turn (nothing allowed): all four wait');
  await user.click(button('Wait'));
  ok(none.onWait.calls.length === 0, '…and clicks do nothing');
}
