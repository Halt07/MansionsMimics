import { TIER_CONFIG } from "../gameData";
import { useHunt } from "./HuntContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatBar from "../StatBar";
import SuspicionMeter from "../SuspicionMeter";

/** The left column's top two cards: the form you're wearing and your stats, then suspicion and AP. */
export default function StatusPanel() {
  const { character, activeForm, stats, sickness, suspicion } = useHunt();
  const { mass: massPenalty, formTier, sickness: sick } = stats.penalties;
  const sickLabel = (n: number) => (n ? `–${n} ${sickness?.name}` : null);
  const apToEvolve = TIER_CONFIG[character.tier].apToEvolve;
  const apProgress = Math.min((character.assimilationPoints / apToEvolve) * 100, 100);

  const app = character.currentAppearance;
  const mats = app ? [...(app.primaryMaterials || []), ...(app.secondaryMaterials || [])] : [];
  const traits = app ? [...(app.surfaceTraits || []), ...(app.symbolicTraits || []), ...(app.conditionTraits || []), ...(app.scentTraits || [])] : [];

  return (
    <>
      <Card className="bg-card border-border">
        <CardContent className="fx-shake p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-cinzel text-xs text-muted-foreground uppercase tracking-wide">Active Form</span>
            {activeForm ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 border text-[11px]">{activeForm.name}</Badge>
            ) : (
              <span className="text-xs text-destructive">None</span>
            )}
          </div>
          {activeForm && (
            <p className="text-xs text-muted-foreground flavor-text italic mb-1">{activeForm.description}</p>
          )}
          {activeForm && activeForm.builtInTraits.length > 0 && (
            <p className="text-[11px] text-muted-foreground mb-1">
              Built-in: <span className="text-primary">{activeForm.builtInTraits.join(", ")}</span>
            </p>
          )}
          {/* Current appearance summary */}
          {mats.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/50">
              <div className="flex flex-wrap gap-1">
                {mats.map(m => (
                  <span key={m} className="text-[10px] bg-accent/20 text-accent-foreground rounded px-1.5 py-0.5 border border-accent/20">{m}</span>
                ))}
                {traits.map(t => (
                  <span key={t} className="text-[10px] bg-primary/10 text-primary/80 rounded px-1.5 py-0.5 border border-primary/20">{t}</span>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2 pt-1 border-t border-border">
            <StatBar label="Plausibility" value={character.plausibility} max={6} color="bg-green-500"
              penalty={massPenalty + sick.plausibility + formTier.plausibility}
              penaltyLabel={sickLabel(sick.plausibility)}
              massPenalty={massPenalty}
              formPenalty={formTier.plausibility}
              formPenaltyNote="Your form is from the tier above — you can't quite match its appearance (stealth checks)."
            />
            <StatBar label="Adhesion" value={character.adhesion} max={6} color="bg-primary"
              penalty={sick.adhesion}
              penaltyLabel={sickLabel(sick.adhesion)}
            />
            <StatBar label="Patience" value={character.patience} max={6} color="bg-purple-500"
              penalty={sick.patience + formTier.patience}
              penaltyLabel={sickLabel(sick.patience)}
              formPenalty={formTier.patience}
              formPenaltyNote="Your form is from the tier below — too much mass in a small space makes you restless."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="fx-shake bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <SuspicionMeter value={suspicion} max={10} />
          <div className="border-t border-border pt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground font-cinzel uppercase tracking-wide text-[11px]">Assimilation</span>
              <span className="text-foreground font-bold">{character.assimilationPoints} AP</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${apProgress}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              {`${character.assimilationPoints} / ${apToEvolve} AP`}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
