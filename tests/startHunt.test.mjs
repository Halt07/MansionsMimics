// Starting a hunt (startHunt): who's there, rivals, creatures, sickness, starting suspicion, and
// what gets saved on the character. A constant random value forces each chance one way or the
// other (bounty, rival, sickness, rare location…).
export default async function ({ gameData: m, ok }) {
  const always = (r) => () => r;
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const ref = (formId) => ({ formId, name: formId, tier: m.ALL_FORMS.find((f) => f.id === formId).tier, learned: true });
  const mimic = (over = {}) => ({
    name: 'Testy', startingType: 'Lesser', tier: 'Lesser', mass: 6, plausibility: 3, adhesion: 3, patience: 3,
    assimilationPoints: 0, forms: [ref('lesser_chest')], activeFormIndex: 0, currentAppearance: {},
    learnedMaterials: [], learnedTraits: [], rareLocation: null, burnedLocations: [], burnedForms: [],
    adventurersMet: [], adventurersEaten: [], formsUsed: [], formHuntCounts: {}, locationHuntCounts: {},
    ...over,
  });
  const manor = loc('manor');
  const start = (c, l = manor, room = 'Library', r = 0.5) => m.startHunt(c, l, room, always(r));

  // ---------- an ordinary hunt ----------
  const plain = start(mimic());
  const people = plain.party.filter((a) => !a.isCompanion);
  ok(!plain.bounty && people.length >= manor.partySize[0] && people.length <= manor.partySize[1], 'an ordinary party, sized for the location');
  ok(plain.party.every((a) => manor.rooms.includes(a.location)), 'everyone starts somewhere in the location');
  ok(plain.rivals.length === 0 && plain.sickness === null && plain.suspicion === 0, 'no rivals, no sickness, nobody suspicious');
  ok(plain.creatures.length >= 3 && plain.creatures.length <= 5, 'a few small creatures about');
  ok(plain.startForm?.id === 'lesser_chest' && !plain.burned.location && !plain.burned.form, 'starting in the active form, nothing burned');
  ok(plain.openedRare === null && plain.changes.rareLocation === null, 'no rare location opens on an unlucky roll');
  ok(plain.changes.locationHuntCounts.manor === 1 && plain.changes.formHuntCounts.lesser_chest === 1, 'the hunt is counted, for this location and this form');
  ok(plain.changes.formsUsed.includes('lesser_chest'), 'the form counts as used');
  ok(people.every((a) => plain.changes.adventurersMet.includes(a.name)), 'everyone in the party is now met (the Codex)');
  ok(!plain.party.filter((a) => a.isCompanion).some((a) => plain.changes.adventurersMet.includes(a.name)), '…but not companions');
  ok(start(mimic({ locationHuntCounts: { manor: 4 } })).changes.locationHuntCounts.manor === 5, 'counts add up');
  const formless = start(mimic({ forms: [] }));
  ok(formless.startForm === null && formless.changes.formsUsed.length === 0 && Object.keys(formless.changes.formHuntCounts).length === 0, 'no form: nothing to count');

  // ---------- bounty hunts ----------
  const apex = (mass, over = {}) => mimic({ tier: 'Apex', mass, forms: [], ...over });
  const hunted = start(apex(36), manor, 'Library', 0.1);
  ok(hunted.bounty && hunted.party.every((a) => a.isMimicHunter), 'a famous mimic (mass 36+): bounty hunters, all mimic hunters');
  ok(hunted.party.length === 4 && start(apex(30), manor, 'Library', 0.1).party.length === 3, 'four of them at mass 36+, three below');
  ok(hunted.suspicion === m.BOUNTY_START_SUSPICION, `they know you're there: suspicion starts at ${m.BOUNTY_START_SUSPICION}`);
  ok(hunted.rivals.length === 0, 'no rival mimics on a bounty hunt');
  ok(start(apex(36), manor, 'Library', 0.45).bounty && !start(apex(35), manor, 'Library', 0.45).bounty, 'mass 36+: a 50% chance; 30–35: 25%');
  ok(!start(apex(29), manor, 'Library', 0).bounty, 'under mass 30: never');
  ok(!start(apex(40, { rareLocation: { id: 'sinking_ship', huntsLeft: 2 } }), loc('sinking_ship'), 'Main Deck', 0).bounty, 'never at a rare location');

  // ---------- rival mimics ----------
  const greater = (over = {}) => mimic({ tier: 'Greater', mass: 14, forms: [], ...over });
  const rival = start(greater(), manor, 'Library', 0.1);
  ok(rival.rivals.length === 1 && rival.rivals[0].kind === 'lone' && rival.rivals[0].room !== 'Library', 'Greater+: sometimes a lone rival, never in your room');
  ok(rival.rivals[0].disguise && !rival.rivals[0].revealed, '…hidden, and in disguise');
  ok(start(greater(), manor, 'Library', m.RIVAL_CHANCE + 0.01).rivals.length === 0, `about 1 in 7 (${(m.RIVAL_CHANCE * 100).toFixed(0)}%)`);
  ok(start(mimic({ tier: 'Standard', mass: 10, forms: [] }), manor, 'Library', 0).rivals.length === 0, 'never below Greater');
  ok(start(greater({ rareLocation: { id: 'sinking_ship', huntsLeft: 2 } }), loc('sinking_ship'), 'Main Deck', 0).rivals.length === 0, 'never at a rare location');
  const nestLoc = loc('mimic_nest');
  const nest = start(greater({ rareLocation: { id: 'mimic_nest', huntsLeft: 2 } }), nestLoc, 'Loading Dock', 0.9);
  ok(nest.rivals.some((r) => r.kind === 'elder') && nest.rivals.length >= nestLoc.rivalNest[0] && nest.rivals.length <= nestLoc.rivalNest[1],
    `the Mimic Nest always has its nest: ${nest.rivals.length} mimics, the Elder among them`);
  ok(nest.rivals.every((r) => r.room !== 'Loading Dock'), '…none of them in your room');

  // ---------- burned ----------
  const burnedHere = start(mimic({ burnedLocations: [{ id: 'manor', huntsLeft: 2 }] }));
  ok(burnedHere.burned.location && burnedHere.suspicion === m.BURN_SUSPICION, `burned here: +${m.BURN_SUSPICION}`);
  const burnedShape = start(mimic({ burnedForms: [{ formId: 'lesser_chest', huntsLeft: 2 }] }));
  ok(burnedShape.burned.form && burnedShape.suspicion === m.BURN_SUSPICION, `burned in this shape: +${m.BURN_SUSPICION}`);
  const variant = start(mimic({ forms: [ref('lesser_herbalists_chest')], burnedForms: [{ formId: 'lesser_chest', huntsLeft: 2 }] }));
  ok(variant.burned.form, 'a variant (Herbalist\'s Chest) is burned with its base (Chest)');
  const both = start(mimic({ burnedLocations: [{ id: 'manor', huntsLeft: 2 }], burnedForms: [{ formId: 'lesser_chest', huntsLeft: 2 }] }));
  ok(both.suspicion === 2 * m.BURN_SUSPICION, 'both: they stack');
  const worst = start(apex(36, { forms: [ref('lesser_chest')], burnedLocations: [{ id: 'manor', huntsLeft: 2 }], burnedForms: [{ formId: 'lesser_chest', huntsLeft: 2 }] }), manor, 'Library', 0.1);
  ok(worst.bounty && worst.suspicion === m.BOUNTY_START_SUSPICION + 2 * m.BURN_SUSPICION && worst.suspicion <= m.MAX_START_SUSPICION, `bounty hunters and both burns: ${worst.suspicion}, still short of being found out`);
  ok(!start(mimic({ burnedLocations: [{ id: 'wizard_tower', huntsLeft: 2 }] })).burned.location, 'a burn somewhere else doesn\'t count here');
  const ticked = start(mimic({ burnedLocations: [{ id: 'manor', huntsLeft: 2 }, { id: 'wizard_tower', huntsLeft: 1 }] })).changes.burnedLocations;
  ok(ticked.length === 1 && ticked[0].id === 'manor' && ticked[0].huntsLeft === 1, 'starting a hunt ticks every burn down one, and spent ones go');

  // ---------- sickness ----------
  const capped = { plausibility: 6, adhesion: 6, patience: 6 };
  ok(start(mimic(capped), manor, 'Library', 0.1).sickness !== null, 'every stat capped: sometimes a sickness');
  ok(start(mimic(capped), manor, 'Library', 0.5).sickness === null, '…only 1 in 5');
  ok(start(mimic({ ...capped, patience: 5 }), manor, 'Library', 0).sickness === null, 'not every stat capped: never');

  // ---------- rare locations ----------
  const open = (c) => ({ ...c, rareLocation: { id: 'sinking_ship', huntsLeft: 2 } });
  ok(start(open(mimic()), loc('sinking_ship'), 'Main Deck').changes.rareLocation === null, 'hunting at the open rare location closes it');
  ok(start(open(mimic())).changes.rareLocation?.huntsLeft === 1, 'hunting elsewhere uses up one of its hunts');
  const lucky = start(mimic(), manor, 'Library', 0.05);
  ok(lucky.openedRare?.rare && lucky.changes.rareLocation?.id === lucky.openedRare.id, `none open, and a lucky roll: one opens (${lucky.openedRare?.name})`);

  // ---------- seasonal locations ----------
  const lodge = start(mimic(), loc('snowbound_lodge'), 'Great Hearth');
  ok(lodge.party.every((a) => a.warmth > 0 && a.maxWarmth === a.warmth), 'the Snowbound Lodge: everyone starts warm');
  const street = loc('spell_or_sweet_street');
  const lane = start(mimic(), street, street.procession.order[0]);
  ok(lane.party.every((a) => a.costume), 'Spell or Sweet Street: everyone in costume');
  ok(street.procession.order.every((house) => start(mimic(), street, house).party.every((a) => a.location !== house)), '…and whichever house you pick, nobody starts at yours');
  ok(lane.changes.adventurersMet.length === 0, '…and nobody in costume counts as met');
  const huntersInCostume = start(apex(36), street, street.procession.order[0], 0.1);
  ok(huntersInCostume.bounty && huntersInCostume.party.every((a) => a.isMimicHunter), 'a bounty on the street: hunters only, no real monster joins them');

  // ---------- no side effects ----------
  const c = mimic({ burnedLocations: [{ id: 'manor', huntsLeft: 2 }], locationHuntCounts: { manor: 1 } });
  const before = JSON.stringify(c);
  start(c); start(c, manor, 'Library', 0.05);
  ok(JSON.stringify(c) === before, 'the character passed in is never changed');
}
