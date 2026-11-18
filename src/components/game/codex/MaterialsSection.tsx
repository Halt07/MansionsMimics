import {
  TIER_ORDER, MATERIALS, MATERIAL_COLORS, APPEARANCE_LIMITS, MAGIC_EFFECTS, isMagicMaterial, type Material,
  type MaterialRarity,
} from "@/data/gameData";
import Collapsible from "./Collapsible";

/** Every material by rarity (with what magic ones do), and the appearance limits per tier. */
export default function MaterialsSection() {
  // MATERIALS as typed [rarity, materials] pairs (Object.entries would lose the key types)
  const groups = Object.entries(MATERIALS) as [MaterialRarity, readonly Material[]][];
  return (
    <div className="space-y-4">
        <h2 className="font-cinzel text-2xl text-foreground mb-2">Materials</h2>
        <p className="text-sm text-muted-foreground mb-4">
          You can only use materials you have <em>consumed or directly observed</em>. Each tier unlocks the ability to use more complex appearance combinations.
        </p>
        {groups.map(([rarity, mats]) =>
      <Collapsible key={rarity} title={`${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Materials (${mats.length})`} defaultOpen={rarity === "mundane"}>
            {rarity === "magic" && (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-purple-400/80 italic border border-purple-400/20 bg-purple-400/5 rounded px-2 py-1.5">
                  Magic materials are worn in your primary or secondary slots like any other material, up to your tier's Magic limit, and each one worn grants its effect. The cost: each one gives off <span className="font-semibold">arcane residue</span>, an extra flaw check against adventurers with Magical perception +2 or higher (wizards, clerics, inquisitors, changelings…).
                </p>
              </div>
            )}
            {rarity === "giant" && (
              <p className="text-xs text-amber-400/80 italic mb-3 border border-amber-400/20 bg-amber-400/5 rounded px-2 py-1.5">
                ⚠ Giant-realm materials are only obtainable by consuming Giant-kin adventurers or creatures in the <span className="font-semibold">Giant's Castle</span> or <span className="font-semibold">Cloud Kingdom Outpost</span> locations. These locations require Apex tier and a minimum mass of 28–38.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {mats.map((mat) =>
          <span key={mat} className={`text-xs px-2.5 py-1 rounded border ${MATERIAL_COLORS[rarity]}`}>
                  {mat}
                </span>
          )}
            </div>
            {rarity === "magic" && (
              <div className="mt-3 space-y-2">
                <ul className="space-y-1 text-xs">
                  {mats.filter(isMagicMaterial).map((mat) =>
                    <li key={mat}><span className="text-purple-400">{mat}</span> <span className="text-muted-foreground">— {MAGIC_EFFECTS[mat]}</span></li>
                  )}
                </ul>
              </div>
            )}
          </Collapsible>
      )}
        <Collapsible title="Appearance Limits by Tier">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-muted-foreground">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1 pr-3 font-cinzel text-foreground">Tier</th>
                  <th className="py-1 px-2 font-cinzel text-foreground">Primary</th>
                  <th className="py-1 px-2 font-cinzel text-foreground">Secondary</th>
                  <th className="py-1 px-2 font-cinzel text-foreground" title="How many of your primary and secondary materials may be magic">Magic (of P+S)</th>
                  <th className="py-1 px-2 font-cinzel text-foreground">Surface</th>
                  <th className="py-1 px-2 font-cinzel text-foreground">Symbolic</th>
                  <th className="py-1 px-2 font-cinzel text-foreground">Condition</th>
                  <th className="py-1 px-2 font-cinzel text-foreground">Scent</th>
                </tr>
              </thead>
              <tbody>
                {TIER_ORDER.map((tier) => {
                const lim = APPEARANCE_LIMITS[tier];
                return (
                  <tr key={tier} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 font-cinzel text-foreground">{tier}</td>
                      <td className="py-1.5 px-2 text-center">{lim.primaryMaterials}</td>
                      <td className="py-1.5 px-2 text-center">{lim.secondaryMaterials}</td>
                      <td className="py-1.5 px-2 text-center">{lim.magicalMaterials}</td>
                      <td className="py-1.5 px-2 text-center">{lim.surfaceTraits}</td>
                      <td className="py-1.5 px-2 text-center">{lim.symbolicTraits}</td>
                      <td className="py-1.5 px-2 text-center">{lim.conditionTraits}</td>
                      <td className="py-1.5 px-2 text-center">{lim.scentTraits}</td>
                    </tr>);

              })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Magic materials don't have their own slot. They go in your primary or secondary slots, and the Magic column caps how many of those may be magic — at Apex, up to 3 of your 4 materials.</p>
        </Collapsible>
      </div>
  );
}
