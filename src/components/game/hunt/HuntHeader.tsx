import { Button } from "@/components/ui/button";
import { Layers, Palette, RefreshCw } from "lucide-react";
import { plural } from "@/data/gameData";
import { useHunt } from "./HuntContext";

interface HuntHeaderProps {
  /** New Hunt is disabled while a ceremony plays out. */
  canLeave: boolean;
  onNewHunt: () => void;
  onToggleForms: () => void;
  onToggleAppearance: () => void;
}

/** Top of the hunt: any bounty or sickness notice, where you are, New Hunt, and the form/appearance buttons. */
export default function HuntHeader({ canLeave, onNewHunt, onToggleForms, onToggleAppearance }: HuntHeaderProps) {
  const { location, character, mimicRoom, activeAdventurers, lureRange, isBountyHunt, sickness } = useHunt();
  return (
    <>
      {isBountyHunt && (
        <div className="p-3 bg-destructive/10 border border-destructive/40 rounded-lg">
          <p className="font-cinzel text-destructive text-sm font-bold mb-0.5">⚠ Bounty Hunt</p>
          <p className="text-xs text-destructive/80">
            A bounty has been placed on <span className="font-bold">{character.name}</span>. These hunters know your kind intimately — they will be extremely difficult to deceive.
          </p>
        </div>
      )}
      {sickness && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg">
          <p className="font-cinzel text-amber-400 text-sm font-bold mb-0.5">☠ {sickness.name}</p>
          <p className="text-xs text-amber-400/80 flavor-text italic mb-1">{sickness.flavorText}</p>
          <p className="text-xs text-amber-400/70">
            {Object.entries(sickness.penalties).map(([k, v]) => `–${v} ${k}`).join(" · ")} — this hunt only.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-cinzel text-xl text-foreground">{location?.name}</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">{activeAdventurers.length} {plural(activeAdventurers.length, "adventurer remains", "adventurers remain")}</p>
            {mimicRoom && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-primary/80 font-cinzel">You: {mimicRoom}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-yellow-400/70">Lure range: {lureRange} {plural(lureRange, "room")}</span>
              </>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onNewHunt} disabled={!canLeave} className="text-xs border-border gap-1">
          <RefreshCw className="w-3 h-3" /> New Hunt
        </Button>
      </div>

      {/* Form & Appearance quick-change */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onToggleForms} className="text-xs border-border gap-1 flex-1">
          <Layers className="w-3 h-3" /> Change Form
        </Button>
        <Button variant="outline" size="sm" onClick={onToggleAppearance} className="text-xs border-border gap-1 flex-1">
          <Palette className="w-3 h-3" /> Appearance
        </Button>
      </div>
    </>
  );
}
