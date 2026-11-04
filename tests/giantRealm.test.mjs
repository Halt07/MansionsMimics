// Giant realm: each location's giant roster, small creatures, and the Titanic Feast achievement.
export default async function ({ gameData: m, ok, log }) {
  const { ADVENTURER_TEMPLATES: T, LOCATIONS } = m;
  const loc = (id) => LOCATIONS.find((l) => l.id === id);
  const eligibleAt = (id, mass) => T.filter((t) => m.isTemplateEligible(t, loc(id), 'Apex', mass)).map((t) => t.name).sort();

  // Cloud Kingdom: exactly its five giants, all available on arrival (mass 38)
  const kingdom = eligibleAt('cloud_kingdom', 38);
  const expected = ['Cloud Eagle Rider', 'Cloud Forge Smith', 'Cloud Giant Scout', 'Giant Lord', 'Storm Giant Wanderer'];
  ok(kingdom.join() === expected.join(), `Cloud Kingdom roster is its five giants (${kingdom.join(', ')})`);
  ok(eligibleAt('cloud_kingdom', 99).join() === expected.join(), 'no ordinary adventurers or castle giants reach the Cloud Kingdom');

  // Giant's Castle: its own five giants, never the Cloud Kingdom ones
  const castleGiants = T.filter((t) => t.group === 'giantKin' && m.isTemplateEligible(t, loc('giants_castle'), 'Apex', 99)).map((t) => t.name);
  ok(castleGiants.length === 5, `Giant's Castle has five giants (${castleGiants.join(', ')})`);
  ok(!castleGiants.some((n) => expected.includes(n)), 'Cloud Kingdom giants never appear at the castle');

  // Small creatures: no more "Golden Goose" creature; the Storm Elemental isn't filling
  const creatures = [loc('giants_castle'), loc('cloud_kingdom')].flatMap((l) => l.locationCreatures);
  ok(!creatures.some((c) => c.name === 'Golden Goose'), 'only the companion is called Golden Goose');
  ok(creatures.filter((c) => c.name === 'Cloud Gosling').length === 2, 'both giant locations have Cloud Goslings');
  const storm = creatures.find((c) => c.name === 'Storm Elemental');
  ok(storm && storm.ap <= 2, `Storm Elemental is barely a snack (${storm?.ap} AP)`);

  // Giant Lord is the biggest meal in the kingdom
  const lord = T.find((t) => t.name === 'Giant Lord');
  ok(T.filter((t) => expected.includes(t.name)).every((t) => t.wholeMealMass <= lord.wholeMealMass), `Giant Lord is the largest meal (whole at ${lord.wholeMealMass})`);

  // Titanic Feast
  ok(m.TITANIC_FEAST_GIANTS.slice().sort().join() === expected.join(), 'Titanic Feast requires the five Cloud Kingdom giants');
  ok(!m.isTitanicFeastComplete(expected.slice(0, 4)), 'four of five is not enough');
  ok(m.isTitanicFeastComplete([...expected, "Giant's Goose-Keeper"]), 'all five (plus extras) completes it');
}
