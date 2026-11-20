// The hunt's side panels (src/components/game/hunt/HuntPanels.tsx), clicked through with React
// Testing Library from real hunts: switching forms, where you can relocate to, and the easy meals
// lying about in your room.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup, spy, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { FormSwitcher, RelocatePanel, MealsHere } = await load('/src/components/game/hunt/HuntPanels.tsx');
  const user = userEvent.setup();
  const opts = { random: () => 0.5, now: new Date('2026-05-15T12:00:00Z') };
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const ref = (id) => { const f = m.ALL_FORMS.find((x) => x.id === id); return { formId: id, name: f.name, tier: f.tier, learned: true }; };
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const button = (start) => screen.getAllByRole('button').find((b) => b.textContent.includes(start));
  const manor = loc('manor');
  const { hunt } = m.beginHunt(mimic(), manor, manor.rooms[0], opts);

  // ---------- switching forms ----------
  const switchTo = (character, h = hunt) => { const onChange = spy(); s.showInHunt(FormSwitcher, { onChange }, s.huntState(character, h)); return onChange; };
  const onChange = switchTo(mimic({ forms: [ref('lesser_chest'), ref('standard_door')], activeFormIndex: 1 }));
  ok(has('Select Active Form (costs 1 suspicion)') && button('Chest') && button('Door'), "lists the mimic's forms, and what switching costs");
  ok(button('Door').textContent.includes('Active') && !button('Chest').textContent.includes('Active'), 'the form being worn is marked Active');
  ok(button('Chest').textContent.includes('Lesser') && button('Door').textContent.includes('Standard'), "each shows the tier it's worn at");
  await user.click(button('Door'));
  ok(onChange.calls.length === 0, 'clicking the form already worn does nothing');
  await user.click(button('Chest'));
  ok(onChange.calls.length === 1 && onChange.calls[0][0] === 0, 'clicking another switches to it (by its place in the list)');
  switchTo(mimic({ tier: 'Standard', mass: 12, forms: [ref('lesser_haunted_tree')] }));
  ok(button('Haunted Tree').textContent.includes('Standard'), 'a seasonal form counts as the tier of the mimic wearing it');
  switchTo(mimic({ forms: [ref('standard_door')], currentAppearance: { primaryMaterials: ['Thimblewood'] } }));
  ok(button('Door').textContent.includes('Standard'), 'an ordinary form keeps its own tier, even shrunk by Thimblewood');
  switchTo(mimic({ forms: [] }));
  ok(screen.queryAllByRole('button').length === 0 && !has('Select Active Form'), 'no forms: nothing to switch to');

  // ---------- relocating ----------
  const next = m.getAdjacentRooms(manor, hunt.mimicRoom);
  const onRelocate = spy();
  s.show(RelocatePanel, { rooms: next, onRelocate });
  ok(next.every((r, i) => { const b = button(r); return b.querySelector('kbd')?.textContent === String(i + 1) && b.textContent.includes('(+1 suspicion)'); }), 'each room next door, numbered for its key, with the cost');
  await user.click(button(next[next.length - 1]));
  ok(onRelocate.calls.length === 1 && onRelocate.calls[0][0] === next[next.length - 1], 'clicking a room moves there');
  s.show(RelocatePanel, { rooms: [], onRelocate });
  ok(has('There are too many people nearby') && screen.queryAllByRole('button').length === 0, "nowhere empty: it's too risky, and there's nothing to click");
  const { container: many } = s.show(RelocatePanel, { rooms: Array.from({ length: 10 }, (_, i) => `Room ${i + 1}`), onRelocate });
  ok(many.querySelectorAll('kbd').length === 9, 'only the first nine get a key');

  // ---------- meals lying about ----------
  const meals = (h, extra) => {
    const handlers = { onEatCreature: spy(), onEatStar: spy(), onEatRemains: spy() };
    const { container } = s.showInHunt(MealsHere, handlers, s.huntState(mimic(), h, extra));
    return { ...handlers, container };
  };
  const room = hunt.mimicRoom;
  const elsewhere = manor.rooms.find((r) => r !== room);
  const critter = (uid, over) => ({ uid, id: 'rat', name: 'Cellar Rat', ap: 1, discipline: 1, description: 'Squeaks.', location: room, isConsumed: false, ...over });
  const withCritters = { ...hunt, creatures: [critter('a'), critter('b', { location: elsewhere }), critter('c', { isConsumed: true })] };
  const fed = meals(withCritters);
  ok(has('Creatures of Opportunity') && screen.getAllByRole('button').length === 1, 'only the creature in your room is offered (not one elsewhere, nor one eaten)');
  const rat = button('Cellar Rat');
  ok(rat.textContent.includes(`${m.creatureEmoji('Cellar Rat')} Cellar Rat`) && rat.textContent.includes('+1 AP') && rat.title === 'Squeaks.', '…with its emoji, AP and description');
  await user.click(rat);
  ok(fed.onEatCreature.calls.length === 1 && fed.onEatCreature.calls[0][0].uid === 'a', 'clicking it eats that one');
  ok(meals(hunt).container.innerHTML === '', 'nothing about: no panels');
  const busy = meals(withCritters, { acting: true });
  ok(button('Cellar Rat').disabled, 'mid-turn, the meals wait');
  await user.click(button('Cellar Rat'));
  ok(busy.onEatCreature.calls.length === 0, '…and clicking does nothing');

  const hillLoc = loc('stargazers_hill');
  const hill = m.beginHunt(mimic(), hillLoc, hillLoc.rooms[0], opts).hunt;
  const starry = meals({ ...hill, starFragment: hill.mimicRoom });
  ok(button('Star fragment')?.textContent.includes(`+${m.STAR_FRAGMENT.ap} AP`), 'a star in your room can be swallowed');
  await user.click(button('Star fragment'));
  ok(starry.onEatStar.calls.length === 1, '…with a click');
  ok(meals({ ...hill, starFragment: hillLoc.rooms.find((r) => r !== hill.mimicRoom) }).container.innerHTML === '', '…not one in another room');
  ok(meals({ ...hill, starFragment: hill.mimicRoom }, { huntOver: true }).container.innerHTML === '', '…nor once the hunt is won');

  const lodgeLoc = loc('snowbound_lodge');
  const lodge = m.beginHunt(mimic(), lodgeLoc, lodgeLoc.rooms[0], opts).hunt;
  const body = { ...lodge.party[0], location: lodge.mimicRoom, isAlive: false, isFrozen: true, warmth: 0 };
  const farBody = { ...lodge.party[1], location: lodgeLoc.rooms.find((r) => r !== lodge.mimicRoom), isAlive: false, isFrozen: true };
  const iced = meals({ ...lodge, party: [body, farBody] });
  ok(button(body.name)?.textContent.includes(`+${m.remainsMealAp(body)} AP`) && !has(farBody.name), 'a frozen adventurer in your room is a meal (only in your room)');
  await user.click(button(body.name));
  ok(iced.onEatRemains.calls.length === 1 && iced.onEatRemains.calls[0][0].id === body.id, '…clicking it eats them');
  const roast = { ...body, id: 'roast', name: 'Cave Painter', isFrozen: false, isRoasted: true };
  const ash = meals({ ...lodge, party: [roast] });
  ok(has('Roasted in the Ash') && button('Cave Painter')?.textContent.includes('🍖') && !has('Frozen Solid'), 'a roasted adventurer in your room is a meal too, under Roasted in the Ash');
  await user.click(button('Cave Painter'));
  ok(ash.onEatRemains.calls[0][0].id === 'roast', '…clicking it eats them');
}
