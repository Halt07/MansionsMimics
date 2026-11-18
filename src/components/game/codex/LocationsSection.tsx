import { useState } from "react";
import { LOCATIONS, LOCATION_GROUPS, locationGroup, locationHunts, locationKnowledge, type LocationKnowledge } from "@/data/gameData";
import LocationCard from "./LocationCard";
import type { CodexReader } from "./CodexReader";

/** Every hunting ground, grouped, revealed as it's found and mapped once hunted. */
export default function LocationsSection({ viewedMimic, knowers }: CodexReader) {
  // DEV ONLY (achievement-preview branch): reveal every location (names and details), and/or every
  // map (as if hunted). Display only — nothing is saved.
  const [revealAll, setRevealAll] = useState(false);
  const [revealMaps, setRevealMaps] = useState(false);
  const devKnowledge = (saved: LocationKnowledge): LocationKnowledge =>
    revealMaps ? "visited" : revealAll && saved === "unknown" ? "known" : saved;
  const entries = LOCATIONS.map(loc => ({ loc, knowledge: devKnowledge(locationKnowledge(loc, knowers)), hunts: locationHunts(loc, knowers) }));
  const found = entries.filter(e => e.knowledge !== "unknown").length;
  const mapped = entries.filter(e => e.knowledge === "visited").length;
  return (
    <div className="space-y-4">
      <h2 className="font-cinzel text-2xl text-foreground mb-4">Hunt Locations</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Every hunting ground {viewedMimic ? <span className="text-foreground">{viewedMimic.name}</span> : "your mimics"} {viewedMimic ? "has" : "have"} found. A place shows up here once {viewedMimic ? "it is" : "one of them is"} big enough to hunt there (rare places, only after hunting in one), and its floor plan once {viewedMimic ? "it has" : "one has"} hunted there.
      </p>
      <p className="text-xs font-cinzel text-primary mb-2">
        Found {found}/{LOCATIONS.length} · Mapped {mapped}/{LOCATIONS.length}
      </p>
      {import.meta.env.DEV && (
        <div className="flex gap-2">
          <button onClick={() => setRevealAll(r => !r)} className="w-full mb-2 text-[10px] px-3 py-1.5 rounded border border-dashed border-amber-400/40 text-amber-400/80 hover:text-amber-400">
            🛠 Dev: {revealAll ? "hide undiscovered locations" : "reveal all locations (not saved)"}
          </button>
          <button onClick={() => setRevealMaps(r => !r)} className="w-full mb-2 text-[10px] px-3 py-1.5 rounded border border-dashed border-amber-400/40 text-amber-400/80 hover:text-amber-400">
            🛠 Dev: {revealMaps ? "hide unmapped floor plans" : "reveal all maps (not saved)"}
          </button>
        </div>
      )}
      {LOCATION_GROUPS.map(group => {
        const members = entries.filter(e => locationGroup(e.loc) === group.id);
        if (members.length === 0) return null;
        return (
          <section key={group.id} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 pt-2">
              <h3 className="font-cinzel text-sm uppercase tracking-widest text-foreground">{group.label}</h3>
              <span className="text-[11px] text-muted-foreground">{members.filter(e => e.knowledge !== "unknown").length}/{members.length} found</span>
            </div>
            <p className="text-xs text-muted-foreground">{group.description}</p>
            <div className="space-y-2">
              {members.map(e => <LocationCard key={e.loc.id} location={e.loc} knowledge={e.knowledge} hunts={e.hunts} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
