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

  // Names that bring their own "The" (The Princess, The King) don't get a second one, in any telling
  const royals = (over) => [member('The Princess', over), member('The King', { fled: true })];
  const doubled = [];
  for (let seed = 0; seed < 40; seed++) {
    for (const locationId of [undefined, 'spell_or_sweet_street']) {
      for (const [ending, party] of [['discovered', royals({ isConsumed: true })], ['abandoned', royals({ isConsumed: true })], ['cleared', royals({ isConsumed: true })], ['cleared', [member('The Princess', { isConverted: true })]], ['cleared', [member('The Princess', { isConsumed: true })]]]) {
        const r = m.buildHuntReport({ ...base, seed, locationId, ending, party, biggestMeal: { name: 'The Princess', ap: 4 } });
        if (/the The|The The|a The /.test(text(r))) doubled.push(text(r));
      }
    }
  }
  ok(doubled.length === 0, `no "the The Princess" in any report${doubled.length ? `: ${doubled[0].match(/[^]{0,60}(the The|The The|a The ).{0,30}/s)?.[0]}` : ''}`);

  // Same seed, same report; the seed varies the wording
  const again = m.buildHuntReport({ ...base, ending: 'discovered', biggestMeal: { name: 'Greedy Rogue', ap: 4 },
    party: [member('Greedy Rogue', { isConsumed: true }), member('Paranoid Cleric', { fled: true }), member('Naive Bard')] });
  ok(text(again) === foundText, 'the same seed always gives the same report');
  const titles = new Set(Array.from({ length: 40 }, (_, seed) => m.buildHuntReport({ ...base, seed, ending: 'discovered', party: [member('Naive Bard')] }).title));
  ok(titles.size > 1, 'different hunts get different wording');

  // Spell or Sweet Street tells it the village's way, by costume
  const street = { ...base, locationId: 'spell_or_sweet_street', locationName: 'Spell or Sweet Street', formName: 'Chest', lastRoom: "Baker's House" };
  const dressed = (costume, trueName, over = {}) => member(costume, { costume, trueName, ...over });
  const lane = [dressed('Dracula', 'Paranoid Cleric', { isConsumed: true }), dressed('Bedsheet Ghost', 'Naive Bard')];
  const caught = m.buildHuntReport({ ...street, ending: 'discovered', party: lane });
  ok(caught.kind === 'incident' && caught.heading.includes('Mayor') && /sweet|knock|doorstep/i.test(caught.title), `found out on the street: the Mayor cancels it ("${caught.title}")`);
  ok(text(caught).includes('Bedsheet Ghost') && !text(caught).includes('Naive Bard'), 'everyone is named by their costume, not who they really were');
  ok(text(caught).includes('chest') && text(caught).includes('not full of sweets'), 'the notice warns about the form on the doorstep');
  const quiet = m.buildHuntReport({ ...street, ending: 'cleared', party: lane.map((a) => ({ ...a, isConsumed: true })) });
  ok(quiet.kind === 'missing' && quiet.title === 'No More Spell or Sweeters', 'nobody home: "No More Spell or Sweeters"');
  ok(text(quiet).includes('a Dracula') && text(quiet).includes('sweet bags'), 'the missing notice lists their costumes and finds their sweet bags');
  ok(/prank|joke/.test(text(quiet)), 'the village half suspects a prank');
  const rhyme = m.buildHuntReport({ ...street, ending: 'cleared', biggestMeal: { name: 'Dracula', ap: 5 }, party: lane });
  ok(rhyme.kind === 'verse' && rhyme.heading === 'A Skipping Rhyme' && text(rhyme).includes('Spell or sweet'), 'someone got home: the children skip to a rhyme about it');
  ok(text(rhyme).includes("The Dracula knocked"), 'the rhyme remembers who went in and didn\'t come out');
  const gossip = m.buildHuntReport({ ...street, ending: 'abandoned', party: [dressed('Mummy', 'Naive Bard')] });
  ok(gossip.kind === 'gossip' && gossip.postedAt.includes('Baker'), 'gave up: talk at the baker\'s');

  // A real monster among them
  const wolf = dressed('Werewolf', 'Werewolf');
  const howl = m.buildHuntReport({ ...street, ending: 'cleared', party: [wolf, dressed('Witch', 'Hedge Witch', { isConsumed: true })] });
  ok(text(howl).includes('Not every one of them wore a mask'), 'a real monster who got away: "not every one of them wore a mask"');
  const ate = m.buildHuntReport({ ...street, ending: 'cleared', party: [{ ...wolf, isConsumed: true }, dressed('Witch', 'Hedge Witch', { isConsumed: true })] });
  ok(text(ate).includes('no person at all'), 'a real monster eaten: the search party found no person under that costume');
  const toldBy = m.buildHuntReport({ ...street, ending: 'abandoned', party: [wolf, dressed('Witch', 'Hedge Witch')] });
  ok(text(toldBy).includes("Didn't eat a single sweet"), 'and the baker noticed the Werewolf');

  // Everywhere else still gets the Guild's
  ok(m.buildHuntReport({ ...base, locationId: 'manor', ending: 'discovered', party: [member('Naive Bard')] }).heading.includes('Guild'), 'other locations: still the Guild');
}
