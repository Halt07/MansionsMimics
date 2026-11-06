interface DiceRollDisplayProps {
  /** Individual die results, 1–6. */
  rolls: number[] | null | undefined;
  label: string;
  /** Tailwind text color class for the total. */
  color?: string;
  /** Fade the dice in each time the rolls change. */
  animate?: boolean;
}

/** Shows a set of d6 results and their total. Not used yet; kept for showing rolls in the hunt UI. */
export default function DiceRollDisplay({ rolls, label, color = "text-primary", animate = false }: DiceRollDisplayProps) {
  if (!rolls || rolls.length === 0) return null;

  // Keyed by the rolls, so a new roll remounts the element and replays the fade-in
  return (
    <div
      key={animate ? rolls.join(",") : undefined}
      className={animate ? "animate-in fade-in-0 slide-in-from-top-2 duration-300" : undefined}
    >
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {rolls.map((r, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded border flex items-center justify-center text-sm font-bold
              ${r === 6 ? "border-primary bg-primary/20 text-primary" :
                r === 1 ? "border-destructive/50 bg-destructive/10 text-destructive" :
                "border-border bg-muted text-foreground"}`}
          >
            {r}
          </div>
        ))}
        <span className={`text-sm font-bold ml-1 ${color}`}>
          = {rolls.reduce((a, b) => a + b, 0)}
        </span>
      </div>
    </div>
  );
}