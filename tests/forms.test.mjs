// Which forms a mimic can choose: the tier below, its own tier and the tier above,
// with extra mass gates only on forms that require more than their tier's starting mass.
export default async function (ctx) {
  await availability(ctx);
  await penalties(ctx);
}

async function availability({ gameData: m, ok, log }) {
  const { TIER_ORDER, TIER_CONFIG, MASTER_FORMS } = m;
  const tiersIn = (forms) => [...new Set(forms.map((f) => f.tier))];

  // At the very start of every tier (lowest mass), the tier above is already available
  for (let i = 0; i < TIER_ORDER.length - 1; i++) {
    const tier = TIER_ORDER[i];
    const above = TIER_ORDER[i + 1];
    const startMass = TIER_CONFIG[tier].massRange[0];
    const forms = m.getValidForms(tier, startMass);
    const aboveForms = forms.filter((f) => f.tier === above);
    ok(aboveForms.length > 0, `${tier} at mass ${startMass} can choose ${above} forms (${aboveForms.length})`);
    log(`${tier} @${startMass}: ${tiersIn(forms).join(', ')}`);
  }

  // Never more than one tier away
  const standard = m.getValidForms('Standard', 9);
  ok(tiersIn(standard).sort().join() === ['Greater', 'Lesser', 'Standard'].sort().join(), 'Standard sees Lesser, Standard and Greater only');

  // Extra mass gates still apply
  const byName = (forms, name) => forms.some((f) => f.name === name);
  const grand = m.getValidForms('Grand', 25);
  ok(!byName(grand, 'Giant Pillow') && !byName(grand, 'Chapel') && !byName(grand, 'Lighthouse'), 'Grand still cannot use mass-gated Apex forms (Giant forms, Chapel, Lighthouse)');
  ok(byName(grand, 'Roadside Inn'), 'Grand can use ungated Apex forms (Roadside Inn)');
  ok(!byName(m.getValidForms('Apex', 27), 'Giant Pillow') && byName(m.getValidForms('Apex', 28), 'Giant Pillow'), 'Giant Pillow unlocks at mass 28');
  ok(!byName(m.getValidForms('Apex', 37), 'Lighthouse') && byName(m.getValidForms('Apex', 38), 'Lighthouse'), 'Lighthouse unlocks at mass 38');

  const gated = Object.values(MASTER_FORMS).flat().filter(m.isFormMassGated).map((f) => f.name);
  ok(gated.every((name) => Object.values(MASTER_FORMS).flat().find((f) => f.name === name).tier === 'Apex'), `only Apex forms have extra mass gates (${gated.length})`);
}

// Form tier penalties: above costs Plausibility, below costs Patience
async function penalties({ gameData: m, ok }) {
  const above = m.getFormTierPenalties('Greater', 'Standard');
  const below = m.getFormTierPenalties('Lesser', 'Standard');
  const same = m.getFormTierPenalties('Standard', 'Standard');
  ok(above.plausibility === 2 && above.patience === 0, 'form from the tier above: –2 Plausibility');
  ok(below.patience === 1 && below.plausibility === 0, 'form from the tier below: –1 Patience, no Plausibility penalty');
  ok(same.plausibility === 0 && same.patience === 0, 'form from your own tier: no penalty');

  // In stealth checks, a lower-tier form is no longer penalized on Plausibility
  const T = m.ADVENTURER_TEMPLATES;
  const rogue = { ...T.find((t) => t.name === 'Greedy Rogue'), suspicion: 1 };
  const forms = Object.values(m.MASTER_FORMS).flat();
  const lesserForm = forms.find((f) => f.tier === 'Lesser');
  const standardForm = forms.find((f) => f.tier === 'Standard');
  const N = 20000;
  const rate = (form) => { let k = 0; for (let i = 0; i < N; i++) if (m.stealthCheck(4, 4, form.tier, 'Standard', form, rogue).success) k++; return k / N; };
  const own = rate(standardForm);
  const lower = rate(lesserForm);
  ok(Math.abs(own - lower) < 0.03, `same Plausibility for own-tier and lower-tier forms when Patience is equal (${(own * 100).toFixed(0)}% vs ${(lower * 100).toFixed(0)}%)`);
}
