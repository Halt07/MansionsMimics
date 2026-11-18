// Stargazers' Hill: a Night of Falling Stars location open to every tier, where star fragments
// land every few turns and the party runs for them.
export default async function ({ gameData: m, ok }) {
  const hill = m.LOCATIONS.find((l) => l.id === 'stargazers_hill');
  ok(!!hill && hill.holiday === 'falling_stars' && hill.starfall?.every > 0, 'Stargazers\' Hill is a Falling Stars location with starfall');

  const day = (mo, d) => new Date(2026, mo - 1, d);
  ok(m.isLocationAvailable(hill, 'Minor', 1, null, day(8, 12)), 'open to a Minor mimic on Aug 12');
  ok(!m.isLocationAvailable(hill, 'Apex', 40, null, day(8, 21)), 'closed on Aug 21');
  ok(m.locationGroup(hill) === 'seasonal', 'listed under Seasonal in the Codex');

  const natives = m.ADVENTURER_TEMPLATES.filter((t) => t.locations?.includes('stargazers_hill')).map((t) => t.name);
  ok(natives.includes('Astronomer') && natives.length >= 4, `its own stargazers (${natives.join(', ')})`);
  ok(hill.alwaysIncludes.includes('Astronomer'), 'an Astronomer is always there');
  ok(hill.locationCreatures.every((c) => m.creatureEmoji(c.name) !== m.CREATURE_EMOJI_FALLBACK), 'every hill creature has its own emoji');
  ok(hill.locationCreatures.every((c) => !c.rooms || c.rooms.every((r) => hill.rooms.includes(r))), 'every creature room is a real room');

  // How a fragment gets into each room
  const landings = hill.starfall.landings;
  ok(hill.rooms.every((r) => landings[r]?.includes(r)), 'every room says how a star gets into it (and names the room)');
  ok(Object.keys(landings).every((r) => hill.rooms.includes(r)), 'no landing lines for rooms that don\'t exist');
  const starMods = Object.values(m.ROOM_FORM_MODIFIERS.stargazers_hill).map((room) => room.minor_fallen_star).filter(Boolean);
  ok(starMods.every((mod) => (mod.plausibility ?? 0) >= 0), 'a Fallen Star is never implausible anywhere on the hill');

  // When stars fall
  const every = hill.starfall.every;
  ok(!m.starfallDue(hill, 0) && !m.starfallDue(hill, every - 1) && m.starfallDue(hill, every) && m.starfallDue(hill, every * 2), `a star falls every ${every} turns`);
  ok(!m.starfallDue(m.LOCATIONS.find((l) => l.id === 'manor'), every), 'and nowhere else');
  ok(m.turnsUntil(every, 0) === every && m.turnsUntil(every, every - 1) === 1 && m.turnsUntil(every, every) === every,
    'the banner counts down to the next one, and starts over once it falls');

  // The party heads for it, one room per Wait
  ok(m.stepToward(hill, 'Observatory Dome', 'Stone Circle') === 'Stair Hall', 'from the dome, the way to the stones is down the stairs');
  ok(m.stepToward(hill, 'Stair Hall', 'Stone Circle') === 'Hilltop Lawn', '…then out across the lawn');
  ok(m.stepToward(hill, 'Stone Circle', 'Stone Circle') === 'Stone Circle', 'and they stay once they get there');

  // The first to reach it pockets it
  const member = (name, location, over = {}) => ({ id: name, name, location, isAlive: true, isConsumed: false, isAttracted: false, constitution: 3, ...over });
  const party = [member('A', 'Stair Hall'), member('B', 'Stone Circle'), member('C', 'Stone Circle')];
  const { party: after, claimedBy } = m.claimStar(party, 'Stone Circle');
  ok(claimedBy?.name === 'B' && after.find((a) => a.name === 'B').treasure === m.STAR_FRAGMENT, 'the first one there picks it up, and carries it as treasure');
  ok(!after.find((a) => a.name === 'C').treasure, 'only one of them gets it');
  ok(m.claimStar(party, 'Lens Workshop').claimedBy === null, 'nobody there, nobody picks it up');
  ok(m.claimStar([member('D', 'Stone Circle', { isAlive: false, isFrozen: true })], 'Stone Circle').claimedBy === null, 'the dead and frozen don\'t pick things up');

  // What the fragment's worth
  ok(m.STAR_FRAGMENT.materials.includes('Starforged Iron') && m.STAR_FRAGMENT.traits.includes('Faint Glow'), 'a fragment can teach Starforged Iron or Faint Glow');
  const known = m.pickTreasurePrize(m.STAR_FRAGMENT, ['Starforged Iron'], ['Faint Glow']);
  ok(known === null, 'once you know both, it teaches nothing new');
}
