// The Codex's adventurers (src/components/game/codex/AdventurersSection.tsx and AdventurerEntry.tsx):
// what's given away before a mimic has met one, once met, and once eaten. Groups and entries open
// on a click (React Testing Library); every entry's variants are also shown directly.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setup } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: AdventurersSection } = await load('/src/components/game/codex/AdventurersSection.tsx');
  const { default: AdventurerEntry, AdventurerTitle } = await load('/src/components/game/codex/AdventurerEntry.tsx');
  const user = userEvent.setup();
  const all = m.ADVENTURER_TEMPLATES;
  const knower = (met = [], eaten = []) => ({ name: 'Testy', adventurersMet: met, adventurersEaten: eaten });
  const section = (knowers, viewedMimic = null) => s.show(AdventurersSection, { viewedMimic, knowers }).container;
  const entry = (adv, level) => s.show(AdventurerEntry, { adv, level }).container.textContent;
  const title = (adv, level) => s.show(AdventurerTitle, { adv, level }).container.textContent;
  const has = (t) => screen.queryAllByText(t, { exact: false }).length > 0;
  const named = (adv) => `${adv.name} (${adv.type})`;
  const button = (start) => screen.getAllByRole('button').find((b) => b.textContent.startsWith(start));

  const [firstGroup, secondGroup] = m.ADVENTURER_GROUPS.filter((g) => all.some((a) => a.group === g.id));
  const opening = all.filter((a) => a.group === firstGroup.id);
  const [first, second, third] = opening;

  // ---------- the section: what's been met, counted ----------
  const blank = section([knower()]);
  ok(blank.textContent.includes(`Met 0/${all.length} · Eaten 0/${all.length}`), 'nothing met: 0 of every adventurer');
  ok(screen.getAllByRole('button').filter((b) => b.textContent.startsWith('???')).length === opening.length, 'the first group starts open, every one in it "???"');
  ok(all.every((a) => !blank.textContent.includes(named(a))), '…with no names given away');
  await user.click(button('???'));
  ok(has("You haven't crossed paths with this one yet."), 'opening an unmet one: no stats, just a hint');
  await user.click(button(secondGroup.label));
  const later = all.filter((a) => a.group === secondGroup.id);
  ok(screen.getAllByRole('button').filter((b) => b.textContent.startsWith('???')).length === opening.length + later.length, 'opening another group shows its members, also "???"');

  const some = section([knower([first.name, second.name], [first.name])]);
  ok(some.textContent.includes(`Met 2/${all.length} · Eaten 1/${all.length}`), 'the totals count what was met and eaten');
  ok(button(named(first)) && button(named(second)) && !button(named(third)), 'met adventurers are named, the rest stay "???"');
  ok(has(`${firstGroup.label} (2/${opening.length})`), 'each group counts its own');
  await user.click(button(named(second)));
  ok(has('Eat one to learn what it craves') && !has('Attracted To'), 'opening a met one: its stats, but not what it craves');
  await user.click(button(named(second)));
  await user.click(button(named(first)));
  ok(has('Attracted To'), 'opening an eaten one: what it craves');

  const pooled = section([knower([first.name]), knower([second.name])]);
  ok(pooled.textContent.includes(`Met 2/${all.length}`) && pooled.textContent.includes('your mimics have learned'), 'all mimics: their knowledge is pooled');
  ok(section([knower([first.name])], { name: 'Testy' }).textContent.includes('Testy has learned'), 'one mimic: the Codex says whose knowledge it is');

  // ---------- an entry, not met ----------
  const where = (ids) => ids.map((id) => m.LOCATIONS.find((l) => l.id === id).name);
  const rumoured = all.find((a) => a.locations);
  ok(entry(rumoured, 'unknown').includes(`Rumors place it in ${where(rumoured.locations).join(' or ')}.`), 'unmet, but only found in some places: a rumor where');
  const big = all.find((a) => a.minTier && !a.locations);
  ok(entry(big, 'unknown').includes(`It isn't seen by mimics below ${big.minTier} tier.`), 'unmet and big: the tier it needs');
  const plain = all.find((a) => !a.minTier && !a.locations);
  ok(entry(plain, 'unknown').endsWith('Keep hunting.') && !entry(plain, 'unknown').includes('Discipline'), 'unmet otherwise: keep hunting, and no stats');
  const heavy = all.find((a) => a.minTier && (a.minMass || a.wholeMealMass));
  ok(title(heavy, 'unknown') === `???${heavy.minTier}+`, 'unmet: the title shows only the tier it needs');
  ok(title(heavy, 'met').startsWith(named(heavy)) && /Mass \d+\+|Consumed whole at \d+/.test(title(heavy, 'met')), 'met: its name, and the mass it takes');

  // ---------- met, not eaten ----------
  const met = entry(first, 'met');
  ok(met.includes(`Discipline: ${first.discipline}d6`) && met.includes(`Base Suspicion: ${first.baseSuspicion}`), 'met: its stats');
  ok(first.quirks.every((q) => met.includes(q)), '…and quirks');
  ok(met.includes('Eat one to learn what it craves') && !met.includes('Attracted To'), "…but not what it craves until it's eaten");

  // ---------- eaten ----------
  const picky = all.find((a) => a.repelledBy);
  s.show(AdventurerEntry, { adv: picky, level: 'eaten' });
  const likes = [...picky.alluringQualities.materials, ...picky.alluringQualities.traits, ...picky.alluringQualities.tags];
  const attracted = screen.getByText('Attracted To').nextElementSibling;
  ok(likes.every((q) => within(attracted).queryByText(q)), 'eaten: everything it is attracted to');
  const putOff = screen.getByText('Put Off By').nextElementSibling;
  const dislikes = [...(picky.repelledBy.materials || []), ...(picky.repelledBy.traits || []), ...(picky.repelledBy.tags || [])];
  ok(dislikes.every((q) => within(putOff).queryByText(q)) && !has('Eat one to learn'), '…and what puts it off');

  // ---------- instincts, places, companions ----------
  const keen = all.find((a) => a.behavior === 'keenHearing');
  ok(entry(keen, 'met').includes(`Instinct: ${m.BEHAVIORS.keenHearing.label}`), 'an instinct is shown once met');
  const devout = all.filter((a) => a.behavior && m.isHiddenBehavior(a.behavior));
  ok(devout.length > 0 && devout.every((a) => !entry(a, 'eaten').includes('Instinct:') && !entry(a, 'eaten').includes(m.BEHAVIORS[a.behavior].label)), 'a hidden instinct is never shown, even once eaten');
  ok(entry(rumoured, 'met').includes(`Found Only In${where(rumoured.locations).join(', ')}`), 'met: where it is found, if only some places');
  const pet = all.find((a) => a.companion);
  ok(entry(pet, 'met').includes(`Companion (${Math.round(pet.companion.chance * 100)}% chance)`) && title(pet, 'met').endsWith('✦'), 'a companion: its chance, and ✦ in the title');
}
