// Mass decay: 1 mass per MASS_DECAY_DAYS days unfed, charged once (reloading doesn't charge it again),
// and the decay-free stretch it ends (toward Eternal).
export default async function ({ gameData: m, ok }) {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date('2026-11-20T12:00:00Z');
  const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();

  ok(m.massDecay(10, ago(2), now) === null, 'under 3 days away: nothing lost');
  const nine = m.massDecay(10, ago(9.5), now);
  ok(nine?.massLost === 3 && nine.mass === 7 && nine.daysAway === 9, '9½ days away: 3 mass lost');
  ok(m.massDecay(nine.mass, nine.lastFedAt, now) === null, 'loading again straight after takes nothing more');
  const later = m.massDecay(nine.mass, nine.lastFedAt, new Date(now.getTime() + 2.6 * DAY));
  ok(later?.massLost === 1, 'the leftover half day still counts toward the next loss');
  ok(m.massDecay(3, ago(30), now)?.mass === 1, 'never below 1 mass');
  ok(m.massDecay(1, ago(30), now) === null, 'nothing to lose at mass 1');
  ok(m.massDecay(10, undefined, now) === null, 'a mimic that has never fed doesn\'t decay');

  // ---------- coming back to a mimic (welcomeBack) ----------
  const ref = (formId) => { const f = m.ALL_FORMS.find((x) => x.id === formId); return { formId, name: f.name, tier: f.tier, learned: true }; };
  const base = { mass: 7, lastFedAt: ago(1), decayFreeDate: ago(20), forms: [ref('lesser_chest')], activeFormIndex: 0 };
  const day = new Date(2026, 4, 15);
  const quiet = m.welcomeBack(base, { now, day });
  ok(Object.keys(quiet.changes).length === 0 && !quiet.massDecayNotice && !quiet.seasonNotice && quiet.character.mass === 7, 'back after a day: nothing has changed');
  const hungry = m.welcomeBack({ ...base, lastFedAt: ago(7) }, { now, day });
  ok(hungry.character.mass === 5 && hungry.changes.mass === 5 && hungry.changes.lastFedAt, 'a week away unfed: mass lost, and saved');
  ok(hungry.massDecayNotice === 'You have been away for 7 days without feeding. Your mass has diminished by 2 (now 5). Hunger gnaws at your form.', '…and the player is told');
  const lantern = { ...base, forms: [ref('minor_jack_o_lantern'), ref('lesser_chest')], activeFormIndex: 1 };
  const afterHalloween = m.welcomeBack(lantern, { now, day });
  ok(afterHalloween.character.forms.map((f) => f.formId).join() === 'lesser_chest' && afterHalloween.character.activeFormIndex === 0, 'back after its season: the seasonal form has slipped away, the one worn still worn');
  ok(afterHalloween.changes.forms?.length === 1 && afterHalloween.seasonNotice?.includes('is over'), '…saved, and the player is told');
  ok(!m.welcomeBack(lantern, { now, day: new Date(2026, 9, 31) }).seasonNotice, '…still in season, it stays');

  // ---------- the decay-free stretch (decayFreeDate) ----------
  const fresh = m.welcomeBack({ ...base, decayFreeDate: undefined }, { now, day });
  ok(fresh.changes.decayFreeDate === now.toISOString() && Object.keys(fresh.changes).length === 1, 'a mimic with no stretch yet (new, or an older save) starts one when opened');
  ok(m.decayFreeDays(quiet.character.decayFreeDate, now) === 20, 'fed in time: the stretch carries on (20 days)');
  ok(hungry.changes.decayFreeDate === hungry.changes.lastFedAt && m.decayFreeDays(hungry.character.decayFreeDate, now) === 1,
    'losing mass to decay starts it over, from the last loss (a day ago here, not today)');
  ok(m.decayFreeDays(undefined, now) === 0 && m.decayFreeDays(ago(-1), now) === 0, 'no stretch, or one dated ahead, counts as 0 days');
  ok(m.ETERNAL_DECAY_FREE_DAYS === 45, 'Eternal will ask for 45 days');

  // ---------- Eternal: hunger comes four times slower ----------
  ok(m.massDecayDays({ branchTier: 'Eternal' }) === 12 && m.massDecayDays({ branchTier: null }) === 3 && m.massDecayDays({ branchTier: 'Sovereign' }) === 3, 'an Eternal mimic loses mass every 12 days unfed (everyone else, every 3)');
  const eternal = { ...base, tier: 'Apex', branchTier: 'Eternal', mass: 60, lastFedAt: ago(13) };
  const slow = m.welcomeBack(eternal, { now, day });
  ok(slow.character.mass === 59 && slow.massDecayNotice?.includes('diminished by 1'), 'away 13 days: an Eternal mimic has lost just 1 mass (anyone else, 4)');
  ok(!m.welcomeBack({ ...eternal, lastFedAt: ago(11) }, { now, day }).changes.mass, '…and nothing at all for 11 days');
  ok(m.welcomeBack({ ...eternal, branchTier: null }, { now, day }).character.mass === 56, '(the same mimic, not Eternal: 4 mass)');
}
