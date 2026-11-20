// The branch tiers past Apex: who takes Eternal, Primordial or Sovereign, when, and the locks
// between them (branchTierChange, tearInTimeOpen, becomePrimordial; welcomeBack and
// applyUpgrade, which apply them).
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
  const change = (over) => m.branchTierChange(apex(over), now);

  // ---------- Sovereign: 100 mass, and held only while it lasts ----------
  ok(change({ mass: 98 }) === null, 'Apex at 98 mass: no branch yet');
  const crowned = change({ mass: 100 });
  ok(crowned?.changes.branchTier === 'Sovereign' && crowned.changes.sovereignReached && !crowned.lost, 'at 100 mass: Sovereign (and it is remembered for good)');
  ok(change({ mass: 120, branchTier: 'Sovereign' }) === null, 'a Sovereign that stays at 100+ keeps it');
  const fallen = change({ mass: 99, branchTier: 'Sovereign', sovereignReached: true });
  ok(fallen?.changes.branchTier === null && fallen.lost && fallen.line.includes('no longer Ruler of All Mimics'), 'below 100: Sovereign is lost, back to plain Apex');
  ok(!('sovereignReached' in fallen.changes), '…but not the record of having been it');

  // ---------- Eternal: 45 days without decay ----------
  ok(change({ decayFreeDate: ago(44) }) === null, '44 days without decay: not yet');
  ok(change({ decayFreeDate: ago(45) })?.changes.branchTier === 'Eternal', '45 days: Eternal');
  ok(m.branchTierChange(apex({ tier: 'Grand', mass: 25, decayFreeDate: ago(90) }), now) === null, 'only an Apex mimic takes a branch, however long it has gone without decay');

  // ---------- Primordial: through the Tear in Time ----------
  ok(!m.tearInTimeOpen(apex({ timeTearCounter: 49, mass: 60 })) && !m.tearInTimeOpen(apex({ timeTearCounter: 50, mass: 48 })), 'the Tear stays shut until both: 50 magic users and 50 mass');
  ok(m.tearInTimeOpen(apex({ timeTearCounter: 50, mass: 50 })), '…then it opens');
  ok(m.becomePrimordial(apex({ timeTearCounter: 50, mass: 50 }))?.changes.branchTier === 'Primordial', 'hunting through it: Primordial');
  ok(m.becomePrimordial(apex({ timeTearCounter: 10 })) === null, '…not before it opens');
  ok(change({ timeTearCounter: 80, mass: 60 }) === null, 'Primordial is never taken just by standing there: it is a choice');

  // ---------- one branch at a time ----------
  ok(change({ branchTier: 'Eternal', mass: 120 }) === null, 'an Eternal mimic never becomes Sovereign, whatever its mass');
  ok(change({ branchTier: 'Primordial', mass: 120, decayFreeDate: ago(90) }) === null, '…nor a Primordial one Eternal or Sovereign');
  ok(!m.tearInTimeOpen(apex({ branchTier: 'Eternal', timeTearCounter: 50 })) && !m.tearInTimeOpen(apex({ branchTier: 'Sovereign', mass: 100, timeTearCounter: 50 })),
    'and the Tear closes to anyone who has taken another branch');
  ok(change({ branchTier: 'Sovereign', mass: 120, decayFreeDate: ago(90) }) === null, 'a Sovereign that could be Eternal stays Sovereign');
  ok(m.branchTierChange({ ...apex({ mass: 99, sovereignReached: true }), ...fallen.changes, decayFreeDate: ago(45) }, now)?.changes.branchTier === 'Eternal',
    'a fallen Sovereign is free to take another branch: here Eternal');
  ok(m.tearInTimeOpen({ ...apex({ mass: 99, timeTearCounter: 50, sovereignReached: true }), ...fallen.changes }), '…or to go through the Tear');
  ok(change({ mass: 100, decayFreeDate: ago(45) })?.changes.branchTier === 'Sovereign', 'both due at once: Sovereign first');

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
  const already = m.welcomeBack(apex({ mass: 104 }), { now, day });
  ok(already.changes.branchTier === 'Sovereign' && already.changes.sovereignReached && already.branchNotice === m.BRANCH_TIER_LINES.Sovereign,
    'a mimic already past 100 mass (from before Sovereign existed) is crowned when opened');

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
}
