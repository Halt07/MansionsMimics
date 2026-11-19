import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BURN_HUNTS, BURN_SUSPICION, STAT_CAP, TIER_CONFIG, type HuntReport as Report, type UpgradeChoice } from "@/data/gameData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { asButton, FOCUS_RING } from "@/lib/asButton";
import HuntReport from "../HuntReport";
import { useHunt } from "./HuntContext";


/** Every adventurer is gone: the hunt's report, then forms or straight back out. */
export function HuntOverPanel({ report, onChooseForms, onHuntAgain }: { report: Report | null; onChooseForms: () => void; onHuntAgain: () => void }) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
      <p className="text-primary font-cinzel mb-3">The hunt is over.</p>
      {report && <div className="mb-4"><HuntReport report={report} /></div>}
      <div className="flex gap-2 justify-center">
        <Button onClick={onChooseForms} className="bg-primary text-primary-foreground hover:bg-primary/80 text-xs">
          Choose New Forms
        </Button>
        <Button onClick={onHuntAgain} variant="outline" className="border-border text-xs">
          Hunt Again (Keep Forms)
        </Button>
      </div>
    </div>
  );
}

/** Enough AP to spend: grow, or raise a stat (one choice per visit). */
export function EvolveScreen({ onChoose, onSkip }: { onChoose: (choice: UpgradeChoice) => void; onSkip: () => void }) {
  const { character } = useHunt();
  const cfg = TIER_CONFIG[character.tier];
  const options = [
    { key: "mass", label: "Increase Mass", desc: `Grow toward the next tier. Cost: ${cfg.apToEvolve} AP`, icon: "⬆", capped: false },
    { key: "plausibility", label: "+1 Plausibility", desc: `Improve deception. Cost: ${cfg.apToUpgrade} AP (${character.plausibility}/${STAT_CAP})`, icon: "👁", capped: character.plausibility >= STAT_CAP },
    { key: "adhesion", label: "+1 Adhesion", desc: `Better grappling. Cost: ${cfg.apToUpgrade} AP (${character.adhesion}/${STAT_CAP})`, icon: "🔒", capped: character.adhesion >= STAT_CAP },
    { key: "patience", label: "+1 Patience", desc: `Longer stillness. Cost: ${cfg.apToUpgrade} AP (${character.patience}/${STAT_CAP})`, icon: "⌛", capped: character.patience >= STAT_CAP },
  ] satisfies { key: UpgradeChoice; label: string; desc: string; icon: string; capped: boolean }[];
  return (
    <div>
      <h2 className="font-cinzel text-2xl text-primary mb-2">Assimilation Threshold Reached</h2>
      <p className="flavor-text text-muted-foreground mb-6 italic">
        Your body strains with absorbed essence. Spend your assimilation — grow, or refine.
      </p>
      <p className="text-xs text-muted-foreground -mt-4 mb-6">
        Choose one. To upgrade again, you&apos;ll need to reach the threshold again ({character.assimilationPoints} / {cfg.apToEvolve} AP).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map(opt => (
          <Card
            key={opt.key}
            {...asButton(() => onChoose(opt.key), { disabled: opt.capped })}
            className={`border-border bg-card transition-all group ${FOCUS_RING} ${opt.capped ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">{opt.icon}</div>
              <h3 className="font-cinzel text-foreground group-hover:text-primary transition-colors mb-1">{opt.label}</h3>
              <p className="text-xs text-muted-foreground">{opt.capped ? "MAX — cannot increase further" : opt.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={onSkip}
        className="w-full mt-4 border-border text-muted-foreground hover:text-foreground text-xs"
      >
        Not Now — Continue Hunting
      </Button>
    </div>
  );
}

interface GameOverScreenProps {
  reason: "discovered" | "abandoned";
  report: Report | null;
  onChooseForms: () => void;
  onHuntAgain: () => void;
}

/** Found out, or the party gave up and left. */
export function GameOverScreen({ reason, report, onChooseForms, onHuntAgain }: GameOverScreenProps) {
  const left = reason === "abandoned";
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{left ? "🌫️" : "🔥"}</div>
      <h2 className={`font-cinzel text-3xl mb-2 ${left ? "text-muted-foreground" : "text-destructive"}`}>
        {left ? "They Left" : "Discovered"}
      </h2>
      <p className="flavor-text text-muted-foreground mb-2 italic max-w-sm mx-auto">
        {left
          ? "The adventurers found nothing of interest and moved on. Hunger remains."
          : "Torches are lit. Steel is drawn. You scatter into the dark — this lair is burned."}
      </p>
      {report && <div className="my-6"><HuntReport report={report} /></div>}
      <p className="text-xs text-muted-foreground mb-6 max-w-xs mx-auto">
        {left
          ? "Find a new hunting ground. Better forms and higher stats will help you lure more resistant prey."
          : `This hunting ground and the form you were caught in are burned for ${BURN_HUNTS} hunts: using either starts you under suspicion (+${BURN_SUSPICION} each). Consider a new form.`}
      </p>
      <div className="flex flex-col gap-2 items-center">
        <Button onClick={onChooseForms} className="bg-primary text-primary-foreground hover:bg-primary/80 w-48">
          Change Forms & Hunt Again
        </Button>
        <Button onClick={onHuntAgain} variant="outline" className="border-border w-48">
          Hunt Again (Keep Forms)
        </Button>
        <Button asChild variant="ghost" className="text-muted-foreground w-48">
          <Link to={createPageUrl("Home")}>Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
