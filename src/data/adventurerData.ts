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
  // Hidden: the branch tiers' own adventurers. Left out of the Codex until met, and out of
  // Connoisseur and Master of Disguise (only one branch can ever meet them)
  { id: "beyondApex", label: "Beyond the Apex", description: "What else don't you know?", hidden: true },
] as const;
/** Whether this adventurer belongs to a hidden group (the branch tiers' own; see ADVENTURER_GROUPS). */
export function isHiddenAdventurer(template: Pick<AdventurerTemplate, "group">): boolean {
  return ADVENTURER_GROUPS.some(g => g.id === template.group && "hidden" in g && g.hidden);
}
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
  /** What it's called once swallowed, in "The strongbox cracks open inside you" (default "strongbox"). */
  readonly noun?: string;
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
  /**
   * One of its quirks, acted out on the mimic's form when it enters the mimic's room (shown
   * QUIRK_LINE_CHANCE of the time). {name} is the adventurer, {form} the form's name.
   */
  readonly appliedQuirk?: string;
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
    appliedQuirk: "{name} looks at the {form} closely.",
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Polished", "Gilded", "Locked", "Heavy-Lidded", "Thieves' Mark"], tags: ["Valuable"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 1, text: 0, magical: 0, social: 1, spatial: 1, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Tanned Hide", "Steel", "Goatskin"],
    lootTraits: ["Thieves' Mark"],
    partialLoot: ["scrap of leather armor", "torn belt", "a boot heel"],
  },
  {
    name: "Wary Cutpurse", type: "Rogue", discipline: 2, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Rarely touches anything directly", "Scans exits first"],
    appliedQuirk: "{name} gives the {form} a wide berth, eyes on the exits.",
    alluringQualities: { materials: ["Gold", "Silver", "Silk"], traits: ["Locked", "Thieves' Mark"], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Goatskin", "Iron", "Linen"],
    lootTraits: ["Thieves' Mark"],
    partialLoot: ["strip of cloak", "torn glove", "a coin pouch fragment"],
  },
  // ── Clerics ──
  {
    name: "Paranoid Cleric", type: "Cleric", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence", "Arcane Sigil", "Whispering", "Foul"] },
    quirks: ["Blesses suspicious objects", "Avoids direct skin contact"],
    appliedQuirk: "{name} sketches a quick blessing over the {form}, just in case.",
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Arched", "Fresh"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 2, social: 1, spatial: 1, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Gold", "Silver", "Cotton"],
    lootTraits: ["Sacred Symbol"],
    partialLoot: ["torn vestment", "prayer bead string", "patch of holy cloth"],
  },
  {
    name: "Young Acolyte", type: "Cleric", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence", "Foul"] },
    quirks: ["Whispers prayers when nervous", "Easily distracted by relics"],
    appliedQuirk: "{name} whispers a nervous prayer while passing the {form}.",
    alluringQualities: { materials: ["Gold", "Silver", "Marble"], traits: ["Sacred Symbol", "Runescript", "Arched", "Faint Glow", "Radiant"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 1, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Cotton", "Silver", "Linen", "Stained Glass"],
    lootTraits: ["Sacred Symbol", "Fresh"],
    partialLoot: ["torn robe hem", "a cloth belt", "strip of parchment"],
  },
  // ── Bards ──
  {
    name: "Naive Bard", type: "Bard", discipline: 2, baseSuspicion: 1, constitution: 3, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Bloodstained"] },
    quirks: ["Talks to inanimate objects", "Distracted by comfort"],
    appliedQuirk: "{name} pats the {form} and says, \"Hello there, friend!\"",
    alluringQualities: { materials: ["Velvet", "Silk", "Gold"], traits: ["Tarnished", "Worn", "Upholstered", "Warm to Touch", "Fresh", "Fragrant"], tags: ["Comfort", "Valuable", "Social"] },
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
    appliedQuirk: "{name} pauses to work the {form} into a verse.",
    alluringQualities: { materials: ["Mahogany", "Silk", "Gold"], traits: ["Tarnished", "Heraldic Crest", "Ornate", "Fragrant"], tags: ["Social", "Knowledge"] },
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
    appliedQuirk: "{name} squints at the {form}, hunting for inscriptions.",
    alluringQualities: { materials: [], traits: ["Runescript", "Arcane Sigil", "Whispering", "Musty"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 2, social: 0, spatial: 2, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Feywood", "Spellweave Silk", "Runestone"],
    lootTraits: ["Runescript", "Arcane Sigil", "Musty"],
    partialLoot: ["torn spellbook page", "a runed sleeve patch", "scrap of enchanted robe"],
  },
  {
    name: "Hedge Witch", type: "Wizard", discipline: 2, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Sniffs objects for magical residue", "Mutters to herself"],
    appliedQuirk: "{name} sniffs the {form} and mutters something under her breath.",
    alluringQualities: { materials: ["Feywood", "Crystal"], traits: ["Cracked", "Arcane Sigil", "Faint Glow", "Whispering"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 1, magical: 2, social: 0, spatial: 1, environmental: 2, acoustic: 0, presence: 2 },
    lootMaterials: ["Gravecloth", "Feywood", "Crystal"],
    lootTraits: ["Arcane Sigil", "Fragrant"],
    partialLoot: ["torn herb pouch cloth", "a charm string", "scrap of wax-stained robe"],
  },
  // ── Warriors ──
  {
    name: "Battle-Hardened Fighter", type: "Warrior", discipline: 3, baseSuspicion: 1, constitution: 4, interactionStyle: "touch",
    group: "common",
    quirks: ["Knocks on surfaces", "Tests stability with force"],
    appliedQuirk: "{name} gives the {form} a solid knock with a gauntleted fist.",
    alluringQualities: { materials: ["Steel", "Gold"], traits: ["Tally Marks"], tags: ["Valuable"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Blacksteel", "Iron", "Cowhide"],
    lootTraits: ["Bloodstained", "Tally Marks"],
    partialLoot: ["torn chainmail link strip", "a boot tongue", "piece of pauldron strap"],
  },
  {
    name: "Mercenary Guard", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    quirks: ["Checks corners before entering", "Distrusts ornate things"],
    appliedQuirk: "{name} checks every corner, then gives the {form} a long, suspicious look.",
    alluringQualities: { materials: ["Iron", "Steel"], traits: ["Tally Marks"], tags: ["Valuable"] },
    repelledBy: { traits: ["Thieves' Mark"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Iron", "Steel", "Cowhide"],
    lootTraits: ["Tally Marks"],
    partialLoot: ["torn tabard strip", "a gauntlet finger", "piece of boot leather"],
  },
  // ── Rangers ──
  {
    name: "Observant Ranger", type: "Ranger", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Watches airflow", "Listens for wildlife cues"],
    appliedQuirk: "{name} holds a wetted finger up near the {form}, feeling for a draft.",
    alluringQualities: { materials: ["Tanned Hide", "Oak"], traits: ["Rustic", "Earthy"], tags: ["Structural"] },
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
    appliedQuirk: "{name} keeps to the wall, eyes flicking between the exits and the {form}.",
    alluringQualities: { materials: ["Oak", "Deerskin"], traits: ["Weathered", "Worn", "Rustic", "Minimalist", "Earthy"], tags: ["Structural"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 2, acoustic: 2, presence: 0 },
    lootMaterials: ["Goatskin", "Linen", "Oak", "Birch"],
    lootTraits: ["Fresh"],
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
    repelledBy: { materials: ["Gravecloth"], traits: ["Bloodstained", "Shadowed Presence", "Thieves' Mark"] },
    quirks: ["Detects evil presence", "Slow to trust but fierce when provoked"],
    appliedQuirk: "{name} rests a hand on their holy symbol as they pass the {form}.",
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
    appliedQuirk: "{name} measures the {form} with a folding rule and jots down a note.",
    alluringQualities: { materials: ["Iron", "Brass", "Crystal"], traits: ["Arcane Sigil", "Carved", "Guild Mark"], tags: ["Knowledge"] },
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
    appliedQuirk: "{name} lingers near the doorway, plainly uncomfortable indoors.",
    alluringQualities: { materials: ["Oak", "Feywood"], traits: ["Rustic", "Carved", "Earthy"], tags: ["Structural"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 3, acoustic: 1, presence: 2 },
    lootMaterials: ["Thimblewood", "Oak", "Wool", "Honeyamber"],
    lootTraits: ["Earthy"],
    partialLoot: ["strip of bark-cloth robe", "a vine cord", "torn leaf-pattern cloak"],
  },
  // ── Thieves / Assassins ──
  {
    name: "Silent Assassin", type: "Assassin", discipline: 4, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "common",
    repelledBy: { traits: ["Gilded", "Faint Glow", "Radiant", "Ornate", "Fragrant"] },
    quirks: ["Never announces presence", "Studies shadows carefully"],
    appliedQuirk: "{name} slips in without a sound, studying the shadows around the {form}.",
    alluringQualities: { materials: ["Shadowwood", "Silk"], traits: ["Minimalist", "Thieves' Mark"], tags: ["Valuable"] },
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
    appliedQuirk: "{name} taps the {form} with a knuckle, listening for anything hollow.",
    alluringQualities: { materials: ["Gold", "Mithril", "Obsidian"], traits: ["Smoky"], tags: ["Valuable", "Structural"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 2, environmental: 0, acoustic: 2, presence: 0 },
    lootMaterials: ["Iron", "Granite", "Blacksteel", "Limestone"],
    lootTraits: ["Pitted", "Smoky"],
    partialLoot: ["torn mining smock strip", "a belt buckle", "scrap of heavy wool tunic"],
  },
  {
    name: "Elven Arcanist", type: "Wizard", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Detects enchantments passively", "Questions everything out of place"],
    appliedQuirk: "{name} tilts their head at the {form}, as if something about it were slightly out of place.",
    alluringQualities: { materials: ["Feywood", "Aether Crystal"], traits: ["Arcane Sigil", "Runescript", "Whispering", "Musty"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 0, text: 2, magical: 3, social: 0, spatial: 2, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Feywood", "Aether Crystal", "Spellweave Silk"],
    lootTraits: ["Runescript", "Arcane Sigil", "Faint Glow"],
    partialLoot: ["scrap of elven-woven robe", "a runed button", "torn enchanted sleeve"],
  },
  {
    name: "Halfling Treasure Hunter", type: "Rogue", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Pockets small items instinctively", "Underestimates danger"],
    appliedQuirk: "{name} pockets something small from beside the {form} without even thinking about it.",
    alluringQualities: { materials: ["Gold", "Silver", "Crystal"], traits: ["Upholstered", "Locked", "Heavy-Lidded", "Thieves' Mark"], tags: ["Valuable", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 2, text: 0, magical: 0, social: 1, spatial: 1, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Silk", "Silver", "Linen"],
    lootTraits: ["Briny"],
    partialLoot: ["torn waistcoat patch", "a brace button", "scrap of foot-wrap wool"],
  },

  // ── Elite / Greater+ only ──
  {
    name: "Mimic Hunter", type: "Hunter", discipline: 5, baseSuspicion: 5, constitution: 5, interactionStyle: "touch",
    group: "huntersElites",
    repelledBy: { traits: ["Locked", "Heavy-Lidded", "Fragrant"] },
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Taps every surface methodically", "Carries a vial of acid for testing", "Never touches anything without gloves"],
    appliedQuirk: "{name} raps twice on the {form}, listening.",
    alluringQualities: { materials: ["Gold"], traits: ["Tally Marks"], tags: ["Valuable"] },
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
    appliedQuirk: "{name} announces themselves to the room before entering, nostrils flaring for heat.",
    alluringQualities: { materials: ["Gold", "Obsidian"], traits: ["Arcane Sigil", "Tally Marks", "Smoky"], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 1, magical: 3, social: 0, spatial: 2, environmental: 3, acoustic: 1, presence: 3 },
    lootMaterials: ["Dragonhide", "Starforged Iron", "Aether Crystal"],
    lootTraits: ["Arcane Sigil", "Smoky"],
    partialLoot: ["scale of draconic armor", "a bounty contract scrap", "torn dragonhide glove"],
  },
  {
    name: "Gnomish Tinkerer-Hunter", type: "Hunter", discipline: 4, baseSuspicion: 5, constitution: 3, interactionStyle: "touch",
    group: "huntersElites",
    repelledBy: { traits: ["Locked", "Briny"] },
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Carries mechanical probes that measure density", "Obsessed with metalwork and alloys", "Taps every surface with a tiny silver hammer"],
    appliedQuirk: "{name} taps the {form} with a tiny silver hammer, checking its density.",
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
    appliedQuirk: "{name} sniffs along the floor toward the {form}.",
    alluringQualities: { materials: ["Iron", "Bonesteel", "Horn", "Boarhide"], traits: ["Bloodstained", "Worn", "Reinforced", "Tally Marks", "Earthy"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 3, text: 0, magical: 0, social: 0, spatial: 2, environmental: 3, acoustic: 1, presence: 2 },
    lootMaterials: ["Boarhide", "Iron", "Horn"],
    lootTraits: ["Bloodstained", "Tally Marks"],
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
    name: "Veteran Inquisitor", type: "Paladin", discipline: 5, baseSuspicion: 5, constitution: 4, interactionStyle: "touch",
    group: "huntersElites",
    repelledBy: { materials: ["Shadowwood", "Void Marble"], traits: ["Arcane Sigil", "Shadowed Presence", "Bloodstained", "Whispering", "Thieves' Mark", "Foul"] },
    minTier: "Grand",
    quirks: ["Casts detect magic on entry", "Marks rooms with chalk sigils", "Interrogates every object aloud"],
    appliedQuirk: "{name} chalks a sigil on the floor and questions the {form} aloud.",
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
    appliedQuirk: "{name} takes a charcoal rubbing of the {form}'s surface.",
    alluringQualities: { materials: ["Aether Crystal", "Feywood"], traits: ["Runescript", "Arcane Sigil", "Musty"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 3, magical: 4, social: 0, spatial: 3, environmental: 2, acoustic: 1, presence: 3 },
    lootMaterials: ["Aether Crystal", "Feywood", "Soulglass", "Void Marble"],
    lootTraits: ["Runescript", "Arcane Sigil"],
    partialLoot: ["torn archmage robe panel", "a crystalline focus shard", "scrap of runed glove"],
  },
  {
    name: "Tiefling Hexblade", type: "Hunter", discipline: 5, baseSuspicion: 4, constitution: 4, interactionStyle: "spell",
    group: "huntersElites",
    repelledBy: { traits: ["Sacred Symbol"] },
    minTier: "Apex", isMimicHunter: true,
    quirks: ["Can sense the life-force of a mimic's last meal", "Wears gloves treated with mimic-repellent", "Counts corners in every room — mimics always have one too many"],
    appliedQuirk: "{name} counts the corners of the room under their breath, then counts them again.",
    alluringQualities: { materials: ["Obsidian", "Shadowwood", "Void Marble"], traits: ["Arcane Sigil", "Shadowed Presence", "Foul"], tags: ["Valuable", "Knowledge"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 2, magical: 4, social: 0, spatial: 3, environmental: 2, acoustic: 1, presence: 4 },
    lootMaterials: ["Obsidian", "Shadowwood", "Starforged Iron"],
    lootTraits: ["Arcane Sigil", "Shadowed Presence"],
    partialLoot: ["a hex-marked contract shard", "fragment of obsidian focus", "torn shadow-silk glove"],
  },

  // ── Commoners / Non-combatants ──
  {
    name: "Frightened Peasant", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    repelledBy: { traits: ["Bloodstained", "Shadowed Presence", "Cold to Touch", "Whispering", "Foul", "Tally Marks"] },
    quirks: ["Jumps at shadows", "Clutches holy symbol", "Easily startled by unusual things"],
    appliedQuirk: "{name} jumps at a shadow near the {form}, clutching their holy symbol.",
    alluringQualities: { materials: ["Cotton", "Wool", "Linen"], traits: ["Worn", "Dusty", "Upholstered", "Rustic", "Warm to Touch", "Ward Sign"], tags: ["Comfort", "Storage"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Wool", "Linen", "Burlap", "Pine"],
    lootTraits: ["Ward Sign"],
    partialLoot: ["torn wool smock", "a rope belt", "scrap of burlap sack"],
  },
  {
    name: "Road Vagabond", type: "Commoner", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "commoners",
    quirks: ["Rifles through anything unlocked", "Sleeps anywhere flat", "Interested in anything left behind"],
    appliedQuirk: "{name} eyes the {form} as a likely place for a nap.",
    alluringQualities: { materials: ["Iron", "Brass", "Cotton"], traits: ["Worn", "Weathered", "Tarnished", "Rustic", "Warm to Touch", "Smoky", "Ward Sign"], tags: ["Storage", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Linen", "Cowhide", "Iron"],
    lootTraits: ["Wrinkled", "Musty", "Ward Sign"],
    partialLoot: ["patched travelling cloak strip", "a worn boot sole", "scrap of road-stained linen"],
  },

  // ── Escort targets (non-combatants carried by parties) ──
  {
    name: "The King", type: "Nobility", discipline: 2, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    repelledBy: { materials: ["Burlap", "Cotton"], traits: ["Cracked", "Worn", "Dusty", "Tarnished", "Rustic", "Minimalist", "Foul", "Earthy"] },
    quirks: ["Demands everything be inspected by guards first", "Attracted to displays of wealth", "Expects furnishings worthy of royalty"],
    appliedQuirk: "{name} gestures at the {form}: \"Have that inspected.\"",
    alluringQualities: { materials: ["Gold", "Marble", "Silk", "Velvet"], traits: ["Gilded", "Inlaid", "Polished", "Upholstered", "Ornate", "Fresh", "Maker's Mark"], tags: ["Valuable", "Authority", "Comfort"] },
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
    repelledBy: { materials: ["Burlap"], traits: ["Cracked", "Dusty", "Bloodstained", "Rough-Hewn", "Rustic", "Cold to Touch", "Minimalist", "Musty", "Foul"] },
    quirks: ["Reaches out to touch pretty things", "Easily enchanted by ornate objects", "Wanders from her escort"],
    appliedQuirk: "{name} reaches out to touch the {form}. It's so pretty.",
    alluringQualities: { materials: ["Gold", "Silver", "Silk", "Crystal"], traits: ["Gilded", "Inlaid", "Polished", "Etched", "Upholstered", "Ornate", "Fresh", "Fragrant", "Maker's Mark"], tags: ["Valuable", "Comfort", "Decor"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 1, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Silk", "Silver", "Crystal", "Satin"],
    lootTraits: ["Gilded", "Fragrant"],
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
    repelledBy: { traits: ["Cracked", "Worn", "Tarnished", "Rustic", "Minimalist", "Musty", "Foul", "Earthy"] },
    quirks: ["Mentally appraises everything", "Tests material quality with fingers", "Offers to buy things on the spot"],
    appliedQuirk: "{name} runs appraising fingers over the {form} and murmurs a price.",
    alluringQualities: { materials: ["Gold", "Silver", "Mahogany", "Silk"], traits: ["Polished", "Lacquered", "Gilded", "Ornate", "Guild Mark"], tags: ["Valuable", "Storage", "Dining"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Gold", "Silver", "Mahogany", "Marble"],
    lootTraits: ["Gilded", "Lacquered", "Guild Mark"],
    partialLoot: ["torn merchant coat lining", "a wax seal stamp", "scrap of velvet money pouch"],
  },

  // ── Warlock with familiar ──
  {
    name: "Pact-Bound Warlock", type: "Wizard", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    repelledBy: { traits: ["Sacred Symbol"] },
    quirks: ["Speaks to unseen entities", "Prefers shadowy corners", "Reacts strangely near magical objects"],
    appliedQuirk: "{name} murmurs to something unseen, glancing toward the {form}.",
    alluringQualities: { materials: ["Shadowwood", "Obsidian", "Gravecloth"], traits: ["Arcane Sigil", "Shadowed Presence", "Whispering"], tags: ["Knowledge", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 3, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Shadowwood", "Gravecloth", "Obsidian", "Ebonwood"],
    lootTraits: ["Arcane Sigil", "Shadowed Presence"],
    partialLoot: ["torn warlock pact-cloth", "a bound iron focus shard", "scrap of shadow-dyed robe"],
    companion: {
      chance: 0.65,
      options: [
        { nameSuffix: "'s Imp", type: "Familiar", ap: 3, discipline: 3, constitution: 2, description: "A leathery imp bound to its master's will.", lootTraits: ["Smoky"] },
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
    appliedQuirk: "{name} kisses the {form} reverently, humming a hymn about a chest that eats sinners.",
    alluringQualities: { materials: ["Gold", "Oak"], traits: ["Sacred Symbol", "Heavy-Lidded", "Carved", "Faint Glow"], tags: ["Religious", "Storage"] },
    repelledBy: { traits: ["Tally Marks"] },
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
    appliedQuirk: "{name} raises a cracked voice in prayer and blesses the {form}.",
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Gilded", "Radiant"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 2, social: 1, spatial: 2, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Silver", "Linen", "Stained Glass"],
    lootTraits: ["Sacred Symbol", "Wrinkled"],
    partialLoot: ["a tarnished censer chain", "a strip of vestment hem", "a well-thumbed hymnal page"],
  },
  {
    name: "Shrine Guard", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common",
    repelledBy: { traits: ["Cracked", "Thieves' Mark"] },
    locations: ["hollow_reliquary"],
    quirks: ["Paid to keep thieves out, not to believe", "Raps the pommel of their sword on anything suspicious", "Counts the relics at every shift change"],
    appliedQuirk: "{name} raps the pommel of their sword against the {form}.",
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
    appliedQuirk: "{name} pries at the {form}'s seams with a thin blade.",
    alluringQualities: { materials: ["Gold", "Silver", "Mahogany"], traits: ["Locked", "Inlaid", "Gilded", "Maker's Mark"], tags: ["Valuable", "Storage"] },
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
    appliedQuirk: "{name} reads the {form}'s markings aloud, skeptically.",
    alluringQualities: { materials: ["Walnut", "Linen"], traits: ["Runescript", "Etched", "Carved", "Minimalist", "Musty"], tags: ["Knowledge", "Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 3, magical: 1, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Linen", "Walnut", "Clear Glass"],
    lootTraits: ["Etched", "Musty"],
    partialLoot: ["an ink-stained cuff", "a page of skeptical notes", "a broken reading lens"],
  },

  // ── The Mimic Nest (rare location) ──
  {
    name: "Warehouse Watchman", type: "Warrior", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    locations: ["mimic_nest"],
    quirks: ["Walks the same round every hour, lantern held high", "Swears the crates were stacked differently yesterday", "Won't sit on anything in here anymore"],
    appliedQuirk: "{name} raises their lantern at the {form}: \"Was that there yesterday?\"",
    alluringQualities: { materials: ["Oak", "Iron"], traits: ["Locked", "Iron-Banded"], tags: ["Storage", "Seating"] },
    repelledBy: { traits: ["Thieves' Mark"] },
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
    appliedQuirk: "{name} taps the {form}, checks the manifest and frowns. One too many. Again.",
    alluringQualities: { materials: ["Mahogany", "Brass"], traits: ["Locked", "Lacquered", "Polished", "Guild Mark"], tags: ["Storage", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 3, text: 2, magical: 0, social: 0, spatial: 1, environmental: 0, acoustic: 1, presence: 0 },
    lootMaterials: ["Brass", "Linen"],
    lootTraits: ["Lacquered", "Guild Mark"],
    partialLoot: ["a page of the cargo manifest", "a brass measuring rule", "an ink-stained cuff"],
  },
  {
    name: "Rat-Catcher", type: "Ranger", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "commoners",
    locations: ["mimic_nest"],
    quirks: ["Hired to deal with \"the rat problem\" — has seen no rats", "Lays traps in every corner", "Talks to their terrier as if it understands"],
    appliedQuirk: "{name} sets a trap beside the {form}, chatting to their terrier the whole time.",
    alluringQualities: { materials: ["Burlap", "Pine"], traits: ["Worn", "Dusty", "Weathered"], tags: ["Storage", "Coastal"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 2, presence: 1 },
    // A rat-catcher knows the best bait
    lootMaterials: ["Burlap", "Goatskin", "Pine", "Honeyamber"],
    lootTraits: ["Mossy", "Foul"],
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
    appliedQuirk: "{name} calls her brother's name, then looks hard at the {form}, as if he might be inside.",
    alluringQualities: { materials: ["Pine", "Cotton"], traits: ["Worn", "Heavy-Lidded", "Ward Sign"], tags: ["Storage", "Comfort"] },
    repelledBy: { traits: ["Tally Marks"] },
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
    appliedQuirk: "{name} squints at the {form}: \"That wasn't in my manifest.\"",
    alluringQualities: { materials: ["Brass", "Mahogany", "Gold"], traits: ["Locked", "Iron-Banded", "Polished", "Briny", "Guild Mark"], tags: ["Storage", "Valuable", "Authority"] },
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
    appliedQuirk: "{name} tries to heave the {form} overboard to lighten the ship.",
    alluringQualities: { materials: ["Oak", "Iron"], traits: ["Reinforced", "Weathered", "Briny"], tags: ["Structural", "Transport"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Oak", "Cowhide"],
    lootTraits: ["Lacquered", "Briny"],
    partialLoot: ["a tarred rope end", "a strip of salt-stiff coat", "a bosun's whistle"],
  },
  {
    name: "Ship's Cook", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 3, interactionStyle: "touch",
    group: "commoners",
    locations: ["sinking_ship"],
    quirks: ["Salvaging the good knives before anything else", "Swears at the water as if it can hear", "Grabs any sturdy container to bail with"],
    appliedQuirk: "{name} eyes the {form} as something to bail with.",
    alluringQualities: { materials: ["Pine", "Iron", "Brass"], traits: ["Worn", "Soft", "Smoky", "Ward Sign"], tags: ["Dining", "Storage"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 0, spatial: 0, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Iron", "Linen"],
    lootTraits: ["Pitted", "Smoky"],
    partialLoot: ["a greasy apron string", "a ladle", "a sack of soaked flour"],
  },
  {
    name: "Panicked Passenger", type: "Nobility", discipline: 1, baseSuspicion: 2, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    repelledBy: { traits: ["Briny"] },
    locations: ["sinking_ship"],
    quirks: ["Trying to save their luggage instead of themselves", "Opens every trunk looking for their own", "Screams at sudden movements"],
    appliedQuirk: "{name} rattles the {form}, hoping it's their luggage.",
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
    appliedQuirk: "{name} climbs over the {form} rather than walking around it.",
    alluringQualities: { materials: ["Brass", "Silver"], traits: ["Locked", "Inlaid", "Briny", "Thieves' Mark"], tags: ["Valuable", "Storage"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Linen", "Brass"],
    lootTraits: ["Inlaid", "Briny"],
    partialLoot: ["a knotted bandana", "a stolen pocket watch", "a coil of rigging line"],
  },

  // ── Supernatural / Monster types ──
  {
    name: "Vampire Noble", type: "Undead", discipline: 5, baseSuspicion: 3, constitution: 4, interactionStyle: "sight",
    group: "supernatural",
    repelledBy: { traits: ["Sacred Symbol", "Faint Glow", "Radiant", "Ward Sign"] },
    locations: ["noble_estate", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle"],
    quirks: ["Drawn to bloodstained objects", "Cannot enter without invitation — waits at thresholds", "Hypersensitive to magical auras"],
    appliedQuirk: "{name} pauses at the threshold, waiting to be invited in.",
    alluringQualities: { materials: ["Gold", "Silver", "Silk", "Gravecloth", "Bloodoak"], traits: ["Bloodstained", "Tarnished", "Gilded", "Upholstered", "Cold to Touch", "Ornate"], tags: ["Valuable", "Comfort", "Religious"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 0, text: 1, magical: 3, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 4 },
    lootMaterials: ["Gravecloth", "Silk", "Gold", "Bloodoak"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["strip of vampire cloak", "a silver-inlaid ring shard", "scrap of ancient funeral silk", "splinter of bloodoak coffin wood"],
  },
  {
    name: "Minotaur Sellsword", type: "Warrior", discipline: 4, baseSuspicion: 1, constitution: 5, interactionStyle: "touch",
    group: "supernatural",
    repelledBy: { traits: ["Foul"] },
    quirks: ["Sniffs everything before trusting it", "Navigates by scent more than sight", "Attracted to sturdy, large furnishings"],
    appliedQuirk: "{name} snorts and sniffs the {form} before trusting it.",
    alluringQualities: { materials: ["Iron", "Steel", "Oak", "Horn"], traits: ["Reinforced", "Iron-Banded", "Worn", "Tally Marks"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 3, weight: 3, text: 0, magical: 0, social: 0, spatial: 2, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Horn", "Iron", "Boarhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["a broken horn shard", "strip of iron-studded leather", "scrap of rough ox-hide"],
  },
  {
    name: "Cursed Revenant", type: "Undead", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "supernatural",
    repelledBy: { traits: ["Sacred Symbol", "Pristine", "Ward Sign"] },
    locations: ["manor", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle", "lonely_moor"],
    quirks: ["Fixated on objects from their past life", "Ignores most things unless they trigger recognition", "Slow but relentless — its body is intact, unlike a zombie"],
    appliedQuirk: "{name} stops before the {form}, as if it reminded them of something long ago.",
    alluringQualities: { materials: ["Oak", "Linen", "Iron"], traits: ["Bloodstained", "Worn", "Cracked", "Dusty", "Cold to Touch", "Foul"], tags: ["Comfort", "Structural"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 1, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Gravecloth", "Iron", "Linen", "Cowhide"],
    lootTraits: ["Bloodstained", "Pitted", "Foul"],
    partialLoot: ["strip of burial shroud", "a rusted iron clasp", "scrap of grave-dirt-stained wool", "torn leather boot from its past life"],
  },

  {
    name: "Wailing Banshee", type: "Undead", discipline: 4, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "supernatural",
    repelledBy: { traits: ["Pristine", "Radiant", "Ward Sign"] },
    locations: ["haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle", "lonely_moor"],
    behavior: "keenHearing",
    quirks: ["A gaunt, grave-pale crone — flesh and bone, whatever the stories say", "Turns toward every creak and footstep", "Keens softly when something nearby moves"],
    appliedQuirk: "{name} turns toward the {form} at the faintest creak, keening softly.",
    alluringQualities: { materials: ["Gravecloth", "Soulglass", "Silver"], traits: ["Tarnished", "Etched", "Whispering"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 1, acoustic: 4, presence: 3 },
    lootMaterials: ["Gravecloth", "Soulglass"],
    lootTraits: ["Shadowed Presence"],
    partialLoot: ["a lock of grave-white hair", "strip of tattered burial veil", "a cracked, yellowed fingernail"],
  },
  {
    name: "Ghoul", type: "Undead", discipline: 2, baseSuspicion: 1, constitution: 4, interactionStyle: "touch",
    group: "supernatural",
    repelledBy: { traits: ["Sacred Symbol", "Faint Glow", "Radiant", "Warm to Touch", "Fresh", "Ward Sign"] },
    locations: ["manor", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle"],
    behavior: "carrionScent",
    quirks: ["Sniffs at cupboards and larders", "Gnaws on anything that smells of meat", "Follows the scent of a fresh kill"],
    appliedQuirk: "{name} sniffs at the {form}, hoping for meat.",
    alluringQualities: { materials: ["Bonesteel", "Cowhide"], traits: ["Pitted", "Cold to Touch", "Foul"], tags: ["Dining", "Storage"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 3, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Bonesteel", "Cowhide"],
    lootTraits: ["Bloodstained", "Foul"],
    partialLoot: ["strip of grave-soiled rags", "a gnawed knucklebone", "a clump of matted hair"],
  },
  {
    name: "Fey Changeling", type: "Fey", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    minTier: "Standard",
    group: "supernatural",
    repelledBy: { materials: ["Iron", "Steel", "Blacksteel"], traits: ["Iron-Banded", "Smoky", "Ward Sign"] },
    locations: ["wizard_tower", "noble_estate", "hidden_grove", "crossroads"],
    behavior: "shapeSense",
    quirks: ["Its face never quite settles on one shape", "Feels the moment anything nearby changes its form", "Cannot resist pretty, delicate things"],
    appliedQuirk: "{name}'s face flickers through three shapes as it studies the {form}.",
    alluringQualities: { materials: ["Feywood", "Silk"], traits: ["Mossy", "Inlaid", "Faint Glow", "Fragrant"], tags: ["Decor", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 1, magical: 2, social: 3, spatial: 1, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Feywood", "Spellweave Silk", "Thimblewood"],
    lootTraits: ["Mossy", "Fragrant"],
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
    appliedQuirk: "{name} fixes its unblinking stare on the {form}, memorizing exactly where it sits.",
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
    // On Spell or Sweet Street it only turns up as one of the street's real monsters
    locations: ["manor", "hidden_grove", "country_road", "ruined_mill", "lonely_moor", "spell_or_sweet_street"],
    behavior: "bloodScent",
    quirks: ["Follows the smell of blood through walls", "Paces restlessly between rooms", "Snarls at anything that smells wrong"],
    appliedQuirk: "{name} paces past the {form}, snarling at a smell it can't place.",
    alluringQualities: { materials: ["Direwolf Pelt", "Oak"], traits: ["Mossy", "Rough-Hewn", "Rustic", "Foul"], tags: ["Rural"] },
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
    appliedQuirk: "{name} shoves the {form} to see if it's sturdy.",
    alluringQualities: { materials: ["Titan Oak", "Giant Iron", "Beanstalk Leather"], traits: ["Reinforced", "Iron-Banded", "Heavy-Lidded", "Tally Marks"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 4, weight: 4, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 2, presence: 0 },
    lootMaterials: ["Titan Oak", "Giant Iron", "Beanstalk Leather"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["a massive belt buckle", "strip of giant-hide jerkin", "enormous boot sole"],
  },
  {
    name: "Giant-Blood Shaman", type: "Druid", discipline: 4, baseSuspicion: 3, constitution: 6, interactionStyle: "spell",
    group: "giantKin",
    repelledBy: { traits: ["Polished", "Lacquered", "Pristine"] },
    minTier: "Apex", minMass: 28, wholeMealMass: 36,
    quirks: ["Chants at suspicious objects", "Smells for earth-magic residue", "Distrustful of anything too neat or symmetrical"],
    appliedQuirk: "{name} chants at the {form}, frowning at how neat it looks.",
    alluringQualities: { materials: ["Beanstalk Timber", "Titan Oak", "Cloud Fleece"], traits: ["Mossy", "Weathered", "Rough-Hewn", "Rustic", "Earthy"], tags: ["Structural", "Rural"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 3, social: 0, spatial: 2, environmental: 4, acoustic: 1, presence: 3 },
    lootMaterials: ["Beanstalk Timber", "Cloud Fleece", "Titan Oak"],
    lootTraits: ["Mossy", "Earthy"],
    partialLoot: ["a woven reed charm", "strip of bark-wrapped hide", "pouch of giant-fern spores"],
  },
  {
    name: "Cloud Giant Scout", type: "Warrior", discipline: 5, baseSuspicion: 2, constitution: 9, interactionStyle: "touch",
    group: "giantKin",
    repelledBy: { traits: ["Cracked", "Dusty"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 43,
    locations: ["cloud_kingdom"],
    quirks: ["Everything is too small — they break things accidentally", "Listens at walls with ear to stone", "Attracted to gold and goose-feather items"],
    appliedQuirk: "{name} presses an ear to the wall beside the {form}.",
    alluringQualities: { materials: ["Sky Gold", "Golden Goose Down", "Lightning Marble"], traits: ["Gilded", "Polished", "Inlaid"], tags: ["Valuable", "Comfort", "Authority"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 5, text: 0, magical: 1, social: 0, spatial: 3, environmental: 2, acoustic: 3, presence: 1 },
    lootMaterials: ["Sky Gold", "Golden Goose Down", "Lightning Marble"],
    lootTraits: ["Gilded"],
    partialLoot: ["a cloud-giant coin (enormous)", "tuft of golden goose down", "shard of Lightning Marble flagstone"],
  },
  {
    name: "Storm Giant Wanderer", type: "Warrior", discipline: 6, baseSuspicion: 2, constitution: 12, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 38, wholeMealMass: 48,
    locations: ["cloud_kingdom"],
    quirks: ["Shakes the ground when walking", "Can sense electrical charge — mimic bio-electricity makes them cautious", "Attracted to enormous structural objects"],
    appliedQuirk: "{name}'s footsteps shake the room, and the {form} rattles.",
    alluringQualities: { materials: ["Stormforged Iron", "Cumulogranite", "Beanstalk Timber"], traits: ["Iron-Banded", "Rough-Hewn", "Carved"], tags: ["Structural", "Defensive"] },
    perceptionAffinity: { material: 3, structure: 5, weight: 5, text: 0, magical: 2, social: 0, spatial: 3, environmental: 3, acoustic: 4, presence: 2 },
    lootMaterials: ["Stormforged Iron", "Cumulogranite", "Beanstalk Timber"],
    lootTraits: ["Pitted"],
    partialLoot: ["a stormforged iron rivet", "shard of Cumulogranite block", "length of beanstalk rope"],
  },
  {
    name: "Giant Lord", type: "Nobility", discipline: 6, baseSuspicion: 3, constitution: 14, interactionStyle: "sight",
    group: "giantKin",
    repelledBy: { traits: ["Tarnished", "Cracked", "Dusty", "Rustic"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 52,
    locations: ["cloud_kingdom"],
    quirks: ["Holds court from whatever seat is grandest", "Knows exactly where everything in its hall belongs", "Never hurries — the whole outpost moves around it"],
    appliedQuirk: "{name} looks the {form} over, plainly deciding whether it belongs in their hall.",
    alluringQualities: { materials: ["Sky Gold", "Lightning Marble", "Stormforged Iron"], traits: ["Gilded", "Ornate", "Heraldic Crest", "Inlaid"], tags: ["Authority", "Valuable", "Seating"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 4, text: 2, magical: 2, social: 4, spatial: 4, environmental: 2, acoustic: 2, presence: 3 },
    lootMaterials: ["Sky Gold", "Stormforged Iron", "Lightning Marble"],
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
    appliedQuirk: "{name} raps the {form}'s fittings to hear how they ring.",
    alluringQualities: { materials: ["Stormforged Iron", "Giant Iron", "Cumulogranite"], traits: ["Iron-Banded", "Reinforced", "Etched", "Guild Mark", "Maker's Mark"], tags: ["Structural", "Storage", "Defensive"] },
    perceptionAffinity: { material: 5, structure: 4, weight: 3, text: 1, magical: 2, social: 0, spatial: 1, environmental: 2, acoustic: 4, presence: 1 },
    lootMaterials: ["Stormforged Iron", "Giant Iron"],
    lootTraits: ["Etched", "Maker's Mark"],
    partialLoot: ["a scorched leather apron strap", "a hammer-head the size of an anvil", "a coil of lightning-tempered wire"],
  },
  {
    name: "Cloud Eagle Rider", type: "Ranger", discipline: 5, baseSuspicion: 3, constitution: 9, interactionStyle: "sight",
    group: "giantKin",
    repelledBy: { traits: ["Lacquered", "Gilded"] },
    minTier: "Apex", minMass: 38, wholeMealMass: 42,
    locations: ["cloud_kingdom"],
    quirks: ["Surveys every room from the highest perch available", "Whistles signals to its mount", "Notices anything that wasn't there on the last pass"],
    appliedQuirk: "{name} peers down at the {form} from a high perch: was that there on the last pass?",
    alluringQualities: { materials: ["Cloud Fleece", "Beanstalk Leather", "Titan Oak"], traits: ["Weathered", "Rustic"], tags: ["Transport", "Structural"] },
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
    appliedQuirk: "{name} peers behind the {form}, looking for an escaped goose.",
    alluringQualities: { materials: ["Golden Goose Down", "Titan Oak", "Cloud Fleece"], traits: ["Soft", "Warm to Touch", "Gilded", "Earthy"], tags: ["Comfort", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Golden Goose Down", "Cloud Fleece", "Titan Oak"],
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
    appliedQuirk: "{name} picks up the {form} and gives it a long, thoughtful sniff.",
    alluringQualities: { materials: ["Sky Gold", "Lightning Marble", "Soulglass"], traits: ["Gilded", "Inlaid", "Polished", "Warm to Touch", "Locked", "Maker's Mark"], tags: ["Valuable", "Storage", "Authority"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 4, text: 0, magical: 1, social: 1, spatial: 1, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Sky Gold", "Lightning Marble", "Soulglass"],
    lootTraits: ["Gilded", "Inlaid"],
    partialLoot: ["a fragment of giant's golden ring", "shard of enormous gemstone", "scrap of giant velvet robe"],
  },
  {
    name: "Beanstalk Climber", type: "Rogue", discipline: 4, baseSuspicion: 3, constitution: 4, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 30, wholeMealMass: 38,
    quirks: ["Has climbed the stalk before — checks everything for traps", "Moves silently for their size", "Paranoid about giant detection — checks ceilings constantly"],
    appliedQuirk: "{name} checks the {form} for traps, then glances nervously at the ceiling.",
    alluringQualities: { materials: ["Sky Gold", "Golden Goose Down", "Lightning Marble"], traits: ["Gilded", "Polished", "Locked", "Thieves' Mark"], tags: ["Valuable"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 3, text: 1, magical: 1, social: 1, spatial: 3, environmental: 2, acoustic: 3, presence: 1 },
    lootMaterials: ["Beanstalk Leather", "Titan Oak", "Sky Gold"],
    lootTraits: [],
    partialLoot: ["a length of beanstalk vine", "scrap of beanstalk-leather pack", "a giant's golden coin fragment"],
  },

  // ── Spell or Sweet Street (seasonal, All Hallows' Eve): the costumes that aren't ──
  // On the street they only appear as its real monsters (see `realMonsters` on the location).
  // The Swamp Hag also haunts the Lonely Moor, where she turns up like anyone else.
  {
    name: "Skeleton", type: "Undead", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "supernatural",
    locations: ["spell_or_sweet_street"],
    quirks: ["Rattles when it walks, which everyone agrees is a great touch", "Never eats any of the sweets", "Its mask looks remarkably like a skull"],
    appliedQuirk: "{name} rattles up to the {form} and taps it with one long, bony finger.",
    alluringQualities: { materials: ["Limestone", "Horn"], traits: ["Dusty", "Cracked", "Musty"], tags: ["Storage", "Decor"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 1, text: 0, magical: 1, social: 0, spatial: 1, environmental: 0, acoustic: 2, presence: 1 },
    lootMaterials: ["Horn", "Limestone"],
    lootTraits: ["Musty"],
    partialLoot: ["a loose rib", "a finger bone", "a scrap of grave-dirt cloak"],
  },
  {
    name: "Mummy", type: "Undead", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    minTier: "Standard",
    group: "supernatural",
    repelledBy: { traits: ["Fresh"] },
    locations: ["spell_or_sweet_street"],
    quirks: ["Trails bandages that look centuries old", "Groans instead of saying \"spell or sweet\"", "Smells of resin and old tombs. Very committed."],
    appliedQuirk: "{name} shuffles up to the {form} and lays a wrapped hand on it, groaning softly.",
    alluringQualities: { materials: ["Gold", "Linen", "Limestone"], traits: ["Gilded", "Inlaid", "Musty"], tags: ["Valuable", "Religious"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 1, magical: 1, social: 0, spatial: 0, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Linen", "Gold"],
    lootTraits: ["Wrinkled", "Musty"],
    partialLoot: ["a strip of ancient bandage", "a gold scarab amulet", "a handful of embalming resin"],
  },
  {
    name: "Swamp Hag", type: "Fey", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    minTier: "Standard",
    group: "supernatural",
    repelledBy: { traits: ["Polished", "Fragrant", "Ward Sign"] },
    locations: ["spell_or_sweet_street", "lonely_moor"],
    quirks: ["Her warts move when you aren't looking", "Asks everyone she meets for something other than coin", "The pond weed in her hair is still alive"],
    appliedQuirk: "{name} sniffs the {form} and cackles. \"Oh, I know what YOU are, dearie.\"",
    alluringQualities: { materials: ["Feywood", "Burlap", "Horn"], traits: ["Mossy", "Earthy", "Foul"], tags: ["Rural", "Storage"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 1, magical: 3, social: 1, spatial: 1, environmental: 2, acoustic: 0, presence: 2 },
    lootMaterials: ["Feywood", "Burlap"],
    lootTraits: ["Mossy", "Earthy"],
    partialLoot: ["a clump of living pond weed", "a crooked nail", "a pouch of something that wriggles"],
  },

  // ── The Founders' Fair (seasonal, Founders' Day) ──
  {
    name: "Town Crier", type: "Commoner", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "commoners",
    locations: ["founders_fair"],
    quirks: ["Announces every event twice, loudly", "Rings the bell at anything out of place", "Knows every stall and who set it up"],
    appliedQuirk: "{name} squints at the {form}, then rings the bell once. \"Whose is THIS?\"",
    alluringQualities: { materials: ["Brass", "Oak"], traits: ["Polished", "Heraldic Crest"], tags: ["Authority", "Social"] },
    perceptionAffinity: { material: 0, structure: 1, weight: 0, text: 1, magical: 0, social: 2, spatial: 2, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Brass", "Wool"],
    lootTraits: ["Heraldic Crest"],
    partialLoot: ["a brass handbell", "a tricorn hat", "a scroll of announcements"],
  },
  {
    name: "Fireworks Master", type: "Artificer", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    locations: ["founders_fair"],
    quirks: ["Missing two fingers and an eyebrow, and proud of both", "Always looking for the next crate of rockets", "Can't hear a thing after the first volley"],
    appliedQuirk: "{name} pries at the {form}'s lid, looking for rockets.",
    alluringQualities: { materials: ["Pine", "Burlap", "Iron"], traits: ["Smoky", "Reinforced", "Rustic", "Guild Mark"], tags: ["Storage", "Entertainment"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 0, presence: 0 },
    lootMaterials: ["Pine", "Burlap"],
    lootTraits: ["Smoky"],
    partialLoot: ["a singed glove", "a coil of fuse", "a slow match, still smouldering"],
  },
  {
    name: "Pie Judge", type: "Nobility", discipline: 2, baseSuspicion: 2, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["founders_fair"],
    quirks: ["Has eaten eleven pies and is still judging", "Prods anything that might have a crust", "Takes the rosettes very seriously"],
    appliedQuirk: "{name} prods the {form} with a fork, frowns, and makes a note.",
    alluringQualities: { materials: ["Silver", "Linen"], traits: ["Fragrant", "Ornate", "Gilded"], tags: ["Dining", "Hospitality"] },
    perceptionAffinity: { material: 2, structure: 0, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Silver", "Linen"],
    lootTraits: ["Fragrant", "Gilded"],
    partialLoot: ["a blue rosette", "a crumb-covered napkin", "a silver pie fork"],
  },
  {
    name: "Founder's Heir", type: "Nobility", discipline: 2, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    locations: ["founders_fair"],
    quirks: ["Reminds everyone whose great-great-grandfather founded the town", "Inspects the decorations as if they paid for them (they did)", "Expects a front-row seat for the fireworks"],
    appliedQuirk: "{name} looks the {form} over. \"I don't recall approving this.\"",
    alluringQualities: { materials: ["Gold", "Velvet"], traits: ["Heraldic Crest", "Gilded", "Polished", "Fresh"], tags: ["Valuable", "Authority", "Decor"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 1, magical: 0, social: 2, spatial: 1, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Gold", "Velvet"],
    lootTraits: ["Heraldic Crest", "Fresh"],
    partialLoot: ["a sash of office", "a gold cufflink", "a commemorative medal"],
  },

  // ── Stargazers' Hill (seasonal, Night of Falling Stars) ──
  {
    name: "Astronomer", type: "Wizard", discipline: 3, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "common",
    locations: ["stargazers_hill"],
    quirks: ["Logs every streak in a battered notebook", "Never takes their eyes off the sky for long", "Keeps muttering about the angle of descent"],
    appliedQuirk: "{name} glances at the {form}, then back at the sky, then back at the {form}. \"That wasn't on my chart.\"",
    alluringQualities: { materials: ["Brass", "Crystal", "Clear Glass"], traits: ["Etched", "Polished", "Runescript"], tags: ["Knowledge", "Lighting"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 1, social: 0, spatial: 2, environmental: 2, acoustic: 0, presence: 0 },
    lootMaterials: ["Brass", "Clear Glass"],
    lootTraits: ["Etched", "Runescript"],
    partialLoot: ["a page of star sightings", "a brass sextant arm", "an ink-blotted cuff"],
  },
  {
    name: "Meteorite Prospector", type: "Rogue", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    locations: ["stargazers_hill"],
    quirks: ["Taps every rock with a little hammer, just in case", "Carries a sack for whatever falls", "Elbows anyone between them and a landing"],
    appliedQuirk: "{name} taps the {form} with a little hammer and listens. \"Hm. Not from the sky.\"",
    alluringQualities: { materials: ["Iron", "Obsidian", "Basalt"], traits: ["Pitted", "Rough-Hewn", "Faint Glow"], tags: ["Valuable", "Storage"] },
    perceptionAffinity: { material: 3, structure: 1, weight: 2, text: 0, magical: 0, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Iron", "Basalt"],
    lootTraits: ["Pitted"],
    partialLoot: ["a rock hammer", "a sack of ordinary stones", "a scorched glove"],
  },
  {
    name: "Lens-Grinder's Apprentice", type: "Artificer", discipline: 2, baseSuspicion: 2, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["stargazers_hill"],
    quirks: ["Polishes anything shiny on reflex", "Was told to mind the workshop and absolutely did not", "Squints through a lens at everything"],
    appliedQuirk: "{name} squints at the {form} through a lens, then gives it a quick polish.",
    alluringQualities: { materials: ["Clear Glass", "Crystal", "Brass"], traits: ["Smooth", "Lacquered", "Guild Mark"], tags: ["Lighting", "Knowledge"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 0, text: 0, magical: 0, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Clear Glass", "Crystal"],
    lootTraits: ["Lacquered"],
    partialLoot: ["a polishing cloth", "a cracked lens", "a leather apron strap"],
  },
  {
    name: "Lovestruck Wisher", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["stargazers_hill"],
    quirks: ["Makes a wish on every single streak", "Ties ribbons to anything near the stones", "Is absolutely sure this is the year"],
    appliedQuirk: "{name} ties a ribbon to the {form} and makes a wish on it.",
    alluringQualities: { materials: ["Silver", "Silk"], traits: ["Faint Glow", "Gilded", "Fragrant", "Ward Sign"], tags: ["Decor", "Social"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Silk", "Linen"],
    lootTraits: ["Fragrant"],
    partialLoot: ["a silk ribbon", "a folded wish", "a pressed flower"],
  },

  // ── Snowbound Lodge (seasonal, Midwinter) ──
  {
    name: "Lodgekeeper", type: "Commoner", discipline: 2, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "commoners",
    locations: ["snowbound_lodge"],
    quirks: ["Rations the firewood and counts every log", "Knows exactly what furniture the lodge owns", "Keeps saying the pass will open tomorrow"],
    appliedQuirk: "{name} stops in front of the {form}, frowning. \"I don't remember buying that.\"",
    alluringQualities: { materials: ["Pine", "Wool", "Iron"], traits: ["Rustic", "Smoky", "Worn", "Ward Sign"], tags: ["Comfort", "Hospitality"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 1 },
    lootMaterials: ["Pine", "Wool"],
    lootTraits: ["Smoky"],
    partialLoot: ["a ring of lodge keys", "a knitted scarf end", "a tally stick for the woodpile"],
  },
  {
    name: "Gnome Courier", type: "Commoner", discipline: 2, baseSuspicion: 1, constitution: 2, interactionStyle: "touch",
    group: "commoners",
    locations: ["snowbound_lodge"],
    quirks: ["Snowed in with a sack of Midwinter parcels and a schedule to keep", "Checks every package against a very long list", "Insists the sledge dogs will be back for them"],
    appliedQuirk: "{name} checks the {form} against the list. Twice.",
    alluringQualities: { materials: ["Burlap", "Linen", "Pine"], traits: ["Pristine", "Fragrant"], tags: ["Storage", "Transport", "Decor"] },
    repelledBy: { traits: ["Tally Marks"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 2, text: 2, magical: 0, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Burlap", "Linen"],
    lootTraits: ["Fragrant"],
    partialLoot: ["a parcel tag", "a curl of red ribbon", "a pointed felt cap"],
  },
  {
    name: "Gnome Lamplighter", type: "Artificer", discipline: 3, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    locations: ["snowbound_lodge"],
    repelledBy: { traits: ["Shadowed Presence"] },
    quirks: ["Keeps every lamp in the lodge trimmed and burning", "Notices the moment a shadow falls the wrong way", "Hums to keep warm"],
    appliedQuirk: "{name} lifts a lamp to the {form} and studies the shadow it casts.",
    alluringQualities: { materials: ["Brass", "Clear Glass"], traits: ["Polished", "Faint Glow", "Guild Mark"], tags: ["Lighting", "Decor"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 0, magical: 1, social: 0, spatial: 2, environmental: 2, acoustic: 0, presence: 1 },
    lootMaterials: ["Brass", "Clear Glass"],
    lootTraits: ["Faint Glow"],
    partialLoot: ["a brass wick-trimmer", "a singed mitten", "a stub of lamp oil candle"],
  },
  {
    name: "Gnome Woodcarver", type: "Artificer", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "commoners",
    locations: ["snowbound_lodge"],
    quirks: ["Whittles little gifts by the fire", "Runs a thumb along the grain of everything wooden", "Can't resist critiquing other people's joinery"],
    appliedQuirk: "{name} runs a thumb along the {form}'s grain and tuts at the joinery.",
    alluringQualities: { materials: ["Birch", "Walnut", "Pine"], traits: ["Carved", "Etched", "Smooth", "Guild Mark", "Maker's Mark"], tags: ["Decor", "Entertainment"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 0, text: 0, magical: 0, social: 0, spatial: 0, environmental: 0, acoustic: 1, presence: 0 },
    lootMaterials: ["Birch", "Walnut"],
    lootTraits: ["Etched", "Inlaid", "Maker's Mark"],
    partialLoot: ["a half-whittled reindeer", "a pocket knife", "a curl of birch shaving"],
  },

  // ── Port City of Lonmouth (Standard+; two places in each party are theirs) ──
  {
    name: "Fishwife", type: "Commoner", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "commoners", locations: ["lonmouth"],
    repelledBy: { traits: ["Fragrant"] },
    quirks: ["Prices everything she lays eyes on", "Can smell a bad catch from across the market"],
    appliedQuirk: "{name} sizes up the {form} as if deciding what it would fetch at market.",
    alluringQualities: { materials: ["Oak", "Burlap", "Linen"], traits: ["Briny", "Smoky", "Worn"], tags: ["Storage", "Dining"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 2, spatial: 1, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Burlap", "Linen"],
    lootTraits: ["Briny"],
    partialLoot: ["a scaling knife", "a salt-stiff apron", "a basket of herring"],
  },
  {
    name: "Dockhand", type: "Commoner", discipline: 2, baseSuspicion: 1, constitution: 4, interactionStyle: "touch",
    group: "commoners", locations: ["lonmouth"],
    quirks: ["Lifts anything to see how heavy it is", "Whistles shanties at work"],
    appliedQuirk: "{name} grabs the {form} by a corner and tries to heave it onto a cart.",
    alluringQualities: { materials: ["Oak", "Iron", "Burlap"], traits: ["Reinforced", "Iron-Banded", "Briny"], tags: ["Storage", "Structural"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 4, text: 0, magical: 0, social: 1, spatial: 1, environmental: 1, acoustic: 1, presence: 1 },
    lootMaterials: ["Iron", "Burlap"],
    lootTraits: ["Pitted"],
    partialLoot: ["a cargo hook", "a coil of hemp rope", "a sweat-stained neckerchief"],
  },
  {
    // The Smuggler's opposite: drawn to the Guild Mark, put off by the Thieves' Mark
    name: "Harbormaster", type: "Nobility", discipline: 3, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "commoners", locations: ["lonmouth"],
    repelledBy: { traits: ["Thieves' Mark"] },
    quirks: ["Checks every crate against the manifest", "Never misses a docking fee"],
    appliedQuirk: "{name} squints at the {form}, then at a manifest, then back at the {form}.",
    alluringQualities: { materials: ["Brass", "Mahogany"], traits: ["Locked", "Polished", "Guild Mark"], tags: ["Storage", "Authority"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 3, magical: 0, social: 2, spatial: 2, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Brass", "Mahogany"],
    lootTraits: ["Guild Mark"],
    partialLoot: ["a brass spyglass", "a page of the harbor ledger", "a tricorn hat"],
  },
  {
    // The Harbormaster's opposite: drawn to the Thieves' Mark, put off by the Guild Mark
    name: "Smuggler", type: "Rogue", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "touch",
    group: "common", locations: ["lonmouth"],
    repelledBy: { traits: ["Guild Mark"] },
    quirks: ["Knocks on things to find the hollow ones", "Keeps one eye on the harbormaster"],
    appliedQuirk: "{name} raps on the {form}, listening for a false bottom.",
    alluringQualities: { materials: ["Oak", "Tanned Hide"], traits: ["Thieves' Mark", "Locked", "Briny"], tags: ["Storage", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 3, weight: 2, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 2, presence: 2 },
    lootMaterials: ["Tanned Hide", "Smoked Glass"],
    lootTraits: ["Thieves' Mark"],
    partialLoot: ["a false-bottomed flask", "a length of tarred rope", "a note in a smuggler's cipher"],
  },
  {
    name: "Sailor on Shore Leave", type: "Warrior", discipline: 2, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "common", locations: ["lonmouth"],
    repelledBy: { traits: ["Fresh"] },
    quirks: ["Can't walk straight on dry land", "Sings louder after every tavern"],
    appliedQuirk: "{name} stumbles into the {form} and apologizes to it.",
    alluringQualities: { materials: ["Oak", "Linen", "Brass"], traits: ["Briny", "Tally Marks", "Smoky"], tags: ["Dining", "Entertainment"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 2, spatial: 1, environmental: 2, acoustic: 2, presence: 1 },
    lootMaterials: ["Linen", "Brass"],
    lootTraits: ["Tally Marks"],
    partialLoot: ["a knot of old rigging", "a sailor's earring", "a battered tin cup"],
  },

  // ── The Tear in Time (Primordial's hunting ground) ──
  // They teach only what can be learned elsewhere, so Master of Disguise never needs the Tear
  {
    name: "Cave Hunter", type: "Hunter", discipline: 4, baseSuspicion: 3, constitution: 4, interactionStyle: "touch",
    group: "beyondApex", locations: ["tear_in_time"],
    // Spoiled meat is no meal, and a carcass draws bigger predators than he wants to meet
    repelledBy: { traits: ["Foul"] },
    quirks: ["Prods anything unfamiliar with a spear", "Sniffs the air before stepping into a clearing"],
    appliedQuirk: "{name} jabs the {form} with the butt of a spear, and waits to see if it jabs back.",
    alluringQualities: { materials: ["Horn", "Obsidian", "Boarhide"], traits: ["Bloodstained", "Tally Marks"], tags: ["Defensive"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 0, magical: 0, social: 1, spatial: 3, environmental: 3, acoustic: 3, presence: 3 },
    lootMaterials: ["Obsidian", "Horn", "Boarhide"],
    lootTraits: ["Tally Marks"],
    partialLoot: ["a flint spearhead", "a strip of hide wrapping", "a necklace of teeth"],
    companion: {
      chance: 0.5,
      options: [
        { nameSuffix: "'s Wolf", type: "AnimalCompanion", ap: 3, discipline: 3, constitution: 3, description: "One of the first wolves ever to sit by a fire for scraps. Not a dog yet. Nearly." },
      ],
    },
  },
  {
    name: "Firekeeper", type: "Commoner", discipline: 2, baseSuspicion: 1, constitution: 2, interactionStyle: "sight",
    group: "beyondApex", locations: ["tear_in_time"],
    repelledBy: { traits: ["Cold to Touch"] },
    quirks: ["Never lets the fire go out", "Warms anything that looks cold"],
    appliedQuirk: "{name} sets a smouldering ember beside the {form}, to keep it warm.",
    alluringQualities: { materials: ["Oak", "Basalt"], traits: ["Warm to Touch", "Smoky", "Ward Sign"], tags: ["Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 2, spatial: 1, environmental: 3, acoustic: 1, presence: 1 },
    lootMaterials: ["Oak", "Basalt"],
    lootTraits: ["Smoky"],
    partialLoot: ["a fire-blackened stick", "a pouch of tinder", "a scorched fur mitten"],
  },
  {
    name: "Cave Painter", type: "Bard", discipline: 3, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "beyondApex", locations: ["tear_in_time"],
    quirks: ["Traces every new shape on the cave wall", "Stares a long time at outlines"],
    appliedQuirk: "{name} squints at the {form}, then starts sketching it in ochre.",
    alluringQualities: { materials: ["Limestone", "Basalt"], traits: ["Etched", "Carved", "Runescript", "Earthy"], tags: ["Decor"] },
    perceptionAffinity: { material: 2, structure: 3, weight: 0, text: 3, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Limestone"],
    lootTraits: ["Etched"],
    partialLoot: ["a lump of red ochre", "a charcoal-stained finger bone", "a brush of moss and fat"],
  },
  {
    name: "Tribal Elder", type: "Druid", discipline: 4, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "beyondApex", locations: ["tear_in_time"],
    quirks: ["Speaks to the spirit in every stone", "Leaves offerings on anything strange"],
    appliedQuirk: "{name} lays a bundle of herbs on the {form} and murmurs to it.",
    alluringQualities: { materials: ["Bloodoak", "Horn"], traits: ["Carved", "Earthy", "Sacred Symbol"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 3, social: 2, spatial: 1, environmental: 2, acoustic: 1, presence: 4 },
    lootMaterials: ["Bloodoak"],
    lootTraits: ["Earthy"],
    partialLoot: ["a string of carved bone beads", "a bundle of dried herbs", "a feathered headdress"],
  },
  {
    name: "Woolly Mammoth", type: "Beast", discipline: 3, baseSuspicion: 1, constitution: 8, interactionStyle: "touch",
    group: "beyondApex", locations: ["tear_in_time"],
    repelledBy: { traits: ["Smoky"] },
    quirks: ["Rubs its flank against anything solid", "Trumpets at whatever won't get out of its way"],
    appliedQuirk: "{name} leans its whole shaggy weight against the {form}.",
    alluringQualities: { materials: ["Wool", "Oak", "Birch"], traits: ["Rough-Hewn", "Mossy"], tags: ["Rural"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 4, text: 0, magical: 0, social: 1, spatial: 2, environmental: 3, acoustic: 2, presence: 2 },
    lootMaterials: ["Wool", "Horn"],
    lootTraits: ["Mossy"],
    partialLoot: ["a tuft of russet wool", "a chip of tusk ivory", "a clump of matted fur"],
  },
  {
    name: "Raptor", type: "Beast", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "touch",
    group: "beyondApex", locations: ["tear_in_time"],
    quirks: ["Hunts in short, silent dashes", "Tilts its head at anything that might be breathing"],
    appliedQuirk: "{name} circles the {form} twice, nostrils flaring.",
    alluringQualities: { materials: ["Cowhide", "Boarhide"], traits: ["Bloodstained", "Foul"], tags: ["Dining"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 3, environmental: 3, acoustic: 3, presence: 5 },
    lootMaterials: ["Boarhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["a curved sickle claw", "a scrap of feathered hide", "a serrated tooth"],
  },
  {
    // Rare: joins only now and then (the Tear in Time's realMonsters); eating it is A Stitch in Time
    name: "Time Caster", type: "Wizard", discipline: 6, baseSuspicion: 5, constitution: 3, interactionStyle: "spell",
    group: "beyondApex", locations: ["tear_in_time"],
    quirks: ["Checks a pocket watch that runs backwards", "Keeps muttering about the way home"],
    appliedQuirk: "{name} frowns at the {form}: \"You weren't here yesterday. Or tomorrow.\"",
    alluringQualities: { materials: ["Brass", "Aether Crystal"], traits: ["Runescript", "Arcane Sigil", "Faint Glow"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 3, magical: 5, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 4 },
    lootMaterials: ["Aether Crystal", "Brass"],
    lootTraits: ["Arcane Sigil"],
    partialLoot: ["a cracked hourglass", "a page of impossible arithmetic", "a sleeve of star-spangled robe"],
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
  /** AP taken from them in bites so far: the whole meal, if they collapse. */
  biteAp?: number;
  fled?: boolean;
  isDisappeared?: boolean;
  isCompanion?: boolean;
  /** Converted by Devotion: no longer part of the hunt (isAlive is false too). */
  isConverted?: boolean;
  /** Overrides the type/group AP reward (companions set this from their option's `ap`). */
  apReward?: number;
  /** Snowbound locations: how much cold they can still take (0 = frozen), and the most they can have. */
  warmth?: number;
  maxWarmth?: number;
  /** The room they were in when the cold last touched them (to tell when they enter a new one). */
  warmthRoom?: RoomName;
  /** Frozen solid: out of the hunt (isAlive is false), but still there to be eaten. */
  isFrozen?: boolean;
  /**
   * In costume (see dressParty): `name` is the costume; who they really are stays hidden until
   * eaten. When the two are the same, it isn't a costume at all (a real werewolf).
   */
  costume?: string;
  trueName?: string;
};

/**
 * Still in the hunt: not eaten, fled, vanished, converted or frozen. (Each of those also sets
 * isAlive false; every one is checked here anyway, so nothing depends on that.) The one check
 * for this, used everywhere.
 */
export const stillInHunt = (a: PartyMember): boolean =>
  a.isAlive && !a.isConsumed && !a.fled && !a.isDisappeared && !a.isConverted && !a.isFrozen;

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

// AP for fully consuming an adventurer. Giant-kin use the Giant reward regardless of
// their class type (a Half-Giant Mercenary is type "Warrior" but is worth far more).
export function getApReward(adventurer: Pick<PartyMember, "group" | "type" | "apReward">): number {
  if (adventurer.apReward !== undefined) return adventurer.apReward;
  if (adventurer.group === "giantKin") return AP_REWARDS.Giant;
  return AP_REWARDS[adventurer.type] || 3;
}

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
  Giant: ["Titan Oak", "Giant Iron", "Sky Gold", "Beanstalk Leather", "Cumulogranite"],
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
