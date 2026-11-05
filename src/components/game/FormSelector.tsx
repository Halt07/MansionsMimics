import { useState } from "react";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { ALL_FORMS, TIER_ORDER, getValidForms, getLockedVariants, canAddForm, formBurn, MAX_FORMS_ABOVE_TIER, type Form, type Tier } from "./gameData";
import BurnBadge from "./BurnBadge";
import { Button } from "@/components/ui/button";

const MAX_FORMS = 3;

interface FormSelectorProps {
  character: MimicCharacter;
  onConfirm: (selectedForms: Form[]) => void;
  onSkip: () => void;
}

export default function FormSelector({ character, onConfirm, onSkip }: FormSelectorProps) {
  const currentTierIdx = TIER_ORDER.indexOf(character.tier);
  // Include all forms from tier-1, current tier, and tier+1 (plus any variant forms the mimic
  // has unlocked); variants it hasn't unlocked yet are shown locked, with how to unlock them
  const validForms = getValidForms(character.tier, character.mass, character);
  const lockedVariants = getLockedVariants(character.tier, character.mass, character);
  const baseName = (id?: string) => ALL_FORMS.find(f => f.id === id)?.name ?? id;

  // Start from the current forms, keeping within the form limit and the one-form-above rule
  const [selected, setSelected] = useState<Form[]>(() => {
    return character.forms
      .flatMap(ref => validForms.filter(f => f.id === ref.formId))
      .reduce<Form[]>((acc, form) => (acc.length < MAX_FORMS && canAddForm(acc, form, character.tier) ? [...acc, form] : acc), []);
  });

  const toggle = (form: Form) => {
    setSelected(prev => {
      const exists = prev.find(f => f.id === form.id);
      if (exists) return prev.filter(f => f.id !== form.id);
      if (prev.length >= MAX_FORMS || !canAddForm(prev, form, character.tier)) return prev;
      return [...prev, form];
    });
  };

  const tierMeta: Record<Tier, { color: string; label: string }> = {
    Minor:    { color: "text-muted-foreground", label: "Minor" },
    Lesser:   { color: "text-green-400",  label: "Lesser" },
    Standard: { color: "text-blue-400",   label: "Standard" },
    Greater:  { color: "text-purple-400", label: "Greater" },
    Grand:    { color: "text-orange-400", label: "Grand" },
    Apex:     { color: "text-primary",    label: "Apex" },
  };

  const tierLabel = (tier: Tier) => {
    const idx = TIER_ORDER.indexOf(tier);
    if (idx === currentTierIdx - 1) return `${tier} Tier (Below — simpler forms, –1 Patience)`;
    if (idx === currentTierIdx + 1) return `${tier} Tier (Above — ambitious forms, –2 Plausibility, max ${MAX_FORMS_ABOVE_TIER})`;
    return `${tier} Tier (Current)`;
  };

  const groupedForms = TIER_ORDER.reduce<Partial<Record<Tier, Form[]>>>((acc, tier) => {
    const formsInTier = validForms.filter(f => f.tier === tier);
    if (formsInTier.length > 0) acc[tier] = formsInTier;
    return acc;
  }, {});
  const lockedByTier = (tier: Tier) => lockedVariants.filter(f => f.tier === tier);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-cinzel text-xl text-primary mb-1">Choose Your Forms</h2>
        <p className="text-sm text-muted-foreground flavor-text italic mb-1">
          You may adopt up to {MAX_FORMS} forms for your next hunt. Choose wisely — each form attracts different prey.
        </p>
        <p className="text-xs text-muted-foreground">
          Selected: {selected.length} / {MAX_FORMS}
        </p>
      </div>

      {TIER_ORDER.flatMap(tier => { const forms = groupedForms[tier]; return forms ? [[tier, forms] as const] : []; }).map(([tier, forms]) => (
        <div key={tier}>
          <p className={`text-[10px] font-cinzel uppercase tracking-widest mb-2 ${tierMeta[tier]?.color}`}>{tierLabel(tier)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {forms.map(form => {
              const isSelected = !!selected.find(f => f.id === form.id);
              const blockedByAboveRule = !isSelected && !canAddForm(selected, form, character.tier);
              const isDisabled = !isSelected && (selected.length >= MAX_FORMS || blockedByAboveRule);
              return (
                <button
                  key={form.id}
                  onClick={() => !isDisabled && toggle(form)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : isDisabled
                        ? "border-border bg-card text-muted-foreground/40 cursor-not-allowed"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-cinzel">{form.name}</span>
                    <div className="flex gap-1 items-center">
                      {form.baseAllureModifier > 0 && (
                        <span className="text-[9px] text-yellow-400">✦ Allure +{form.baseAllureModifier}</span>
                      )}
                      {isSelected && <span className="text-[9px] text-primary">✓</span>}
                    </div>
                  </div>
                  {form.variantOf && (
                    <p className="text-[9px] text-teal-300 mb-0.5">🗝️ Variant of {baseName(form.variantOf)}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{form.description}</p>
                  <div className="mt-1"><BurnBadge huntsLeft={formBurn(character, form.id)} /></div>
                  {blockedByAboveRule && selected.length < MAX_FORMS && (
                    <p className="text-[9px] text-orange-400 mt-0.5">You already have a form from the tier above.</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.utilityTags.map(tag => (
                      <span key={tag} className="text-[9px] border border-border rounded px-1 text-muted-foreground/70">{tag}</span>
                    ))}
                    {form.builtInTraits.map(t => (
                      <span key={t} title="Built-in trait — this form always has it" className="text-[9px] border border-dashed border-primary/30 rounded px-1 text-primary/80">{t}</span>
                    ))}
                  </div>
                </button>
              );
            })}
            {lockedByTier(tier).map(form => (
              <div key={form.id} className="text-left px-3 py-2.5 rounded-lg border border-dashed border-border bg-card/50 text-xs text-muted-foreground/50 cursor-not-allowed">
                <span className="font-cinzel">🔒 {form.name}</span>
                <span className="text-[9px] ml-1">— variant of {baseName(form.variantOf)}</span>
                <p className="text-[10px] mt-0.5">Learn {(form.unlockedBy ?? []).join(", ").replace(/, ([^,]*)$/, " or $1")} to unlock.</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/80 flex-1"
        >
          Confirm Forms ({selected.length})
        </Button>
        <Button
          onClick={onSkip}
          disabled={!character.forms.length}
          title={character.forms.length ? undefined : "You have no forms left to keep — choose at least one."}
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground"
        >
          Keep Current
        </Button>
      </div>
    </div>
  );
}