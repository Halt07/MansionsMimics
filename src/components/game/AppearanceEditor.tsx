import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Check } from "lucide-react";
import type { Appearance, MimicCharacter } from "@/api/schemas/mimicCharacter";
import { TRAITS, APPEARANCE_LIMITS, MAGIC_EFFECTS, isMagicMaterial, countMagicMaterials, hasMagic, knowsTrait, plural, toggleChoice, type Material, type Trait } from "@/data/gameData";
import ChoiceSection, { type Choice } from "./ChoiceSection";

type MaterialField = "primaryMaterials" | "secondaryMaterials";
type TraitField = "surfaceTraits" | "symbolicTraits" | "conditionTraits" | "scentTraits";

const MATERIAL_FIELDS: readonly MaterialField[] = ["primaryMaterials", "secondaryMaterials"];

/** A copy of the appearance with one field replaced. */
const withField = <F extends keyof Appearance>(a: Appearance, field: F, value: Appearance[F]): Appearance =>
  ({ ...a, [field]: value });

interface AppearanceEditorProps {
  character: MimicCharacter;
  onSave: (appearance: Appearance) => void;
  onClose: () => void;
}

export default function AppearanceEditor({ character, onSave, onClose }: AppearanceEditorProps) {
  const [appearance, setAppearance] = useState<Appearance>({
    primaryMaterials: character.currentAppearance?.primaryMaterials || [],
    secondaryMaterials: character.currentAppearance?.secondaryMaterials || [],
    surfaceTraits: character.currentAppearance?.surfaceTraits || [],
    symbolicTraits: character.currentAppearance?.symbolicTraits || [],
    conditionTraits: character.currentAppearance?.conditionTraits || [],
    scentTraits: character.currentAppearance?.scentTraits || [],
  });

  const limits = APPEARANCE_LIMITS[character.tier];
  const learned = character.learnedMaterials || [];
  const hasLearnedMagic = learned.some(isMagicMaterial);
  const magicInUse = countMagicMaterials(appearance);
  const wornMagic = MATERIAL_FIELDS.flatMap(f => appearance[f]).filter(isMagicMaterial);

  // A material can only fill one slot at a time
  const usedElsewhere = (field: MaterialField, mat: Material) =>
    MATERIAL_FIELDS.some(f => f !== field && appearance[f].includes(mat));

  // Magic materials go in the primary/secondary slots, but only limits.magicalMaterials of them in total.
  const exceedsMagicCap = (field: MaterialField, mat: Material) => {
    if (!isMagicMaterial(mat) || appearance[field].includes(mat)) return false;
    // With a slot limit of 1 the pick replaces the current material, freeing its magic slot if it had one
    const freed = limits[field] === 1 ? appearance[field].filter(isMagicMaterial).length : 0;
    return magicInUse - freed >= limits.magicalMaterials;
  };

  const materialChoice = (field: MaterialField, mat: Material): Choice => {
    const inOtherSlot = usedElsewhere(field, mat);
    const magicCapped = !inOtherSlot && exceedsMagicCap(field, mat);
    return {
      key: mat,
      label: mat,
      on: appearance[field].includes(mat),
      // In the other slot already, it's simply faded; capped, it stays (muted) magic purple
      tone: isMagicMaterial(mat) && !inOtherSlot ? "magic" : "plain",
      title: isMagicMaterial(mat) ? MAGIC_EFFECTS[mat] : undefined,
      blocked: inOtherSlot ? "Already used in your other material slot."
        : magicCapped ? (limits.magicalMaterials === 0
          ? "Your tier is too inexperienced to imitate magic materials."
          : "You are unable to imitate any more magic materials at one time.")
        : undefined,
      onToggle: () => toggleMat(field, mat, limits[field]),
    };
  };
  // Thimblewood resizes the mimic: warn as soon as it's picked or removed (Apply then opens the form menu)
  const wearingThimblewood = hasMagic(appearance, "Thimblewood");
  const thimblewoodSeen = useRef(wearingThimblewood);
  useEffect(() => {
    if (thimblewoodSeen.current === wearingThimblewood) return;
    thimblewoodSeen.current = wearingThimblewood;
    toast({
      title: wearingThimblewood ? "🪵 Thimblewood will shrink you" : "🪵 Removing Thimblewood will restore your size",
      description: "Some of your forms may no longer be available. Applying this appearance will take you to choose your forms.",
    });
  }, [wearingThimblewood]);

  // Only traits the mimic knows (starting traits, plus any it has learned) are offered. A trait
  // already worn but not known (e.g. from an older save) stays listed so it can be taken off.
  const worn: readonly Trait[] = [
    ...(appearance.surfaceTraits || []), ...(appearance.symbolicTraits || []), ...(appearance.conditionTraits || []),
    ...(appearance.scentTraits || []),
  ];
  const known = (t: Trait) => knowsTrait(character, t) || worn.includes(t);

  // A material slot of one swaps on a new pick; otherwise picks past the limit are ignored (see toggleChoice)
  const toggleMat = (field: MaterialField, mat: Material, max: number) =>
    setAppearance(a => withField(a, field, toggleChoice(a[field], mat, max, { swap: true })));
  const toggleTrait = <F extends TraitField>(field: F, trait: Appearance[F][number], max: number) =>
    setAppearance(a => withField(a, field, toggleChoice(a[field] as Appearance[F][number][], trait, max) as Appearance[F]));

  /** The traits of one kind the mimic knows, as toggles. */
  const traitChoices = <F extends TraitField>(field: F, traits: readonly Appearance[F][number][]): Choice[] =>
    traits.filter(known).map(trait => ({
      key: trait,
      label: trait,
      on: (appearance[field] as readonly Trait[]).includes(trait),
      onToggle: () => toggleTrait(field, trait, limits[field]),
    }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="font-cinzel text-sm text-foreground">Adjust Appearance</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="w-6 h-6 text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">

        <ChoiceSection
          heading={<>Primary {plural(limits.primaryMaterials, "Material")}{limits.primaryMaterials > 1 ? ` (max ${limits.primaryMaterials})` : ""} — learned only</>}
          choices={learned.map(mat => materialChoice("primaryMaterials", mat))}
          empty="No materials learned yet."
        />

        {/* Secondary Material — only if tier allows */}
        {limits.secondaryMaterials > 0 && (
          <ChoiceSection
            heading={<>Secondary {plural(limits.secondaryMaterials, "Material")}{limits.secondaryMaterials > 1 ? ` (max ${limits.secondaryMaterials})` : ""}</>}
            choices={learned.map(mat => materialChoice("secondaryMaterials", mat))}
          />
        )}

        {/* Magic materials: cap and effects */}
        {hasLearnedMagic && (
          <div className="text-[11px] text-muted-foreground space-y-1">
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

        {limits.surfaceTraits > 0 && (
          <ChoiceSection heading={`Surface Traits (max ${limits.surfaceTraits})`} choices={traitChoices("surfaceTraits", TRAITS.surface)} />
        )}
        {/* Symbolic traits are all learned in play */}
        {limits.symbolicTraits > 0 && (
          <ChoiceSection
            heading={`Symbolic Traits — learned only (max ${limits.symbolicTraits})`}
            choices={traitChoices("symbolicTraits", TRAITS.symbolic)}
            empty="No symbolic traits learned yet."
          />
        )}
        {limits.conditionTraits > 0 && (
          <ChoiceSection heading={`Condition Traits (max ${limits.conditionTraits})`} choices={traitChoices("conditionTraits", TRAITS.condition)} />
        )}
        {/* So are scents */}
        {limits.scentTraits > 0 && (
          <ChoiceSection heading={`Scent (max ${limits.scentTraits})`} choices={traitChoices("scentTraits", TRAITS.scent)} empty="No scents learned yet." />
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