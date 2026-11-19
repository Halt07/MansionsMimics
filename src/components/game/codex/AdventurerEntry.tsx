import {
  BEHAVIORS, LOCATIONS, isHiddenBehavior, type AdventurerTemplate, type DiscoveryLevel,
} from "@/data/gameData";

const locationName = (id: string) => LOCATIONS.find((l) => l.id === id)?.name ?? id;

/** An adventurer's Codex title: "???" until met, then its name and type (✦ if it may bring a companion). */
export function AdventurerTitle({ adv, level }: { adv: AdventurerTemplate; level: DiscoveryLevel }) {
  return (
    <>
      {level === "unknown" ? "???" : `${adv.name} (${adv.type})${adv.companion ? " ✦" : ""}`}
      {adv.minTier && (
        <span className="ml-2 align-middle text-[11px] font-sans px-1.5 py-0.5 rounded border border-orange-400/40 text-orange-400 bg-orange-400/5">
          {adv.minTier}+{level !== "unknown" && adv.minMass ? ` · Mass ${adv.minMass}+` : ""}{level !== "unknown" && adv.wholeMealMass ? ` · Consumed whole at ${adv.wholeMealMass}` : ""}
        </span>
      )}
    </>
  );
}

/**
 * What the Codex says about one adventurer, by how well the mimics know it: a rumor where it
 * might be found (unknown), its stats, senses, quirks and instinct (met), and what it craves
 * and what puts it off (eaten). Hidden behaviors are never shown.
 */
export default function AdventurerEntry({ adv, level }: { adv: AdventurerTemplate; level: DiscoveryLevel }) {
  if (level === "unknown") {
    return (
      <p className="text-xs text-muted-foreground italic">
        You haven't crossed paths with this one yet.{" "}
        {adv.locations
          ? `Rumors place it in ${adv.locations.map((id) => locationName(id)).join(" or ")}.`
          : adv.minTier ? `It isn't seen by mimics below ${adv.minTier} tier.` : "Keep hunting."}
      </p>
    );
  }
  return (
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
        ) : (
          <>
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
          </>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Perception Strengths</p>
        <div className="space-y-1 text-xs">
          {Object.entries(adv.perceptionAffinity)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([key, val]) =>
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
  );
}
