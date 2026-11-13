import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { db } from "@/api/db";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import {
  ALL_FORMS, TIER_ORDER, TIER_CONFIG, MASTER_FORMS, MATERIALS, MATERIAL_COLORS, TRAITS, UNLEARNED_TRAITS, APPEARANCE_LIMITS,
  ACHIEVEMENTS, ADVENTURER_TEMPLATES, ADVENTURER_GROUPS, BURN_HUNTS, BURN_SUSPICION, BEHAVIORS, isHiddenBehavior, LOCATIONS, MAGIC_EFFECTS, STARTING_STATS, STARTING_TYPES,
  ALL_STARTING_TRAITS, type StartingTrait, isMagicMaterial, pooledDiscoveries, discoveryLevel, type Discoveries, type Material, type MaterialRarity, type Tier, 
  ACTION_WARNING,
  ACTION_LIMIT, HOLIDAYS, SEASONAL_FORMS, activeHolidays, isInSeason, seasonEnd, today} from
"../components/game/gameData";
import HolidayBadge from "@/components/game/HolidayBadge";
import { ACHIEVEMENT_STYLES } from "@/components/game/Achievements";
import { ChompCard } from "@/components/game/CardChomp";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Home } from "lucide-react";

const LOCATION_NAMES = Object.fromEntries(LOCATIONS.map((l) => [l.id, l.name]));

/** The Codex's "whose discoveries" choice: a mimic id, or this for everything all mimics know. */
const ALL_MIMICS = "all";
const CODEX_VIEWING_KEY = "codex.viewing";

const SECTIONS = ["Overview", "Tiers", "Forms", "Materials", "Traits", "Adventurers", "Mechanics"] as const;
type Section = (typeof SECTIONS)[number];

// MATERIALS as typed [rarity, materials] pairs (Object.entries would lose the key types)
const MATERIAL_GROUPS = Object.entries(MATERIALS) as [MaterialRarity, readonly Material[]][];

interface CollapsibleProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

function Collapsible({ title, subtitle, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/40 transition-colors text-left">

        <span className="min-w-0">
          <span className="font-cinzel text-sm text-foreground">{title}</span>
          {subtitle && <span className="block text-xs text-muted-foreground mt-0.5">{subtitle}</span>}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 bg-card">{children}</div>}
    </div>);

}

export default function Codex() {
  const [activeSection, setActiveSection] = useState<Section>("Overview");
  // A tier, or "season": the seasonal forms in season right now (that tab only exists while a
  // holiday is on; out of season the forms stay a surprise)
  const [selectedTier, setSelectedTier] = useState<Tier | "season">("Minor");
  const season = activeHolidays(today())[0];
  const seasonForms = SEASONAL_FORMS
    .filter((f) => isInSeason(f.holiday, today()))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
  const codexForms = selectedTier === "season" ? seasonForms : MASTER_FORMS[selectedTier];
  // Adventurers are only described once a mimic has met them (see CODEX DISCOVERY). The pill
  // next to the title picks whose discoveries to show: one mimic, or everything all of them know.
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
  const savedDiscoveries: Discoveries = pooledDiscoveries(viewedMimic ? [viewedMimic] : characters);
  // DEV ONLY (achievement-preview branch): show every adventurer as if eaten. Display only — nothing is saved.
  const [revealAll, setRevealAll] = useState(false);
  const allNames = new Set(ADVENTURER_TEMPLATES.map(a => a.name));
  const discoveries: Discoveries = revealAll ? { met: allNames, eaten: allNames } : savedDiscoveries;
  const metCount = ADVENTURER_TEMPLATES.filter(a => discoveryLevel(discoveries, a.name) !== "unknown").length;
  const eatenCount = ADVENTURER_TEMPLATES.filter(a => discoveryLevel(discoveries, a.name) === "eaten").length;

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

          {activeSection === "Overview" &&
          <div className="space-y-4">
              <div>
                <h2 className="font-cinzel text-2xl text-foreground mb-2">Mansions & Mimics</h2>
                <p className="flavor-text text-muted-foreground italic text-lg mb-4">
                  "It was not a haunted house. It was a hungry one."
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                  In Mansions & Mimics, you play as a mimic — a shapeshifting ambush predator that disguises itself as objects, furniture, and even entire rooms to lure and consume adventurers. This is not a game of heroism. It is a game of patience, deception, and predatory evolution.
                </p>
              </div>
              <Collapsible title="Core Mechanics" defaultOpen>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div><span className="text-foreground font-semibold">Plausibility</span> — How convincingly you imitate an object. High plausibility means fewer flaws are noticed.</div>
                  <div><span className="text-foreground font-semibold">Adhesion</span> — Your ability to grapple and consume prey that comes close enough.</div>
                  <div><span className="text-foreground font-semibold">Patience</span> — Your ability to remain perfectly still. Failing patience checks raises suspicion.</div>
                  <div><span className="text-foreground font-semibold">Allure</span> — How attractive your current form and appearance is to nearby adventurers.</div>
                  <div><span className="text-foreground font-semibold">Assimilation Points (AP)</span> — Gained by consuming adventurers. Spent to evolve your mimic.</div>
                  <div><span className="text-foreground font-semibold">Global Suspicion</span> — If this reaches 10, the party hunts you. Keep it low through patience and deception.</div>
                  <div><span className="text-foreground font-semibold">Mass Decay</span> — If you don't feed for 3+ days in real time, your mass shrinks (1 point per 3 days). Return and hunt regularly.</div>
                  <div><span className="text-foreground font-semibold">Rival Mimics</span> — Rare encounters (Standard tier+) where another mimic has invaded your ground. Track it through cryptic disappearances and consume it for a major AP bonus.</div>
                </div>
              </Collapsible>
              <Collapsible title="Turn Structure">
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  You may perform 1 of 5 actions at a time.
                  <li><span className="text-foreground">Relocate</span> — Slip to an adjacent empty room (+1 suspicion). Triggers a stealth check against anyone in the target room. Counts toward the action limit.</li>
                  <li><span className="text-foreground">Lure</span> — Attempt to attract adventurers within range (1 room, or 2 at high Allure). Success pulls them into your room. Counts toward the action limit.</li>
                  <li><span className="text-foreground">Strike!</span> — Snap at an attracted adventurer or a revealed Rival Mimic. Success consumes them. <span className="text-foreground">Resets the action counter.</span></li>
                  <li><span className="text-foreground">Wait</span> — Patience check to reduce suspicion. Adventurers and small creatures wander. Counts toward the action limit.</li>
                  <li><span className="text-foreground">Consume Creatures</span> — Small creatures in your room can be snapped up for quick AP. Resets the action counter and the mass decay timer.</li>
                </ol>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground list-inside">
                  These do not count as an action and can be performed at any time.
                  <li>• <span className="text-foreground">Change Form</span> — Shift to a different prepared form (+1 suspicion).</li>
                  <li>• <span className="text-foreground">Change Appearance</span> — Adjust surface appearance.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">⏳ After <span className="text-foreground">50 actions</span> without a Strike, the party gives up and leaves — ending the hunt automatically.</p>
              </Collapsible>
              <Collapsible title="Dice System">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>All checks use only <span className="text-foreground font-bold">d6</span> dice. Your stat determines how many dice you roll.</p>
                  <p>Checks are opposed: mimic rolls vs. adventurer rolls. Mimic wins on a tie.</p>
                  <p>Example: Plausibility 3 vs. Discipline 2 → roll 3d6 vs 2d6. Higher total wins.</p>
                </div>
              </Collapsible>
            </div>
          }

          {activeSection === "Tiers" &&
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
          }

          {activeSection === "Forms" &&
          <div>
              <h2 className="font-cinzel text-2xl text-foreground mb-2">Forms</h2>
              <p className="text-sm text-muted-foreground mb-3">
                A mimic can hold up to 3 forms at once. Forms must be within 1 tier of your current tier.
                Only 1 form may be from the tier above (–2 plausibility). A tier below penalizes patience (–1).
              </p>
              <div className="p-3 mb-4 border border-amber-400/20 bg-amber-400/5 rounded-lg text-xs text-amber-400/80">
                <span className="font-cinzel font-semibold text-amber-400">Giant Forms</span> — The Apex tier includes oversized Giant versions of classic forms (Giant Pillow, Giant Goblet, Giant Chest, Giant Tome, Giant Barrel, Giant Throne, Giant Bed). These are mass-gated (minimum mass 28–35) and are specifically designed to lure <span className="font-semibold">Giant-kin prey</span> in the Giant's Castle and Cloud Kingdom locations. They have higher digestive capacity requirements and larger material slot counts than their standard equivalents.
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {TIER_ORDER.map((tier) =>
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded border text-xs font-cinzel transition-all ${
                selectedTier === tier ?
                "border-primary bg-primary/10 text-primary" :
                "border-border text-muted-foreground hover:border-primary/30"}`
                }>

                    {tier}
                  </button>
              )}
                {season && (
                  <button
                    onClick={() => setSelectedTier("season")}
                    className={`px-3 py-1.5 rounded border text-xs font-cinzel transition-all ${
                      selectedTier === "season"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"}`}
                  >
                    {HOLIDAYS[season].icon} Current Season
                  </button>
                )}
              </div>
              {selectedTier === "season" && season && (
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="holiday-badge text-xs" data-holiday={season}>{HOLIDAYS[season].icon} {HOLIDAYS[season].name}</span>
                  {" "}· These shapes can be chosen until {seasonEnd(season)}, by mimics of the tiers shown on each. They count as your own tier, with no penalty.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {codexForms.map((form) =>
              <ChompCard key={form.id} speed="slow" data-holiday={form.holiday} className={`${form.holiday ? "holiday-card" : ""} bg-card border-border`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-cinzel text-foreground">{form.name}</h3>
                        <Badge variant="outline" className="text-[11px] border-primary/20 text-primary shrink-0 ml-2">
                          +{form.baseAllureModifier} Allure
                        </Badge>
                      </div>
                      {form.holiday && <p className="mb-1"><HolidayBadge form={form} /> <span className="text-[10px] text-muted-foreground">· {form.holidayTiers?.join(", ")}</span></p>}
                      {form.variantOf && (
                        <p className="text-[11px] text-teal-300 mb-1">
                          🗝️ {form.holiday
                            ? `Seasonal variant of ${ALL_FORMS.find((f) => f.id === form.variantOf)?.name}`
                            : `Variant of ${ALL_FORMS.find((f) => f.id === form.variantOf)?.name} — unlocked by learning any of: ${(form.unlockedBy ?? []).join(", ")}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mb-2">{form.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {form.utilityTags.map((t) =>
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t}</span>
                    )}
                        {form.builtInTraits.map((t) =>
                    <span key={t} title="Built-in trait" className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 text-primary bg-primary/5">{t}</span>
                    )}
                      </div>
                      <div className="border-t border-border pt-2 mt-2">
                        <p className="text-[11px] text-muted-foreground font-cinzel uppercase tracking-wide mb-1">Potential Flaws</p>
                        {form.flawProfiles.slice(0, 2).map((f, i) =>
                    <p key={i} className="text-[11px] text-muted-foreground/70 italic">• {f.description}</p>
                    )}
                      </div>
                    </CardContent>
                  </ChompCard>
              )}
              </div>
            </div>
          }

          {activeSection === "Materials" &&
          <div className="space-y-4">
              <h2 className="font-cinzel text-2xl text-foreground mb-2">Materials</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You can only use materials you have <em>consumed or directly observed</em>. Each tier unlocks the ability to use more complex appearance combinations.
              </p>
              {MATERIAL_GROUPS.map(([rarity, mats]) =>
            <Collapsible key={rarity} title={`${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Materials (${mats.length})`} defaultOpen={rarity === "mundane"}>
                  {rarity === "magic" && (
                    <div className="mb-3 space-y-2">
                      <p className="text-xs text-purple-400/80 italic border border-purple-400/20 bg-purple-400/5 rounded px-2 py-1.5">
                        Magic materials are worn in your primary or secondary slots like any other material, up to your tier's Magic limit, and each one worn grants its effect. The cost: each one gives off <span className="font-semibold">arcane residue</span>, an extra flaw check against adventurers with Magical perception +2 or higher (wizards, clerics, inquisitors, changelings…).
                      </p>
                    </div>
                  )}
                  {rarity === "giant" && (
                    <p className="text-xs text-amber-400/80 italic mb-3 border border-amber-400/20 bg-amber-400/5 rounded px-2 py-1.5">
                      ⚠ Giant-realm materials are only obtainable by consuming Giant-kin adventurers or creatures in the <span className="font-semibold">Giant's Castle</span> or <span className="font-semibold">Cloud Kingdom Outpost</span> locations. These locations require Apex tier and a minimum mass of 28–38.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {mats.map((mat) =>
                <span key={mat} className={`text-xs px-2.5 py-1 rounded border ${MATERIAL_COLORS[rarity]}`}>
                        {mat}
                      </span>
                )}
                  </div>
                  {rarity === "magic" && (
                    <div className="mt-3 space-y-2">
                      <ul className="space-y-1 text-xs">
                        {mats.filter(isMagicMaterial).map((mat) =>
                          <li key={mat}><span className="text-purple-400">{mat}</span> <span className="text-muted-foreground">— {MAGIC_EFFECTS[mat]}</span></li>
                        )}
                      </ul>
                    </div>
                  )}
                </Collapsible>
            )}
              <Collapsible title="Appearance Limits by Tier">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-muted-foreground">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1 pr-3 font-cinzel text-foreground">Tier</th>
                        <th className="py-1 px-2 font-cinzel text-foreground">Primary</th>
                        <th className="py-1 px-2 font-cinzel text-foreground">Secondary</th>
                        <th className="py-1 px-2 font-cinzel text-foreground" title="How many of your primary and secondary materials may be magic">Magic (of P+S)</th>
                        <th className="py-1 px-2 font-cinzel text-foreground">Surface</th>
                        <th className="py-1 px-2 font-cinzel text-foreground">Symbolic</th>
                        <th className="py-1 px-2 font-cinzel text-foreground">Condition</th>
                        <th className="py-1 px-2 font-cinzel text-foreground">Scent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TIER_ORDER.map((tier) => {
                      const lim = APPEARANCE_LIMITS[tier];
                      return (
                        <tr key={tier} className="border-b border-border/50">
                            <td className="py-1.5 pr-3 font-cinzel text-foreground">{tier}</td>
                            <td className="py-1.5 px-2 text-center">{lim.primaryMaterials}</td>
                            <td className="py-1.5 px-2 text-center">{lim.secondaryMaterials}</td>
                            <td className="py-1.5 px-2 text-center">{lim.magicalMaterials}</td>
                            <td className="py-1.5 px-2 text-center">{lim.surfaceTraits}</td>
                            <td className="py-1.5 px-2 text-center">{lim.symbolicTraits}</td>
                            <td className="py-1.5 px-2 text-center">{lim.conditionTraits}</td>
                            <td className="py-1.5 px-2 text-center">{lim.scentTraits}</td>
                          </tr>);

                    })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Magic materials don't have their own slot. They go in your primary or secondary slots, and the Magic column caps how many of those may be magic — at Apex, up to 3 of your 4 materials.</p>
              </Collapsible>
            </div>
          }

          {activeSection === "Traits" &&
          <div className="space-y-4">
              <h2 className="font-cinzel text-2xl text-foreground mb-4">Traits</h2>
              <p className="text-sm text-muted-foreground">Surface, symbolic and condition traits are learned from your prey and applied in the appearance editor. Every mimic begins knowing those <span className="text-primary">highlighted</span>;</p>
              {Object.entries(TRAITS).map(([category, traits]) =>
            <div key={category}>
                  <h3 className="font-cinzel text-sm text-muted-foreground uppercase tracking-widest mb-2">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((t) =>
                <Badge key={t} variant="outline" className={ALL_STARTING_TRAITS.includes(t as StartingTrait) ? "border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground transition-colors"}>{t}</Badge>
                )}
                  </div>
                </div>
            )}
              <p className="text-sm text-muted-foreground pt-2">Structural and aura traits can't be learned or applied — they're built into forms, so you have them only while wearing a form that includes them.</p>
              {Object.entries(UNLEARNED_TRAITS).map(([category, traits]) =>
            <div key={category}>
                  <h3 className="font-cinzel text-sm text-muted-foreground uppercase tracking-widest mb-2">{category} <span className="normal-case tracking-normal text-[11px]">(built into forms)</span></h3>
                  <div className="flex flex-wrap gap-2">
                    {traits.map((t) =>
                <Badge key={t} variant="outline" className="border-dashed border-border text-muted-foreground hover:text-foreground transition-colors">{t}</Badge>
                )}
                  </div>
                </div>
            )}
            </div>
          }

          {activeSection === "Adventurers" &&
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
                <button
                  onClick={() => setRevealAll(r => !r)}
                  className="w-full mb-2 text-[10px] px-3 py-1.5 rounded border border-dashed border-amber-400/40 text-amber-400/80 hover:text-amber-400"
                >
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
                        ? `Rumors place it in ${adv.locations.map((id) => LOCATION_NAMES[id] ?? id).join(" or ")}.`
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
                          <p className="text-xs text-foreground">{adv.locations.map((id) => LOCATION_NAMES[id] ?? id).join(", ")}</p>
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
          }

          {activeSection === "Mechanics" &&
          <div className="space-y-4">
              <h2 className="font-cinzel text-2xl text-foreground mb-4">Detailed Mechanics</h2>
              <Collapsible title="Stealth Check" defaultOpen>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Triggered when an adventurer enters your room (via Wait wandering or Lure). Roll <span className="text-foreground">Plausibility + Patience/2 d6</span> vs. adventurer's <span className="text-foreground">Discipline + Suspicion d6</span>.</p>
                  <p>Modifiers applied before rolling:</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• Form one tier <span className="text-foreground">above</span> you: <span className="text-red-400">–2 Plausibility</span></li>
                    <li>• Form one tier <span className="text-foreground">below</span> you: <span className="text-red-400">–1 Patience</span> (fewer bonus dice from Patience)</li>
                    <li>• <span className="text-foreground">Room context bonus</span>: e.g. +1 if you're a Barrel in a Cellar</li>
                    <li>• <span className="text-foreground">Room context penalty</span>: e.g. –2 if you're a Bookshelf in a Cellar</li>
                  </ul>
                  <p>Before the main roll, exposed flaws (based on low plausibility) are contested individually. Each adventurer's perception affinities add bonus dice to their flaw checks.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• Plausibility ≤ 2: 2 flaws exposed</li>
                    <li>• Plausibility ≤ 3: 1 flaw exposed</li>
                    <li>• Plausibility 4+: No automatic flaws</li>
                  </ul>
                  <p>A failed stealth check raises suspicion. Detected flaws add further suspicion on top.</p>
                </div>
              </Collapsible>
              <Collapsible title="Allure Check">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Lure rolls <span className="text-foreground">Base Allure + form modifier + room context d6</span> vs. the adventurer's <span className="text-foreground">Discipline + Suspicion/2 d6</span>. Success draws them into your room.</p>
                  <p>Your look is compared against what each adventurer is <span className="text-yellow-400">attracted to</span> and <span className="text-red-400">put off by</span>. Materials (primary and secondary, magic or not), surface traits, symbolic traits, condition traits, your form's tags and your form's built-in traits (e.g. a Chest is always Iron-Banded and Heavy-Lidded) all count.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• Each quality they like: <span className="text-green-400">+1 die</span>, up to your Plausibility. Going over that cap is too good to be true: <span className="text-red-400">+1 suspicion</span>.</li>
                    <li>• Each quality they dislike: <span className="text-red-400">–1 die</span>, with no cap. A King won't be tempted by anything Cracked or Dusty.</li>
                  </ul>
                  <p>When you Strike, you go for the nearest lured adventurer, preferring whoever likes your look most (likes minus dislikes).</p>
                </div>
              </Collapsible>
              <Collapsible title="Room Context Modifiers">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Certain forms gain or lose plausibility and allure based on the room you inhabit. This reflects how natural or out-of-place an object looks in its surroundings. This is exemplified by, but not limited to, the following:</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">Barrel in a Cellar</span>: +1 Plausibility, +1 Allure</li>
                    <li>• <span className="text-foreground">Bookshelf in a Cellar</span>: –2 Plausibility</li>
                    <li>• <span className="text-foreground">Bookshelf in Arcane Library</span>: +1 Plausibility, –1 Allure (one of many)</li>
                    <li>• <span className="text-foreground">Writing Desk in a Study</span>: +1 Plausibility, +1 Allure</li>
                    <li>• <span className="text-foreground">Bed in a Bedroom</span>: +1 Plausibility</li>
                    <li>• <span className="text-foreground">Chest in a Vault</span>: +1 Plausibility, +1 Allure</li>
                  </ul>
                  <p>Room context is shown in the event log when you lure or when adventurers enter your room.</p>
                </div>
              </Collapsible>
              <Collapsible title="Form Tier Penalties">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Taking a form one tier <span className="text-foreground">above</span> your current tier: <span className="text-red-400">–2 Plausibility</span> (not enough mass to fully fill the form)</p>
                  <p>Taking a form one tier <span className="text-foreground">below</span> your current tier: <span className="text-red-400">–1 Patience</span> (too much mass in too small a space)</p>
                  <p>You may only have <span className="text-foreground">1 greater-tier form</span> in your known forms at once.</p>
                  <p><span className="text-purple-400">🪵 Thimblewood</span> shrinks you one tier while worn: every rule above treats you as that smaller size. Forms two tiers below open up (at –1 Patience), forms one tier below lose their penalty, and forms of your own tier count as one above (–2 Plausibility, and the one-form limit). Putting it on or taking it off sends you to choose your forms again.</p>
                </div>
              </Collapsible>
              <Collapsible title="Evolution & Assimilation">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>When you reach the AP threshold for your tier, you may choose to spend AP to:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• <span className="text-foreground">Increase Mass</span> — move toward the next tier</li>
                    <li>• <span className="text-foreground">+1 Plausibility</span> — harder to detect</li>
                    <li>• <span className="text-foreground">+1 Adhesion</span> — better at catching prey</li>
                    <li>• <span className="text-foreground">+1 Patience</span> — better at waiting</li>
                  </ul>
                  <p>AP costs for stat upgrades scale with your tier. Evolution costs are fixed per tier.</p>
                </div>
              </Collapsible>
              <Collapsible title="Learning Materials & Traits">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>You can only use materials and traits in your appearance if you have <span className="text-foreground">previously consumed or directly observed</span> them.</p>
                  <p>Consuming an adventurer does <span className="text-foreground">not</span> guarantee you learn everything they carry. Assimilation is imperfect — each kill yields a <span className="text-foreground">random subset</span> of their materials and traits. Hunt the same type repeatedly to learn all they have to offer.</p>
                  <p>Traits have a lower chance of transfer than materials — they represent deeper knowledge that may require multiple encounters to fully absorb.</p>
                  <p>A partial bite that holds has a <span className="text-foreground">35% chance</span> to teach one of the target's materials.</p>
                  <p>The number of materials and traits you can apply simultaneously scales with your tier — see the Appearance Limits table.</p>
                </div>
              </Collapsible>
              <Collapsible title="Companions & Familiars">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Some adventurers may arrive with a <span className="text-foreground">companion or familiar</span> — a beast or bound creature that counts as an additional party member.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">Rangers</span> have a chance to bring an animal companion: Bear, Hound, or Lynx.</li>
                    <li>• <span className="text-foreground">Warlocks</span> may be accompanied by a bound Imp or Felhound.</li>
                    <li>• Some elites bring trained beasts of their own: the <span className="text-foreground">Mimic Hunter</span>'s Bloodhound (some are trained in Blood Scent), or the <span className="text-foreground">Orcish Tracker</span>'s War Boar or Warg. They are rarer, but sharper and tougher than ordinary companions.</li>
                    <li>• <span className="text-foreground">Fey Changelings</span> are often trailed by a Pixie or Thorn Sprite.</li>
                    <li>• <span className="text-foreground">Giant's Goose-Keepers</span> rarely go anywhere without a Giant Goose — or, if you're lucky, the Golden Goose itself. Geese hear everything.</li>
                  </ul>
                  <p>Companions may wander separately from their owner — they can be lured and consumed independently. They yield AP and count toward party depletion; some, like fey familiars and geese, also carry materials or traits you can learn.</p>
                </div>
              </Collapsible>
              <Collapsible title="Suspicion from Combat">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><span className="text-foreground">Successful consumption</span> raises suspicion by <span className="text-red-400">+1</span> — a party member has gone missing.</p>
                  <p><span className="text-foreground">Successful consumption in the presence of others</span> raises suspicion by <span className="text-red-400">+2-3</span> — one or more people may have seen your true form as you ate.</p>
                  <p><span className="text-foreground">Failed strike</span> raises suspicion by <span className="text-red-400">+4</span> — the target saw you lunge and knows exactly what you are.</p>
                  <p>Partial bites (Minor mimics, or any mimic biting a giant it can't yet swallow) raise suspicion by <span className="text-red-400">+2</span> per hit, and <span className="text-red-400">+3</span> if the target flees.</p>
                </div>
              </Collapsible>
              <Collapsible title="Burned Lairs & Forms">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>When a party discovers you, the survivors talk. The <span className="text-foreground">location</span> and the <span className="text-foreground">form you were caught in</span> are both <span className="text-orange-400">🔥 burned</span> for your next <span className="text-foreground">{BURN_HUNTS} hunts</span>.</p>
                  <p>Hunting at a burned location starts you at <span className="text-red-400">+{BURN_SUSPICION} suspicion</span>, and so does starting a hunt in a burned form. They stack: going back to the same place in the same shape starts you at <span className="text-red-400">+{BURN_SUSPICION * 2}</span>. Burned cards are marked on the hunting-ground and form screens. Being discovered again resets the count.</p>
                </div>
              </Collapsible>
              <Collapsible title="Bounty Hunts (Legendary Reputation)">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>At high mass, your notoriety draws specialized hunters specifically targeting <span className="text-foreground">you by name</span>.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">Mass 30–35</span>: 25% chance of a Bounty Hunt per expedition</li>
                    <li>• <span className="text-foreground">Mass 36+</span>: 50% chance of a Bounty Hunt per expedition</li>
                  </ul>
                  <p>Bounty hunts spawn an entirely hunter party of mimic specialists — they know your kind intimately. <span className="text-red-400">Suspicion starts at 4</span> because they know you are already there. They are much harder to deceive than ordinary adventurers.</p>
                  <p>Hunter types include Gnomish Tinkerer-Hunters (acoustic/material specialists), Draconic Bounty Hunters (environmental/magical), Orcish Trackers (scent-based), and the rare Tiefling Hexblade (Apex only, magical presence expert).</p>
                </div>
              </Collapsible>
              <Collapsible title="Rival Mimic Encounters">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Approximately <span className="text-foreground">1 in every 7 hunts</span> (Greater tier and above), another mimic has moved into your hunting ground. It lurks in a room you have not yet chosen.</p>
                  <p>The rival is hidden at first — you will only know something is wrong because <span className="text-foreground">adventurers silently vanish</span> when they wander into its room. The event log will show cryptic messages about party members who do not return.</p>
                  <p><span className="text-foreground font-semibold">How to defeat it:</span></p>
                  <ol className="space-y-1 ml-4 text-xs list-decimal list-inside">
                    <li>Watch the event log for cryptic disappearances — note which room is mentioned.</li>
                    <li>Use <span className="text-foreground">Relocate</span> to move into that room. Entering the rival's room reveals it.</li>
                    <li>Once revealed, use <span className="text-foreground">Strike!</span> to consume it for a major AP bonus (+12 AP).</li>
                    <li>If you miss, the rival retreats and re-hides. Track it again.</li>
                  </ol>
                  <p>A rival indicator appears in the left panel once you have received a clue.</p>
                  <p>If you consume all the adventurers before finding your rival <span className="text-foreground">the hunt will end</span> and you will lose your chance.</p>
                </div>
              </Collapsible>
              <Collapsible title="Low-Mass Plausibility Penalty">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>If your mass drops below your tier's minimum threshold (due to mass decay), your effective Plausibility is reduced. You do not lose your tier, but your deception weakens until you feed enough to restore your mass.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• Mass below your <span className="text-foreground">current tier's minimum</span>: <span className="text-red-400">–1 Plausibility</span></li>
                    <li>• Mass below the <span className="text-foreground">tier below yours</span>: <span className="text-red-400">–2 Plausibility</span></li>
                  </ul>
                  <p>The red portion of the Plausibility bar in the left panel shows exactly how many points are penalized. Hover over it for details. Hunt and feed to restore your mass and remove the penalty.</p>
                </div>
              </Collapsible>
              <Collapsible title="Mass Decay">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>A mimic that does not feed will slowly lose mass. If you are away from the game for several days without hunting, your mass will diminish upon your return.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">1 mass point lost per 3 days</span> without feeding</li>
                    <li>• Mass cannot decay below 1</li>
                    <li>• A notification banner tells you exactly how much was lost when you return</li>
                  </ul>
                  <p>Any successful feeding — whether consuming an adventurer, a small creature, or landing a bite — resets the decay timer.</p>
                </div>
              </Collapsible>
              <Collapsible title="Hunt Time Limit (Adventurer Patience)">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Adventurers will not search forever. If you perform <span className="text-foreground">{ACTION_LIMIT} actions</span> (Lure, Wait, Relocate) without landing a Strike, the party grows bored and leaves — ending the hunt.</p>
                  <p>A warning appears in the left panel at {ACTION_WARNING} actions remaining, turning red as the limit approaches. Striking any target (adventurer or rival mimic) or consuming a creature resets the counter.</p>
                  <p>This prevents frustrating dead-end hunts where remaining adventurers cannot be lured — the hunt simply ends and you move on to fresh prey.</p>
                </div>
              </Collapsible>
              <Collapsible title="Sickness System (Apex — All Stats Capped)">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>When all three of your combat stats (<span className="text-foreground">Plausibility</span>, <span className="text-foreground">Adhesion</span>, and <span className="text-foreground">Patience</span>) are at their maximum of <span className="text-foreground">6</span>, there is a <span className="text-foreground">20% chance</span> at the start of each hunt that your mimic contracts a temporary sickness.</p>
                  <p>Sicknesses apply <span className="text-red-400">penalties to one or two stats</span> for the duration of that hunt only — they are cleared when the hunt ends.</p>
                  <p>The six possible sicknesses:</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">Mimic Pox</span> — <span className="text-red-400">–3 Plausibility</span>: blisters ripple across your disguise surface.</li>
                    <li>• <span className="text-foreground">Adhesion Palsy</span> — <span className="text-red-400">–3 Adhesion</span>: your gripping enzymes fail to cohere.</li>
                    <li>• <span className="text-foreground">Torpor Rot</span> — <span className="text-red-400">–3 Patience</span>: a creeping stillness prevents you holding yourself still.</li>
                    <li>• <span className="text-foreground">Surface Decay</span> — <span className="text-red-400">–2 Plausibility, –2 Adhesion</span>: outer membrane degradation.</li>
                    <li>• <span className="text-foreground">Mimic Ague</span> — <span className="text-red-400">–2 Plausibility, –2 Patience</span>: feverish shuddering undermines deception and stillness.</li>
                    <li>• <span className="text-foreground">Grip Fatigue</span> — <span className="text-red-400">–2 Adhesion, –2 Patience</span>: exhaustion bleeds between muscles and stillness.</li>
                  </ul>
                  <p>When afflicted, the hunt opens with an amber warning banner naming the sickness. The affected stat bars show an <span className="text-amber-400">orange penalty segment</span> (distinct from the red mass-decay penalty), and hovering reveals the sickness name and details.</p>
                </div>
              </Collapsible>
              <Collapsible title="New Locations & Forms (Apex)">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>High-mass Apex mimics unlock additional locations and forms gated by raw mass rather than just tier:</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">Ruined City Quarter</span> — unlocks at mass 30</li>
                    <li>• <span className="text-foreground">Border Guardhouse</span> — unlocks at mass 33</li>
                    <li>• <span className="text-foreground">Abandoned Castle</span> / <span className="text-foreground">Castle Gate form</span> — unlocks at mass 35</li>
                    <li>• <span className="text-foreground">Lighthouse form</span> — unlocks at mass 38</li>
                  </ul>
                </div>
              </Collapsible>
              <Collapsible title="Rare Locations">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Some hunting grounds aren't always within reach. After each hunt there's a <span className="text-foreground">15% chance</span> that word reaches you of a rare location for which you qualify. It appears on the hunting-ground screen with a <span className="text-amber-400">✦ gold border</span> and stays for <span className="text-foreground">2 hunts elsewhere</span>, or until you hunt there. Only one rare location is open at a time. Rare locations have their own adventurers, and no bounty hunters or rival mimics follow you there.</p>
                  <p className="font-semibold text-foreground">The Hollow Reliquary <span className="text-muted-foreground font-normal">(Standard+)</span></p>
                  <p>A half-ruined shrine built around a sacred chest that once "consumed the unworthy." The chest is long gone, but pilgrims still come, and some of them have never stopped believing it will return.</p>
                  <p className="font-semibold text-foreground">The Mimic Nest <span className="text-muted-foreground font-normal">(Greater+)</span></p>
                  <p>A dockside warehouse where your kind has nested: 3–4 rival mimics hide in its rooms, and one of them is the <span className="text-foreground">Elder Mimic</span> (5 dice to resist, 18 AP). Younger nest mimics are easier prey (3 dice, 6 AP). The few adventurers sent to investigate are your best guides — whatever eats them is hiding where they vanished. <span className="text-foreground">Devouring the Elder ends the hunt</span>; running out of adventurers does not.</p>
                  <p className="font-semibold text-foreground">The Sinking Ship <span className="text-muted-foreground font-normal">(Lesser+)</span></p>
                  <p>A merchant ship holed on the rocks. It goes under after <span className="text-foreground">15 turns</span> (every Wait, Lure, Relocate and Strike counts), and whoever is left takes to the lifeboats. The <span className="text-foreground">Ship's Captain</span> is always aboard, clutching the strongbox: swallow the Captain whole and the strongbox goes down too, for <span className="text-foreground">+8 AP</span> on top of the usual reward and one guaranteed new material or trait from its contents (Gold, Silver, Crystal, Heraldic Crest or Guild Mark).</p>
                </div>
              </Collapsible>
              <Collapsible title="Giant Realm (Apex — Mass 28+)">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>At high Apex mass, two entirely new hunting grounds become available — locations scaled for giant-sized prey, with their own exclusive adventurer pool, materials, and forms.</p>
                  <p className="font-semibold text-foreground">Giant's Castle <span className="text-muted-foreground font-normal">(Apex, mass 28+)</span></p>
                  <p>A castle whose ceilings brush the clouds. Rooms include the Great Hall, Giant's Kitchen, Treasury Vault, Goose Chamber, Sleeping Quarters, and Cloud Battlement. Parties are small (2–4) but extremely powerful. Its giants are the Half-Giant Mercenary, Giant-Blood Shaman, Giant's Goose-Keeper, Giant Treasure Hoarder and Beanstalk Climber. Local creatures include Cloud Goslings, Giant Rats, and the Giant's Cat.</p>
                  <p className="font-semibold text-foreground">Cloud Kingdom Outpost <span className="text-muted-foreground font-normal">(Apex, mass 38+)</span></p>
                  <p>A floating fortress of cloud-stone and stormforged iron, reachable only by beanstalk or sorcery. No ordinary adventurers make the climb: parties are tiny (2–3) and drawn only from its five resident giants — the Giant Lord, Cloud Forge Smith, Cloud Eagle Rider, Cloud Giant Scout and Storm Giant Wanderer. Storm Elementals, Cloud Eagles and Cloud Goslings drift through its halls. The highest-risk, highest-reward location in the game.</p>
                  <p><span className="text-amber-400 font-semibold">🍖 Titanic Feast:</span> consume all five Cloud Kingdom giants <span className="text-foreground">whole</span> — finishing one off with bites doesn't count.</p>
                  <p className="font-semibold text-foreground mt-2">Giant-realm materials</p>
                  <p>Giant-kin carry exclusive materials: <span className="text-amber-400">Titan Oak, Giant Iron, Sky Gold, Lightning Marble, Cumulogranite, Beanstalk Timber, Beanstalk Leather, Cloud Fleece, Golden Goose Down, Stormforged Iron</span>. These can only be obtained in these locations.</p>
                  <p className="font-semibold text-foreground mt-2">Giant forms</p>
                  <p>Giant forms are mass-gated Apex forms designed to be plausible in giant-scaled environments. Using a standard Minor/Lesser form (e.g. a normal Pillow) in the Giant's Castle would look absurdly small — Giant Forms resolve this. They require higher digestive capacity and have more material slots.</p>
                  <ul className="space-y-1 ml-4 text-xs">
                    <li>• <span className="text-foreground">Giant Pillow, Giant Goblet, Giant Barrel</span> — mass 28+</li>
                    <li>• <span className="text-foreground">Giant Chest, Giant Tome</span> — mass 30+</li>
                    <li>• <span className="text-foreground">Giant Throne, Giant Bed</span> — mass 33–35+</li>
                  </ul>
                  <p>Giant-kin adventurers yield <span className="text-foreground font-semibold">12 AP</span> when consumed — roughly double to triple normal adventurer rewards.</p>
                  <p className="font-semibold text-foreground mt-2">Too big to swallow</p>
                  <p>Each giant can only be swallowed whole once your mass reaches its <span className="text-foreground">"Consumed whole at"</span> value on its Codex entry (e.g. a Half-Giant Mercenary at mass 36, the Giant Lord at 52). Until then you take <span className="text-foreground">partial bites</span>, like a Minor mimic: each bite that holds is worth <span className="text-foreground">2–3 AP</span> and may teach one of the giant's materials, and a giant worn down by enough bites collapses for a final <span className="text-foreground">+2 AP</span>.</p>
                </div>
              </Collapsible>
              <Collapsible title="Achievements">
                <div className="text-sm text-muted-foreground space-y-2">
                  {ACHIEVEMENTS.map(a => (
                    <p key={a.id}><span className={`${ACHIEVEMENT_STYLES[a.id].text} font-semibold`}>{a.icon} {a.name}:</span> {a.description}</p>
                  ))}
                  <p>Earned achievements appear as badges beside your mimic on the home screen.</p>
                </div>
              </Collapsible>
            </div>
          }

        </div>
      </div>
    </div>);

}