import { useState } from "react";

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  /** Tailwind background class for the bar. */
  color?: string;
  /** Total penalty (mass + form tier + sickness). */
  penalty?: number;
  /** Tooltip text for the sickness part of the penalty. */
  penaltyLabel?: string | null;
  massPenalty?: number;
  formPenalty?: number;
  formPenaltyNote?: string | null;
}

export default function StatBar({
  label, value, max = 6, color = "bg-green-500", penalty = 0, penaltyLabel = null,
  massPenalty = 0, formPenalty = 0, formPenaltyNote = null,
}: StatBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const effectiveValue = Math.max(0, value - penalty);
  // Split penalty into mass, form-tier and sickness portions for separate coloring
  const sicknessPenalty = penalty - massPenalty - formPenalty;

  // The whole row (label, value and bar) is the hover target; the bar alone is only 6px tall.
  // The tooltip must live outside the bar, whose overflow-hidden (for the rounded segments)
  // would otherwise clip it out of view.
  return (
    <div
      className={`relative space-y-1 ${penalty > 0 ? "cursor-help" : ""}`}
      onMouseEnter={() => penalty > 0 && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-cinzel tracking-wide uppercase text-[11px]">{label}</span>
        <span className={`font-bold ${penalty > 0 ? "text-red-400" : "text-foreground"}`}>
          {penalty > 0 ? `${effectiveValue} (${value}-${penalty})` : `${value}/${max}`}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
        {/* Normal (effective) portion */}
        <div
          className={`h-full ${color} rounded-l-full transition-all duration-500`}
          style={{ width: `${(effectiveValue / max) * 100}%` }}
        />
        {/* Mass penalty portion — red */}
        {massPenalty > 0 && (
          <div
            className="h-full bg-red-500/70 transition-all duration-500"
            style={{ width: `${(massPenalty / max) * 100}%` }}
          />
        )}
        {/* Form-tier penalty portion — sky blue */}
        {formPenalty > 0 && (
          <div
            className="h-full bg-sky-500/70 transition-all duration-500"
            style={{ width: `${(formPenalty / max) * 100}%` }}
          />
        )}
        {/* Sickness penalty portion — amber/orange */}
        {sicknessPenalty > 0 && (
          <div
            className="h-full bg-amber-500/70 transition-all duration-500"
            style={{ width: `${(sicknessPenalty / max) * 100}%` }}
          />
        )}
      </div>
      {/* Tooltip */}
      {showTooltip && penalty > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 w-52 bg-card border border-border rounded px-2 py-1.5 text-[11px] text-muted-foreground pointer-events-none shadow-lg">
          {massPenalty > 0 && (
            <>
              <span className="text-red-400 font-bold">–{massPenalty} mass penalty</span>
              <br />Your mass is below your tier's minimum. Hunt and feed to restore it.
            </>
          )}
          {formPenalty > 0 && (
            <>
              {massPenalty > 0 && <br />}
              <span className="text-sky-400 font-bold">–{formPenalty} form tier</span>
              <br />{formPenaltyNote || "Your active form is from a different tier."}
            </>
          )}
          {sicknessPenalty > 0 && (
            <>
              {(massPenalty > 0 || formPenalty > 0) && <br />}
              <span className="text-amber-400 font-bold">{penaltyLabel || `–${sicknessPenalty} sickness`}</span>
              <br />This penalty lasts the current hunt only.
            </>
          )}
        </div>
      )}
    </div>
  );
}