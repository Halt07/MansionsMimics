import { TIER_ORDER, TIER_CONFIG, STARTING_STATS, STARTING_TYPES } from "@/data/gameData";
import { ChompCard } from "@/components/game/CardChomp";
import { CardContent } from "@/components/ui/card";
import Collapsible from "./Collapsible";

/** Each tier of mimic, and how the two starting types compare. */
export default function TiersSection() {
  return (
    <div className="space-y-4">
        <h2 className="font-cinzel text-2xl text-foreground mb-4">Mimic Tiers</h2>
        <div className="space-y-3">
          {TIER_ORDER.map((tier) => {
          const cfg = TIER_CONFIG[tier];
          return (
            <ChompCard key={tier} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-cinzel text-lg text-foreground">{tier} Mimic</h3>
                      <p className="text-xs text-muted-foreground">{cfg.description}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Mass: {cfg.massRange[0]}–{cfg.massRange[1]}</div>
                      <div>AP to evolve: {cfg.apToEvolve >= 999 ? "—" : cfg.apToEvolve}</div>
                    </div>
                  </div>
                  <p className="flavor-text text-sm text-muted-foreground italic">{cfg.lore}</p>
                </CardContent>
              </ChompCard>);

        })}
        </div>
        <Collapsible title="Starting Type Tradeoffs">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {STARTING_TYPES.map((type) => {
            const s = STARTING_STATS[type];
            return (
              <div key={type}>
                  <h4 className="font-cinzel text-foreground mb-2">{type} Origin</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Plausibility: <span className="text-foreground">{s.plausibility}</span></div>
                    <div>Adhesion: <span className="text-foreground">{s.adhesion}</span></div>
                    <div>Patience: <span className="text-foreground">{s.patience}</span></div>
                    <div>Mass: <span className="text-foreground">{s.mass}</span></div>
                    <div>Digest Capacity: <span className="text-foreground">{s.digestiveCapacity}</span></div>
                  </div>
                </div>);

          })}
          </div>
        </Collapsible>
      </div>
  );
}
