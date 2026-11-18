import { useState } from "react";
import {
  ADVENTURER_TEMPLATES, ADVENTURER_GROUPS, BEHAVIORS, isHiddenBehavior, LOCATIONS, pooledDiscoveries,
  discoveryLevel,
} from "@/data/gameData";
import Collapsible from "./Collapsible";
import type { CodexReader } from "./CodexReader";

/** Every adventurer, described once met and fully once eaten (by whoever the Codex is reading for). */
export default function AdventurersSection({ viewedMimic, knowers }: CodexReader) {
  // Adventurers are only described once a mimic has met them (see codex.ts)
  const savedDiscoveries = pooledDiscoveries(knowers);
  // DEV ONLY (achievement-preview branch): show every adventurer as if eaten. Display only — nothing is saved.
  const [revealAll, setRevealAll] = useState(false);
  const allNames = new Set(ADVENTURER_TEMPLATES.map(a => a.name));
  const discoveries = revealAll ? { met: allNames, eaten: allNames } : savedDiscoveries;
  const metCount = ADVENTURER_TEMPLATES.filter(a => discoveryLevel(discoveries, a.name) !== "unknown").length;
  const eatenCount = ADVENTURER_TEMPLATES.filter(a => discoveryLevel(discoveries, a.name) === "eaten").length;
  const locationName = (id: string) => LOCATIONS.find((l) => l.id === id)?.name ?? id;
  return (
    <div className="space-y-4">
        <h2 className="font-cinzel text-2xl text-foreground mb-4">Adventurer Templates</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Parties are randomly assembled from these templates. Each adventurer has unique perception affinities and luring preferences. Entries marked <span className="text-primary">✦</span> may bring a companion.
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          The Codex only knows what {viewedMimic ? <span className="text-foreground">{viewedMimic.name}</span> : "your mimics"} {viewedMimic ? "has" : "have"} learned: an adventurer is described once {viewedMimic ? "it has" : "one of them has"} <span className="text-foreground">met</span> one in a hunt, and what it craves and despises is revealed once {viewedMimic ? "it has" : "one has"} <span className="text-foreground">eaten</span> one. Switch whose knowledge you're reading with the pill at the top.
        </p>
        <p className="text-xs font-cinzel text-primary mb-2">
          Met {metCount}/{ADVENTURER_TEMPLATES.length} · Eaten {eatenCount}/{ADVENTURER_TEMPLATES.length}
        </p>
        {import.meta.env.DEV && (
          <button onClick={() => setRevealAll(r => !r)} className="w-full mb-2 text-[10px] px-3 py-1.5 rounded border border-dashed border-amber-400/40 text-amber-400/80 hover:text-amber-400">
            🛠 Dev: {revealAll ? "show only what my mimics have discovered" : "reveal all adventurers (not saved)"}
          </button>
        )}
        {ADVENTURER_GROUPS.map((group, groupIndex) => {
          const members = ADVENTURER_TEMPLATES.filter((adv) => adv.group === group.id);
          if (members.length === 0) return null;
          return (
        <Collapsible
          key={group.id}
          title={`${group.label} (${members.filter(a => discoveryLevel(discoveries, a.name) !== "unknown").length}/${members.length})`}
          subtitle={group.description}
          defaultOpen={groupIndex === 0}>
          <div className="space-y-2">
        {members.map((adv) => {
          const level = discoveryLevel(discoveries, adv.name);
          return (
      <Collapsible key={adv.name} title={<>
          {level === "unknown" ? "???" : `${adv.name} (${adv.type})${adv.companion ? " ✦" : ""}`}
          {adv.minTier && (
            <span className="ml-2 align-middle text-[11px] font-sans px-1.5 py-0.5 rounded border border-orange-400/40 text-orange-400 bg-orange-400/5">
              {adv.minTier}+{level !== "unknown" && adv.minMass ? ` · Mass ${adv.minMass}+` : ""}{level !== "unknown" && adv.wholeMealMass ? ` · Consumed whole at ${adv.wholeMealMass}` : ""}
            </span>
          )}
        </>}>
            {level === "unknown" ? (
              <p className="text-xs text-muted-foreground italic">
                You haven't crossed paths with this one yet.{" "}
                {adv.locations
                  ? `Rumors place it in ${adv.locations.map((id) => locationName(id)).join(" or ")}.`
                  : adv.minTier ? `It isn't seen by mimics below ${adv.minTier} tier.` : "Keep hunting."}
              </p>
            ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Base Stats</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Discipline:</span> <span className="text-foreground">{adv.discipline}d6</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Base Suspicion:</span> <span className="text-foreground">{adv.baseSuspicion}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Interaction:</span> <span className="text-foreground capitalize">{adv.interactionStyle}</span></div>
                </div>
                {level !== "eaten" ? (
                  <p className="text-xs text-muted-foreground/70 italic mt-3">Eat one to learn what it craves — and what puts it off.</p>
                ) : (<>
                <p className="text-xs text-muted-foreground mt-3 mb-1">Attracted To</p>
                <div className="flex flex-wrap gap-1">
                  {[...adv.alluringQualities.materials, ...adv.alluringQualities.traits, ...adv.alluringQualities.tags].map((q) =>
              <span key={q} className="text-[11px] px-1.5 py-0.5 rounded border border-yellow-400/30 text-yellow-400 bg-yellow-400/5">{q}</span>
              )}
                </div>
                {adv.repelledBy && (
                  <>
                    <p className="text-xs text-muted-foreground mt-3 mb-1">Put Off By</p>
                    <div className="flex flex-wrap gap-1">
                      {[...(adv.repelledBy.materials || []), ...(adv.repelledBy.traits || []), ...(adv.repelledBy.tags || [])].map((q) =>
                        <span key={q} className="text-[11px] px-1.5 py-0.5 rounded border border-red-400/30 text-red-400 bg-red-400/5">{q}</span>
                      )}
                    </div>
                  </>
                )}
                </>)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Perception Strengths</p>
                <div className="space-y-1 text-xs">
                  {Object.entries(adv.perceptionAffinity).
              filter(([, v]) => v > 0).
              sort(([, a], [, b]) => b - a).
              map(([key, val]) =>
              <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <span className={val >= 2 ? "text-red-400" : "text-orange-400"}>+{val}</span>
                      </div>
              )}
                </div>
                <p className="text-xs text-muted-foreground mt-3 mb-1">Quirks</p>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {adv.quirks.map((q) => <li key={q}>• {q}</li>)}
                </ul>
                {adv.behavior && !isHiddenBehavior(adv.behavior) && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Instinct: <span className="text-purple-400">{BEHAVIORS[adv.behavior].label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{BEHAVIORS[adv.behavior].description}</p>
                  </div>
                )}
                {adv.locations && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Found Only In</p>
                    <p className="text-xs text-foreground">{adv.locations.map((id) => locationName(id)).join(", ")}</p>
                  </div>
                )}
                {adv.companion && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Companion ({Math.round(adv.companion.chance * 100)}% chance)</p>
                    <div className="flex flex-wrap gap-1">
                      {adv.companion.options.map((o, _i, opts) => {
                        const rare = (o.weight ?? 1) < Math.max(...opts.map(x => x.weight ?? 1));
                        return (
                          <span key={o.nameSuffix} title={o.description} className="text-[11px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/5">
                            {o.nameSuffix.replace("'s ", "")}{rare ? " (rare)" : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </Collapsible>
          );
        })}
          </div>
        </Collapsible>
          );
        })}
      </div>
  );
}
