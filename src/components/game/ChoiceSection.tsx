import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One toggle in a ChoiceSection. */
export interface Choice {
  key: string;
  label: ReactNode;
  /** Chosen (worn). */
  on: boolean;
  /** Can't be chosen right now; the reason shows on hover. Clicking does nothing. */
  blocked?: string;
  /** Hover text when it isn't blocked (e.g. what a magic material does). */
  title?: string;
  /** Magic materials are purple (and a muted purple when capped, rather than faded). */
  tone?: "plain" | "magic";
  onToggle: () => void;
}

const SIZES = {
  /** In a panel (the appearance editor). */
  sm: { heading: "text-[11px] tracking-widest mb-1.5", row: "gap-1.5", button: "px-2.5 py-1 text-xs" },
  /** On its own page, with more room (character creation). */
  md: { heading: "text-xs tracking-wide mb-2", row: "gap-2", button: "px-3 py-1.5 text-sm bg-card" },
} as const;

function look({ on, blocked, tone = "plain" }: Choice): string {
  const magic = tone === "magic";
  if (on) return magic ? "border-purple-400 bg-purple-400/10 text-purple-400" : "border-primary bg-primary/10 text-primary";
  // A capped magic material stays (muted) purple, so it still reads as magic; anything else fades
  if (blocked) return magic ? "border-purple-400/15 bg-purple-400/5 text-purple-300/35 cursor-not-allowed" : "border-border text-muted-foreground opacity-30 cursor-not-allowed";
  return magic ? "border-purple-400/30 text-purple-400/70 hover:border-purple-400/60" : "border-border text-muted-foreground hover:border-primary/30";
}

/**
 * A heading and a row of toggles: the materials or traits a mimic can wear in one slot. Each
 * says whether it's chosen (to screen readers too), and one that can't be chosen says why on
 * hover (aria-disabled rather than disabled, so the hover text still shows in every browser).
 * `empty` shows when there's nothing to choose yet.
 */
export default function ChoiceSection({ heading, choices, empty, size = "sm" }: {
  heading: ReactNode;
  choices: readonly Choice[];
  empty?: ReactNode;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <div>
      <p className={cn("font-cinzel text-muted-foreground uppercase", s.heading)}>{heading}</p>
      <div className={cn("flex flex-wrap", s.row)}>
        {choices.length === 0 && empty && <span className="text-muted-foreground italic">{empty}</span>}
        {choices.map(choice => (
          <button
            key={choice.key}
            type="button"
            title={choice.blocked ?? choice.title}
            aria-pressed={choice.on}
            aria-disabled={choice.blocked ? true : undefined}
            onClick={() => { if (!choice.blocked) choice.onToggle(); }}
            className={cn("rounded border transition-all", s.button, look(choice))}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
