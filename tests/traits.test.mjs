// Forms' built-in traits (structural/aura) and flaw data, and who cares about the symbolic marks.
export default async function ({ gameData: m, ok }) {
  const forms = m.ALL_FORMS;
  const builtInAllowed = new Set([...m.UNLEARNED_TRAITS.structural, ...m.UNLEARNED_TRAITS.aura]);

  ok(forms.every((f) => Array.isArray(f.builtInTraits) && f.builtInTraits.length > 0), `all ${forms.length} forms have built-in traits`);
  ok(forms.every((f) => f.builtInTraits.every((t) => builtInAllowed.has(t))), 'built-in traits are all structural or aura traits');
  ok(forms.every((f) => f.flawProfiles.every((x) => x.type !== 'sound')), "no 'sound' flaws (they are 'acoustic')");

  // Every structural and aura trait must matter: built into at least one form, and
  // liked or disliked by at least one adventurer (otherwise it does nothing in play)
  for (const t of [...m.UNLEARNED_TRAITS.structural, ...m.UNLEARNED_TRAITS.aura]) {
    const fs = forms.filter((f) => f.builtInTraits.includes(t));
    const likers = m.ADVENTURER_TEMPLATES.filter((a) => a.alluringQualities.traits.includes(t));
    const dislikers = m.ADVENTURER_TEMPLATES.filter((a) => a.repelledBy?.traits?.includes(t));
    ok(fs.length > 0 && likers.length + dislikers.length > 0,
      `${t}: on ${fs.length} forms, liked by ${likers.length}, disliked by ${dislikers.length}`);
  }
  const book = forms.find((f) => f.id === 'minor_book');
  ok(book && !book.builtInTraits.includes('Whispering'), 'an ordinary Book does not whisper');

  const rogue = m.ADVENTURER_TEMPLATES.find((a) => a.name === 'Greedy Rogue');
  const hunter = m.ADVENTURER_TEMPLATES.find((a) => a.name === 'Mimic Hunter');
  const chest = forms.find((f) => f.id === 'lesser_chest');
  ok(m.calcAllureBreakdown(chest, {}, rogue).liked.includes('Locked') && m.calcAllureBreakdown(chest, {}, hunter).disliked.includes('Locked'), 'a Locked chest lures the rogue and repels the mimic hunter');

  const half = m.ADVENTURER_TEMPLATES.find((a) => a.name === 'Half-Giant Mercenary');
  const giantChest = forms.find((f) => f.id === 'giant_chest');
  const liked = m.calcAllureBreakdown(giantChest, {}, half).liked;
  ok(liked.includes('Iron-Banded') && liked.includes('Heavy-Lidded'), "a bare Giant Chest's built-in traits lure a Half-Giant");

  // ---------- the symbolic marks: who's drawn, who's put off, who teaches them ----------
  const T = m.ADVENTURER_TEMPLATES;
  const likers = (t) => T.filter((a) => a.alluringQualities.traits.includes(t));
  const dislikers = (t) => T.filter((a) => a.repelledBy?.traits?.includes(t));
  const teachers = (t) => T.filter((a) => a.lootTraits.includes(t));
  const types = (list) => new Set(list.map((a) => a.type));
  const only = (list, allowed) => list.length > 0 && [...types(list)].every((x) => allowed.includes(x));
  for (const t of m.TRAITS.symbolic) {
    ok(likers(t).length > 0 && teachers(t).length > 0, `${t}: liked by ${likers(t).length}, taught by ${teachers(t).length}`);
  }
  ok(only(likers('Ward Sign'), ['Commoner']) && only(dislikers('Ward Sign'), ['Undead', 'Fey']), 'Ward Sign: commoners trust it; undead and fey shy from it');
  ok(only(likers("Thieves' Mark"), ['Rogue', 'Assassin']) && types(likers("Thieves' Mark")).has('Assassin'), "Thieves' Mark: rogues and assassins read it");
  ok(types(dislikers("Thieves' Mark")).has('Paladin') && dislikers("Thieves' Mark").some((a) => /Guard|Watchman/.test(a.name)), '…and paladins and guards distrust it');
  ok(only(likers('Tally Marks'), ['Warrior', 'Hunter']) && types(likers('Tally Marks')).has('Hunter'), 'Tally Marks: warriors and hunters respect a count of kills');
  ok(only(dislikers('Tally Marks'), ['Commoner']), '…and they unsettle commoners');
  ok(T.filter((a) => a.type === 'Artificer').every((a) => likers('Guild Mark').includes(a)) && likers('Guild Mark').some((a) => a.name === 'The High Merchant'),
    'Guild Mark: every artificer, and the merchants');
  ok(['The King', 'The Princess'].every((n) => likers("Maker's Mark").some((a) => a.name === n)) && !likers('Guild Mark').some((a) => ['The King', 'The Princess'].includes(a.name)),
    "Maker's Mark: royalty want the maker's name, not the guild's");
  const both = likers("Maker's Mark").filter((a) => likers('Guild Mark').includes(a));
  ok(both.length * 2 <= Math.min(likers("Maker's Mark").length, likers('Guild Mark').length),
    `Guild Mark and Maker's Mark draw mostly different people (${both.length} share both)`);
}
