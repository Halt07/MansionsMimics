// Forms' built-in traits (structural/aura) and flaw data.
export default async function ({ gameData: m, ok }) {
  const forms = Object.values(m.MASTER_FORMS).flat();
  const builtInAllowed = new Set([...m.UNLEARNED_TRAITS.structural, ...m.UNLEARNED_TRAITS.aura]);

  ok(forms.every((f) => Array.isArray(f.builtInTraits) && f.builtInTraits.length > 0), `all ${forms.length} forms have built-in traits`);
  ok(forms.every((f) => f.builtInTraits.every((t) => builtInAllowed.has(t))), 'built-in traits are all structural or aura traits');
  ok(forms.every((f) => f.flawProfiles.every((x) => x.type !== 'sound')), "no 'sound' flaws (they are 'acoustic')");

  for (const t of ['Upholstered', 'Locked', 'Rustic', 'Arched']) {
    const fs = forms.filter((f) => f.builtInTraits.includes(t));
    const likers = m.ADVENTURER_TEMPLATES.filter((a) => a.alluringQualities.traits.includes(t));
    ok(m.UNLEARNED_TRAITS.structural.includes(t) && fs.length > 0 && likers.length > 0, `${t}: on ${fs.length} forms, liked by ${likers.length} adventurers`);
  }

  const rogue = m.ADVENTURER_TEMPLATES.find((a) => a.name === 'Greedy Rogue');
  const hunter = m.ADVENTURER_TEMPLATES.find((a) => a.name === 'Mimic Hunter');
  const chest = forms.find((f) => f.id === 'lesser_chest');
  ok(m.calcAllureBreakdown(chest, {}, rogue).liked.includes('Locked') && m.calcAllureBreakdown(chest, {}, hunter).disliked.includes('Locked'), 'a Locked chest lures the rogue and repels the mimic hunter');

  const half = m.ADVENTURER_TEMPLATES.find((a) => a.name === 'Half-Giant Mercenary');
  const giantChest = forms.find((f) => f.id === 'giant_chest');
  const liked = m.calcAllureBreakdown(giantChest, {}, half).liked;
  ok(liked.includes('Iron-Banded') && liked.includes('Heavy-Lidded'), "a bare Giant Chest's built-in traits lure a Half-Giant");
}
