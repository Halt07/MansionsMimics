// Adventurer data integrity, party eligibility (tier / mass / location gating),
// AP rewards, and the special behaviors (Keen Hearing, Carrion Scent, etc.).
export default async function ({ gameData: m, ok, log }) {
  const { ADVENTURER_TEMPLATES: T, ADVENTURER_GROUPS: G, LOCATIONS: L, MATERIALS, AP_REWARDS, BEHAVIORS, TIER_ORDER } = m;
  const allMats = new Set(Object.values(MATERIALS).flat());
  const allTraits = new Set(m.ALL_TRAITS);
  const locIds = new Set(L.map((l) => l.id));
  const groupIds = new Set(G.map((g) => g.id));

  // Every template references real groups, types, materials, traits, locations and behaviors
  let problems = 0;
  const check = (cond, msg) => { if (!cond) { problems++; ok(false, msg); } };
  for (const t of T) {
    check(groupIds.has(t.group), `${t.name}: unknown group "${t.group}"`);
    check(AP_REWARDS[t.type] !== undefined, `${t.name}: no AP reward for type ${t.type}`);
    t.lootMaterials.forEach((x) => check(allMats.has(x), `${t.name}: loot material "${x}" doesn't exist`));
    (t.lootTraits || []).forEach((x) => check(allTraits.has(x), `${t.name}: loot trait "${x}" doesn't exist`));
    (t.locations || []).forEach((x) => check(locIds.has(x), `${t.name}: location "${x}" doesn't exist`));
    if (t.behavior) check(BEHAVIORS[t.behavior], `${t.name}: behavior "${t.behavior}" doesn't exist`);
  }
  ok(problems === 0, `all ${T.length} templates reference valid data`);

  // Each supernatural monster can spawn somewhere reachable at its own unlock tier
  for (const t of T.filter((t) => t.group === 'supernatural')) {
    const tier = t.minTier || 'Minor';
    const ti = TIER_ORDER.indexOf(tier);
    const reachable = L.filter((l) => TIER_ORDER.indexOf(l.minTier) <= ti && !(l.minMass > 40));
    const where = reachable.filter((l) => m.isTemplateEligible(t, l, tier, 40)).map((l) => l.id);
    ok(where.length > 0, `${t.name} can spawn at ${tier}`);
    log(`${t.name.padEnd(18)} ${tier.padEnd(8)} first available at: ${where.join(', ')}`);
  }
  ok(!m.isTemplateEligible(T.find((t) => t.name === 'Gargoyle'), L.find((l) => l.id === 'cursed_chapel'), 'Lesser', 6), 'Gargoyle gated below Standard');
  ok(!m.isTemplateEligible(T.find((t) => t.name === 'Ghoul'), L.find((l) => l.id === 'wizard_tower'), 'Apex', 40), 'Ghoul not in the Wizard Tower');
  ok(!m.isTemplateEligible(T.find((t) => t.name === 'Half-Giant Mercenary'), L.find((l) => l.id === 'manor'), 'Apex', 40), 'giant-kin only in giant realms');
  ok(m.getApReward(T.find((t) => t.name === 'Half-Giant Mercenary')) === 12, 'giant-kin worth 12 AP regardless of class');
  ok(m.getApReward(T.find((t) => t.name === 'Werewolf')) === 6, 'Werewolf (Beast) worth 6 AP');

  // Behaviors on a real room graph
  const loc = L.find((l) => l.id === 'cursed_chapel');
  const rooms = loc.rooms;
  const mk = (name, room) => ({ ...T.find((t) => t.name === name), id: name, location: room, isAlive: true, isConsumed: false, suspicion: 1 });
  const base = rooms[0];
  const adj = loc.roomGraph[base][0];
  const farRoom = rooms.find((r) => m.getRoomDistance(loc, base, r) >= 3);
  const twoAway = rooms.find((x) => m.getRoomDistance(loc, base, x) === 2);

  let r = m.getBehaviorReactions('strike', { party: [mk('Wailing Banshee', adj)], location: loc, mimicRoom: base });
  ok(r.suspicion === 1 && r.patches['Wailing Banshee'].suspicionDelta === 1, 'Banshee hears a nearby strike');
  if (farRoom) {
    r = m.getBehaviorReactions('strike', { party: [mk('Wailing Banshee', farRoom)], location: loc, mimicRoom: base });
    ok(r.suspicion === 0, "Banshee doesn't hear 3+ rooms away");
  }
  r = m.getBehaviorReactions('formChange', { party: [mk('Fey Changeling', adj)], location: loc, mimicRoom: base });
  ok(r.suspicion === 2, 'Changeling senses a form change');
  r = m.getBehaviorReactions('relocate', { party: [mk('Gargoyle', base)], location: loc, mimicRoom: adj, fromRoom: base });
  ok(r.suspicion === 2, 'Gargoyle sees a relocate');
  r = m.getBehaviorReactions('feed', { party: [mk('Ghoul', adj)], location: loc, mimicRoom: base });
  ok(r.patches.Ghoul.location === base && r.patches.Ghoul.isAttracted === true && r.arrivals.length === 1, 'Ghoul arrives already lured');
  if (twoAway) {
    r = m.getBehaviorReactions('feed', { party: [mk('Werewolf', twoAway)], location: loc, mimicRoom: base });
    ok(m.getRoomDistance(loc, r.patches.Werewolf.location, base) === 1 && r.arrivals.length === 0, 'Werewolf steps one room closer');
  }
  r = m.getBehaviorReactions('feed', { party: [mk('Ghoul', adj)], location: loc, mimicRoom: base, excludeIds: ['Ghoul'] });
  ok(Object.keys(r.patches).length === 0, 'the consumed target itself does not react');
  ok(m.isStationary(mk('Gargoyle', base)) && !m.isStationary(mk('Werewolf', base)), 'Gargoyle never wanders');
}
