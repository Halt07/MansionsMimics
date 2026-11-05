// Burned lairs and forms: discovery burns both, they add starting suspicion and stack, and expire.
export default async function ({ gameData: m, ok }) {
  const none = { burnedLocations: [], burnedForms: [] };
  const burned = m.burnAfterDiscovery(none, 'manor', 'minor_pillow');
  ok(m.locationBurn(burned, 'manor') === m.BURN_HUNTS && m.formBurn(burned, 'minor_pillow') === m.BURN_HUNTS, `discovery burns the location and the form for ${m.BURN_HUNTS} hunts`);
  ok(m.burnSuspicion(none, 'manor', 'minor_pillow') === 0, 'nothing burned: no extra suspicion');
  ok(m.burnSuspicion(burned, 'manor', 'minor_goblet') === m.BURN_SUSPICION, 'same place, different form: +2');
  ok(m.burnSuspicion(burned, 'wizard_tower', 'minor_pillow') === m.BURN_SUSPICION, 'same form, different place: +2');
  ok(m.burnSuspicion(burned, 'manor', 'minor_pillow') === m.BURN_SUSPICION * 2, 'same place and form: they stack (+4)');
  ok(m.burnAfterDiscovery(none, 'manor', null).burnedForms.length === 0, 'no active form: only the location burns');

  const after1 = m.tickBurns(burned);
  ok(m.locationBurn(after1, 'manor') === 1 && m.formBurn(after1, 'minor_pillow') === 1, 'one hunt later: 1 hunt left on each');
  const after2 = m.tickBurns(after1);
  ok(after2.burnedLocations.length === 0 && after2.burnedForms.length === 0, 'two hunts later: both burns are gone');

  const reburned = m.burnAfterDiscovery(after1, 'manor', 'minor_pillow');
  ok(reburned.burnedLocations.length === 1 && m.locationBurn(reburned, 'manor') === m.BURN_HUNTS, 'discovered again while burned: the count resets (no duplicates)');
  const two = m.burnAfterDiscovery(burned, 'wizard_tower', 'minor_goblet');
  ok(two.burnedLocations.length === 2 && two.burnedForms.length === 2, 'separate discoveries burn separate places and forms');
}
