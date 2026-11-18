import { useState } from "react";
import { HOLIDAYS, seasonRange, creatureEmoji, type HuntLocation, type LocationKnowledge } from "@/data/gameData";
import RoomMap, { MysteryMap } from "@/components/game/RoomMap";
import { ChevronDown, ChevronRight } from "lucide-react";

interface LocationCardProps {
  location: HuntLocation;
  knowledge: LocationKnowledge;
  hunts: number;
}

/**
 * A hunting ground in the Codex. Unknown ones are just "???". Known ones show their name and
 * description, and open to show the rest; the floor plan stays fogged until you've hunted there.
 */
export default function LocationCard({ location: loc, knowledge, hunts }: LocationCardProps) {
  const [open, setOpen] = useState(false);
  if (knowledge === "unknown") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-4">
        <p className="font-cinzel text-base text-muted-foreground/60">???</p>
        <p className="text-xs text-muted-foreground/50 italic mt-1">
          {loc.holiday ? "It only opens in its season, and this isn't it." : "You haven't found this place yet."}
        </p>
      </div>
    );
  }
  const visited = knowledge === "visited";
  return (
    <div className={`rounded-lg border bg-card overflow-hidden transition-colors ${open ? "border-primary/40" : "border-border"}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full px-4 py-4 flex items-start justify-between gap-3 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-cinzel text-base text-foreground">{loc.name}</span>
            {loc.holiday ? (
              <span data-holiday={loc.holiday} className="holiday-badge text-[11px]">
                {HOLIDAYS[loc.holiday].icon} {HOLIDAYS[loc.holiday].name} · {seasonRange(loc.holiday)} · all tiers
              </span>
            ) : (
              <span className="text-[11px] px-1.5 py-0.5 rounded border border-orange-400/40 text-orange-400 bg-orange-400/5">
                {loc.minTier}+{loc.minMass ? ` · Mass ${loc.minMass}+` : ""}
              </span>
            )}
            <span className={`text-[11px] ${visited ? "text-primary" : "text-muted-foreground/70 italic"}`}>
              {visited ? `Hunted ${hunts} ${hunts === 1 ? 'time' : 'times'}` : "Not yet hunted"}
            </span>
          </span>
          <span className="block text-sm text-muted-foreground mt-1">{loc.description}</span>
        </span>
        {open ? <ChevronDown className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Floor Plan</p>
            {visited ? <RoomMap location={loc} /> : <MysteryMap />}
          </div>
          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground italic flavor-text">{loc.flavorText}</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Party size:</span> <span className="text-foreground">{loc.partySize[0]}–{loc.partySize[1]}</span></div>
              {visited && loc.sinkingTurns && (
                <div className="flex justify-between"><span className="text-muted-foreground">Sinks after:</span> <span className="text-foreground">{loc.sinkingTurns} turns</span></div>
              )}
              {visited && loc.snowbound && (
                <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Snowbound:</span> <span className="text-foreground text-right">Nobody can leave, and the cold freezes them one by one</span></div>
              )}
              {visited && loc.procession && (
                <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Door to door:</span> <span className="text-foreground text-right">The crowd walks the loop of houses, knocking; answer with a sweet, or get pranked</span></div>
              )}
              {visited && loc.costumes && (
                <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Costumes:</span> <span className="text-foreground text-right">Nobody knows who's under the mask until you eat them</span></div>
              )}
              {visited && loc.fireworks && (
                <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Fireworks:</span> <span className="text-foreground text-right">Every {loc.fireworks.every} turns: anyone below can be struck unseen, but crates get opened</span></div>
              )}
              {visited && loc.starfall && (
                <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Starfall:</span> <span className="text-foreground text-right">Every {loc.starfall.every} turns a star lands, and the party runs for it</span></div>
              )}
              {visited && loc.rivalNest && (
                <div className="flex justify-between"><span className="text-muted-foreground">Rival mimics:</span> <span className="text-foreground">{loc.rivalNest[0]}–{loc.rivalNest[1]}, one of them the Elder</span></div>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Forms at Home Here</p>
              <div className="flex flex-wrap gap-1">
                {loc.advantageTags.map(tag => (
                  <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/5">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Creatures of Opportunity</p>
              {visited ? (
                <div className="flex flex-wrap gap-1">
                  {loc.locationCreatures.map(c => (
                    <span key={c.id} title={c.description} className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {creatureEmoji(c.name)} {c.name} <span className="text-primary">+{c.ap}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground/70 italic">Hunt here to learn what scurries about.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
