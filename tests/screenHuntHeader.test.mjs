// The top of the hunt (src/components/game/hunt/HuntHeader.tsx), from real hunts with React
// Testing Library: where you are, who's left, how far the lure reaches, any bounty or sickness,
// and the New Hunt, Change Form and Appearance buttons.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: HuntHeader } = await load('/src/components/game/hunt/HuntHeader.tsx');
  const user = userEvent.setup();
  const opts = { random: () => 0.5, now: new Date('2026-05-15T12:00:00Z') };
  const manor = m.LOCATIONS.find((l) => l.id === 'manor');
  const { hunt } = m.beginHunt(mimic(), manor, manor.rooms[0], opts);
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const show = (character, h, extra = {}) => {
    const handlers = { onNewHunt: spy(), onToggleForms: spy(), onToggleAppearance: spy() };
    s.showInHunt(HuntHeader, { canLeave: true, canChange: true, ...handlers, ...extra }, s.huntState(character, h));
    return handlers;
  };

  // ---------- where you are ----------
  show(mimic(), hunt);
  ok(screen.getByRole('heading', { name: manor.name }) && has(`You: ${hunt.mimicRoom}`), 'the location, and the room you are in');
  ok(has(`${hunt.party.length} adventurers remain`), 'how many adventurers are left');
  show(mimic(), { ...hunt, party: hunt.party.map((a, i) => (i === 0 ? a : { ...a, isAlive: false, isConsumed: true })) });
  ok(has('1 adventurer remains'), '…down to the last one (singular)');
  show(mimic({ baseAllure: 3 }), hunt);
  ok(has('Lure range: 1 room') && !has('1 rooms'), 'lure range 1: "1 room"');
  show(mimic({ baseAllure: 5 }), hunt);
  ok(has('Lure range: 2 rooms'), 'lure range 2: "2 rooms"');

  // ---------- bounty and sickness ----------
  show(mimic(), hunt);
  ok(!has('Bounty Hunt'), 'no bounty: no warning');
  show(mimic(), { ...hunt, bounty: true });
  ok(has('⚠ Bounty Hunt') && has('A bounty has been placed on'), 'a bounty hunt says so');
  const sickness = m.SICKNESSES[0];
  show(mimic(), { ...hunt, sickness });
  const penalties = Object.entries(sickness.penalties).map(([k, v]) => `–${v} ${k}`).join(' · ');
  ok(has(`☠ ${sickness.name}`) && has(`${penalties} — this hunt only.`), 'a sickness shows its name and penalties');

  // ---------- the buttons ----------
  const handlers = show(mimic(), hunt);
  await user.click(screen.getByRole('button', { name: /New Hunt/ }));
  await user.click(screen.getByRole('button', { name: /Change Form/ }));
  await user.click(screen.getByRole('button', { name: /Appearance/ }));
  ok(handlers.onNewHunt.calls.length === 1 && handlers.onToggleForms.calls.length === 1 && handlers.onToggleAppearance.calls.length === 1, 'each button does its job');
  show(mimic(), hunt, { canChange: false });
  ok(screen.getByRole('button', { name: /Change Form/ }).disabled && screen.getByRole('button', { name: /Appearance/ }).disabled && !screen.getByRole('button', { name: /New Hunt/ }).disabled,
    'once the hunt is won or mid-ceremony: Change Form and Appearance are greyed out (New Hunt is not)');
  const stuck = show(mimic(), hunt, { canLeave: false });
  ok(screen.getByRole('button', { name: /New Hunt/ }).disabled, "mid-ceremony, New Hunt can't be pressed");
  await user.click(screen.getByRole('button', { name: /New Hunt/ }));
  ok(stuck.onNewHunt.calls.length === 0, '…and clicking it does nothing');
}
