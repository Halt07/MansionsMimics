// Luring: likes and dislikes (all traits count, dislikes cost dice),
// and partial bites (Minor mimics, and giants you can't yet swallow whole).
export default async function ({ gameData: m, ok, log }) {
  const { ADVENTURER_TEMPLATES: T, MATERIALS, TRAITS, ALL_FORMS } = m;
  const forms = ALL_FORMS;
  const allMats = new Set(Object.values(MATERIALS).flat());
  // Anything wearable in the appearance editor (every learnable category), plus traits built into forms
  const reachableTraits = new Set([...Object.values(TRAITS).flat(), ...forms.flatMap((f) => f.builtInTraits)]);
  const allTags = new Set(forms.flatMap((f) => f.utilityTags));

  // Every like and dislike can actually be matched, and nothing is both liked and disliked
  let problems = 0;
  const check = (cond, msg) => { if (!cond) { problems++; ok(false, msg); } };
  for (const t of T) {
    const a = t.alluringQualities;
    a.materials.forEach((x) => check(allMats.has(x), `${t.name}: lure material "${x}" doesn't exist`));
    a.traits.forEach((x) => check(reachableTraits.has(x), `${t.name}: lure trait "${x}" can never be matched`));
    if (!t.repelledBy) continue;
    const r = t.repelledBy;
    (r.materials || []).forEach((x) => { check(allMats.has(x), `${t.name}: dislike material "${x}" doesn't exist`); check(!a.materials.includes(x), `${t.name}: likes AND dislikes ${x}`); });
    (r.traits || []).forEach((x) => { check(reachableTraits.has(x), `${t.name}: dislike trait "${x}" can never be matched`); check(!a.traits.includes(x), `${t.name}: likes AND dislikes ${x}`); });
    (r.tags || []).forEach((x) => check(allTags.has(x), `${t.name}: dislike tag "${x}" doesn't exist`));
  }
  ok(problems === 0, 'all likes and dislikes are valid and reachable');
  log(`templates with dislikes: ${T.filter((t) => t.repelledBy).length}`);

  const king = T.find((t) => t.name === 'The King');
  const form = { name: 'Chest', utilityTags: ['Valuable', 'Storage'], baseAllureModifier: 0 };
  const look = (o) => ({ primaryMaterials: [], secondaryMaterials: [], surfaceTraits: [], symbolicTraits: [], conditionTraits: [], ...o });
  const kingLook = look({ primaryMaterials: ['Gold'], surfaceTraits: ['Gilded'], conditionTraits: ['Cracked', 'Dusty'] });
  const b = m.calcAllureBreakdown(form, kingLook, king);
  ok(b.interest === 3 && b.aversion === 2, 'King: 3 likes (Gold, Gilded, Valuable), 2 dislikes (Cracked, Dusty)');
  ok(m.calcAllureInterest(form, kingLook, king) === 1, 'net interest is likes minus dislikes');
  ok(m.calcAllureBreakdown({ utilityTags: [] }, look({ conditionTraits: ['Worn', 'Dusty'] }), T.find((t) => t.name === 'Frightened Peasant')).interest === 2, 'condition traits count as likes');

  // Dislikes meaningfully lower the chance to lure (statistical)
  const N = 20000;
  const rate = (app) => { let s = 0; for (let i = 0; i < N; i++) if (m.allureCheck(4, 6, form, app, { ...king, suspicion: 2 }).success) s++; return s / N; };
  const clean = rate(look({ primaryMaterials: ['Gold'] }));
  const shabby = rate(look({ primaryMaterials: ['Gold'], conditionTraits: ['Cracked', 'Dusty', 'Worn'] }));
  ok(shabby < clean - 0.15, `dislikes lower allure (King: ${(clean * 100).toFixed(0)}% clean vs ${(shabby * 100).toFixed(0)}% cracked+dusty+worn)`);
  const r = m.allureCheck(4, 6, form, look({ conditionTraits: ['Cracked'] }), { ...king, suspicion: 0 });
  ok(r.aversion === 1 && r.disliked[0] === 'Cracked', 'allureCheck reports which dislikes matched');

  // Partial bites
  const half = T.find((t) => t.name === 'Half-Giant Mercenary');
  const storm = T.find((t) => t.name === 'Storm Giant Wanderer');
  const rogue = T.find((t) => t.name === 'Greedy Rogue');
  ok(half.wholeMealMass === 36 && storm.wholeMealMass === 48, 'giant whole-meal mass = unlock mass + 8');
  ok(m.needsPartialBites({ tier: 'Apex', mass: 30 }, half) && !m.needsPartialBites({ tier: 'Apex', mass: 36 }, half), 'Half-Giant swallowed whole from mass 36');
  ok(m.needsPartialBites({ tier: 'Apex', mass: 45 }, storm), 'Storm Giant still needs bites at mass 45');
  ok(m.needsPartialBites({ tier: 'Minor', mass: 2 }, rogue) && !m.needsPartialBites({ tier: 'Lesser', mass: 6 }, rogue), 'Minor bites, Lesser swallows');
  const aps = new Set(Array.from({ length: 200 }, () => m.getBiteAp(half)));
  ok([...aps].every((x) => x === 2 || x === 3) && aps.size === 2, 'giant bites give 2–3 AP');
  ok(m.getBiteAp(rogue) === 1, 'normal bites give 1 AP');
  let learned = 0;
  let fromLoot = true;
  for (let i = 0; i < N; i++) {
    const x = m.rollBiteMaterial(half);
    if (x) { learned++; if (!half.lootMaterials.includes(x)) fromLoot = false; }
  }
  ok(fromLoot, "bite materials come from the target's loot");
  ok(Math.abs(learned / N - m.BITE_MATERIAL_CHANCE) < 0.02, `bite material rate ≈ ${m.BITE_MATERIAL_CHANCE * 100}% (got ${(learned / N * 100).toFixed(1)}%)`);
}
