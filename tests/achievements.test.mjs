// Achievements that are decided by a rule function (Titanic Feast is covered in giantRealm.test).
export default async function ({ gameData: m, ok }) {
  const minor = { startingType: 'Minor', hatboxToLegendReached: false };
  ok(m.earnsHatboxToLegend(minor, 'Apex'), 'a Minor-born mimic earns From Hatbox to Legend on reaching Apex');
  ok(!m.earnsHatboxToLegend(minor, 'Grand'), 'reaching Grand is not enough');
  ok(!m.earnsHatboxToLegend({ startingType: 'Lesser', hatboxToLegendReached: false }, 'Apex'), 'Lesser-born mimics never earn it');
  ok(!m.earnsHatboxToLegend({ startingType: undefined, hatboxToLegendReached: false }, 'Apex'), 'unknown origin does not earn it');
  ok(!m.earnsHatboxToLegend({ ...minor, hatboxToLegendReached: true }, 'Apex'), 'it is only awarded once');
}
