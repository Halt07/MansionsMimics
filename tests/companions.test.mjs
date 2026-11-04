// Companion wiring: stats come from the option, AP from `ap`, overrides apply, weights work.
export default async function ({ gameData: m, ok, log }) {
  const { ADVENTURER_TEMPLATES: T, MATERIALS, TRAITS, BEHAVIORS } = m;
  const allMats = new Set(Object.values(MATERIALS).flat());
  const allTraits = new Set(Object.values(TRAITS).flat());

  // Every companion option references real data
  let problems = 0;
  for (const t of T.filter((t) => t.companion)) {
    for (const o of t.companion.options) {
      const where = `${t.name}${o.nameSuffix}`;
      (o.lootMaterials || []).forEach((x) => { if (!allMats.has(x)) { problems++; ok(false, `${where}: material ${x}`); } });
      (o.lootTraits || []).forEach((x) => { if (!allTraits.has(x)) { problems++; ok(false, `${where}: trait ${x}`); } });
      if (o.behavior && !BEHAVIORS[o.behavior]) { problems++; ok(false, `${where}: behavior ${o.behavior}`); }
    }
  }
  ok(problems === 0, 'all companion options reference valid data');

  // Discipline and AP are no longer swapped
  const ranger = T.find((t) => t.companion?.options.some((o) => o.nameSuffix === "'s Lynx"));
  const lynx = ranger.companion.options.find((o) => o.nameSuffix === "'s Lynx");
  const lynxMember = m.createCompanion(ranger, lynx, 'c1', 'Hall');
  ok(lynxMember.discipline === lynx.discipline, `Lynx uses its own discipline (${lynx.discipline})`);
  ok(m.getApReward(lynxMember) === lynx.ap, `Lynx is worth its own AP (${lynx.ap})`);
  ok(lynxMember.partialLoot.includes('a claw'), 'companions without overrides keep the default bite flavor');

  // Fey Changeling familiars
  const changeling = T.find((t) => t.name === 'Fey Changeling');
  const names = changeling.companion.options.map((o) => o.nameSuffix);
  ok(names.includes("'s Pixie") && names.includes("'s Thorn Sprite"), 'Changeling can bring a Pixie or Thorn Sprite');
  ok(changeling.companion.options.every((o) => !o.behavior), 'Changeling familiars have no special behavior');
  const pixie = m.createCompanion(changeling, changeling.companion.options[0], 'c2', 'Hall');
  ok(pixie.partialLoot.includes('a gossamer wing') && pixie.lootMaterials.includes('Feywood'), 'Pixie has its own bite flavor and loot');

  // Goose-Keeper's geese
  const keeper = T.find((t) => t.name === "Giant's Goose-Keeper");
  const [giant, golden] = ['Giant Goose', 'Golden Goose'].map((n) => keeper.companion.options.find((o) => o.nameSuffix === `'s ${n}`));
  ok(giant && golden, 'Goose-Keeper can bring a Giant Goose or the Golden Goose');
  for (const o of [giant, golden]) {
    const goose = m.createCompanion(keeper, o, 'c3', 'Hall');
    ok(goose.group === 'giantKin' && goose.behavior === 'keenHearing', `${goose.name} is giant-kin with Keen Hearing`);
    ok(goose.wholeMealMass < keeper.wholeMealMass, `${goose.name} can be swallowed before its keeper (${goose.wholeMealMass} < ${keeper.wholeMealMass})`);
    ok(m.getApReward(goose) === o.ap, `${goose.name} is worth ${o.ap} AP, not the giant default`);
    ok(m.needsPartialBites({ tier: 'Apex', mass: 30 }, goose) && !m.needsPartialBites({ tier: 'Apex', mass: 32 }, goose), `${goose.name} needs bites below mass 32`);
  }
  ok(golden.lootMaterials.includes('Golden Goose Down'), 'Golden Goose carries Golden Goose Down');

  // Weighted picking: Giant Goose (2) should come up about twice as often as the Golden Goose (1)
  const counts = { giant: 0, golden: 0 };
  for (let i = 0; i < 6000; i++) {
    const o = m.pickCompanionOption(keeper.companion.options);
    if (o === giant) counts.giant++; else counts.golden++;
  }
  const share = counts.golden / 6000;
  ok(share > 0.28 && share < 0.39, `Golden Goose appears about 1/3 of the time (${(share * 100).toFixed(1)}%)`);
  log(`goose picks: ${counts.giant} giant / ${counts.golden} golden`);

  // Elite hunters' companions: less common, but stronger than the King's Hunting Hound
  const hound = T.flatMap((t) => t.companion?.options ?? []).find((o) => o.nameSuffix === "'s Hunting Hound");
  for (const name of ['Mimic Hunter', 'Orcish Tracker']) {
    const t = T.find((x) => x.name === name);
    ok(t.companion && t.companion.chance >= 0.3 && t.companion.chance <= 0.4, `${name} has a 30–40% companion chance`);
    for (const o of t.companion.options) {
      ok(o.ap > hound.ap && o.discipline > hound.discipline && o.constitution > hound.constitution,
        `${name}${o.nameSuffix} out-classes the Hunting Hound`);
    }
  }

  // The Bloodhound only sometimes has Blood Scent (~30%)
  const hunter = T.find((x) => x.name === 'Mimic Hunter');
  const bloodhound = hunter.companion.options.find((o) => o.nameSuffix === "'s Bloodhound");
  let scented = 0;
  for (let i = 0; i < 5000; i++) {
    const b = m.createCompanion(hunter, bloodhound, 'c4', 'Hall');
    if (b.behavior === 'bloodScent') scented++;
    else if (b.behavior !== undefined) { ok(false, `unexpected behavior ${b.behavior}`); break; }
  }
  const rate = scented / 5000;
  ok(rate > 0.26 && rate < 0.34, `Bloodhound has Blood Scent about 30% of the time (${(rate * 100).toFixed(1)}%)`);
  // Options without behaviorChance always get their behavior
  const goose = m.createCompanion(keeper, giant, 'c5', 'Hall');
  ok(goose.behavior === 'keenHearing', 'geese always have Keen Hearing');
}
