
import Collapsible from "./Collapsible";

/** What the game is, the stats, a turn, and the dice. */
export default function OverviewSection() {
  return (
    <div className="space-y-4">
        <div>
          <h2 className="font-cinzel text-2xl text-foreground mb-2">Mansions & Mimics</h2>
          <p className="flavor-text text-muted-foreground italic text-lg mb-4">
            "It was not a haunted house. It was a hungry one."
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
            In Mansions & Mimics, you play as a mimic — a shapeshifting ambush predator that disguises itself as objects, furniture, and even entire rooms to lure and consume adventurers. This is not a game of heroism. It is a game of patience, deception, and predatory evolution.
          </p>
        </div>
        <Collapsible title="Core Mechanics" defaultOpen>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div><span className="text-foreground font-semibold">Plausibility</span> — How convincingly you imitate an object. High plausibility means fewer flaws are noticed.</div>
            <div><span className="text-foreground font-semibold">Adhesion</span> — Your ability to grapple and consume prey that comes close enough.</div>
            <div><span className="text-foreground font-semibold">Patience</span> — Your ability to remain perfectly still. Failing patience checks raises suspicion.</div>
            <div><span className="text-foreground font-semibold">Allure</span> — How attractive your current form and appearance is to nearby adventurers.</div>
            <div><span className="text-foreground font-semibold">Assimilation Points (AP)</span> — Gained by consuming adventurers. Spent to evolve your mimic.</div>
            <div><span className="text-foreground font-semibold">Global Suspicion</span> — If this reaches 10, the party hunts you. Keep it low through patience and deception.</div>
            <div><span className="text-foreground font-semibold">Mass Decay</span> — If you don't feed for 3+ days in real time, your mass shrinks (1 point per 3 days). Return and hunt regularly.</div>
            <div><span className="text-foreground font-semibold">Rival Mimics</span> — Rare encounters (Standard tier+) where another mimic has invaded your ground. Track it through cryptic disappearances and consume it for a major AP bonus.</div>
          </div>
        </Collapsible>
        <Collapsible title="Turn Structure">
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            You may perform 1 of 5 actions at a time.
            <li><span className="text-foreground">Relocate</span> — Slip to an adjacent empty room (+1 suspicion). Triggers a stealth check against anyone in the target room. Counts toward the action limit.</li>
            <li><span className="text-foreground">Lure</span> — Attempt to attract adventurers within range (1 room, or 2 at high Allure). Success pulls them into your room. Counts toward the action limit.</li>
            <li><span className="text-foreground">Strike!</span> — Snap at an attracted adventurer or a revealed Rival Mimic. Success consumes them. <span className="text-foreground">Resets the action counter.</span></li>
            <li><span className="text-foreground">Wait</span> — Patience check to reduce suspicion. Adventurers and small creatures wander. Counts toward the action limit.</li>
            <li><span className="text-foreground">Consume Creatures</span> — Small creatures in your room can be snapped up for quick AP. Resets the action counter and the mass decay timer.</li>
          </ol>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground list-inside">
            These do not count as an action and can be performed at any time.
            <li>• <span className="text-foreground">Change Form</span> — Shift to a different prepared form (+1 suspicion).</li>
            <li>• <span className="text-foreground">Change Appearance</span> — Adjust surface appearance.</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">⏳ After <span className="text-foreground">50 actions</span> without a Strike, the party gives up and leaves — ending the hunt automatically.</p>
        </Collapsible>
        <Collapsible title="Dice System">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>All checks use only <span className="text-foreground font-bold">d6</span> dice. Your stat determines how many dice you roll.</p>
            <p>Checks are opposed: mimic rolls vs. adventurer rolls. Mimic wins on a tie.</p>
            <p>Example: Plausibility 3 vs. Discipline 2 → roll 3d6 vs 2d6. Higher total wins.</p>
          </div>
        </Collapsible>
      </div>
  );
}
