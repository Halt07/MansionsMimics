import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MoveRight, RefreshCw, Shield, Zap } from "lucide-react";
import KeyHint from "../KeyHint";

interface ActionBarProps {
  canRelocate: boolean;
  canLure: boolean;
  canStrike: boolean;
  canWait: boolean;
  onRelocate: () => void;
  onLure: () => void;
  onStrike: () => void;
  onWait: () => void;
}

interface ActionProps {
  hint: string;
  icon: ReactNode;
  label: string;
  detail: string;
  /** Extra classes for the detail line (Strike's is red, the rest are muted). */
  detailClass?: string;
  className: string;
  variant: "outline" | "ghost";
  disabled: boolean;
  onClick: () => void;
}

function Action({ hint, icon, label, detail, detailClass = "text-muted-foreground", className, variant, disabled, onClick }: ActionProps) {
  return (
    <Button onClick={onClick} disabled={disabled} variant={variant} className={`relative h-auto py-2 lg:py-3 flex-col gap-1 ${className}`}>
      <KeyHint k={hint} className="absolute top-1 right-1" />
      {icon}
      <span className="text-xs font-cinzel">{label}</span>
      <span className={`hidden lg:inline text-[11px] ${detailClass}`}>{detail}</span>
    </Button>
  );
}

/** The four hunt actions: a bar fixed to the bottom of the screen below lg, a 2×2 grid above. */
export default function ActionBar(p: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
      <div className="h-1 bg-muted lg:hidden" aria-hidden><div className="action-bar-suspicion h-full" /></div>
      <div className="grid grid-cols-4 gap-2 p-2 lg:grid-cols-2 lg:gap-3 lg:p-0">
        <Action hint="R" label="Relocate" detail="Slip to empty room" onClick={p.onRelocate} disabled={!p.canRelocate}
          icon={<MoveRight className="w-5 h-5 text-muted-foreground" />} variant="outline"
          className="border-border hover:border-blue-400/30 hover:text-blue-400" />
        <Action hint="L" label="Lure" detail="Attract adventurers" onClick={p.onLure} disabled={!p.canLure}
          icon={<Zap className="w-5 h-5 text-yellow-400/70" />} variant="outline"
          className="border-border hover:border-yellow-400/30 hover:text-yellow-400" />
        <Action hint="S" label="Strike!" detail="Consume attracted prey" detailClass="" onClick={p.onStrike} disabled={!p.canStrike}
          icon={<Shield className="w-5 h-5" />} variant="ghost"
          className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30" />
        <Action hint="W" label="Wait" detail="Rest & reduce suspicion" onClick={p.onWait} disabled={!p.canWait}
          icon={<RefreshCw className="w-5 h-5 text-muted-foreground" />} variant="outline"
          className="border-border hover:border-purple-400/30" />
      </div>
    </div>
  );
}
