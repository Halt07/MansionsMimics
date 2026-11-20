// The branch tiers past Apex: who takes Eternal, Primordial or Sovereign, when, and the locks
// between them (sovereignOnGrowth, branchOnOpening, tearInTimeOpen, becomePrimordial; and
// applyUpgrade and welcomeBack, which apply them).
export default async function ({ gameData: m, ok }) {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date('2026-11-20T12:00:00Z');
  const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();
  const always = (r) => () => r;
  const ref = (formId) => ({ formId, name: formId, tier: m.ALL_FORMS.find((f) => f.id === formId).tier, learned: true });
  const apex = (over = {}) => ({
    name: 'Testy', startingType: 'Minor', tier: 'Apex', mass: 60, branchTier: null, sovereignReached: false,
    decayFreeDate: ago(10), lastFedAt: ago(1), timeTearCounter: 0, plausibility: 3, adhesion: 3, patience: 3,
    assimilationPoints: 200, forms: [ref('apex_watchtower')], activeFormIndex: 0, currentAppearance: {},
    learnedMaterials: [], learnedTraits: [], hatboxToLegendReached: false, apexPeakReached: true,
    ...over,
  });
  const opening = (over) => m.branchOnOpening(apex(over), now);
  const growing = (over, mass) => m.sovereignOnGrowth(apex(over), mass);

  // ---------- Sovereign: grown into, and held only while the mass lasts ----------
  ok(growing({}, 98) === null, 'growing to 98 mass: no branch yet');
  const crowned = growing({}, 100);
  ok(crowned?.changes.branchTier === 'Sovereign' && crowned.changes.sovereignReached, 'growing to 100 mass: Sovereign (and it is remembered for good)');
  ok(opening({ mass: 104 }) === null, 'never by being opened: mass only grows in play, so Sovereign is always seen being taken');
  ok(opening({ mass: 120, branchTier: 'Sovereign' }) === null, 'a Sovereign that stays at 100+ keeps it');
  const fallen = opening({ mass: 99, branchTier: 'Sovereign', sovereignReached: true });
  ok(fallen?.changes.branchTier === null && fallen.lost && fallen.line.includes('no longer Ruler of All Mimics'), 'opened below 100: Sovereign is lost, back to plain Apex');
  ok(!('sovereignReached' in fallen.changes), '…but not the record of having been it');

  // ---------- Eternal: 45 days without decay, seen when opened ----------
  ok(opening({ decayFreeDate: ago(44) }) === null, '44 days without decay: not yet');
  ok(opening({ decayFreeDate: ago(45) })?.changes.branchTier === 'Eternal', '45 days: Eternal');
  ok(m.branchOnOpening(apex({ tier: 'Grand', mass: 25, decayFreeDate: ago(90) }), now) === null, 'only an Apex mimic takes a branch, however long it has gone without decay');

  // ---------- Primordial: through the Tear in Time ----------
  ok(!m.tearInTimeOpen(apex({ timeTearCounter: 49, mass: 60 })) && !m.tearInTimeOpen(apex({ timeTearCounter: 50, mass: 48 })), 'the Tear stays shut until both: 50 magic users and 50 mass');
  ok(m.tearInTimeOpen(apex({ timeTearCounter: 50, mass: 50 })), '…then it opens');
  ok(m.becomePrimordial(apex({ timeTearCounter: 50, mass: 50 }))?.changes.branchTier === 'Primordial', 'hunting through it: Primordial');
  ok(m.becomePrimordial(apex({ timeTearCounter: 10 })) === null, '…not before it opens');
  ok(opening({ timeTearCounter: 80, mass: 60 }) === null && growing({ timeTearCounter: 80 }, 62) === null, 'Primordial is never taken just by standing there: it is a choice');

  // ---------- one branch at a time ----------
  ok(growing({ branchTier: 'Eternal' }, 100) === null, 'an Eternal mimic never becomes Sovereign, whatever its mass');
  ok(growing({ branchTier: 'Primordial' }, 120) === null && opening({ branchTier: 'Primordial', decayFreeDate: ago(90) }) === null, '…nor a Primordial one Sovereign or Eternal');
  ok(!m.tearInTimeOpen(apex({ branchTier: 'Eternal', timeTearCounter: 50 })) && !m.tearInTimeOpen(apex({ branchTier: 'Sovereign', mass: 100, timeTearCounter: 50 })),
    'and the Tear closes to anyone who has taken another branch');
  ok(opening({ branchTier: 'Sovereign', mass: 120, decayFreeDate: ago(90) }) === null, 'a Sovereign that could be Eternal stays Sovereign');
  const dropped = { ...apex({ mass: 99, sovereignReached: true }), ...fallen.changes };
  ok(m.branchOnOpening({ ...dropped, decayFreeDate: ago(45) }, now)?.changes.branchTier === 'Eternal', 'a fallen Sovereign is free to take another branch: Eternal…');
  ok(m.tearInTimeOpen({ ...dropped, timeTearCounter: 50 }), '…or through the Tear…');
  ok(m.sovereignOnGrowth(dropped, 101)?.changes.branchTier === 'Sovereign', '…or growing back to Sovereign');

  // ---------- coming back to the mimic (welcomeBack) ----------
  const day = new Date(2026, 4, 15);
  const eternal = m.welcomeBack(apex({ decayFreeDate: ago(46) }), { now, day });
  ok(eternal.character.branchTier === 'Eternal' && eternal.changes.branchTier === 'Eternal' && eternal.branchNotice === m.BRANCH_TIER_LINES.Eternal && !eternal.massDecayNotice,
    'opened after 46 days fed: it has become Eternal, saved, and the player is told');
  const starved = m.welcomeBack(apex({ decayFreeDate: ago(60), lastFedAt: ago(7) }), { now, day });
  ok(!starved.character.branchTier && starved.massDecayNotice && !starved.branchNotice, '…but not if decay took mass on the way back in (the stretch starts over)');
  const dethroned = m.welcomeBack(apex({ mass: 101, branchTier: 'Sovereign', sovereignReached: true, lastFedAt: ago(7) }), { now, day });
  ok(dethroned.character.mass === 99 && dethroned.changes.branchTier === null && !dethroned.branchNotice, 'a Sovereign that decays below 100 loses it when opened…');
  ok(dethroned.massDecayNotice.startsWith('You have been away for 7 days') && dethroned.massDecayNotice.endsWith(m.BRANCH_TIER_LINES.sovereignLost),
    '…and the mass decay notice ends by saying so');
  const big = m.welcomeBack(apex({ mass: 104 }), { now, day });
  ok(!('branchTier' in big.changes) && !big.branchNotice, 'a mimic already past 100 mass (from before Sovereign existed) is not crowned when opened…');
  ok(m.applyUpgrade(big.character, 'mass', new Date(2026, 5, 1), always(0)).changes.branchTier === 'Sovereign', '…but on its next growth');

  // ---------- growing into Sovereign (applyUpgrade) ----------
  const june = new Date(2026, 5, 1);
  const grow = (over) => m.applyUpgrade(apex(over), 'mass', june, always(0));
  const crowning = grow({ mass: 98 });
  ok(crowning.kind === 'grew' && crowning.changes.mass === 100 && crowning.changes.branchTier === 'Sovereign' && crowning.changes.sovereignReached,
    'growing from 98 to 100: Sovereign');
  ok(crowning.branchLine === m.BRANCH_TIER_LINES.Sovereign, '…and the log says so');
  ok(grow({ mass: 96 }).branchLine === null && !('branchTier' in grow({ mass: 96 }).changes), 'growing to 98: nothing yet');
  ok(!('branchTier' in grow({ mass: 100, branchTier: 'Sovereign' }).changes), 'growing as a Sovereign: nothing more to take');
  ok(!('branchTier' in grow({ mass: 98, branchTier: 'Eternal' }).changes), 'growing to 100 as Eternal: still Eternal');
  ok(!('branchTier' in grow({ mass: 60, decayFreeDate: ago(60) }).changes), 'growing never makes a mimic Eternal (that waits for it to be opened)');

  // ---------- the branch forms ----------
  const names = (forms) => forms.map((f) => f.name);
  const offered = (over) => names(m.getValidForms('Apex', 60, { learnedMaterials: [], learnedTraits: [], ...over }));
  ok(!offered({}).some((n) => ['Colossus', 'Volcano', 'T. Rex Carcass', 'Cave'].includes(n)), 'a plain Apex mimic is offered none of the branch forms');
  ok(['Colossus', 'Volcano', 'T. Rex Carcass', 'Cave'].every((n) => offered({ branchTier: 'Primordial' }).includes(n)), 'a Primordial one: the Colossus, Volcano, T. Rex Carcass and Cave');
  ok(offered({ branchTier: 'Eternal' }).includes('Colossus') && !offered({ branchTier: 'Eternal' }).includes('Volcano') && offered({ branchTier: 'Sovereign' }).includes('Colossus'),
    'Eternal and Sovereign share only the Colossus (their own forms are still to come)');
  ok(!names(m.getValidForms('Apex', 48, { learnedMaterials: [], learnedTraits: [], branchTier: 'Primordial' })).includes('Volcano'), 'branch forms need 50 mass');
  ok(m.ALL_FORMS.filter((f) => f.branches?.includes('Primordial')).length === 4, 'Primordial has four forms, no more');
  ok(m.ALL_FORMS.filter((f) => f.branches).every((f) => !m.VARIANT_FORMS.includes(f) && f.tier === 'Apex'), 'branch forms are Apex forms of their own, not variants (Curiosity Cabinet doesn\'t need them)');
  const colossus = m.ALL_FORMS.find((f) => f.id === 'apex_colossus');
  const told = ['Primordial', 'Eternal', 'Sovereign'].map((b) => m.formDescription(colossus, b));
  ok(new Set(told).size === 3 && told[0].includes('idol') && told[1].includes('guardian') && told[2].includes('Mimic King'), 'the Colossus is told differently on each branch: idol, guardian, monument');
  ok(m.formDescription(colossus, null) === colossus.description && m.formDescription(m.ALL_FORMS.find((f) => f.id === 'apex_volcano'), 'Primordial') === m.ALL_FORMS.find((f) => f.id === 'apex_volcano').description,
    '…and plainly elsewhere (and other forms just use their own)');
  const colossusKing = apex({ mass: 101, branchTier: 'Sovereign', sovereignReached: true, lastFedAt: ago(7), forms: [ref('apex_watchtower'), { ...ref('apex_colossus'), name: 'Colossus' }], activeFormIndex: 1 });
  const uncrowned = m.welcomeBack(colossusKing, { now, day });
  ok(uncrowned.changes.forms?.map((f) => f.formId).join() === 'apex_watchtower' && uncrowned.changes.activeFormIndex === 0, 'a Sovereign that loses it loses the Colossus too (back to its other form)');
  ok(uncrowned.massDecayNotice.endsWith('You can no longer take the shape of the Colossus.'), '…and is told');
  ok(!m.welcomeBack(apex({ mass: 101, branchTier: 'Sovereign', forms: [ref('apex_colossus')] }), { now, day }).changes.forms, 'a Sovereign that keeps it keeps its Colossus');
}
