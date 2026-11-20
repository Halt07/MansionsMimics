// The Port City of Lonmouth: the first hunting ground past the five starter grounds (Standard+).
// Its waterfront layout, its locals (two places in every party), and Briny mattering there.
export default async function ({ gameData: m, ok }) {
  const port = m.LOCATIONS.find((l) => l.id === 'lonmouth');
  const plain = (tier, mass) => m.LOCATIONS.filter((l) => !l.holiday && !l.rare && !l.branch && m.meetsLocationRequirements(l, tier, mass)).length;

  // ---------- where it fits ----------
  ok(port && port.name === 'Port City of Lonmouth' && port.minTier === 'Standard' && !port.rare && !port.holiday && !port.branch, 'Lonmouth: an ordinary hunting ground, from Standard');
  ok(!m.isLocationAvailable(port, 'Lesser', 8, null) && m.isLocationAvailable(port, 'Standard', 9, null) && m.isLocationAvailable(port, 'Apex', 60, null), 'not for Lesser mimics; Standard and up');
  ok(plain('Lesser', 8) === 5 && plain('Standard', 9) === 6, 'the first new ground after the starter five');
  ok(m.locationGroup(port) === 'uncommon' && m.locationKnowledge(port, [{ tier: 'Standard', mass: 9, locationHuntCounts: {} }]) === 'known', 'the Codex files it as Uncommon, known once a mimic is Standard');
  ok(port.advantageTags.includes('Coastal'), 'a coastal ground');

  // ---------- the waterfront ----------
  const plan = m.floorPlan(port);
  const at = Object.fromEntries(plan.cells.map((c) => [c.room, [c.col, c.row]]));
  ok(plan.cells.length === 6 && plan.cols === 2 && plan.rows === 4, 'six rooms, two wide and four tall');
  ok(plan.cells.every((c) => c.stairsTo.length === 0), '…every connection a door between neighbors (no stairs)');
  ok(at['Wharf Warehouse'].join() === '1,0' && at["Smugglers' Cave"].join() === '1,3' && at['The Salted Gull'].join() === '0,2', 'the warehouse top right, the smugglers\' cave bottom right, the Salted Gull on the left');
  ok(port.roomGraph["Smugglers' Cave"].join() === 'The Docks' && port.roomGraph['Wharf Warehouse'].join() === 'Fish Market', '…both ends of the waterfront are dead ends');
  ok(port.roomGraph['The Docks'].length === 3, 'the Docks are the hub');

  // ---------- who's there ----------
  const locals = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('lonmouth'));
  ok(locals.map((t) => t.name).sort().join() === 'Dockhand,Fishwife,Harbormaster,Sailor on Shore Leave,Smuggler', 'five locals');
  ok(port.nativeShare === 2 && !port.exclusiveRoster, 'two places in each party are theirs; the rest are ordinary adventurers');
  let always = true, mixed = false;
  for (let i = 0; i < 300; i++) {
    const party = m.generateParty(port, 'Standard', 10).filter((p) => !p.isCompanion);
    const n = party.filter((p) => locals.some((t) => t.name === p.name)).length;
    if (n < 2) always = false;
    if (party.some((p) => !locals.some((t) => t.name === p.name))) mixed = true;
  }
  ok(always && mixed, 'every party has at least two locals, alongside ordinary adventurers');
  ok(!m.generateParty(m.LOCATIONS.find((l) => l.id === 'manor'), 'Apex', 40).some((p) => locals.some((t) => t.name === p.name)), 'the locals never leave town');
  const tinker = m.ADVENTURER_TEMPLATES.find((t) => t.name === 'Gnomish Tinkerer-Hunter');
  ok(!m.isTemplateEligible(tinker, port, 'Standard', 10) && m.isTemplateEligible(tinker, port, 'Greater', 13), 'the Gnomish Tinkerer-Hunter (who hates the salt) only turns up from Greater');

  // ---------- the marks, and Briny ----------
  const local = (n) => locals.find((t) => t.name === n);
  ok(local('Harbormaster').alluringQualities.traits.includes('Guild Mark') && local('Harbormaster').repelledBy.traits.includes("Thieves' Mark"), 'the Harbormaster likes a Guild Mark and distrusts a Thieves\' Mark…');
  ok(local('Smuggler').alluringQualities.traits.includes("Thieves' Mark") && local('Smuggler').repelledBy.traits.includes('Guild Mark'), '…and the Smuggler the other way round');
  ok(locals.filter((t) => t.alluringQualities.traits.includes('Briny')).length === 4 && local('Fishwife').lootTraits.includes('Briny'), 'four of them like Briny, and the Fishwife teaches it');

  // ---------- dressing for it ----------
  const fits = (form, room) => m.getRoomContextMod(form, 'lonmouth', room).plausibility;
  ok(fits('standard_dining_table', 'The Salted Gull') > 0 && fits('lesser_chair', 'The Salted Gull') > 0, 'tavern furniture (the dining table, chairs) fits in the Salted Gull');
  ok(fits('lesser_crate', 'Wharf Warehouse') > 0 && fits('lesser_chest', "Smugglers' Cave") > 0 && fits('standard_writing_desk', "Harbormaster's Office") > 0, 'crates in the warehouse, a chest in the smugglers\' cave, a desk in the office');
  ok(port.locationCreatures.some((c) => c.name === 'Wharf Seal') && m.creatureEmoji('Wharf Seal') === '🦭', 'a seal sunning on the docks');
}
