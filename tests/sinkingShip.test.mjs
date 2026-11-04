// The Sinking Ship: roster, the Captain's strongbox, and the sinking clock.
export default async function ({ gameData: m, ok, log }) {
  const { LOCATIONS, ADVENTURER_TEMPLATES: T } = m;
  const ship = LOCATIONS.find((l) => l.id === 'sinking_ship');

  ok(ship.rare && ship.minTier === 'Lesser' && ship.sinkingTurns === 15, 'the Sinking Ship is a rare Lesser+ location that sinks after 15 turns');
  ok(m.isLocationAvailable(ship, 'Lesser', 5, { id: 'sinking_ship', huntsLeft: 2 }) && !m.isLocationAvailable(ship, 'Minor', 3, { id: 'sinking_ship', huntsLeft: 2 }), 'it needs Lesser tier');
  const opened = m.advanceRareLocation(null, 'manor', 'Lesser', 5, (() => { const v = [0.1, 0]; let i = 0; return () => v[i++]; })());
  ok(opened.opened?.id === 'sinking_ship', 'it is the only rare location a Lesser mimic can be offered');

  const roster = T.filter((t) => m.isTemplateEligible(t, ship, 'Apex', 40)).map((t) => t.name);
  ok(roster.length === 5 && ship.alwaysIncludes.includes("Ship's Captain"), `its own five-person crew, Captain always aboard (${roster.join(', ')})`);

  const captain = T.find((t) => t.name === "Ship's Captain");
  ok(captain.treasure?.ap === 8, "the Captain carries the strongbox (+8 AP)");
  ok(T.filter((t) => t.treasure).length === 1, 'only the Captain carries treasure');

  // Warnings: a third of the way, two thirds, and the last two turns
  const warnings = Array.from({ length: 15 }, (_, i) => m.sinkingWarning(15, i + 1));
  const warnedTurns = warnings.map((w, i) => (w ? i + 1 : null)).filter(Boolean);
  ok(warnedTurns.join() === '5,10,13,14', `warnings at turns ${warnedTurns.join(', ')}`);
  ok(warnings[14] === null, 'the sinking turn itself is announced by the game, not as a warning');
  log(warnings.filter(Boolean).join(' | '));

  // The strongbox's guaranteed prize
  const box = captain.treasure;
  const prizes = new Set();
  for (let i = 0; i < 300; i++) { const p = m.pickTreasurePrize(box, [], []); prizes.add(`${p.kind}:${p.name}`); }
  ok([...prizes].sort().join() === 'material:Crystal,material:Gold,material:Silver,trait:Gilded,trait:Ornate', `a fresh mimic can win any of the five (${[...prizes].join(', ')})`);
  let neverKnown = true;
  for (let i = 0; i < 300; i++) {
    const p = m.pickTreasurePrize(box, ['Gold', 'Silver'], ['Ornate']);
    if (!p || ['Gold', 'Silver', 'Ornate'].includes(p.name)) neverKnown = false;
  }
  ok(neverKnown, 'it never awards something the mimic already knows');
  ok(m.pickTreasurePrize(box, ['Gold', 'Silver', 'Crystal'], ['Gilded'])?.name === 'Ornate', 'with one unknown left, that one is guaranteed');
  ok(m.pickTreasurePrize(box, ['Gold', 'Silver', 'Crystal'], ['Gilded', 'Ornate']) === null, 'knowing them all yields no prize (the game shows a flavor line instead)');

  // Down With the Ship
  const ach = m.ACHIEVEMENTS.find((a) => a.id === 'downWithTheShip');
  const base = { hatboxToLegendReached: false, apexPeakReached: false, titanicFeastReached: false, downWithTheShipReached: false, conversions: 0, mimicsConsumed: 0 };
  ok(ach && !ach.isEarned(base) && ach.isEarned({ ...base, downWithTheShipReached: true }), 'Down With the Ship is earned by swallowing the Captain');

  // Elusive: harder to catch, and never leaves the ship when it gets away
  ok(captain.behavior === 'elusive' && !m.isHiddenBehavior('elusive'), 'the Captain is Elusive (shown in the Codex)');
  ok(m.strikeResistDice(captain) === captain.discipline + 1 && m.strikeResistDice({ discipline: 4 }) === 4, 'Elusive adds one die to the resist roll; others roll their Discipline');
  const form = m.ALL_FORMS[0];
  const trials = 6000;
  const catchRate = (adv) => { let c = 0; for (let i = 0; i < trials; i++) if (m.adhesionCheck(4, form, adv).success) c++; return c / trials; };
  const plain = catchRate({ name: 'x', discipline: 4 });
  const elusive = catchRate({ name: 'x', discipline: 4, behavior: 'elusive' });
  ok(elusive < plain - 0.18 && elusive > 0.22 && elusive < 0.34, `at Adhesion 4 the Captain is caught ${(elusive * 100).toFixed(0)}% of the time vs ${(plain * 100).toFixed(0)}% without Elusive`);
  let staysAboard = true;
  for (let i = 0; i < 300; i++) {
    const room = m.escapeRoom(ship, 'Main Deck', 'Main Deck');
    if (room === 'Main Deck' || !ship.rooms.includes(room)) staysAboard = false;
  }
  ok(staysAboard, 'when it gets away it runs to another room on the ship, never the mimic’s');
  ok(m.escapeRoom(ship, "Captain's Cabin", 'Quarterdeck') !== 'Quarterdeck', 'it never runs into the mimic’s room, even from a dead end');
}
