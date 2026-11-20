import { useState } from "react";
import {
  ALL_FORMS, TIER_ORDER, MASTER_FORMS, type Tier, HOLIDAYS, SEASONAL_FORMS, activeHolidays, isInSeason,
  MAX_FORMS, MAX_FORMS_ABOVE_TIER, formDescription, plural, seasonEnd, today, type BranchTier, type Form,
} from "@/data/gameData";
import HolidayBadge from "@/components/game/HolidayBadge";
import { ChompCard } from "@/components/game/CardChomp";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CodexReader } from "./CodexReader";

/** Every form by tier, plus a Current Season tab while a holiday is on. */
export default function FormsSection({ knowers }: Pick<CodexReader, "knowers">) {
  // A branch tier's own forms are listed only if a mimic being read for is on that branch, and
  // described as that branch tells them (see "Beyond Apex" in IDEAS.md)
  const branchOf = (form: Pick<Form, "branches">): BranchTier | null =>
    knowers.map(k => k.branchTier).find(b => !!b && !!form.branches?.includes(b)) ?? null;
  // A tier, or "season": the seasonal forms in season right now (that tab only exists while a
  // holiday is on; out of season the forms stay a surprise)
  const [selectedTier, setSelectedTier] = useState<Tier | "season">("Minor");
  const season = activeHolidays(today())[0];
  const seasonForms = SEASONAL_FORMS
    .filter((f) => isInSeason(f.holiday, today()))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  const codexForms = selectedTier === "season" ? seasonForms : MASTER_FORMS[selectedTier].filter(f => !f.branches || branchOf(f));
  return (
    <div>
        <h2 className="font-cinzel text-2xl text-foreground mb-2">Forms</h2>
        <p className="text-sm text-muted-foreground mb-3">
          A mimic can hold up to {MAX_FORMS} forms at once. Forms must be within 1 tier of your current tier.
          Only {MAX_FORMS_ABOVE_TIER} {plural(MAX_FORMS_ABOVE_TIER, "form")} may be from the tier above (–2 plausibility). A tier below penalizes patience (–1).
        </p>
        <div className="p-3 mb-4 border border-amber-400/20 bg-amber-400/5 rounded-lg text-xs text-amber-400/80">
          <span className="font-cinzel font-semibold text-amber-400">Giant Forms</span> — The Apex tier includes oversized Giant versions of classic forms (Giant Pillow, Giant Goblet, Giant Chest, Giant Tome, Giant Barrel, Giant Throne, Giant Bed). These are mass-gated (minimum mass 28–35) and are specifically designed to lure <span className="font-semibold">Giant-kin prey</span> in the Giant's Castle and Cloud Kingdom locations. They have higher digestive capacity requirements and larger material slot counts than their standard equivalents.
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {TIER_ORDER.map((tier) =>
        <button
          key={tier}
          onClick={() => setSelectedTier(tier)}
          aria-pressed={selectedTier === tier}
          className={`px-3 py-1.5 rounded border text-xs font-cinzel transition-all ${
          selectedTier === tier ?
          "border-primary bg-primary/10 text-primary" :
          "border-border text-muted-foreground hover:border-primary/30"}`
          }>

              {tier}
            </button>
        )}
          {season && (
            <button
              onClick={() => setSelectedTier("season")}
              aria-pressed={selectedTier === "season"}
              className={`px-3 py-1.5 rounded border text-xs font-cinzel transition-all ${
                selectedTier === "season"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"}`}
            >
              {HOLIDAYS[season].icon} Current Season
            </button>
          )}
        </div>
        {selectedTier === "season" && season && (
          <p className="text-xs text-muted-foreground mb-3">
            <span className="holiday-badge text-xs" data-holiday={season}>{HOLIDAYS[season].icon} {HOLIDAYS[season].name}</span>
            {" "}· These shapes can be chosen until {seasonEnd(season)}, by mimics of the tiers shown on each. They count as your own tier, with no penalty.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {codexForms.map((form) =>
        <ChompCard key={form.id} speed="slow" data-holiday={form.holiday} className={`${form.holiday ? "holiday-card" : ""} bg-card border-border`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-cinzel text-foreground">{form.name}</h3>
                  <Badge variant="outline" className="text-[11px] border-primary/20 text-primary shrink-0 ml-2">
                    +{form.baseAllureModifier} Allure
                  </Badge>
                </div>
                {form.holiday && <p className="mb-1"><HolidayBadge form={form} /> <span className="text-[10px] text-muted-foreground">· {form.holidayTiers?.join(", ")}</span></p>}
                {form.variantOf && (
                  <p className="text-[11px] text-teal-300 mb-1">
                    🗝️ {form.holiday
                      ? `Seasonal variant of ${ALL_FORMS.find((f) => f.id === form.variantOf)?.name}`
                      : `Variant of ${ALL_FORMS.find((f) => f.id === form.variantOf)?.name} — unlocked by learning any of: ${(form.unlockedBy ?? []).join(", ")}`}
                  </p>
                )}
                {"branches" in form && form.branches && (
                  <p className="tear-badge text-[11px] font-cinzel mb-1">🌀 Beyond the Apex · {form.branches.join(", ")} only</p>
                )}
                <p className="text-xs text-muted-foreground mb-2">{formDescription(form, "branches" in form ? branchOf(form) : null)}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {form.utilityTags.map((t) =>
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t}</span>
              )}
                  {form.builtInTraits.map((t) =>
              <span key={t} title="Built-in trait" className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/5">{t}</span>
              )}
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <p className="text-[11px] text-muted-foreground font-cinzel uppercase tracking-wide mb-1">Potential Flaws</p>
                  {form.flawProfiles.slice(0, 2).map((f, i) =>
              <p key={i} className="text-[11px] text-muted-foreground/70 italic">• {f.description}</p>
              )}
                </div>
              </CardContent>
            </ChompCard>
        )}
        </div>
      </div>
  );
}
