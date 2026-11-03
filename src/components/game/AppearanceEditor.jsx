import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Check } from "lucide-react";
import { TRAITS, APPEARANCE_LIMITS, MATERIALS, MAGIC_EFFECTS } from "./gameData";

export default function AppearanceEditor({ character, onSave, onClose }) {
  const [appearance, setAppearance] = useState({
    primaryMaterials: character.currentAppearance?.primaryMaterials || [],
    secondaryMaterials: character.currentAppearance?.secondaryMaterials || [],
    magicalMaterials: character.currentAppearance?.magicalMaterials || [],
    surfaceTraits: character.currentAppearance?.surfaceTraits || [],
    symbolicTraits: character.currentAppearance?.symbolicTraits || [],
    conditionTraits: character.currentAppearance?.conditionTraits || [],
  });

  const limits = APPEARANCE_LIMITS[character.tier] || APPEARANCE_LIMITS["Minor"];
  const learned = character.learnedMaterials || [];
  const learnedMagic = learned.filter(m => MATERIALS.magic.includes(m));
  // A material can only fill one slot at a time
  const usedElsewhere = (field, mat) =>
    ["primaryMaterials", "secondaryMaterials", "magicalMaterials"]
      .some(f => f !== field && (appearance[f] || []).includes(mat));
  const learnedTraits = character.learnedTraits || [];

  // With a limit of 1, picking a new material replaces the current one.
  // With higher limits, extra picks are ignored once the limit is reached.
  const toggleMat = (field, mat, maxCount) => {
    setAppearance(a => {
      const cur = a[field] || [];
      if (cur.includes(mat)) return { ...a, [field]: cur.filter(m => m !== mat) };
      if (maxCount === 1) return { ...a, [field]: [mat] };
      if (cur.length >= maxCount) return a;
      return { ...a, [field]: [...cur, mat] };
    });
  };

  const toggleTrait = (field, trait, maxCount) => {
    setAppearance(a => {
      const cur = a[field] || [];
      if (cur.includes(trait)) return { ...a, [field]: cur.filter(t => t !== trait) };
      if (cur.length >= maxCount) return a;
      return { ...a, [field]: [...cur, trait] };
    });
  };

  const allLearnedTraits = [...learnedTraits, ...TRAITS.surface, ...TRAITS.condition];
  const uniqueLearnedTraits = [...new Set(allLearnedTraits)];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="font-cinzel text-sm text-foreground">Adjust Appearance</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="w-6 h-6 text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">

        {/* Primary Material */}
        <div>
          <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
            Primary Material{limits.primaryMaterials > 1 ? `s (max ${limits.primaryMaterials})` : ""} — learned only
          </p>
          <div className="flex flex-wrap gap-1.5">
            {learned.length === 0 && <span className="text-muted-foreground italic">No materials learned yet.</span>}
            {learned.map(mat => (
              <button
                key={mat}
                onClick={() => toggleMat("primaryMaterials", mat, limits.primaryMaterials)}
                disabled={usedElsewhere("primaryMaterials", mat)}
                className={`px-2.5 py-1 rounded border text-xs transition-all disabled:opacity-30 ${
                  appearance.primaryMaterials.includes(mat)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Material — only if tier allows */}
        {limits.secondaryMaterials > 0 && (
          <div>
            <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
              Secondary Material{limits.secondaryMaterials > 1 ? `s (max ${limits.secondaryMaterials})` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {learned.map(mat => (
                <button
                  key={mat}
                  onClick={() => toggleMat("secondaryMaterials", mat, limits.secondaryMaterials)}
                  disabled={usedElsewhere("secondaryMaterials", mat)}
                  className={`px-2.5 py-1 rounded border text-xs transition-all disabled:opacity-30 ${
                    appearance.secondaryMaterials.includes(mat)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Magical Materials — learned magic materials only */}
        {limits.magicalMaterials > 0 && (
          <div>
            <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
              Magical Materials (max {limits.magicalMaterials}) — learned only
            </p>
            <div className="flex flex-wrap gap-1.5">
              {learnedMagic.length === 0 && <span className="text-muted-foreground italic">No magical materials learned yet.</span>}
              {learnedMagic.map(mat => (
                <button
                  key={mat}
                  title={MAGIC_EFFECTS[mat]}
                  onClick={() => toggleMat("magicalMaterials", mat, limits.magicalMaterials)}
                  disabled={usedElsewhere("magicalMaterials", mat)}
                  className={`px-2.5 py-1 rounded border text-xs transition-all disabled:opacity-30 ${
                    appearance.magicalMaterials.includes(mat)
                      ? "border-purple-400 bg-purple-400/10 text-purple-400"
                      : "border-border text-muted-foreground hover:border-purple-400/30"
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
            {appearance.magicalMaterials.filter(mat => MAGIC_EFFECTS[mat]).map(mat => (
              <p key={mat} className="mt-1.5 text-[10px] text-muted-foreground">
                <span className="text-purple-400">{mat}:</span> {MAGIC_EFFECTS[mat]}
              </p>
            ))}
            {appearance.magicalMaterials.length > 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground italic">Each magic material leaves arcane residue that magic-sensitive adventurers may notice.</p>
            )}
          </div>
        )}

        {/* Surface Traits */}
        {limits.surfaceTraits > 0 && (
          <div>
            <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
              Surface Traits (max {limits.surfaceTraits})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRAITS.surface.map(trait => (
                <button
                  key={trait}
                  onClick={() => toggleTrait("surfaceTraits", trait, limits.surfaceTraits)}
                  className={`px-2.5 py-1 rounded border text-xs transition-all ${
                    (appearance.surfaceTraits || []).includes(trait)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbolic Traits — only if learned */}
        {limits.symbolicTraits > 0 && (
          <div>
            <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
              Symbolic Traits — learned only (max {limits.symbolicTraits})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRAITS.symbolic.filter(t => learnedTraits.includes(t)).length === 0
                ? <span className="text-muted-foreground italic">No symbolic traits learned yet.</span>
                : TRAITS.symbolic.filter(t => learnedTraits.includes(t)).map(trait => (
                  <button
                    key={trait}
                    onClick={() => toggleTrait("symbolicTraits", trait, limits.symbolicTraits)}
                    className={`px-2.5 py-1 rounded border text-xs transition-all ${
                      (appearance.symbolicTraits || []).includes(trait)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {trait}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* Condition Traits */}
        {limits.conditionTraits > 0 && (
          <div>
            <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
              Condition Traits (max {limits.conditionTraits})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRAITS.condition.map(trait => (
                <button
                  key={trait}
                  onClick={() => toggleTrait("conditionTraits", trait, limits.conditionTraits)}
                  className={`px-2.5 py-1 rounded border text-xs transition-all ${
                    (appearance.conditionTraits || []).includes(trait)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => onSave(appearance)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 h-8 text-xs font-cinzel gap-1"
        >
          <Check className="w-3 h-3" /> Apply Appearance
        </Button>
      </CardContent>
    </Card>
  );
}