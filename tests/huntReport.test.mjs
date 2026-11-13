// End-of-hunt report: the right document for each ending, written from the hunt's own data.
export default async function ({ gameData: m, ok, log }) {
  const member = (name, extra = {}) => ({ name, isConsumed: false, ...extra });
  const base = {
    seed: 42, locationName: 'Abandoned Manor', lastRoom: 'Grand Foyer', formName: 'Coat Rack', tier: 'Standard',
    mimicName: 'Gristle', bounty: false, peakSuspicion: 3, biggestMeal: null, mimicsDevoured: 0, sank: false,
  };
  const text = (r) => [r.heading, r.title, r.subtitle ?? '', ...r.fields.map(f => `${f.label}: ${f.value}`),
    r.quote ? `${r.quote.text} ${r.quote.by}` : '', ...r.body, r.signoff ?? '', r.stamp ?? ''].join('\n');

  // Discovered: a Guild incident notice naming the place, the room and the disguise
  const found = m.buildHuntReport({
    ...base, ending: 'discovered', biggestMeal: { name: 'Greedy Rogue', ap: 4 },
    party: [member('Greedy Rogue', { isConsumed: true }), member('Paranoid Cleric', { fled: true }), member('Naive Bard')],
  });
  const foundText = text(found);
  log(foundText);
  ok(found.kind === 'incident', 'discovered: an incident notice');
  ok(foundText.includes('Abandoned Manor') && foundText.includes('Grand Foyer'), 'the notice names the location and the room');
  ok(foundText.includes('coat rack'), 'the notice describes the form it was wearing');
  ok(/One devoured/.test(foundText), 'casualties are counted in words');
  ok(foundText.includes('the Paranoid Cleric') && foundText.includes('the Naive Bard'), 'survivors are listed');
  ok(!!found.quote && ['the Paranoid Cleric', 'the Naive Bard'].includes(found.quote.by), 'the witness is a survivor');
  ok(!foundText.includes('Gristle'), "without a bounty, nobody knows the mimic's name");

  const wanted = m.buildHuntReport({ ...base, ending: 'discovered', bounty: true, party: [member('Monster Hunter')] });
  ok(wanted.title === 'Wanted' && text(wanted).includes('Gristle'), "a bounty hunt's notice is a Wanted poster, by name");

  // Cleared with survivors: a bard's verse in the spirit of "Three entered… One came out"
  const verse = m.buildHuntReport({
    ...base, ending: 'cleared', biggestMeal: { name: 'Greedy Rogue', ap: 4 },
    party: [member('Greedy Rogue', { isConsumed: true }), member('Wary Cutpurse', { isConsumed: true }), member('Paranoid Cleric', { fled: true })],
  });
  log(text(verse));
  ok(verse.kind === 'verse', 'cleared with survivors: a verse');
  ok(verse.body[0].startsWith('Three entered the Abandoned Manor.\nOne came out, insisting the coat rack'), 'the verse opens with who went in and who came out');
  ok(text(verse).includes('Greedy Rogue'), 'the verse mourns the biggest meal');

  // Companions don't count as party members going in
  const pets = m.buildHuntReport({ ...base, ending: 'cleared', party: [member('Ranger', { fled: true }), member('Wolf', { isCompanion: true, isConsumed: true })] });
  ok(pets.body[0].startsWith('One entered'), 'companions are not counted among those who entered');

  // Cleared with nobody left: a missing-party notice
  const gone = m.buildHuntReport({ ...base, ending: 'cleared', party: [member('Greedy Rogue', { isConsumed: true }), member('Naive Bard', { isDisappeared: true })] });
  ok(gone.kind === 'missing' && gone.title === 'Missing Party', 'cleared with no survivors: a missing-party notice');
  ok(text(gone).includes('Two went into the Abandoned Manor'), 'the missing notice counts the party');

  // Abandoned: tavern gossip, more rattled the closer they came
  const bored = m.buildHuntReport({ ...base, ending: 'abandoned', peakSuspicion: 1, party: [member('Naive Bard')] });
  const spooked = m.buildHuntReport({ ...base, ending: 'abandoned', peakSuspicion: 8, party: [member('Naive Bard')] });
  ok(bored.kind === 'gossip' && spooked.kind === 'gossip', 'abandoned: tavern gossip');
  ok(text(bored).includes('Dullest job') && !text(spooked).includes('Dullest job'), 'low suspicion: they found it dull');
  ok(/watching|pale/.test(text(spooked)), 'high suspicion: they are rattled');

  // The Sinking Ship's name doesn't get a doubled article
  const ship = m.buildHuntReport({ ...base, ending: 'cleared', locationName: 'The Sinking Ship', sank: true, party: [member('Ship\'s Captain', { fled: true })] });
  ok(!/the The|the the/i.test(text(ship)), 'no "the The Sinking Ship"');

  // Same seed, same report; the seed varies the wording
  const again = m.buildHuntReport({ ...base, ending: 'discovered', biggestMeal: { name: 'Greedy Rogue', ap: 4 },
    party: [member('Greedy Rogue', { isConsumed: true }), member('Paranoid Cleric', { fled: true }), member('Naive Bard')] });
  ok(text(again) === foundText, 'the same seed always gives the same report');
  const titles = new Set(Array.from({ length: 40 }, (_, seed) => m.buildHuntReport({ ...base, seed, ending: 'discovered', party: [member('Naive Bard')] }).title));
  ok(titles.size > 1, 'different hunts get different wording');
}
