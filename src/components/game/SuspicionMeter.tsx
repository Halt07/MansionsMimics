import { AlertTriangle, Eye } from "lucide-react";

const LEVELS = [
  { label: "Unsuspecting", color: "text-green-400", bg: "bg-green-400" },
  { label: "Curious", color: "text-yellow-400", bg: "bg-yellow-400" },
  { label: "Wary", color: "text-orange-400", bg: "bg-orange-400" },
  { label: "Alert", color: "text-red-400", bg: "bg-red-400" },
  { label: "HUNT MODE", color: "text-red-600", bg: "bg-red-600" },
];

interface SuspicionMeterProps {
  value: number;
  max?: number;
  label?: string;
}

export default function SuspicionMeter({ value, max = 10, label = "Global Suspicion" }: SuspicionMeterProps) {
  const levelIndex = Math.min(Math.floor((value / max) * LEVELS.length), LEVELS.length - 1);
  const level = LEVELS[levelIndex];
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <Eye className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground font-cinzel tracking-wide uppercase text-[10px]">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {value >= 7 && <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />}
          <span className={`text-xs font-bold ${level.color}`}>{level.label}</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${level.bg} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span>{value}/{max}</span>
        <span>10</span>
      </div>
    </div>
  );
}