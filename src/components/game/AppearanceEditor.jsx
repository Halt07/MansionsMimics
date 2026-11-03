import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Check } from "lucide-react";
import { TRAITS, APPEARANCE_LIMITS, MAGIC_EFFECTS, isMagicMaterial, countMagicMaterials } from "./gameData";

const MATERIAL_FIELDS = ["primaryMaterials", "secondaryMaterials"];

export default function AppearanceEditor({ character, onSave, onClose }) {
  const [appearance, setAppearance] = useState({
    primaryMaterials: character.currentAppearance?.primaryMaterials || [],
    secondaryMaterials: character.currentAppearance?.secondaryMaterials || [],
    surfaceTraits: character.currentAppearance?.surfaceTraits || [],
    symbolicTraits: character.currentAppearance?.symbolicTraits || [],
    conditionTraits: character.currentAppearance?.conditionTraits || [],
  });

  const limits = APPEARANCE_LIMITS[character.tier] || APPEARANCE_LIMITS["Minor"];
  const learned = character.learnedMaterials || [];
  const hasLearnedMagic = learned.some(isMagicMaterial);
  const magicInUse = countMagicMaterials(appearance);
  const wornMagic = MATERIAL_FIELDS.flatMap(f => appearance[f]).filter(isMagicMaterial);

  // A material can only fill one slot at a time
  const usedElsewhere = (field, mat) =>
    MATERIAL_FIELDS.some(f => f !== field && appearance[f].includes(mat));

  // Magic materials go in the primary/secondary slots, but only limits.magicalMaterials of them in total.
  const exceedsMagicCap = (field, mat) => {
    if (!isMagicMaterial(mat) || appearance[field].includes(mat)) return false;
    // With a slot limit of 1 the pick replaces the current material, freeing its magic slot if it had one
    const freed = limits[field] === 1 ? appearance[field].filter(isMagicMaterial).length : 0;
    return magicInUse - freed >= limits.magicalMaterials;
  };

  const materialButton = (field, mat) => {
    const selected = appearance[field].includes(mat);
    const magic = isMagicMaterial(mat);
    const inOtherSlot = usedElsewhere(field, mat);
    const magicCapped = !inOtherSlot && exceedsMagicCap(field, mat);
    const blocked = inOtherSlot || magicCapped;

    let style;
    let title = MAGIC_EFFECTS[mat];
    if (selected) {
      style = magic ? "border-purple-400 bg-purple-400/10 text-purple-400" : "border-primary bg-primary/10 text-primary";
    } else if (magicCapped) {
      // Muted purple (not grey) so it still reads as a magic material
      style = "border-purple-400/15 bg-purple-400/5 text-purple-300/35 cursor-not-allowed";
      title = limits.magicalMaterials === 0
        ? "Your tier is too inexperienced to imitate magic materials."
        : "You are unable to imitate any more magic materials at one time.";
    } else if (inOtherSlot) {
      style = "border-border text-muted-foreground opacity-30 cursor-not-allowed";
      title = "Already used in your other material slot.";
    } else {
      style = magic ? "border-purple-400/30 text-purple-400/70 hover:border-purple-400/60" : "border-border text-muted-foreground hover:border-primary/30";
    }

    // aria-disabled instead of disabled, so the hover message still shows in every browser
    return (
      <button
        key={mat}
        type="button"
        title={title}
        aria-disabled={blocked}
        onClick={() => { if (!blocked) toggleMat(field, mat, limits[field]); }}
        className={`px-2.5 py-1 rounded border text-xs transition-all ${style}`}
      >
        {mat}
      </button>
    );
  };
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
            {learned.map(mat => materialButton("primaryMaterials", mat))}
          </div>
        </div>

        {/* Secondary Material — only if tier allows */}
        {limits.secondaryMaterials > 0 && (
          <div>
            <p className="font-cinzel text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5">
              Secondary Material{limits.secondaryMaterials > 1 ? `s (max ${limits.secondaryMaterials})` : ""}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {learned.map(mat => materialButton("secondaryMaterials", mat))}
            </div>
          </div>
        )}

        {/* Magic materials: cap and effects */}
        {hasLearnedMagic && (
          <div className="text-[10px] text-muted-foreground space-y-1">
            {limits.magicalMaterials > 0 ? (
              <p>
                <span className="text-purple-400">Magical materials</span> can fill primary or secondary slots:{" "}
                <span className="text-foreground">{magicInUse}/{limits.magicalMaterials}</span> in use.
              </p>
            ) : (
              <p>Your tier can&apos;t wear <span className="text-purple-400">magical materials</span> yet.</p>
            )}
            {wornMagic.map(mat => (
              <p key={mat}><span className="text-purple-400">{mat}:</span> {MAGIC_EFFECTS[mat]}</p>
            ))}
            {wornMagic.length > 0 && (
              <p className="italic">Each magic material leaves arcane residue that magic-sensitive adventurers may notice.</p>
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