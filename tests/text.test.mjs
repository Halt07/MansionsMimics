// Writing names and numbers into sentences (src/data/text.ts).
export default async function ({ gameData: m, ok }) {
  // ---------- the ----------
  ok(m.the('Warrior') === 'the Warrior' && m.the('Warrior', true) === 'The Warrior', '"the" in front of a name, capitalised at the start of a sentence');
  ok(m.the('The Princess') === 'the Princess' && m.the('The Princess', true) === 'The Princess', 'a name with its own "The" gets no second one');

  // ---------- plural ----------
  ok(m.plural(1, 'hunt') === 'hunt' && m.plural(2, 'hunt') === 'hunts' && m.plural(0, 'hunt') === 'hunts', 'singular for exactly 1, plural for 0 and 2');
  ok(m.plural(1, 'knocks', 'knock') === 'knocks' && m.plural(3, 'knocks', 'knock') === 'knock', 'an irregular plural can be given');
  ok(m.plural(2, 'One more turn', 'Two more turns') === 'Two more turns', 'whole phrases work too (the number need not be printed)');
  ok(m.sinkingWarning(15, 14).includes('One more turn') && m.sinkingWarning(15, 13).includes('Two more turns'), 'the sinking ship counts down in words');
  const lost = (n) => m.dropExpiredSeasonalForms(m.SEASONAL_FORMS.filter((f) => f.holiday === 'halloween').slice(0, n).map((f) => ({ formId: f.id })), 0, new Date(2026, 4, 15)).message;
  ok(/Your \S.* shape slips away/.test(lost(1)) && / and .* shapes slip away/.test(lost(2)), 'one seasonal shape slips away; two shapes slip');
}
