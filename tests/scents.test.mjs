// Scent traits: all learned, slot limits by tier, and they count when luring.
export default async function ({ gameData: m, ok }) {
  const { TRAITS, APPEARANCE_LIMITS, ADVENTURER_TEMPLATES: T } = m;
  ok(TRAITS.scent.join() === 'Musty,Fresh,Fragrant,Foul,Smoky,Briny,Earthy', 'seven scents');
  ok(TRAITS.scent.every((t) => !m.ALL_STARTING_TRAITS.includes(t)), 'every scent must be learned');
  ok(TRAITS.scent.every((t) => m.LEARNABLE_TRAITS.includes(t)), 'scents count toward Master of Disguise');

  const slots = m.TIER_ORDER.map((tier) => APPEARANCE_LIMITS[tier].scentTraits).join();
  ok(slots === '0,1,1,1,1,2', `scent slots by tier: none at Minor, one from Lesser, two at Apex (${slots})`);

  const { traits } = m.obtainableMaterialsAndTraits();
  for (const scent of TRAITS.scent) {
    const reactors = T.filter((t) => t.alluringQualities.traits.includes(scent) || t.repelledBy?.traits?.includes(scent));
    ok(traits.has(scent) && reactors.length > 0, `${scent}: learnable, and ${reactors.length} adventurers react to it`);
  }

  // Wearing a scent lures (or repels) like any other trait
  const ghoul = T.find((t) => t.name === 'Ghoul');
  const crate = m.ALL_FORMS.find((f) => f.id === 'lesser_crate');
  const foul = m.calcAllureBreakdown(crate, { scentTraits: ['Foul'] }, ghoul);
  const fresh = m.calcAllureBreakdown(crate, { scentTraits: ['Fresh'] }, ghoul);
  ok(foul.liked.includes('Foul') && fresh.disliked.includes('Fresh'), 'a Ghoul is drawn to Foul and put off by Fresh');

  // ---------- who notices smells ----------
  const scentOf = (a) => [...a.alluringQualities.traits, ...(a.repelledBy?.traits ?? [])].filter((t) => m.TRAITS.scent.includes(t));
  const elites = m.ADVENTURER_TEMPLATES.filter((a) => a.group === 'huntersElites');
  ok(elites.length > 0 && elites.every((a) => scentOf(a).length > 0), 'every hunter and elite reacts to some scent (trackers have noses)');
  const freshFans = m.ADVENTURER_TEMPLATES.filter((a) => a.alluringQualities.traits.includes('Fresh')).map((a) => a.name);
  ok(freshFans.includes("Founder's Heir") && freshFans.includes('Paranoid Cleric') && freshFans.length >= 5, `Fresh draws ${freshFans.length}, the Founder's Heir and the Paranoid Cleric among them`);
}
