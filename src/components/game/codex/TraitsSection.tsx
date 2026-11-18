import { TRAITS, UNLEARNED_TRAITS, ALL_STARTING_TRAITS, type StartingTrait } from "@/data/gameData";
import { Badge } from "@/components/ui/badge";

/** Learnable traits (starting ones highlighted) and the ones built into forms. */
export default function TraitsSection() {
  return (
    <div className="space-y-4">
        <h2 className="font-cinzel text-2xl text-foreground mb-4">Traits</h2>
        <p className="text-sm text-muted-foreground">Surface, symbolic and condition traits are learned from your prey and applied in the appearance editor. Every mimic begins knowing those <span className="text-primary">highlighted</span>;</p>
        {Object.entries(TRAITS).map(([category, traits]) =>
      <div key={category}>
            <h3 className="font-cinzel text-sm text-muted-foreground uppercase tracking-widest mb-2">{category}</h3>
            <div className="flex flex-wrap gap-2">
              {traits.map((t) =>
          <Badge key={t} variant="outline" className={ALL_STARTING_TRAITS.includes(t as StartingTrait) ? "border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground transition-colors"}>{t}</Badge>
          )}
            </div>
          </div>
      )}
        <p className="text-sm text-muted-foreground pt-2">Structural and aura traits can't be learned or applied — they're built into forms, so you have them only while wearing a form that includes them.</p>
        {Object.entries(UNLEARNED_TRAITS).map(([category, traits]) =>
      <div key={category}>
            <h3 className="font-cinzel text-sm text-muted-foreground uppercase tracking-widest mb-2">{category} <span className="normal-case tracking-normal text-[11px]">(built into forms)</span></h3>
            <div className="flex flex-wrap gap-2">
              {traits.map((t) =>
          <Badge key={t} variant="outline" className="border-dashed border-border text-muted-foreground hover:text-foreground transition-colors">{t}</Badge>
          )}
            </div>
          </div>
      )}
      </div>
  );
}
