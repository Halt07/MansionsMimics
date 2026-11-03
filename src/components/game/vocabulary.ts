// ============================================================
// MANSIONS & MIMICS — Game vocabulary
// The fixed word lists the rest of the game is built from. Each list is the single
// source of truth for its names, and the matching TypeScript type is derived from it,
// so a misspelled tier, material, trait or tag is a compile error everywhere.
// ============================================================

// ── Tiers ──
export const TIER_ORDER = ["Minor", "Lesser", "Standard", "Greater", "Grand", "Apex"] as const;
export type Tier = (typeof TIER_ORDER)[number];

/** The tiers a new mimic can start at. */
export const STARTING_TYPES = ["Minor", "Lesser"] as const;
export type StartingType = (typeof STARTING_TYPES)[number];

// ── Materials ──
export const MATERIALS = {
  mundane: ["Oak", "Pine", "Walnut", "Birch", "Iron", "Steel", "Brass", "Cotton", "Wool", "Burlap", "Linen", "Cowhide", "Goatskin", "Limestone", "Clear Glass", "Horn"],
  valuable: ["Mahogany", "Silver", "Gold", "Silk", "Velvet", "Satin", "Deerskin", "Tanned Hide", "Granite", "Marble", "Stained Glass"],
  rare: ["Ebonwood", "Ironwood", "Mithril", "Blacksteel", "Boarhide", "Obsidian", "Basalt", "Smoked Glass", "Crystal", "Bloodoak"],
  magic: ["Feywood", "Shadowwood", "Bonesteel", "Starforged Iron", "Dragonhide", "Direwolf Pelt", "Spellweave Silk", "Gravecloth", "Runestone", "Void Marble", "Soulglass", "Aether Crystal"],
  // ── Giant-realm materials (unlocked via Giant's Castle location) ──
  giant: ["Giant Oak", "Giant Iron", "Giant Gold", "Giant Marble", "Giant Granite", "Beanstalk Timber", "Beanstalk Leather", "Cloud Fleece", "Golden Goose Down", "Stormforged Iron"],
} as const;
export type MaterialRarity = keyof typeof MATERIALS;
export type Material = (typeof MATERIALS)[MaterialRarity][number];
export type MagicMaterial = (typeof MATERIALS)["magic"][number];

export const ALL_MATERIALS = [
  ...MATERIALS.mundane, ...MATERIALS.valuable, ...MATERIALS.rare, ...MATERIALS.magic, ...MATERIALS.giant,
] as const satisfies readonly Material[];

// ── Traits ──
// surface / symbolic / condition: applied through the appearance editor
// structural / aura: built into forms (see Form.builtInTraits)
export const TRAITS = {
  surface: ["Polished", "Tarnished", "Gilded", "Etched", "Inlaid", "Lacquered", "Rough-Hewn", "Soft", "Wrinkled", "Smooth", "Pitted", "Mossy"],
  symbolic: ["Runescript", "Sacred Symbol", "Heraldic Crest", "Arcane Sigil", "Guild Mark"],
  condition: ["Worn", "Pristine", "Cracked", "Weathered", "Bloodstained", "Dusty", "Shadowed Presence"],
  structural: ["Reinforced", "Carved", "Ornate", "Minimalist", "Heavy-Lidded", "Iron-Banded", "Upholstered", "Locked", "Rustic", "Arched"],
  aura: ["Faint Glow", "Cold to Touch", "Warm to Touch", "Whispering", "Radiant"],
} as const;
export type TraitCategory = keyof typeof TRAITS;
export type Trait = (typeof TRAITS)[TraitCategory][number];
export type SurfaceTrait = (typeof TRAITS)["surface"][number];
export type SymbolicTrait = (typeof TRAITS)["symbolic"][number];
export type ConditionTrait = (typeof TRAITS)["condition"][number];
/** Traits a form has built in rather than ones applied in the appearance editor. */
export type BuiltInTrait = (typeof TRAITS)["structural" | "aura"][number];

export const ALL_TRAITS = [
  ...TRAITS.surface, ...TRAITS.symbolic, ...TRAITS.condition, ...TRAITS.structural, ...TRAITS.aura,
] as const satisfies readonly Trait[];

// ── Utility tags ──
// What a form is "for". Adventurers are lured (or repelled) by tags; locations favor some.
export const UTILITY_TAGS = [
  "Comfort", "Bedroom", "Valuable", "Dining", "Wearable", "Knowledge", "Storage", "Lighting", "Structural",
  "Seating", "Decor", "Entertainment", "Authority", "Social", "Transport", "Hospitality", "Agricultural",
  "Religious", "Defensive", "Rural", "Coastal",
] as const;
export type UtilityTag = (typeof UTILITY_TAGS)[number];

// ── Perception ──
/** Senses an adventurer can be good at (perceptionAffinity keys). */
export const PERCEPTION_SENSES = [
  "material", "structure", "weight", "text", "magical", "social", "spatial", "environmental", "acoustic", "presence",
] as const;
export type PerceptionSense = (typeof PERCEPTION_SENSES)[number];

/** Kinds of flaw a form can give away. Flaws whose type is also a sense get that sense's bonus. */
export const FLAW_TYPES = [
  "material", "weight", "structure", "text", "acoustic", "visual", "spatial", "environmental", "presence",
  "temperature", "light", "grounding", "social",
] as const;
export type FlawType = (typeof FLAW_TYPES)[number];

export function isPerceptionSense(value: string): value is PerceptionSense {
  return (PERCEPTION_SENSES as readonly string[]).includes(value);
}

// ── Adventurers ──
export const ADVENTURER_TYPES = [
  "Rogue", "Cleric", "Bard", "Wizard", "Warrior", "Ranger", "Paladin", "Artificer", "Druid", "Assassin",
  "Hunter", "Commoner", "Nobility", "Undead", "Fey", "Construct", "Beast",
] as const;
export type AdventurerType = (typeof ADVENTURER_TYPES)[number];

/** Types used only by companions/familiars that travel with an adventurer. */
export type CompanionType = "AnimalCompanion" | "Familiar" | "Commoner";

export const INTERACTION_STYLES = ["touch", "sight", "spell"] as const;
export type InteractionStyle = (typeof INTERACTION_STYLES)[number];

// ── Mimic stats ──
export type CombatStat = "plausibility" | "adhesion" | "patience";

// ── Event log ──
export type GameEventType =
  | "info" | "system" | "alert" | "stealth" | "allure" | "attack" | "consume" | "escape" | "evolve" | "flaw";
