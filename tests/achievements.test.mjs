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
  const fresh = { hatboxToLegendReached: false, apexPeakReached: false, titanicFeastReached: false, conversions: 0, mimicsConsumed: 0 };
  const earned = (c) => ACHIEVEMENTS.filter((a) => a.isEarned(c)).map((a) => a.id);
  ok(ACHIEVEMENTS.length === 5 && new Set(ACHIEVEMENTS.map((a) => a.id)).size === 5, 'five distinct achievements');
  ok(earned(fresh).length === 0, 'a new mimic has none');
  ok(CULT_CONVERSIONS === 3 && CANNIBAL_MIMICS === 10, 'Cult of Personality needs 3 conversions; Cannibal needs 10 mimics');
  ok(!earned({ ...fresh, conversions: 2 }).includes('cultOfPersonality') && earned({ ...fresh, conversions: 3 }).includes('cultOfPersonality'), 'Cult of Personality is earned at the 3rd conversion');
  ok(!earned({ ...fresh, mimicsConsumed: 9 }).includes('cannibal') && earned({ ...fresh, mimicsConsumed: 10 }).includes('cannibal'), 'Cannibal is earned at the 10th mimic');
  ok(earned({ ...fresh, apexPeakReached: true, titanicFeastReached: true, hatboxToLegendReached: true }).length === 3, 'the flag-based achievements read their saved flags');
  ok(ACHIEVEMENTS.every((a) => a.flavor('Chesty').length > 0 && a.description.length > 0), 'every achievement has a description and banner text');
}
