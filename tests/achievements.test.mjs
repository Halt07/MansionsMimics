// Achievements that are decided by a rule function (Titanic Feast is covered in giantRealm.test).
export default async function ({ gameData: m, ok }) {
  const minor = { startingType: 'Minor', hatboxToLegendReached: false };
  ok(m.earnsHatboxToLegend(minor, 'Apex'), 'a Minor-born mimic earns From Hatbox to Legend on reaching Apex');
  ok(!m.earnsHatboxToLegend(minor, 'Grand'), 'reaching Grand is not enough');
  ok(!m.earnsHatboxToLegend({ startingType: 'Lesser', hatboxToLegendReached: false }, 'Apex'), 'Lesser-born mimics never earn it');
  ok(!m.earnsHatboxToLegend({ startingType: undefined, hatboxToLegendReached: false }, 'Apex'), 'unknown origin does not earn it');
  ok(!m.earnsHatboxToLegend({ ...minor, hatboxToLegendReached: true }, 'Apex'), 'it is only awarded once');

  // The shared achievement list
  const { ACHIEVEMENTS, CULT_CONVERSIONS, CANNIBAL_MIMICS } = m;
  const fresh = { hatboxToLegendReached: false, apexPeakReached: false, titanicFeastReached: false, downWithTheShipReached: false, conversions: 0, mimicsConsumed: 0, adventurersEaten: [], learnedMaterials: [], learnedTraits: [], formsUsed: [] };
  const earned = (c) => ACHIEVEMENTS.filter((a) => a.isEarned(c)).map((a) => a.id);
  ok(ACHIEVEMENTS.length === 9 && new Set(ACHIEVEMENTS.map((a) => a.id)).size === 9, 'nine distinct achievements');
  ok(earned(fresh).length === 0, 'a new mimic has none');
  ok(CULT_CONVERSIONS === 3 && CANNIBAL_MIMICS === 10, 'Cult of Personality needs 3 conversions; Cannibal needs 10 mimics');
  ok(!earned({ ...fresh, conversions: 2 }).includes('cultOfPersonality') && earned({ ...fresh, conversions: 3 }).includes('cultOfPersonality'), 'Cult of Personality is earned at the 3rd conversion');
  ok(!earned({ ...fresh, mimicsConsumed: 9 }).includes('cannibal') && earned({ ...fresh, mimicsConsumed: 10 }).includes('cannibal'), 'Cannibal is earned at the 10th mimic');
  ok(earned({ ...fresh, apexPeakReached: true, titanicFeastReached: true, hatboxToLegendReached: true, downWithTheShipReached: true }).length === 4, 'the flag-based achievements read their saved flags');
  ok(ACHIEVEMENTS.every((a) => a.flavor('Chesty').length > 0 && a.description.length > 0), 'every achievement has a description and banner text');

  // Connoisseur: one of every adventurer
  const allNames = m.ADVENTURER_TEMPLATES.map((t) => t.name);
  ok(!earned({ ...fresh, adventurersEaten: allNames.slice(1) }).includes('connoisseur'), 'Connoisseur needs every adventurer — one missing is not enough');
  ok(earned({ ...fresh, adventurersEaten: allNames }).includes('connoisseur'), 'eating every adventurer earns Connoisseur');

  // Master of Disguise: every material and every trait
  const { ALL_MATERIALS, LEARNABLE_TRAITS } = m;
  ok(earned({ ...fresh, learnedMaterials: [...ALL_MATERIALS], learnedTraits: [...LEARNABLE_TRAITS] }).includes('masterOfDisguise'), 'knowing every material and learnable trait earns Master of Disguise');
  ok(!earned({ ...fresh, learnedMaterials: [...ALL_MATERIALS], learnedTraits: LEARNABLE_TRAITS.filter((t) => t !== 'Gilded') }).includes('masterOfDisguise'), 'one learned trait short is not enough');
  const teachable = LEARNABLE_TRAITS.filter((t) => !m.ALL_STARTING_TRAITS.includes(t));
  ok(earned({ ...fresh, learnedMaterials: [...ALL_MATERIALS], learnedTraits: teachable }).includes('masterOfDisguise'), 'starting traits count without being learned');

  // Every material and trait must actually be learnable somewhere, or Master of Disguise is impossible
  const { materials, traits } = m.obtainableMaterialsAndTraits();
  const missingMats = ALL_MATERIALS.filter((x) => !materials.has(x));
  const missingTraits = teachable.filter((x) => !traits.has(x));
  ok(missingMats.length === 0, `every material can be learned from some adventurer${missingMats.length ? ` — missing: ${missingMats.join(', ')}` : ''}`);
  ok(missingTraits.length === 0, `every trait a mimic doesn't start with can be learned from some adventurer${missingTraits.length ? ` — missing: ${missingTraits.join(', ')}` : ''}`);

  // Lifetime stats
  const stats = m.lifetimeStats({
    huntsSurvived: 7, huntsFailed: 3, partyMembersEaten: 20, mimicsConsumed: 4, formsUsed: ['minor_pillow', 'minor_goblet'],
    closestCall: 9, biggestMeal: { name: 'Giant Lord', ap: 12 }, lifetimeApEarned: 340,
    formHuntCounts: { minor_pillow: 5, minor_goblet: 2 }, locationHuntCounts: { manor: 1, wizard_tower: 6 },
  });
  ok(stats.huntsTotal === 10 && stats.entitiesEaten === 24 && stats.formsUsed === 2, 'lifetime stats: total = survived + failed; entities include rival mimics; forms are unique');
  ok(m.withFormUsed(['minor_pillow'], 'minor_pillow').length === 1 && m.withFormUsed(['minor_pillow'], 'minor_goblet').length === 2, 'forms used are only counted once each');

  ok(stats.favoriteForm?.name === 'Pillow' && stats.favoriteForm.hunts === 5, 'favorite form is the one hunted in most');
  ok(stats.favoriteHuntingGround?.name === "Wizard's Tower" && stats.favoriteHuntingGround.hunts === 6, 'favorite hunting ground is the one hunted at most');
  ok(stats.closestCall === 9 && stats.biggestMeal?.name === 'Giant Lord' && stats.lifetimeApEarned === 340, 'closest call, biggest meal and lifetime AP come straight from the save');
  const empty = m.lifetimeStats({ huntsSurvived: 0, huntsFailed: 0, partyMembersEaten: 0, mimicsConsumed: 0, formsUsed: [], closestCall: 0, biggestMeal: null, lifetimeApEarned: 0, formHuntCounts: {}, locationHuntCounts: {} });
  ok(empty.favoriteForm === null && empty.favoriteHuntingGround === null, 'no hunts yet: no favorites');
  ok(m.withCount({ manor: 2 }, 'manor').manor === 3 && m.withCount({}, 'manor').manor === 1, 'withCount adds one to a key');
  ok(m.withBiggestMeal({ name: 'Ghoul', ap: 5 }, 'Rat', 1)?.name === 'Ghoul' && m.withBiggestMeal({ name: 'Ghoul', ap: 5 }, 'Elder Mimic', 18)?.name === 'Elder Mimic', 'biggest meal only changes for a bigger one');
  ok(m.withBiggestMeal(null, 'Rat', 1)?.name === 'Rat', 'the first meal is the biggest so far');

  // Starting traits and materials
  const startingTaught = [...traits].filter((t) => m.ALL_STARTING_TRAITS.includes(t));
  ok(startingTaught.length === 0, `no adventurer teaches a trait every mimic already knows${startingTaught.length ? ` — ${startingTaught.join(', ')}` : ''}`);
  ok(['Bloodstained', 'Shadowed Presence', 'Faint Glow', 'Gilded'].every((t) => !m.ALL_STARTING_TRAITS.includes(t)), 'Bloodstained, Shadowed Presence, Faint Glow and Gilded must be learned');
  ok(m.knowsTrait({ learnedTraits: [] }, 'Worn') && !m.knowsTrait({ learnedTraits: [] }, 'Gilded') && m.knowsTrait({ learnedTraits: ['Gilded'] }, 'Gilded'), 'a mimic knows starting traits plus what it has learned');
  ok(m.STARTING_MATERIALS.Minor.join() === 'Pine,Iron,Cotton' && m.STARTING_MATERIALS.Lesser.join() === 'Oak,Iron,Cowhide', 'Minor mimics start with Pine, Lesser with Oak');
  const starters = new Set([...m.STARTING_MATERIALS.Minor, ...m.STARTING_MATERIALS.Lesser]);
  const unteachableStarters = [...starters].filter((x) => !materials.has(x));
  ok(unteachableStarters.length === 0, `either origin can learn the other's starting materials${unteachableStarters.length ? ` — missing: ${unteachableStarters.join(', ')}` : ''}`);

  // Starting materials should be learnable outside rare locations too (rare ones may never open)
  const rareIds = new Set(m.LOCATIONS.filter((l) => l.rare).map((l) => l.id));
  const everydayTeachers = (mat) => m.ADVENTURER_TEMPLATES.filter((t) =>
    t.lootMaterials.includes(mat) && !(t.locations && t.locations.every((id) => rareIds.has(id))));
  for (const mat of starters) {
    ok(everydayTeachers(mat).length > 0, `${mat} can be learned outside rare locations (${everydayTeachers(mat).map((t) => t.name).join(', ')})`);
  }
}
