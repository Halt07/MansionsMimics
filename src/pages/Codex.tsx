import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { ChevronDown, Home } from "lucide-react";
import OverviewSection from "@/components/game/codex/OverviewSection";
import TiersSection from "@/components/game/codex/TiersSection";
import FormsSection from "@/components/game/codex/FormsSection";
import MaterialsSection from "@/components/game/codex/MaterialsSection";
import TraitsSection from "@/components/game/codex/TraitsSection";
import AdventurersSection from "@/components/game/codex/AdventurersSection";
import LocationsSection from "@/components/game/codex/LocationsSection";
import MechanicsSection from "@/components/game/codex/MechanicsSection";
import type { CodexReader } from "@/components/game/codex/CodexReader";

/** The Codex's "whose discoveries" choice: a mimic id, or this for everything all mimics know. */
const ALL_MIMICS = "all";
const CODEX_VIEWING_KEY = "codex.viewing";

const SECTIONS = ["Overview", "Tiers", "Forms", "Materials", "Traits", "Adventurers", "Locations", "Mechanics"] as const;
type Section = (typeof SECTIONS)[number];

export default function Codex() {
  const [activeSection, setActiveSection] = useState<Section>("Overview");
  // The Codex only reveals what's been discovered (adventurers met and eaten, places found and
  // hunted; see src/data/codex.ts). The pill next to the title picks whose discoveries to show:
  // one mimic, or everything all of them know.
  // Opening the Codex from a hunt (?characterId=) picks that mimic; otherwise the last choice is kept.
  const [characters, setCharacters] = useState<MimicCharacter[]>([]);
  const [viewing, setViewing] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("characterId");
    if (fromUrl) return fromUrl;
    try { return localStorage.getItem(CODEX_VIEWING_KEY) ?? ALL_MIMICS; } catch { return ALL_MIMICS; }
  });
  useEffect(() => {
    db.entities.MimicCharacter.list("-updated_date")
      .then(setCharacters)
      .catch(err => console.error("Failed to load mimics for the Codex:", err));
  }, []);
  const chooseViewing = (id: string) => {
    setViewing(id);
    try { localStorage.setItem(CODEX_VIEWING_KEY, id); } catch { /* storage unavailable: just don't remember */ }
  };
  const viewedMimic = characters.find(c => c.id === viewing) ?? null;
  // An unknown id (e.g. a deleted mimic) falls back to all mimics
  const reader: CodexReader = { viewedMimic, knowers: viewedMimic ? [viewedMimic] : characters };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 px-4 py-3 flex items-center gap-3">
        <Link to={createPageUrl("Home")} className="text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="font-cinzel text-foreground text-sm">The Codex of Forms</h1>
        {characters.length > 0 && (
          <label className="relative inline-flex items-center" title="Whose discoveries the Codex shows">
            <span className="sr-only">Show the Codex as known by</span>
            <select
              value={viewedMimic ? viewedMimic.id : ALL_MIMICS}
              onChange={(e) => chooseViewing(e.target.value)}
              className="appearance-none cursor-pointer rounded-full border border-primary/30 bg-primary/5 py-1 pl-3 pr-7 text-xs font-cinzel text-primary hover:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value={ALL_MIMICS}>All mimics</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.tier}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 w-3 h-3 text-primary" />
          </label>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="md:w-48 shrink-0">
          <div className="space-y-1">
            {SECTIONS.map((s) =>
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`w-full text-left px-3 py-2 rounded text-sm font-cinzel transition-colors ${
              activeSection === s ?
              "bg-primary/10 text-primary" :
              "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`
              }>

                {s}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {activeSection === "Overview" && <OverviewSection />}
          {activeSection === "Tiers" && <TiersSection />}
          {activeSection === "Forms" && <FormsSection />}
          {activeSection === "Materials" && <MaterialsSection />}
          {activeSection === "Traits" && <TraitsSection />}
          {activeSection === "Adventurers" && <AdventurersSection {...reader} />}
          {activeSection === "Locations" && <LocationsSection {...reader} />}
          {activeSection === "Mechanics" && <MechanicsSection />}

        </div>
      </div>
    </div>);

}
