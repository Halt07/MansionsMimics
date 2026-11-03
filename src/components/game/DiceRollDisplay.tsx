import { useState, useEffect } from "react";

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
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (animate) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 200);
      return () => clearTimeout(t);
    }
  }, [rolls, animate]);

  if (!rolls || rolls.length === 0) return null;

  return (
    <div className={`transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
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