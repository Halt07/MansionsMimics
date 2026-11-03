import { useState } from "react";
import { MASTER_FORMS, TIER_ORDER, getValidForms } from "./gameData";
import { Button } from "@/components/ui/button";

const MAX_FORMS = 3;

export default function FormSelector({ character, onConfirm, onSkip }) {
  const currentTierIdx = TIER_ORDER.indexOf(character.tier);
  // Include all forms from tier-1, current tier, and tier+1
  const validForms = getValidForms(character.tier, character.mass);

  const [selected, setSelected] = useState(() => {
    return (character.forms || [])
      .map(ref => validForms.find(f => f.id === ref.formId))
      .filter(Boolean)
      .slice(0, MAX_FORMS);
  });

  const toggle = (form) => {
    setSelected(prev => {
      const exists = prev.find(f => f.id === form.id);
      if (exists) return prev.filter(f => f.id !== form.id);
      if (prev.length >= MAX_FORMS) return prev;
      return [...prev, form];
    });
  };

  const tierMeta = {
    Minor:    { color: "text-muted-foreground", label: "Minor" },
    Lesser:   { color: "text-green-400",  label: "Lesser" },
    Standard: { color: "text-blue-400",   label: "Standard" },
    Greater:  { color: "text-purple-400", label: "Greater" },
    Grand:    { color: "text-orange-400", label: "Grand" },
    Apex:     { color: "text-primary",    label: "Apex" },
  };

  const tierLabel = (tier) => {
    const idx = TIER_ORDER.indexOf(tier);
    if (idx === currentTierIdx - 1) return `${tier} Tier (Below — simpler forms)`;
    if (idx === currentTierIdx + 1) return `${tier} Tier (Above — ambitious forms)`;
    return `${tier} Tier (Current)`;
  };

  const groupedForms = TIER_ORDER.reduce((acc, tier) => {
    const formsInTier = validForms.filter(f => f.tier === tier);
    if (formsInTier.length > 0) acc[tier] = formsInTier;
    return acc;
  }, {});

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

      {Object.entries(groupedForms).map(([tier, forms]) => (
        <div key={tier}>
          <p className={`text-[10px] font-cinzel uppercase tracking-widest mb-2 ${tierMeta[tier]?.color}`}>{tierLabel(tier)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {forms.map(form => {
              const isSelected = !!selected.find(f => f.id === form.id);
              const isDisabled = !isSelected && selected.length >= MAX_FORMS;
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
                  <p className="text-[10px] text-muted-foreground">{form.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.utilityTags.map(tag => (
                      <span key={tag} className="text-[9px] border border-border rounded px-1 text-muted-foreground/70">{tag}</span>
                    ))}
                  </div>
                </button>
              );
            })}
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
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground"
        >
          Keep Current
        </Button>
      </div>
    </div>
  );
}