// Magic material effects and their arcane-residue cost.
// Many checks are statistical: they roll thousands of times and compare rates.
export default async function ({ gameData: m, ok }) {
  const { ADVENTURER_TEMPLATES: T, MATERIALS, MAGIC_EFFECTS, MASTER_FORMS, LOCATIONS: L } = m;
  const N = 20000;
  const forms = Object.values(MASTER_FORMS).flat();
  const tpl = (n) => ({ ...T.find((t) => t.name === n), suspicion: 1, id: n, isAlive: true, isConsumed: false });
  const app = (...magic) => ({ primaryMaterials: ['Oak'], secondaryMaterials: magic, surfaceTraits: [], symbolicTraits: [], conditionTraits: [] });
  const form = forms.find((f) => f.id === 'lesser_chest');
  const soundForm = forms.find((f) => f.flawProfiles.some((x) => x.type === 'acoustic'));
  const stealth = (adv, a, f = form, plaus = 3) => m.stealthCheck(plaus, 3, f.tier, f.tier, f, adv, {}, a);
  const rate = (fn) => { let k = 0; for (let i = 0; i < N; i++) if (fn()) k++; return k / N; };

  ok(Object.keys(MAGIC_EFFECTS).length === MATERIALS.magic.length && MATERIALS.magic.every((x) => MAGIC_EFFECTS[x]), 'every magic material has an effect');

  // Gravecloth
  ok(rate(() => stealth(tpl('Vampire Noble'), app('Gravecloth')).success) === 1, 'Gravecloth: undead always pass over you');
  ok(rate(() => stealth(tpl('Vampire Noble'), app()).success) < 0.9, 'without Gravecloth undead can detect you');

  // Arcane residue
  ok(rate(() => stealth(tpl('Arcane Scholar'), app('Spellweave Silk'), form, 3).detectedFlaws.some((f) => f.includes('arcane residue'))) > 0.1, 'a wizard can spot arcane residue');
  ok(rate(() => stealth(tpl('Greedy Rogue'), app('Spellweave Silk'), form, 6).detectedFlaws.some((f) => f.includes('arcane residue'))) === 0, 'a rogue (magical 0) never notices residue');

  // Shadowwood
  const base = rate(() => stealth(tpl('Greedy Rogue'), app()).success);
  const shadow = rate(() => stealth(tpl('Greedy Rogue'), app('Shadowwood')).success);
  ok(shadow > base + 0.03, `Shadowwood improves stealth (${(base * 100).toFixed(0)}% → ${(shadow * 100).toFixed(0)}%)`);

  // Void Marble vs acoustic flaws (the Banshee has acoustic 4)
  const banshee = tpl('Wailing Banshee');
  const acousticSpotted = (a) => rate(() => stealth(banshee, a, soundForm, 2).detectedFlaws
    .some((d) => soundForm.flawProfiles.find((f) => f.description === d && f.type === 'acoustic')));
  ok(acousticSpotted(app()) > 0 && acousticSpotted(app('Void Marble')) === 0, `Void Marble hides acoustic flaws (${soundForm.name})`);

  // Starforged Iron vs a bounty hunter
  const hunter = tpl('Mimic Hunter');
  const hunterStealth = (a) => rate(() => stealth({ ...hunter, suspicion: 4 }, a, form, 4).success);
  const hb = hunterStealth(app());
  const hw = hunterStealth(app('Starforged Iron'));
  ok(hw > hb + 0.1, `Starforged Iron vs a mimic hunter at suspicion 4 (${(hb * 100).toFixed(0)}% → ${(hw * 100).toFixed(0)}%)`);

  // Spellweave Silk
  const allure = (a) => rate(() => m.allureCheck(2, 4, form, a, tpl('Battle-Hardened Fighter')).success);
  ok(allure(app('Spellweave Silk')) > allure(app()) + 0.05, 'Spellweave Silk raises allure');

  // Behavior counters
  const loc = L.find((l) => l.id === 'cursed_chapel');
  const r0 = loc.rooms[0];
  const r1 = loc.roomGraph[r0][0];
  const react = (trig, name, a) => m.getBehaviorReactions(trig, { party: [{ ...tpl(name), location: r1 }], location: loc, mimicRoom: r0, appearance: a });
  ok(react('strike', 'Wailing Banshee', app()).suspicion > 0 && react('strike', 'Wailing Banshee', app('Void Marble')).suspicion === 0, 'Void Marble silences Keen Hearing');
  ok(react('formChange', 'Fey Changeling', app()).suspicion > 0 && react('formChange', 'Fey Changeling', app('Feywood')).suspicion === 0, 'Feywood hides form changes from Shape Sense');
  ok(Object.keys(react('feed', 'Werewolf', app()).patches).length === 1 && Object.keys(react('feed', 'Werewolf', app('Direwolf Pelt')).patches).length === 0, 'Direwolf Pelt masks Blood Scent');
  ok(Object.keys(react('feed', 'Ghoul', app('Direwolf Pelt')).patches).length === 1, "Direwolf Pelt doesn't stop the Ghoul (carrion, not blood)");

  // Slots
  ok(m.hasMagic({ primaryMaterials: ['Gravecloth'] }, 'Gravecloth'), 'magic works from the primary slot');
  const apex = { primaryMaterials: ['Void Marble', 'Oak'], secondaryMaterials: ['Feywood', 'Soulglass'] };
  ok(m.countMagicMaterials(apex) === 3 && m.wornMagic(apex).length === 3, 'magic counted across primary and secondary (3 of 4 at Apex)');
  ok(m.APPEARANCE_LIMITS.Minor.magicalMaterials === 0, 'Minor mimics cannot wear magic materials');
}
