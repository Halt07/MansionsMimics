// ============================================================
// MANSIONS & MIMICS — Adventurer data
// Adventurer groups, templates, companions, behaviors, AP rewards and loot fallbacks,
// plus the PartyMember type for an adventurer taking part in a hunt.
// Rules that use this data (checks, behavior reactions, spawning) live in ./gameData.
// ============================================================
import {
  type AdventurerType, type CompanionType, type InteractionStyle, type Material,
  type PerceptionSense, type TeachableTrait, type Tier, type Trait, type UtilityTag,
} from "./vocabulary";
import type { LocationId, RoomName } from "./locationData";

// ============================================================
// ADVENTURER GROUPS
// ============================================================
// Every template in ADVENTURER_TEMPLATES has a `group` matching one of these ids.
// Order here is the display order in the Codex.
export const ADVENTURER_GROUPS = [
  { id: "common", label: "Common Adventurers", description: "The everyday dungeon-delvers. They appear in parties at any tier." },
  { id: "commoners", label: "Commoners & Nobility", description: "Non-combatants and escort targets. Easy prey, but nobles rarely travel unguarded." },
  { id: "supernatural", label: "Supernatural & Monstrous", description: "Undead, fey and monstrous things. Most haunt only certain locations, and several have unusual instincts that change how you hunt them." },
  { id: "huntersElites", label: "Hunters & Elites", description: "Specialists who appear once you have grown powerful enough to draw attention. Mimic hunters also form Bounty Hunt parties." },
  { id: "giantKin", label: "Giant-Kin", description: "Only found in giant-realm locations (the Giant's Castle and Cloud Kingdom Outpost). Gated by Apex tier and minimum mass. Giant-kin yield significantly more AP than standard adventurers (up to 12 per kill)." },
] as const;
export type AdventurerGroupId = (typeof ADVENTURER_GROUPS)[number]["id"];

/** Qualities an adventurer reacts to: materials and traits on the mimic's look, tags on its form. */
export interface QualityList {
  readonly materials?: readonly Material[];
  readonly traits?: readonly Trait[];
  readonly tags?: readonly UtilityTag[];
}

export interface CompanionOption {
  readonly nameSuffix: string;
  readonly type: CompanionType;
  /** AP for consuming it whole. */
  readonly ap: number;
  readonly discipline: number;
  readonly constitution: number;
  readonly description: string;
  /** Relative odds of this option being picked (default 1). */
  readonly weight?: number;
  // Optional overrides; anything left out uses the companion defaults (see createCompanion).
  readonly interactionStyle?: InteractionStyle;
  readonly perceptionAffinity?: Readonly<Record<PerceptionSense, number>>;
  readonly lootMaterials?: readonly Material[];
  readonly lootTraits?: readonly TeachableTrait[];
  readonly partialLoot?: readonly string[];
  /** Set to "giantKin" for giant companions (bites, giant bite AP). */
  readonly group?: AdventurerGroupId;
  readonly wholeMealMass?: number;
  readonly behavior?: BehaviorId;
  /** Chance (0–1) that a spawned companion actually has `behavior` (default 1: always). */
  readonly behaviorChance?: number;
}

/**
 * Treasure an adventurer carries. Swallowing it gives bonus AP and one guaranteed prize:
 * a material or trait from these lists that the mimic doesn't know yet.
 */
export interface Treasure {
  readonly ap: number;
  readonly description: string;
  readonly materials: readonly Material[];
  readonly traits: readonly TeachableTrait[];
}

export interface AdventurerTemplate {
  readonly name: string;
  readonly type: AdventurerType;
  readonly discipline: number;
  readonly baseSuspicion: number;
  /** Bonus HP / max hits before fleeing (default 3, tough = 4). */
  readonly constitution: number;
  readonly interactionStyle: InteractionStyle;
  readonly group: AdventurerGroupId;
  readonly quirks: readonly string[];
  readonly alluringQualities: Required<QualityList>;
  readonly repelledBy?: QualityList;
  readonly perceptionAffinity: Readonly<Record<PerceptionSense, number>>;
  readonly lootMaterials: readonly Material[];
  readonly lootTraits: readonly TeachableTrait[];
  /** Flavor text for what a partial bite tears off. */
  readonly partialLoot: readonly string[];
  readonly companion?: { readonly chance: number; readonly options: readonly CompanionOption[] };
  readonly minTier?: Tier;
  readonly minMass?: number;
  /** Giant-kin: the mass a mimic needs to swallow them whole (below it, partial bites). */
  readonly wholeMealMass?: number;
  readonly isMimicHunter?: boolean;
  /** Only appears at these locations (any location if omitted). */
  readonly locations?: readonly LocationId[];
  readonly behavior?: BehaviorId;
  /** Devotion: the name this adventurer takes once it converts (e.g. "Elder Zealot"). */
  readonly convertedName?: string;
  /** Something valuable carried, swallowed along with them when consumed whole (not by bites). */
  readonly treasure?: Treasure;
}

// ============================================================
// ADVENTURER TEMPLATES
// constitution: bonus HP / max hits before fleeing (default 3, tough = 4)
// ============================================================
export const ADVENTURER_TEMPLATES: readonly AdventurerTemplate[] = [
  // ── Rogues ──
  {
    name: "Greedy Rogue", type: "Rogue", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Inspects valuables closely", "Tests hinges and seams"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Polished", "Gilded", "Locked", "Heavy-Lidded"], tags: ["Valuable"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 1, text: 0, magical: 0, social: 1, spatial: 1, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Tanned Hide", "Steel", "Goatskin"],
    lootTraits: [],
    partialLoot: ["scrap of leather armor", "torn belt", "a boot heel"],
  },
  {
    name: "Wary Cutpurse", type: "Rogue", discipline: 2, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Rarely touches anything directly", "Scans exits first"],
    alluringQualities: { materials: ["Gold", "Silver", "Silk"], traits: ["Locked"], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Goatskin", "Iron", "Linen"],
    lootTraits: [],
    partialLoot: ["strip of cloak", "torn glove", "a coin pouch fragment"],
  },
  // ── Clerics ──
  {
    name: "Paranoid Cleric", type: "Cleric", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence", "Arcane Sigil", "Whispering"] },
    quirks: ["Blesses suspicious objects", "Avoids direct skin contact"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Arched"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 2, social: 1, spatial: 1, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Gold", "Silver", "Cotton"],
    lootTraits: ["Sacred Symbol"],
    partialLoot: ["torn vestment", "prayer bead string", "patch of holy cloth"],
  },
  {
    name: "Young Acolyte", type: "Cleric", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence"] },
    quirks: ["Whispers prayers when nervous", "Easily distracted by relics"],
    alluringQualities: { materials: ["Gold", "Silver", "Marble"], traits: ["Sacred Symbol", "Runescript", "Arched", "Faint Glow", "Radiant"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 1, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Cotton", "Silver", "Linen", "Stained Glass"],
    lootTraits: ["Sacred Symbol"],
    partialLoot: ["torn robe hem", "a cloth belt", "strip of parchment"],
  },
  // ── Bards ──
  {
    name: "Naive Bard", type: "Bard", discipline: 2, baseSuspicion: 1, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Bloodstained"] },
    quirks: ["Talks to inanimate objects", "Distracted by comfort"],
    alluringQualities: { materials: ["Velvet", "Silk", "Gold"], traits: ["Tarnished", "Worn", "Upholstered", "Warm to Touch"], tags: ["Comfort", "Valuable", "Social"] },
    perceptionAffinity: { material: 0, structure: 1, weight: 0, text: 1, magical: 0, social: 2, spatial: 0, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Silk", "Velvet", "Mahogany"],
    lootTraits: ["Gilded"],
    partialLoot: ["strip of velvet cape", "torn silk sleeve", "a lute string"],
  },
  {
    name: "Seasoned Troubadour", type: "Bard", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Cracked"] },
    quirks: ["Records observations in verse", "Draws comparisons to old stories"],
    alluringQualities: { materials: ["Mahogany", "Silk", "Gold"], traits: ["Tarnished", "Heraldic Crest", "Ornate"], tags: ["Social", "Knowledge"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 0, social: 2, spatial: 0, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Velvet", "Silk", "Oak"],
    lootTraits: ["Heraldic Crest"],
    partialLoot: ["torn doublet panel", "a woven badge", "strip of performer's sash"],
  },
  // ── Wizards ──
  {
    name: "Arcane Scholar", type: "Wizard", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Examines inscriptions carefully", "Measures interior spaces"],
    alluringQualities: { materials: [], traits: ["Runescript", "Arcane Sigil", "Whispering"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 2, social: 0, spatial: 2, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Feywood", "Spellweave Silk", "Runestone"],
    lootTraits: ["Runescript", "Arcane Sigil"],
    partialLoot: ["torn spellbook page", "a runed sleeve patch", "scrap of enchanted robe"],
  },
  {
    name: "Hedge Witch", type: "Wizard", discipline: 2, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Sniffs objects for magical residue", "Mutters to herself"],
    alluringQualities: { materials: ["Feywood", "Crystal"], traits: ["Cracked", "Arcane Sigil", "Faint Glow", "Whispering"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 1, magical: 2, social: 0, spatial: 1, environmental: 2, acoustic: 0, presence: 2 },
    lootMaterials: ["Gravecloth", "Feywood", "Crystal"],
    lootTraits: ["Arcane Sigil"],
    partialLoot: ["torn herb pouch cloth", "a charm string", "scrap of wax-stained robe"],
  },
  // ── Warriors ──
  {
    name: "Battle-Hardened Fighter", type: "Warrior", discipline: 3, baseSuspicion: 1, constitution: 4, interactionStyle: "touch",
    group: "common",
    quirks: ["Knocks on surfaces", "Tests stability with force"],
    alluringQualities: { materials: ["Steel", "Gold"], traits: [], tags: ["Valuable"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Blacksteel", "Iron", "Cowhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["torn chainmail link strip", "a boot tongue", "piece of pauldron strap"],
  },
  {
    name: "Mercenary Guard", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    quirks: ["Checks corners before entering", "Distrusts ornate things"],
    alluringQualities: { materials: ["Iron", "Steel"], traits: [], tags: ["Valuable"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Iron", "Steel", "Cowhide"],
    lootTraits: [],
    partialLoot: ["torn tabard strip", "a gauntlet finger", "piece of boot leather"],
  },
  // ── Rangers ──
  {
    name: "Observant Ranger", type: "Ranger", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Watches airflow", "Listens for wildlife cues"],
    alluringQualities: { materials: ["Tanned Hide", "Oak"], traits: ["Rustic"], tags: ["Structural"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Deerskin", "Oak", "Boarhide"],
    lootTraits: [],
    partialLoot: ["strip of leather quiver strap", "a torn cloak edge", "scrap of hood"],
    companion: {
      chance: 0.60,
      options: [
        { nameSuffix: "'s Bear", type: "AnimalCompanion", ap: 4, discipline: 2, constitution: 4, description: "A large brown bear, loyal and dangerous." },
        { nameSuffix: "'s Hound", type: "AnimalCompanion", ap: 2, discipline: 2, constitution: 3, description: "A keen-nosed hunting hound, alert and tireless." },
        { nameSuffix: "'s Lynx", type: "AnimalCompanion", ap: 2, discipline: 3, constitution: 2, description: "A silent forest cat with ember-bright eyes." },
      ],
    },
  },
  {
    name: "Wilderness Scout", type: "Ranger", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "common",
    repelledBy: { traits: ["Gilded", "Lacquered"] },
    quirks: ["Marks exits mentally", "Stays near walls"],
    alluringQualities: { materials: ["Oak", "Deerskin"], traits: ["Weathered", "Worn", "Rustic", "Minimalist"], tags: ["Structural"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 2, acoustic: 2, presence: 0 },
    lootMaterials: ["Goatskin", "Linen", "Oak", "Birch"],
    lootTraits: [],
    partialLoot: ["torn wool blanket strip", "a boot sole", "scrap of hunting jacket"],
    companion: {
      chance: 0.50,
      options: [
        { nameSuffix: "'s Hound", type: "AnimalCompanion", ap: 2, discipline: 2, constitution: 3, description: "A lean scout's hound, trained for silence." },
        { nameSuffix: "'s Lynx", type: "AnimalCompanion", ap: 2, discipline: 3, constitution: 2, description: "A compact wildcat used for tracking." },
        { nameSuffix: "'s Ferret", type: "AnimalCompanion", ap: 1, discipline: 2, constitution: 2, description: "A quick ferret used to flush out quarry." },
      ],
    },
  },
  // ── Paladins ──
  {
    name: "Grizzled Paladin", type: "Paladin", discipline: 4, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    repelledBy: { materials: ["Gravecloth"], traits: ["Bloodstained", "Shadowed Presence"] },
    quirks: ["Detects evil presence", "Slow to trust but fierce when provoked"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Arched", "Radiant"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 2, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Gold", "Silver", "Granite", "Ironwood"],
    lootTraits: ["Sacred Symbol", "Heraldic Crest"],
    partialLoot: ["torn surcoat panel", "a holy symbol chain link", "scrap of blessed tabard"],
  },
  // ── Artificers ──
  {
    name: "Curious Artificer", type: "Artificer", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Takes notes on unusual objects", "Taps and measures everything"],
    alluringQualities: { materials: ["Iron", "Brass", "Crystal"], traits: ["Arcane Sigil", "Carved"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 1, magical: 1, social: 0, spatial: 2, environmental: 0, acoustic: 1, presence: 0 },
    lootMaterials: ["Brass", "Iron", "Crystal"],
    lootTraits: ["Arcane Sigil"],
    partialLoot: ["torn work apron strip", "a brass button", "scrap of tool belt"],
  },
  // ── Druids ──
  {
    name: "Wandering Druid", type: "Druid", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    repelledBy: { materials: ["Steel", "Blacksteel"], traits: ["Lacquered", "Polished", "Ornate"] },
    quirks: ["Speaks to animals before entering", "Uncomfortable indoors"],
    alluringQualities: { materials: ["Oak", "Feywood"], traits: ["Rustic", "Carved"], tags: ["Structural"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 3, acoustic: 1, presence: 2 },
    lootMaterials: ["Feywood", "Oak", "Wool"],
    lootTraits: [],
    partialLoot: ["strip of bark-cloth robe", "a vine cord", "torn leaf-pattern cloak"],
  },
  // ── Thieves / Assassins ──
  {
    name: "Silent Assassin", type: "Assassin", discipline: 4, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "common",
    repelledBy: { traits: ["Gilded", "Faint Glow", "Radiant", "Ornate"] },
    quirks: ["Never announces presence", "Studies shadows carefully"],
    alluringQualities: { materials: ["Shadowwood", "Silk"], traits: ["Minimalist"], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 1, social: 0, spatial: 2, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Shadowwood", "Goatskin", "Steel", "Smoked Glass"],
    lootTraits: ["Shadowed Presence"],
    partialLoot: ["torn black cloak strip", "a garotte cord", "scrap of shadow-dyed leather"],
  },
  // ── Dwarves / non-human ──
  {
    name: "Dwarf Prospector", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    quirks: ["Taps walls for hollow sounds", "Obsessed with metals and stonework"],
    alluringQualities: { materials: ["Gold", "Mithril", "Obsidian"], traits: [], tags: ["Valuable", "Structural"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 2, environmental: 0, acoustic: 2, presence: 0 },
    lootMaterials: ["Iron", "Granite", "Blacksteel", "Limestone"],
    lootTraits: ["Pitted"],
    partialLoot: ["torn mining smock strip", "a belt buckle", "scrap of heavy wool tunic"],
  },
  {
    name: "Elven Arcanist", type: "Wizard", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Detects enchantments passively", "Questions everything out of place"],
    alluringQualities: { materials: ["Feywood", "Aether Crystal"], traits: ["Arcane Sigil", "Runescript", "Whispering"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 0, text: 2, magical: 3, social: 0, spatial: 2, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Feywood", "Aether Crystal", "Spellweave Silk"],
    lootTraits: ["Runescript", "Arcane Sigil", "Faint Glow"],
    partialLoot: ["scrap of elven-woven robe", "a runed button", "torn enchanted sleeve"],
  },
  {
    name: "Halfling Treasure Hunter", type: "Rogue", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Pockets small items instinctively", "Underestimates danger"],
    alluringQualities: { materials: ["Gold", "Silver", "Crystal"], traits: ["Upholstered", "Locked", "Heavy-Lidded"], tags: ["Valuable", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 2, text: 0, magical: 0, social: 1, spatial: 1, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Silk", "Silver", "Linen"],
    lootTraits: [],
    partialLoot: ["torn waistcoat patch", "a brace button", "scrap of foot-wrap wool"],
  },

  // ── Elite / Greater+ only ──
  {
    name: "Mimic Hunter", type: "Hunter", discipline: 5, baseSuspicion: 5, constitution: 5, interactionStyle: "touch",
    group: "huntersElites",
    repelledBy: { traits: ["Locked", "Heavy-Lidded"] },
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Taps every surface methodically", "Carries a vial of acid for testing", "Never touches anything without gloves"],
    alluringQualities: { materials: ["Gold"], traits: [], tags: ["Valuable"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 3, text: 1, magical: 2, social: 0, spatial: 3, environmental: 2, acoustic: 2, presence: 3 },
    lootMaterials: ["Blacksteel", "Mithril", "Dragonhide"],
    lootTraits: ["Runescript"],
    partialLoot: ["vial of mimic acid", "a silver detection rod shard", "strip of warded leather coat"],
    // Elite companions: stronger than ordinary ones, and less common
    companion: {
      chance: 0.35,
      options: [
        {
          nameSuffix: "'s Bloodhound", type: "AnimalCompanion", ap: 5, discipline: 4, constitution: 4,
          description: "A mimic-hunting bloodhound, trained to bay at anything that smells of digestion.",
          perceptionAffinity: { material: 2, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 3, acoustic: 2, presence: 2 },
          // Only some bloodhounds are trained on the scent of a mimic's meals
          behavior: "bloodScent", behaviorChance: 0.30,
          lootMaterials: ["Tanned Hide"],
          partialLoot: ["a drooping ear tip", "a strip of warded leather collar", "a fold of loose jowl"],
        },
      ],
    },
  },
  {
    name: "Draconic Bounty Hunter", type: "Hunter", discipline: 5, baseSuspicion: 4, constitution: 5, interactionStyle: "spell",
    group: "huntersElites",
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Speaks to rooms aloud before entering", "Detects heat signatures instinctively", "Refuses to sit or lean on anything"],
    alluringQualities: { materials: ["Gold", "Obsidian"], traits: ["Arcane Sigil"], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 1, magical: 3, social: 0, spatial: 2, environmental: 3, acoustic: 1, presence: 3 },
    lootMaterials: ["Dragonhide", "Starforged Iron", "Aether Crystal"],
    lootTraits: ["Arcane Sigil"],
    partialLoot: ["scale of draconic armor", "a bounty contract scrap", "torn dragonhide glove"],
  },
  {
    name: "Gnomish Tinkerer-Hunter", type: "Hunter", discipline: 4, baseSuspicion: 5, constitution: 3, interactionStyle: "touch",
    group: "huntersElites",
    repelledBy: { traits: ["Locked"] },
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Carries mechanical probes that measure density", "Obsessed with metalwork and alloys", "Taps every surface with a tiny silver hammer"],
    alluringQualities: { materials: ["Mithril", "Brass", "Iron", "Gold"], traits: ["Arcane Sigil", "Etched"], tags: ["Valuable", "Knowledge"] },
    perceptionAffinity: { material: 4, structure: 3, weight: 3, text: 1, magical: 1, social: 0, spatial: 2, environmental: 0, acoustic: 3, presence: 0 },
    lootMaterials: ["Brass", "Mithril", "Crystal"],
    lootTraits: ["Arcane Sigil"],
    partialLoot: ["a brass probe tip", "strip of leather tool harness", "tiny silver hammer handle"],
  },
  {
    name: "Orcish Tracker", type: "Hunter", discipline: 5, baseSuspicion: 3, constitution: 6, interactionStyle: "touch",
    group: "huntersElites",
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Follows scent trails", "Breaks off pieces of suspicious objects to taste them", "Ignores anything that doesn't smell like prey"],
    alluringQualities: { materials: ["Iron", "Bonesteel", "Horn", "Boarhide"], traits: ["Bloodstained", "Worn", "Reinforced"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 3, text: 0, magical: 0, social: 0, spatial: 2, environmental: 3, acoustic: 1, presence: 2 },
    lootMaterials: ["Boarhide", "Iron", "Horn"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["strip of studded hide armor", "a bone talisman shard", "torn tusk-leather belt"],
    companion: {
      chance: 0.40,
      options: [
        {
          nameSuffix: "'s War Boar", type: "AnimalCompanion", ap: 5, discipline: 3, constitution: 5,
          description: "A tusked war boar in a spiked harness. It roots through rooms snout-first.",
          perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 3, acoustic: 1, presence: 1 },
          lootMaterials: ["Boarhide", "Horn"],
          partialLoot: ["a chipped tusk", "a tuft of bristly hide", "a spike from its harness"],
        },
        {
          nameSuffix: "'s Warg", type: "AnimalCompanion", ap: 6, discipline: 4, constitution: 4,
          description: "A hulking, red-eyed warg that hunts in silence at its master's side.",
          perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 1, social: 0, spatial: 2, environmental: 3, acoustic: 2, presence: 2 },
          lootMaterials: ["Direwolf Pelt"],
          partialLoot: ["a hank of coarse black fur", "a broken fang", "a torn ear"],
        },
      ],
    },
  },
  {
    name: "Tiefling Hexblade", type: "Hunter", discipline: 5, baseSuspicion: 4, constitution: 4, interactionStyle: "spell",
    group: "huntersElites",
    repelledBy: { traits: ["Sacred Symbol"] },
    minTier: "Apex", isMimicHunter: true,
    quirks: ["Can sense the life-force of a mimic's last meal", "Wears gloves treated with mimic-repellent", "Counts corners in every room — mimics always have one too many"],
    alluringQualities: { materials: ["Obsidian", "Shadowwood", "Void Marble"], traits: ["Arcane Sigil", "Shadowed Presence"], tags: ["Valuable", "Knowledge"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 2, magical: 4, social: 0, spatial: 3, environmental: 2, acoustic: 1, presence: 4 },
    lootMaterials: ["Obsidian", "Shadowwood", "Starforged Iron"],
    lootTraits: ["Arcane Sigil", "Shadowed Presence"],
    partialLoot: ["a hex-marked contract shard", "fragment of obsidian focus", "torn shadow-silk glove"],
  },
  {
    name: "Veteran Inquisitor", type: "Paladin", discipline: 5, baseSuspicion: 5, constitution: 4, interactionStyle: "touch",
    group: "huntersElites",
    repelledBy: { materials: ["Shadowwood", "Void Marble"], traits: ["Arcane Sigil", "Shadowed Presence", "Bloodstained", "Whispering"] },
    minTier: "Grand",
    quirks: ["Casts detect magic on entry", "Marks rooms with chalk sigils", "Interrogates every object aloud"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Runescript", "Arched", "Radiant"], tags: ["Religious"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 2, magical: 3, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Gold", "Mithril", "Spellweave Silk"],
    lootTraits: ["Sacred Symbol", "Heraldic Crest"],
    partialLoot: ["torn inquisitor's surcoat", "a holy sigil badge", "fragment of warded gauntlet"],
  },
  {
    name: "Grand Arcanist", type: "Wizard", discipline: 6, baseSuspicion: 5, constitution: 3, interactionStyle: "spell",
    group: "huntersElites",
    minTier: "Grand",
    quirks: ["Maintains a permanent magical sight", "Questions spatial anomalies obsessively", "Takes rubbings of every surface"],
    alluringQualities: { materials: ["Aether Crystal", "Feywood"], traits: ["Runescript", "Arcane Sigil"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 3, magical: 4, social: 0, spatial: 3, environmental: 2, acoustic: 1, presence: 3 },
    lootMaterials: ["Aether Crystal", "Feywood", "Soulglass", "Void Marble"],
    lootTraits: ["Runescript", "Arcane Sigil"],
    partialLoot: ["torn archmage robe panel", "a crystalline focus shard", "scrap of runed glove"],
  },

  // ── Commoners / Non-combatants ──
  {
    name: "Frightened Peasant", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence", "Cold to Touch", "Whispering"] },
    quirks: ["Jumps at shadows", "Clutches holy symbol", "Easily startled by unusual things"],
    alluringQualities: { materials: ["Cotton", "Wool", "Linen"], traits: ["Worn", "Dusty", "Upholstered", "Rustic", "Warm to Touch"], tags: ["Comfort", "Storage"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Wool", "Linen", "Burlap", "Pine"],
    lootTraits: [],
    partialLoot: ["torn wool smock", "a rope belt", "scrap of burlap sack"],
  },
  {
    name: "Road Vagabond", type: "Commoner", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "commoners",
    quirks: ["Rifles through anything unlocked", "Sleeps anywhere flat", "Interested in anything left behind"],
    alluringQualities: { materials: ["Iron", "Brass", "Cotton"], traits: ["Worn", "Weathered", "Tarnished", "Rustic", "Warm to Touch"], tags: ["Storage", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Linen", "Cowhide", "Iron"],
    lootTraits: ["Wrinkled"],
    partialLoot: ["patched travelling cloak strip", "a worn boot sole", "scrap of road-stained linen"],
  },

  // ── Escort targets (non-combatants carried by parties) ──
  {
    name: "The King", type: "Nobility", discipline: 2, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    repelledBy: { materials: ["Burlap", "Cotton"], traits: ["Cracked", "Worn", "Dusty", "Tarnished", "Rustic", "Minimalist"] },
    quirks: ["Demands everything be inspected by guards first", "Attracted to displays of wealth", "Expects furnishings worthy of royalty"],
    alluringQualities: { materials: ["Gold", "Marble", "Silk", "Velvet"], traits: ["Gilded", "Inlaid", "Polished", "Upholstered", "Ornate"], tags: ["Valuable", "Authority", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 1, magical: 0, social: 2, spatial: 0, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Gold", "Silk", "Velvet"],
    lootTraits: ["Gilded", "Heraldic Crest"],
    partialLoot: ["torn ermine trim", "a golden signet ring shard", "scrap of royal velvet cloak"],
    companion: {
      chance: 0.35,
      options: [
        { nameSuffix: "'s Hunting Hound", type: "AnimalCompanion", ap: 3, discipline: 2, constitution: 3, description: "A prize-bred hunting dog, well fed and obedient." },
        { nameSuffix: "'s Attendant", type: "Commoner", ap: 2, discipline: 1, constitution: 2, description: "A dutiful royal attendant, entirely unprepared for this." },
      ],
    },
  },
  {
    name: "The Princess", type: "Nobility", discipline: 1, baseSuspicion: 2, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    repelledBy: { materials: ["Burlap"], traits: ["Cracked", "Dusty", "Bloodstained", "Rough-Hewn", "Rustic", "Cold to Touch", "Minimalist"] },
    quirks: ["Reaches out to touch pretty things", "Easily enchanted by ornate objects", "Wanders from her escort"],
    alluringQualities: { materials: ["Gold", "Silver", "Silk", "Crystal"], traits: ["Gilded", "Inlaid", "Polished", "Etched", "Upholstered", "Ornate"], tags: ["Valuable", "Comfort", "Decor"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 1, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Silk", "Silver", "Crystal", "Satin"],
    lootTraits: ["Gilded"],
    partialLoot: ["strip of silk gown hem", "a pearl button", "scrap of lace trim"],
    companion: {
      chance: 0.40,
      options: [
        { nameSuffix: "'s Lady-in-Waiting", type: "Commoner", ap: 2, discipline: 1, constitution: 2, description: "A noble attendant, fussing nervously at the princess's side." },
        { nameSuffix: "'s Servant", type: "Commoner", ap: 1, discipline: 1, constitution: 2, description: "A frightened young servant carrying the princess's parcels." },
      ],
    },
  },
  {
    name: "The High Merchant", type: "Nobility", discipline: 3, baseSuspicion: 2, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    repelledBy: { traits: ["Cracked", "Worn", "Tarnished", "Rustic", "Minimalist"] },
    quirks: ["Mentally appraises everything", "Tests material quality with fingers", "Offers to buy things on the spot"],
    alluringQualities: { materials: ["Gold", "Silver", "Mahogany", "Silk"], traits: ["Polished", "Lacquered", "Gilded", "Ornate"], tags: ["Valuable", "Storage", "Dining"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Gold", "Silver", "Mahogany", "Marble"],
    lootTraits: ["Gilded", "Lacquered"],
    partialLoot: ["torn merchant coat lining", "a wax seal stamp", "scrap of velvet money pouch"],
  },

  // ── Warlock with familiar ──
  {
    name: "Pact-Bound Warlock", type: "Wizard", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    repelledBy: { traits: ["Sacred Symbol"] },
    quirks: ["Speaks to unseen entities", "Prefers shadowy corners", "Reacts strangely near magical objects"],
    alluringQualities: { materials: ["Shadowwood", "Obsidian", "Gravecloth"], traits: ["Arcane Sigil", "Shadowed Presence", "Whispering"], tags: ["Knowledge", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 3, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Shadowwood", "Gravecloth", "Obsidian", "Ebonwood"],
    lootTraits: ["Arcane Sigil", "Shadowed Presence"],
    partialLoot: ["torn warlock pact-cloth", "a bound iron focus shard", "scrap of shadow-dyed robe"],
    companion: {
      chance: 0.65,
      options: [
        { nameSuffix: "'s Imp", type: "Familiar", ap: 3, discipline: 3, constitution: 2, description: "A leathery imp bound to its master's will." },
        { nameSuffix: "'s Felhound", type: "Familiar", ap: 4, discipline: 3, constitution: 3, description: "A muscular hellhound trailing brimstone smoke." },
      ],
    },
  },

  // ── The Hollow Reliquary (rare location) ──
  {
    name: "Wide-Eyed Pilgrim", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["hollow_reliquary"],
    behavior: "devotion", convertedName: "Consumption Zealot",
    quirks: ["Kisses every relic it passes", "Hums hymns about a chest that eats sinners", "Lingers at the empty altar long after the others move on"],
    alluringQualities: { materials: ["Gold", "Oak"], traits: ["Sacred Symbol", "Heavy-Lidded", "Carved", "Faint Glow"], tags: ["Religious", "Storage"] },
    perceptionAffinity: { material: 0, structure: 1, weight: 0, text: 1, magical: 1, social: 0, spatial: 0, environmental: 0, acoustic: 1, presence: 2 },
    lootMaterials: ["Linen", "Wool"],
    lootTraits: ["Sacred Symbol"],
    partialLoot: ["a frayed pilgrim's sash", "a tin pilgrim badge", "a string of prayer beads"],
  },
  {
    name: "Pilgrim Elder", type: "Cleric", discipline: 3, baseSuspicion: 2, constitution: 2, interactionStyle: "spell",
    group: "commoners",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence"] },
    locations: ["hollow_reliquary"],
    behavior: "devotion", convertedName: "Elder Zealot",
    quirks: ["Leads the prayers in a cracked, carrying voice", "Remembers how the shrine looked fifty years ago", "Blesses anything left on the altar"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Gilded", "Radiant"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 2, social: 1, spatial: 2, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Silver", "Linen", "Stained Glass"],
    lootTraits: ["Sacred Symbol", "Wrinkled"],
    partialLoot: ["a tarnished censer chain", "a strip of vestment hem", "a well-thumbed hymnal page"],
  },
  {
    name: "Shrine Guard", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Cracked"] },
    locations: ["hollow_reliquary"],
    quirks: ["Paid to keep thieves out, not to believe", "Raps the pommel of their sword on anything suspicious", "Counts the relics at every shift change"],
    alluringQualities: { materials: ["Iron", "Steel"], traits: ["Locked", "Reinforced", "Iron-Banded"], tags: ["Defensive", "Storage"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 1, presence: 1 },
    lootMaterials: ["Steel", "Cowhide"],
    lootTraits: ["Etched"],
    partialLoot: ["a dented helm strap", "a ring of shrine keys", "a strip of tabard"],
  },
  {
    name: "Relic-Seeker", type: "Rogue", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "touch",
    group: "common",
    locations: ["hollow_reliquary"],
    quirks: ["Posing as a pilgrim, fooling no one", "Pries at every lock and seam", "Knows exactly what the old reliquary chest was worth"],
    alluringQualities: { materials: ["Gold", "Silver", "Mahogany"], traits: ["Locked", "Inlaid", "Gilded"], tags: ["Valuable", "Storage"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 1, magical: 0, social: 0, spatial: 1, environmental: 0, acoustic: 1, presence: 0 },
    lootMaterials: ["Silver", "Tanned Hide"],
    lootTraits: ["Inlaid"],
    partialLoot: ["a bent lockpick", "a stolen saint's knucklebone", "a scrap of a forged pilgrim's pass"],
  },
  {
    name: "Doubting Scholar", type: "Wizard", discipline: 3, baseSuspicion: 2, constitution: 2, interactionStyle: "sight",
    group: "common",
    locations: ["hollow_reliquary"],
    quirks: ["Writing a treatise on why the legend is false", "Measures the altar where the chest once stood", "Reads every inscription aloud, skeptically"],
    alluringQualities: { materials: ["Walnut", "Linen"], traits: ["Runescript", "Etched", "Carved", "Minimalist"], tags: ["Knowledge", "Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 3, magical: 1, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Linen", "Walnut", "Clear Glass"],
    lootTraits: ["Etched"],
    partialLoot: ["an ink-stained cuff", "a page of skeptical notes", "a broken reading lens"],
  },

  // ── The Mimic Nest (rare location) ──
  {
    name: "Warehouse Watchman", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    locations: ["mimic_nest"],
    quirks: ["Walks the same round every hour, lantern held high", "Swears the crates were stacked differently yesterday", "Won't sit on anything in here anymore"],
    alluringQualities: { materials: ["Oak", "Iron"], traits: ["Locked", "Iron-Banded"], tags: ["Storage", "Seating"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Iron", "Wool", "Clear Glass"],
    lootTraits: ["Pitted"],
    partialLoot: ["a cracked lantern shutter", "a ring of warehouse keys", "a strip of oilskin coat"],
  },
  {
    name: "Cargo Assessor", type: "Artificer", discipline: 3, baseSuspicion: 3, constitution: 2, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Cracked", "Worn"] },
    locations: ["mimic_nest"],
    quirks: ["Counts every crate against the manifest — there is always one too many", "Taps lids to judge what's inside", "Sent by the insurers, and furious about it"],
    alluringQualities: { materials: ["Mahogany", "Brass"], traits: ["Locked", "Lacquered", "Polished"], tags: ["Storage", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 3, text: 2, magical: 0, social: 0, spatial: 1, environmental: 0, acoustic: 1, presence: 0 },
    lootMaterials: ["Brass", "Linen"],
    lootTraits: ["Lacquered"],
    partialLoot: ["a page of the cargo manifest", "a brass measuring rule", "an ink-stained cuff"],
  },
  {
    name: "Rat-Catcher", type: "Ranger", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "commoners",
    locations: ["mimic_nest"],
    quirks: ["Hired to deal with \"the rat problem\" — has seen no rats", "Lays traps in every corner", "Talks to their terrier as if it understands"],
    alluringQualities: { materials: ["Burlap", "Pine"], traits: ["Worn", "Dusty", "Weathered"], tags: ["Storage", "Coastal"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 2, presence: 1 },
    lootMaterials: ["Burlap", "Goatskin", "Pine"],
    lootTraits: ["Mossy"],
    partialLoot: ["a sprung rat trap", "a leather glove, bitten through", "a sack smelling of bait"],
    companion: {
      chance: 0.50,
      options: [
        { nameSuffix: "'s Terrier", type: "AnimalCompanion", ap: 1, discipline: 2, constitution: 2, description: "A wiry terrier that growls at the crates, and is right to." },
      ],
    },
  },
  {
    name: "Missing Porter's Sister", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["mimic_nest"],
    quirks: ["Calls her brother's name into every room", "Opens every chest big enough to hide a person", "Refuses to leave until she finds him"],
    alluringQualities: { materials: ["Pine", "Cotton"], traits: ["Worn", "Heavy-Lidded"], tags: ["Storage", "Comfort"] },
    perceptionAffinity: { material: 0, structure: 1, weight: 1, text: 0, magical: 0, social: 1, spatial: 1, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Cotton", "Linen"],
    lootTraits: ["Soft"],
    partialLoot: ["a hand-drawn portrait of her brother", "a frayed shawl corner", "a porter's tin token"],
  },

  // ── The Sinking Ship (rare location) ──
  {
    name: "Ship's Captain", type: "Nobility", discipline: 4, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "commoners",
    locations: ["sinking_ship"],
    behavior: "elusive",
    treasure: {
      ap: 8, description: "the ship's strongbox, still clutched to their chest",
      materials: ["Gold", "Silver", "Crystal"], traits: ["Heraldic Crest", "Guild Mark"],
    },
    quirks: ["Refuses to abandon ship without the strongbox", "Barks orders at anything that moves", "Knows every inch of this hull — and that one chest wasn't in the manifest"],
    alluringQualities: { materials: ["Brass", "Mahogany", "Gold"], traits: ["Locked", "Iron-Banded", "Polished"], tags: ["Storage", "Valuable", "Authority"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 1, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 1 },
    lootMaterials: ["Brass", "Mahogany", "Gold"],
    lootTraits: ["Pitted"],
    partialLoot: ["a gold-braided epaulette", "a sodden logbook page", "the strongbox key on a chain"],
  },
  {
    name: "First Mate", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    locations: ["sinking_ship"],
    quirks: ["Trying to drag the captain to the lifeboats", "Shoves anything loose overboard to lighten the ship", "Shouts headcounts that keep coming up short"],
    alluringQualities: { materials: ["Oak", "Iron"], traits: ["Reinforced", "Weathered"], tags: ["Structural", "Transport"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Oak", "Cowhide"],
    lootTraits: ["Lacquered"],
    partialLoot: ["a tarred rope end", "a strip of salt-stiff coat", "a bosun's whistle"],
  },
  {
    name: "Ship's Cook", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 3, interactionStyle: "touch",
    group: "commoners",
    locations: ["sinking_ship"],
    quirks: ["Salvaging the good knives before anything else", "Swears at the water as if it can hear", "Grabs any sturdy container to bail with"],
    alluringQualities: { materials: ["Pine", "Iron", "Brass"], traits: ["Worn", "Soft"], tags: ["Dining", "Storage"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 0, spatial: 0, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Iron", "Linen"],
    lootTraits: ["Pitted"],
    partialLoot: ["a greasy apron string", "a ladle", "a sack of soaked flour"],
  },
  {
    name: "Panicked Passenger", type: "Nobility", discipline: 1, baseSuspicion: 2, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["sinking_ship"],
    quirks: ["Trying to save their luggage instead of themselves", "Opens every trunk looking for their own", "Screams at sudden movements"],
    alluringQualities: { materials: ["Silk", "Velvet", "Silver"], traits: ["Upholstered", "Gilded", "Locked"], tags: ["Storage", "Valuable", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 0, magical: 0, social: 1, spatial: 0, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Silk", "Silver"],
    lootTraits: ["Gilded"],
    partialLoot: ["a sodden silk glove", "a luggage tag", "a pearl-handled hatpin"],
  },
  {
    name: "Deckhand", type: "Rogue", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "common",
    locations: ["sinking_ship"],
    quirks: ["Pocketing whatever the passengers leave behind", "Climbs rather than walks", "Eyes the captain's strongbox"],
    alluringQualities: { materials: ["Brass", "Silver"], traits: ["Locked", "Inlaid"], tags: ["Valuable", "Storage"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Linen", "Brass"],
    lootTraits: ["Inlaid"],
    partialLoot: ["a knotted bandana", "a stolen pocket watch", "a coil of rigging line"],
  },

  // ── Supernatural / Monster types ──
  {
    name: "Vampire Noble", type: "Undead", discipline: 5, baseSuspicion: 3, constitution: 4, interactionStyle: "sight",
    group: "supernatural",
    repelledBy: { traits: ["Sacred Symbol", "Faint Glow", "Radiant"] },
    locations: ["noble_estate", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle"],
    quirks: ["Drawn to bloodstained objects", "Cannot enter without invitation — waits at thresholds", "Hypersensitive to magical auras"],
    alluringQualities: { materials: ["Gold", "Silver", "Silk", "Gravecloth", "Bloodoak"], traits: ["Bloodstained", "Tarnished", "Gilded", "Upholstered", "Cold to Touch", "Ornate"], tags: ["Valuable", "Comfort", "Religious"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 0, text: 1, magical: 3, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 4 },
    lootMaterials: ["Gravecloth", "Silk", "Gold", "Bloodoak"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["strip of vampire cloak", "a silver-inlaid ring shard", "scrap of ancient funeral silk", "splinter of bloodoak coffin wood"],
  },
  {
    name: "Minotaur Sellsword", type: "Warrior", discipline: 4, baseSuspicion: 1, constitution: 5, interactionStyle: "touch",
    group: "supernatural",
    quirks: ["Sniffs everything before trusting it", "Navigates by scent more than sight", "Attracted to sturdy, large furnishings"],
    alluringQualities: { materials: ["Iron", "Steel", "Oak", "Horn"], traits: ["Reinforced", "Iron-Banded", "Worn"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 3, weight: 3, text: 0, magical: 0, social: 0, spatial: 2, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Horn", "Iron", "Boarhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["a broken horn shard", "strip of iron-studded leather", "scrap of rough ox-hide"],
  },
  {
    name: "Cursed Revenant", type: "Undead", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "supernatural",
    repelledBy: { traits: ["Sacred Symbol", "Pristine"] },
    locations: ["manor", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle", "lonely_moor"],
    quirks: ["Fixated on objects from their past life", "Ignores most things unless they trigger recognition", "Slow but relentless — its body is intact, unlike a zombie"],
    alluringQualities: { materials: ["Oak", "Linen", "Iron"], traits: ["Bloodstained", "Worn", "Cracked", "Dusty", "Cold to Touch"], tags: ["Comfort", "Structural"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 1, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Gravecloth", "Iron", "Linen", "Cowhide"],
    lootTraits: ["Bloodstained", "Pitted"],
    partialLoot: ["strip of burial shroud", "a rusted iron clasp", "scrap of grave-dirt-stained wool", "torn leather boot from its past life"],
  },

  {
    name: "Wailing Banshee", type: "Undead", discipline: 4, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "supernatural",
    repelledBy: { traits: ["Pristine", "Radiant"] },
    locations: ["haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle", "lonely_moor"],
    behavior: "keenHearing",
    quirks: ["A gaunt, grave-pale crone — flesh and bone, whatever the stories say", "Turns toward every creak and footstep", "Keens softly when something nearby moves"],
    alluringQualities: { materials: ["Gravecloth", "Soulglass", "Silver"], traits: ["Tarnished", "Etched", "Whispering"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 1, acoustic: 4, presence: 3 },
    lootMaterials: ["Gravecloth", "Soulglass"],
    lootTraits: ["Shadowed Presence"],
    partialLoot: ["a lock of grave-white hair", "strip of tattered burial veil", "a cracked, yellowed fingernail"],
  },
  {
    name: "Ghoul", type: "Undead", discipline: 2, baseSuspicion: 1, constitution: 4, interactionStyle: "touch",
    group: "supernatural",
    repelledBy: { traits: ["Sacred Symbol", "Faint Glow", "Radiant", "Warm to Touch"] },
    locations: ["manor", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle"],
    behavior: "carrionScent",
    quirks: ["Sniffs at cupboards and larders", "Gnaws on anything that smells of meat", "Follows the scent of a fresh kill"],
    alluringQualities: { materials: ["Bonesteel", "Cowhide"], traits: ["Pitted", "Cold to Touch"], tags: ["Dining", "Storage"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 3, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Bonesteel", "Cowhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["strip of grave-soiled rags", "a gnawed knucklebone", "a clump of matted hair"],
  },
  {
    name: "Fey Changeling", type: "Fey", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    minTier: "Standard",
    group: "supernatural",
    repelledBy: { materials: ["Iron", "Steel", "Blacksteel"], traits: ["Iron-Banded"] },
    locations: ["wizard_tower", "noble_estate", "hidden_grove", "crossroads"],
    behavior: "shapeSense",
    quirks: ["Its face never quite settles on one shape", "Feels the moment anything nearby changes its form", "Cannot resist pretty, delicate things"],
    alluringQualities: { materials: ["Feywood", "Silk"], traits: ["Mossy", "Inlaid", "Faint Glow"], tags: ["Decor", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 1, magical: 2, social: 3, spatial: 1, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Feywood", "Spellweave Silk"],
    lootTraits: ["Mossy"],
    partialLoot: ["a lock of shifting, silver hair", "scrap of dew-damp silk", "a petal-shaped scale"],
    companion: {
      chance: 0.50,
      options: [
        {
          nameSuffix: "'s Pixie", type: "Familiar", ap: 2, discipline: 3, constitution: 1, interactionStyle: "spell",
          description: "A thumb-sized pixie that darts about its master's head, giggling at nothing.",
          perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 2, social: 1, spatial: 1, environmental: 1, acoustic: 1, presence: 2 },
          lootMaterials: ["Feywood"],
          lootTraits: ["Faint Glow"],
          partialLoot: ["a gossamer wing", "a pinch of glittering dust", "a thistledown cap"],
        },
        {
          nameSuffix: "'s Thorn Sprite", type: "Familiar", ap: 2, discipline: 3, constitution: 2, interactionStyle: "spell",
          description: "A prickly little sprite armored in bark, fiercely protective of its master.",
          perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 2, acoustic: 0, presence: 2 },
          lootMaterials: ["Feywood"],
          lootTraits: ["Mossy"],
          partialLoot: ["a bramble-thorn spine", "a curl of bark armor", "a pinch of glittering dust"],
        },
      ],
    },
  },
  {
    name: "Gargoyle", type: "Construct", discipline: 3, baseSuspicion: 2, constitution: 6, interactionStyle: "sight",
    minTier: "Standard",
    group: "supernatural",
    locations: ["wizard_tower", "noble_estate", "cursed_chapel", "ruined_city", "abandoned_castle"],
    behavior: "stoneWatch",
    quirks: ["Never moves from its perch", "Memorizes where every object in sight sits", "Watches without blinking for hours"],
    alluringQualities: { materials: ["Marble", "Granite", "Basalt"], traits: ["Etched", "Pitted", "Sacred Symbol", "Arched", "Cold to Touch"], tags: ["Structural", "Religious"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 1, social: 0, spatial: 4, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Basalt", "Runestone", "Marble"],
    lootTraits: ["Etched"],
    partialLoot: ["a chip of weathered stone", "a broken stone talon", "grit from a cracked wing"],
  },
  {
    name: "Werewolf", type: "Beast", discipline: 5, baseSuspicion: 2, constitution: 6, interactionStyle: "touch",
    minTier: "Greater",
    group: "supernatural",
    repelledBy: { materials: ["Silver"] },
    locations: ["manor", "hidden_grove", "country_road", "ruined_mill", "lonely_moor"],
    behavior: "bloodScent",
    quirks: ["Follows the smell of blood through walls", "Paces restlessly between rooms", "Snarls at anything that smells wrong"],
    alluringQualities: { materials: ["Direwolf Pelt", "Oak"], traits: ["Mossy", "Rough-Hewn", "Rustic"], tags: ["Rural"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 0, spatial: 2, environmental: 4, acoustic: 2, presence: 2 },
    lootMaterials: ["Direwolf Pelt", "Boarhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["a tuft of coarse grey fur", "a cracked claw", "strip of torn, half-shifted hide"],
  },

  // ── Giant-kin (Apex only, minMass gated) ──
  {
    name: "Half-Giant Mercenary", type: "Warrior", discipline: 4, baseSuspicion: 1, constitution: 7, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 28, wholeMealMass: 36,
    quirks: ["Shoves furniture to test sturdiness", "Sits on things without asking", "Drawn to large, sturdy objects"],
    alluringQualities: { materials: ["Giant Oak", "Giant Iron", "Beanstalk Leather"], traits: ["Reinforced", "Iron-Banded", "Heavy-Lidded"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 4, weight: 4, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 2, presence: 0 },
    lootMaterials: ["Giant Oak", "Giant Iron", "Beanstalk Leather"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["a massive belt buckle", "strip of giant-hide jerkin", "enormous boot sole"],
  },
  {
    name: "Giant-Blood Shaman", type: "Druid", discipline: 4, baseSuspicion: 3, constitution: 6, interactionStyle: "spell",
    group: "giantKin",
    repelledBy: { traits: ["Polished", "Lacquered", "Pristine"] },
    minTier: "Apex", minMass: 28, wholeMealMass: 36,
    quirks: ["Chants at suspicious objects", "Smells for earth-magic residue", "Distrustful of anything too neat or symmetrical"],
    alluringQualities: { materials: ["Beanstalk Timber", "Giant Oak", "Cloud Fleece"], traits: ["Mossy", "Weathered", "Rough-Hewn", "Rustic"], tags: ["Structural", "Rural"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 3, social: 0, spatial: 2, environmental: 4, acoustic: 1, presence: 3 },
    lootMaterials: ["Beanstalk Timber", "Cloud Fleece", "Giant Oak"],
    lootTraits: ["Mossy"],
    partialLoot: ["a woven reed charm", "strip of bark-wrapped hide", "pouch of giant-fern spores"],
  },
  {
    name: "Cloud Giant Scout", type: "Warrior", discipline: 5, baseSuspicion: 2, constitution: 9, interactionStyle: "touch",
    group: "giantKin",
    repelledBy: { traits: ["Cracked", "Dusty"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 43,
    locations: ["cloud_kingdom"],
    quirks: ["Everything is too small — they break things accidentally", "Listens at walls with ear to stone", "Attracted to gold and goose-feather items"],
    alluringQualities: { materials: ["Giant Gold", "Golden Goose Down", "Giant Marble"], traits: ["Gilded", "Polished", "Inlaid"], tags: ["Valuable", "Comfort", "Authority"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 5, text: 0, magical: 1, social: 0, spatial: 3, environmental: 2, acoustic: 3, presence: 1 },
    lootMaterials: ["Giant Gold", "Golden Goose Down", "Giant Marble"],
    lootTraits: ["Gilded"],
    partialLoot: ["a cloud-giant coin (enormous)", "tuft of golden goose down", "shard of giant marble flagstone"],
  },
  {
    name: "Storm Giant Wanderer", type: "Warrior", discipline: 6, baseSuspicion: 2, constitution: 12, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 38, wholeMealMass: 48,
    locations: ["cloud_kingdom"],
    quirks: ["Shakes the ground when walking", "Can sense electrical charge — mimic bio-electricity makes them cautious", "Attracted to enormous structural objects"],
    alluringQualities: { materials: ["Stormforged Iron", "Giant Granite", "Beanstalk Timber"], traits: ["Iron-Banded", "Rough-Hewn", "Carved"], tags: ["Structural", "Defensive"] },
    perceptionAffinity: { material: 3, structure: 5, weight: 5, text: 0, magical: 2, social: 0, spatial: 3, environmental: 3, acoustic: 4, presence: 2 },
    lootMaterials: ["Stormforged Iron", "Giant Granite", "Beanstalk Timber"],
    lootTraits: ["Pitted"],
    partialLoot: ["a stormforged iron rivet", "shard of giant granite block", "length of beanstalk rope"],
  },
  {
    name: "Giant Lord", type: "Nobility", discipline: 6, baseSuspicion: 3, constitution: 14, interactionStyle: "sight",
    group: "giantKin",
    repelledBy: { traits: ["Tarnished", "Cracked", "Dusty", "Rustic"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 52,
    locations: ["cloud_kingdom"],
    quirks: ["Holds court from whatever seat is grandest", "Knows exactly where everything in its hall belongs", "Never hurries — the whole outpost moves around it"],
    alluringQualities: { materials: ["Giant Gold", "Giant Marble", "Stormforged Iron"], traits: ["Gilded", "Ornate", "Heraldic Crest", "Inlaid"], tags: ["Authority", "Valuable", "Seating"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 4, text: 2, magical: 2, social: 4, spatial: 4, environmental: 2, acoustic: 2, presence: 3 },
    lootMaterials: ["Giant Gold", "Stormforged Iron", "Giant Marble"],
    lootTraits: ["Gilded", "Heraldic Crest"],
    partialLoot: ["a signet ring the size of a shield", "strip of storm-dyed royal mantle", "a chip of crown-gold"],
  },
  {
    name: "Cloud Forge Smith", type: "Artificer", discipline: 5, baseSuspicion: 2, constitution: 10, interactionStyle: "touch",
    group: "giantKin",
    repelledBy: { traits: ["Cracked", "Pitted"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 45,
    locations: ["cloud_kingdom"],
    quirks: ["Raps on metal to hear how it rings", "Can't pass an iron fitting without checking the rivets", "Hums over the roar of the forge"],
    alluringQualities: { materials: ["Stormforged Iron", "Giant Iron", "Giant Granite"], traits: ["Iron-Banded", "Reinforced", "Etched"], tags: ["Structural", "Storage", "Defensive"] },
    perceptionAffinity: { material: 5, structure: 4, weight: 3, text: 1, magical: 2, social: 0, spatial: 1, environmental: 2, acoustic: 4, presence: 1 },
    lootMaterials: ["Stormforged Iron", "Giant Iron"],
    lootTraits: ["Etched"],
    partialLoot: ["a scorched leather apron strap", "a hammer-head the size of an anvil", "a coil of lightning-tempered wire"],
  },
  {
    name: "Cloud Eagle Rider", type: "Ranger", discipline: 5, baseSuspicion: 3, constitution: 9, interactionStyle: "sight",
    group: "giantKin",
    repelledBy: { traits: ["Lacquered", "Gilded"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 42,
    locations: ["cloud_kingdom"],
    quirks: ["Surveys every room from the highest perch available", "Whistles signals to its mount", "Notices anything that wasn't there on the last pass"],
    alluringQualities: { materials: ["Cloud Fleece", "Beanstalk Leather", "Giant Oak"], traits: ["Weathered", "Rustic"], tags: ["Transport", "Structural"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 0, magical: 1, social: 0, spatial: 4, environmental: 3, acoustic: 2, presence: 2 },
    lootMaterials: ["Cloud Fleece", "Beanstalk Leather"],
    lootTraits: ["Soft"],
    partialLoot: ["a strip of saddle leather", "a long grey flight feather", "a wind-burned riding glove"],
    companion: {
      chance: 0.60,
      options: [
        {
          nameSuffix: "'s Roc", type: "AnimalCompanion", ap: 6, discipline: 4, constitution: 5,
          description: "A storm-grey roc broad enough to carry a giant, circling the outpost's high places.",
          group: "giantKin", wholeMealMass: 40,
          perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 3, environmental: 2, acoustic: 2, presence: 1 },
          lootMaterials: ["Cloud Fleece"],
          partialLoot: ["a flight feather longer than a spear", "a hooked talon", "a tuft of storm-grey down"],
        },
      ],
    },
  },
  {
    name: "Giant's Goose-Keeper", type: "Commoner", discipline: 2, baseSuspicion: 1, constitution: 5, interactionStyle: "sight",
    group: "giantKin",
    minTier: "Apex", minMass: 28, wholeMealMass: 36,
    quirks: ["Wanders after escaped geese", "Easily distracted by shiny objects", "Terrified of small spaces"],
    alluringQualities: { materials: ["Golden Goose Down", "Giant Oak", "Cloud Fleece"], traits: ["Soft", "Warm to Touch", "Gilded"], tags: ["Comfort", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Golden Goose Down", "Cloud Fleece", "Giant Oak"],
    lootTraits: ["Soft"],
    partialLoot: ["a golden feather", "scrap of cloud-weave apron", "length of giant twine"],
    // Geese are famous alarm animals: Keen Hearing makes them honk at any nearby movement
    companion: {
      chance: 0.70,
      options: [
        {
          nameSuffix: "'s Giant Goose", type: "AnimalCompanion", ap: 6, discipline: 2, constitution: 4, weight: 2,
          description: "A goose the size of a draft horse, ill-tempered and very, very loud.",
          group: "giantKin", wholeMealMass: 32, behavior: "keenHearing",
          perceptionAffinity: { material: 0, structure: 0, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 2, presence: 1 },
          lootTraits: ["Soft"],
          partialLoot: ["a grey feather the size of a sword", "a tuft of giant down", "a flake of orange beak"],
        },
        {
          nameSuffix: "'s Golden Goose", type: "AnimalCompanion", ap: 8, discipline: 2, constitution: 4, weight: 1,
          description: "The prized goose itself, its feathers gleaming like coins. Guarded jealously, and just as loud.",
          group: "giantKin", wholeMealMass: 32, behavior: "keenHearing",
          perceptionAffinity: { material: 0, structure: 0, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 2, presence: 1 },
          lootMaterials: ["Golden Goose Down"],
          lootTraits: ["Soft", "Gilded"],
          partialLoot: ["a golden feather the size of a sword", "a tuft of gleaming down", "a gilded flake of beak"],
        },
      ],
    },
  },
  {
    name: "Giant Treasure Hoarder", type: "Nobility", discipline: 3, baseSuspicion: 2, constitution: 8, interactionStyle: "touch",
    group: "giantKin",
    repelledBy: { traits: ["Tarnished", "Cracked"] },
    minTier: "Apex", minMass: 35, wholeMealMass: 43,
    quirks: ["Appraises everything by picking it up and sniffing it", "Obsessed with gold and gemstone items", "Drops things carelessly — they are very large"],
    alluringQualities: { materials: ["Giant Gold", "Giant Marble", "Soulglass"], traits: ["Gilded", "Inlaid", "Polished", "Warm to Touch", "Locked"], tags: ["Valuable", "Storage", "Authority"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 4, text: 0, magical: 1, social: 1, spatial: 1, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Giant Gold", "Giant Marble", "Soulglass"],
    lootTraits: ["Gilded", "Inlaid"],
    partialLoot: ["a fragment of giant's golden ring", "shard of enormous gemstone", "scrap of giant velvet robe"],
  },
  {
    name: "Beanstalk Climber", type: "Rogue", discipline: 4, baseSuspicion: 3, constitution: 4, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 30, wholeMealMass: 38,
    quirks: ["Has climbed the stalk before — checks everything for traps", "Moves silently for their size", "Paranoid about giant detection — checks ceilings constantly"],
    alluringQualities: { materials: ["Giant Gold", "Golden Goose Down", "Giant Marble"], traits: ["Gilded", "Polished", "Locked"], tags: ["Valuable"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 3, text: 1, magical: 1, social: 1, spatial: 3, environmental: 2, acoustic: 3, presence: 1 },
    lootMaterials: ["Beanstalk Leather", "Giant Oak", "Giant Gold"],
    lootTraits: [],
    partialLoot: ["a length of beanstalk vine", "scrap of beanstalk-leather pack", "a giant's golden coin fragment"],
  },
];

// ============================================================
// ADVENTURER BEHAVIORS
// Special instincts some adventurers have. A template opts in with `behavior: "<id>"`.
// The game calls getBehaviorReactions() when the mimic does something a behavior
// can react to:
//   "relocate"   — mimic moved rooms (ctx.fromRoom → ctx.mimicRoom)
//   "strike"     — mimic attacked a party member (hit or miss)
//   "formChange" — mimic shifted to another form
//   "feed"       — mimic bit or consumed a party member
// ============================================================
export interface BehaviorInfo {
  readonly label: string;
  readonly description: string;
  /** Hidden behaviors are never shown to the player, not even in the Codex. */
  readonly hidden?: boolean;
}

export const BEHAVIORS = {
  keenHearing: {
    label: "Keen Hearing",
    description: "Hears you move and strike from up to 2 rooms away. Each time, its suspicion and the party's suspicion rise.",
  },
  carrionScent: {
    label: "Carrion Scent",
    description: "When you feed on a party member, it shambles one room toward you — and arrives already drawn in, ready to be struck.",
  },
  shapeSense: {
    label: "Shape Sense",
    description: "Feels you change form from up to 2 rooms away. Changing form near it raises suspicion sharply.",
  },
  stoneWatch: {
    label: "Stone Watch",
    description: "Never leaves its perch. If you move out of, into, or past a room next to it, it notices the change.",
  },
  elusive: {
    label: "Elusive",
    description: "Hard to pin down: rolls an extra die when resisting your Strikes. If it slips free, it bolts to another room — it never leaves the hunting ground.",
  },
  devotion: {
    label: "Devotion",
    description: "Once every other party member is gone, it recognises you as the shrine's lost god: it brings you offerings and leaves in reverence, ending the hunt.",
    hidden: true,
  },
  bloodScent: {
    label: "Blood Scent",
    description: "When you feed on a party member, it stalks one room toward you, growing more suspicious as it comes.",
  },
} as const satisfies Record<string, BehaviorInfo>;
export type BehaviorId = keyof typeof BEHAVIORS;

// ============================================================
// PARTY MEMBERS
// An adventurer (or companion) taking part in a hunt: template fields plus live state.
// ============================================================
export type PartyMember = Omit<AdventurerTemplate, "type" | "group"> & {
  id: string;
  type: AdventurerType | CompanionType;
  /** Companions have no group. */
  group?: AdventurerGroupId;
  suspicion: number;
  location: RoomName;
  isAlive: boolean;
  isConsumed: boolean;
  isAttracted: boolean;
  hitsTaken?: number;
  fled?: boolean;
  isDisappeared?: boolean;
  isCompanion?: boolean;
  /** Converted by Devotion: no longer part of the hunt (isAlive is false too). */
  isConverted?: boolean;
  /** Overrides the type/group AP reward (companions set this from their option's `ap`). */
  apReward?: number;
};

// ============================================================
// AP REWARDS & LOOT FALLBACKS
// ============================================================
// AP rewards per adventurer type
export type ApRewardKey = AdventurerType | CompanionType | "Giant";

export const AP_REWARDS: Record<ApRewardKey, number> = {
  Rogue: 4, Cleric: 5, Bard: 3, Wizard: 5, Warrior: 3, Ranger: 4, Paladin: 5, Artificer: 4,
  Druid: 4, Assassin: 5, Hunter: 8, Commoner: 2, Nobility: 6, Undead: 5, AnimalCompanion: 2, Familiar: 3,
  Fey: 5, Construct: 6, Beast: 6,
  Giant: 12, // Giant-kin yield significantly more AP (applied by group, see getApReward)
};

// Materials / traits learned from FULL consumption — pulled directly from adventurer template now
// These are fallback values if template lootMaterials is missing
export const ADVENTURER_MATERIALS: Partial<Record<ApRewardKey, readonly Material[]>> = {
  Rogue: ["Tanned Hide", "Steel", "Goatskin"],
  Cleric: ["Gold", "Silver", "Cotton"],
  Bard: ["Silk", "Velvet", "Mahogany"],
  Wizard: ["Feywood", "Spellweave Silk", "Runestone"],
  Warrior: ["Blacksteel", "Iron", "Cowhide"],
  Ranger: ["Deerskin", "Oak", "Boarhide"],
  Paladin: ["Gold", "Silver", "Granite"],
  Artificer: ["Brass", "Iron", "Crystal"],
  Druid: ["Feywood", "Oak", "Wool"],
  Assassin: ["Shadowwood", "Goatskin", "Steel"],
  Commoner: ["Wool", "Linen", "Burlap"],
  Nobility: ["Gold", "Silk", "Velvet"],
  Undead: ["Gravecloth", "Iron", "Linen"],
  Fey: ["Feywood", "Spellweave Silk"],
  Construct: ["Basalt", "Granite", "Runestone"],
  Beast: ["Direwolf Pelt", "Boarhide"],
  Giant: ["Giant Oak", "Giant Iron", "Giant Gold", "Beanstalk Leather", "Giant Granite"],
};

// Traits learned from full consumption (by type)
export const ADVENTURER_TRAITS: Partial<Record<ApRewardKey, readonly TeachableTrait[]>> = {
  Rogue: [],
  Cleric: ["Sacred Symbol"],
  Bard: ["Gilded"],
  Wizard: ["Runescript", "Arcane Sigil"],
  Warrior: ["Bloodstained"],
  Ranger: [],
  Paladin: ["Sacred Symbol", "Heraldic Crest"],
  Artificer: ["Arcane Sigil"],
  Druid: [],
  Assassin: ["Shadowed Presence"],
  Commoner: [],
  Nobility: ["Gilded", "Heraldic Crest"],
  Undead: ["Bloodstained"],
  Fey: ["Mossy"],
  Construct: ["Etched"],
  Beast: ["Bloodstained"],
  Giant: ["Pitted"],
};
