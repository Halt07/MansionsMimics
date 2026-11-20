import { useState } from "react";
import { ADVENTURER_GROUPS, ADVENTURER_TEMPLATES, codexAdventurers, pooledDiscoveries, discoveryLevel } from "@/data/gameData";
import Collapsible from "./Collapsible";
import AdventurerEntry, { AdventurerTitle } from "./AdventurerEntry";
import type { CodexReader } from "./CodexReader";

/** Every adventurer, described once met and fully once eaten (by whoever the Codex is reading for). */
export default function AdventurersSection({ viewedMimic, knowers }: CodexReader) {
  // Adventurers are only described once a mimic has met them (see codex.ts)
  const savedDiscoveries = pooledDiscoveries(knowers);
  // DEV ONLY (achievement-preview branch): show every adventurer as if eaten, the hidden ones
  // (Beyond the Apex) included. Display only — nothing is saved.
  const [revealAll, setRevealAll] = useState(false);
  const allNames = new Set(ADVENTURER_TEMPLATES.map(a => a.name));
  const discoveries = revealAll ? { met: allNames, eaten: allNames } : savedDiscoveries;
  const listed = codexAdventurers(discoveries);
  const metCount = listed.filter(a => discoveryLevel(discoveries, a.name) !== "unknown").length;
  const eatenCount = listed.filter(a => discoveryLevel(discoveries, a.name) === "eaten").length;
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
        Met {metCount}/{listed.length} · Eaten {eatenCount}/{listed.length}
      </p>
      {import.meta.env.DEV && (
        <button onClick={() => setRevealAll(r => !r)} className="w-full mb-2 text-[10px] px-3 py-1.5 rounded border border-dashed border-amber-400/40 text-amber-400/80 hover:text-amber-400">
          🛠 Dev: {revealAll ? "show only what my mimics have discovered" : "reveal all adventurers (not saved)"}
        </button>
      )}
      {ADVENTURER_GROUPS.map((group, groupIndex) => {
        const members = listed.filter((adv) => adv.group === group.id);
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
                  <Collapsible key={adv.name} title={<AdventurerTitle adv={adv} level={level} />}>
                    <AdventurerEntry adv={adv} level={level} />
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
