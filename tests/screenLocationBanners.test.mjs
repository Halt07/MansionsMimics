// The hunt's status strips (src/components/game/hunt/LocationBanners.tsx), with React Testing
// Library from real hunts: one per thing going on at the location, and the party growing restless.
// Each check reads what the strips say, as the page has it (textContent).
import { setup, mimic } from './screen.mjs';

export default async function ({ gameData: m, load, ok }) {
  const s = await setup(load);
  const { default: LocationBanners } = await load('/src/components/game/hunt/LocationBanners.tsx');
  const opts = { random: () => 0.5, now: new Date('2026-05-15T12:00:00Z') };
  const loc = (id) => m.LOCATIONS.find((l) => l.id === id);
  const start = (id, room = loc(id).rooms[0], character = mimic()) => m.beginHunt(character, loc(id), room, opts).hunt;
  const banners = (hunt, { character = mimic(), huntOver = false } = {}) =>
    s.showInHunt(LocationBanners, {}, s.huntState(character, hunt, { huntOver })).container.textContent;

  // ---------- an ordinary hunt ----------
  const manor = start('manor');
  ok(banners(manor) === '', 'an ordinary location, early on: no banners');
  const restless = { ...manor, actionCount: m.ACTION_LIMIT - m.ACTION_WARNING };
  ok(banners(restless).includes(`⏳ ${m.ACTION_WARNING} actions remaining`), `${m.ACTION_WARNING} actions from the limit, the party grows restless`);
  ok(banners({ ...manor, actionCount: m.ACTION_LIMIT - m.ACTION_WARNING - 1 }) === '', '…not a moment before');
  ok(banners({ ...manor, actionCount: m.ACTION_LIMIT - 1 }).includes('⏳ 1 action remaining'), '…down to the last action (singular)');

  // ---------- rival mimics ----------
  const rival = (over) => ({ id: 'r', kind: 'lone', room: manor.party[0].location, revealed: false, consumed: false, clueGiven: false, disguise: { name: 'Barrel', icon: '🛢️' }, ...over });
  ok(banners({ ...manor, rivals: [rival()] }).includes('A presence lurks... Wait and observe.'), 'a hidden rival: something lurks');
  ok(banners({ ...manor, rivals: [rival({ clueGiven: true })] }).includes('Track the predator'), "once it's eaten someone: track it");
  ok(banners({ ...manor, rivals: [rival({ revealed: true })] }).includes(`is exposed in the ${manor.party[0].location}. Strike to devour it!`), "exposed: where it is");
  ok(banners({ ...manor, rivals: [rival({ consumed: true })] }) === '', 'eaten: the banner goes');

  // ---------- the Sinking Ship ----------
  const ship = start('sinking_ship');
  const total = loc('sinking_ship').sinkingTurns;
  ok(banners(ship).includes(`🌊 ${total} turns until she goes under`), 'the ship counts down from the start');
  ok(banners({ ...ship, turn: total - 1 }).includes('🌊 1 turn until she goes under'), '…to the last turn');
  ok(!banners(ship, { huntOver: true }).includes('goes under'), 'once the hunt is won, the location banners go');

  // ---------- Spell or Sweet Street ----------
  const street = loc('spell_or_sweet_street');
  const house = street.procession.order[0];
  const asChest = banners(start('spell_or_sweet_street', house));
  ok(asChest.includes("As a Chest, you've got sweets"), 'a Chest answers the door with sweets');
  const crate = mimic({ forms: [{ formId: 'lesser_crate', name: 'Crate', tier: 'Lesser', learned: true }] });
  const asCrate = banners(start('spell_or_sweet_street', house, crate), { character: crate });
  ok(asCrate.includes("Nobody's answering at your house"), "…a Crate doesn't, and gets pranked");
  const answerers = street.procession.sweets.map((id) => m.ALL_FORMS.find((f) => f.id === id).name);
  ok(answerers.every((name) => asCrate.includes(name)), `…and it names every form that does answer (${answerers.join(', ')})`);
  const green = street.rooms.find((r) => !street.procession.order.includes(r));
  ok(banners(start('spell_or_sweet_street', green)).includes(`You're out on the ${green}: nobody knocks here`), 'out on the green, nobody knocks');

  // ---------- the Founders' Fair ----------
  const fair = start('founders_fair');
  const every = loc('founders_fair').fireworks.every;
  ok(banners(fair).includes(`The next volley goes up in ${every} turns.`), 'fireworks: when the next volley goes up');
  const room = fair.mimicRoom;
  const volley = banners({ ...fair, fireworksRoom: room });
  ok(volley.includes(`Everyone in the ${m.distractedRooms(loc('founders_fair'), room).join(', ')} is looking up`), '…then who is looking up');
  ok(volley.includes('you can Strike anyone in your room without luring them first'), '…and, over your own room, that you can strike unlured');
  ok(!banners(fair).includes('crate under the fireworks'), 'as a Chest: no rummage warning');
  const crateFair = banners(start('founders_fair', undefined, crate), { character: crate });
  ok(crateFair.includes('a crate under the fireworks will get opened'), 'as a crate: a warning about the rummage');

  // ---------- Stargazers' Hill ----------
  const hill = start('stargazers_hill');
  ok(banners(hill).includes(`The next one should fall in ${loc('stargazers_hill').starfall.every} turns.`), 'stars: when the next one falls');
  ok(banners({ ...hill, starFragment: 'Stone Circle' }).includes('A fragment glows in the Stone Circle.'), '…then where it lies');

  // ---------- the Snowbound Lodge ----------
  const lodge = start('snowbound_lodge');
  const snow = loc('snowbound_lodge').snowbound;
  ok(banners(lodge).includes(`The ${snow.hearth} warms whoever walks in; the ${snow.cold.join(' and ')} chill them.`), 'snowed in: where it is warm and cold');
  ok(banners({ ...lodge, party: lodge.party.map((a, i) => (i === 0 ? { ...a, isFrozen: true, isAlive: false } : a)) }).includes('1 frozen solid so far.'), '…and how many have frozen');
  ok(!banners({ ...lodge, actionCount: m.ACTION_LIMIT - 1 }).includes('actions remaining'), "snowed in, the party can't get bored and leave");
}
