import { codexLocations, LOCATION_GROUPS, locationGroup, locationHunts, locationKnowledge } from "@/data/gameData";
import LocationCard from "./LocationCard";
import type { CodexReader } from "./CodexReader";

/** Every hunting ground, grouped, revealed as it's found and mapped once hunted. */
export default function LocationsSection({ viewedMimic, knowers }: CodexReader) {
  const listed = codexLocations(knowers);
  const entries = listed.map(loc => ({ loc, knowledge: locationKnowledge(loc, knowers), hunts: locationHunts(loc, knowers) }));
  const found = entries.filter(e => e.knowledge !== "unknown").length;
  const mapped = entries.filter(e => e.knowledge === "visited").length;
  return (
    <div className="space-y-4">
      <h2 className="font-cinzel text-2xl text-foreground mb-4">Hunt Locations</h2>
      <p className="text-sm text-muted-foreground mb-2">
        Every hunting ground {viewedMimic ? <span className="text-foreground">{viewedMimic.name}</span> : "your mimics"} {viewedMimic ? "has" : "have"} found. A place shows up here once {viewedMimic ? "it is" : "one of them is"} big enough to hunt there (rare places, only after hunting in one), and its floor plan once {viewedMimic ? "it has" : "one has"} hunted there.
      </p>
      <p className="text-xs font-cinzel text-primary mb-2">
        Found {found}/{listed.length} · Mapped {mapped}/{listed.length}
      </p>
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
