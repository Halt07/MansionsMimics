// The Old Academy (Greater+): a school of magic where everyone is a magic user (toward the Tear in
// Time), except the Academy Dropout, who tried very hard. Who turns up, the cloister, the rooms.
export default async function ({ gameData: m, ok }) {
  const academy = m.LOCATIONS.find((l) => l.id === 'old_academy');

  // ---------- where it fits ----------
  ok(academy && academy.name === 'The Old Academy' && academy.minTier === 'Greater' && academy.magicUsersOnly, 'the Old Academy: from Greater, magic users only');
  ok(!m.isLocationAvailable(academy, 'Standard', 12, null) && m.isLocationAvailable(academy, 'Greater', 13, null), 'not for Standard mimics; Greater and up');
  ok(m.locationGroup(academy) === 'uncommon', 'the Codex files it as Uncommon, with Lonmouth');
  const plan = m.floorPlan(academy);
  const cell = Object.fromEntries(plan.cells.map((c) => [c.room, `${c.col},${c.row}`]));
  ok(plan.cols === 3 && plan.rows === 3 && cell['Cloister Courtyard'] === '1,1' && plan.cells.every((c) => c.stairsTo.length === 0),
    'a cloister: eight rooms around a courtyard, every connection a door');
  ok(academy.roomGraph['Cloister Courtyard'].length === 4, '…the courtyard opens onto the four sides');

  // ---------- who's there ----------
  const dropout = m.ADVENTURER_TEMPLATES.find((t) => t.name === 'Academy Dropout');
  ok(dropout && dropout.type === 'Commoner' && !m.isMagicUser(dropout) && dropout.locations.join() === 'old_academy',
    'the Academy Dropout: a Commoner (not a magic user, however hard they tried), found only here');
  ok(dropout.quirks.some((q) => q.includes('never, ever work')) && dropout.partialLoot.some((l) => l.includes('never once worked')), '…and everything about them says so');
  const seen = new Map();
  for (const [tier, mass] of [['Greater', 13], ['Grand', 20], ['Apex', 40]]) {
    for (let i = 0; i < 400; i++) {
      for (const p of m.generateParty(academy, tier, mass)) seen.set(p.name, { ...p, tier });
    }
  }
  const people = [...seen.values()].filter((p) => !p.isCompanion);
  ok(people.every((p) => m.isMagicUser(p) || p.name === 'Academy Dropout'), `everyone else who turns up is a magic user (${people.map((p) => p.name).join(', ')})`);
  ok(['Arcane Scholar', 'Hedge Witch', 'Elven Arcanist', 'Pact-Bound Warlock', 'Astronomer', 'Doubting Scholar', 'Academy Dropout'].every((n) => seen.has(n)),
    'the scholars, the witches, the warlock, the visiting Astronomer and the Doubting Scholar, and the Dropout');
  ok(!seen.has('Fey Changeling') && !seen.has('Swamp Hag') && !seen.has(m.TIME_CASTER), 'not magic users who belong elsewhere (the fey, the Time Caster)');
  ok(![...seen.keys()].some((n) => ['Greedy Rogue', 'Battle-Hardened Fighter', 'Mimic Hunter'].includes(n)), '…and no ordinary adventurers at all');
  const greaterOnly = new Set(); for (let i = 0; i < 400; i++) m.generateParty(academy, 'Greater', 13).forEach((p) => greaterOnly.add(p.name));
  ok(!greaterOnly.has('Grand Arcanist') && seen.has('Grand Arcanist') && seen.has('Tiefling Hexblade') && !greaterOnly.has('Tiefling Hexblade'),
    'the Grand Arcanist and the Tiefling Hexblade only come for bigger mimics');
  const companions = [...seen.values()].filter((p) => p.isCompanion);
  ok(companions.length > 0 && companions.every((c) => !m.isMagicUser(c)), 'pact companions (the Warlock\'s imp) come too, but don\'t count as magic users');
  ok(m.ADVENTURER_TEMPLATES.find((t) => t.name === 'Astronomer').locations.includes('stargazers_hill'), 'the Astronomer still watches the stars on the hill');

  // ---------- creatures and rooms ----------
  ok(academy.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK) && m.creatureEmoji('Bookworm') === '🪱', 'owls, mice, lab rats, bookworms and a stray familiar');
  const fits = (form, room) => m.getRoomContextMod(form, 'old_academy', room).plausibility;
  ok(fits('standard_bookshelf', 'Great Library') > 0 && fits('standard_writing_desk', "Headmaster's Study") > 0 && fits('standard_dining_table', 'Refectory') > 0 && fits('greater_grandfather_clock', "Headmaster's Study") > 0,
    'a bookshelf in the library, a desk (and the Grandfather Clock) in the Headmaster\'s study, the long table in the refectory');

  // ---------- the Doubting Scholar's notes stay a Reliquary easter egg ----------
  // (They're only ever told in a Devotion ceremony, and only the Reliquary's pilgrims start one)
  ok(!m.ADVENTURER_TEMPLATES.some((t) => t.behavior === 'devotion' && m.isTemplateEligible(t, academy, 'Apex', 60)), 'no devoted pilgrim ever turns up at the Academy, so the Scholar\'s notes are never found there');
}
