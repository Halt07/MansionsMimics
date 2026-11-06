/**
 * MimicCharacter schema — the single source of truth for the character record.
 *
 * - `.parse()` validates a record and fills in defaults for missing fields, so saves
 *   made before a field existed still load correctly.
 * - The objects are strict: unknown keys (e.g. a misspelled field name in an
 *   `update()` call) are rejected rather than silently stored or dropped.
 * - Tiers, materials, traits and form ids must be real game names (from the game
 *   vocabulary and form data), so a save can't hold a misspelled or unknown name.
 * - The TypeScript types below are inferred from the schema; don't write them by hand.
 * - If database tooling needs JSON Schema, generate it with
 *   `z.toJSONSchema(MimicCharacterSchema)` instead of maintaining a second copy.
 */
import { z } from 'zod';
import {
  ALL_MATERIALS, ALL_TRAITS, STARTING_TYPES, TIER_ORDER, TRAITS,
} from '@/components/game/vocabulary';
import { FORM_IDS, LOCATIONS, type LocationId } from '@/components/game/gameData';

const TierSchema = z.enum(TIER_ORDER);
const MaterialSchema = z.enum(ALL_MATERIALS);

const FormRefSchema = z.strictObject({
  formId: z.enum(FORM_IDS),
  name: z.string(),
  tier: TierSchema,
  learned: z.boolean().default(true),
});

// Magic materials go in the primary/secondary slots (the tier's magicalMaterials limit caps
// how many of them may be magic), so there is no separate magic slot.
const AppearanceSchema = z.strictObject({
  primaryMaterials: z.array(MaterialSchema).default([]),
  secondaryMaterials: z.array(MaterialSchema).default([]),
  surfaceTraits: z.array(z.enum(TRAITS.surface)).default([]),
  symbolicTraits: z.array(z.enum(TRAITS.symbolic)).default([]),
  conditionTraits: z.array(z.enum(TRAITS.condition)).default([]),
  scentTraits: z.array(z.enum(TRAITS.scent)).default([]),
});

/** Fields the game controls. Used to validate `create()` input. */
export const MimicCharacterFieldsSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required'),
  tier: TierSchema.default('Minor'),
  startingType: z.enum(STARTING_TYPES).optional(),
  mass: z.number().default(2),
  digestiveCapacity: z.number().default(5),
  patience: z.number().default(3),
  adhesion: z.number().default(3),
  plausibility: z.number().default(3),
  assimilationPoints: z.number().default(0),
  baseAllure: z.number().default(2),
  forms: z.array(FormRefSchema).max(3, 'A mimic can hold at most 3 forms').default([]),
  activeFormIndex: z.number().int().min(0).default(0),
  learnedMaterials: z.array(MaterialSchema).default([]),
  learnedTraits: z.array(z.enum(ALL_TRAITS)).default([]),
  currentAppearance: AppearanceSchema.default(() => AppearanceSchema.parse({})),
  /** True when the mimic has reached mass 40 at Apex tier. */
  apexPeakReached: z.boolean().default(false),
  /** Names of the Cloud Kingdom giants this mimic has consumed whole (for Titanic Feast). */
  giantsConsumedWhole: z.array(z.string()).default([]),
  /** True when a mimic that started at Minor tier has evolved all the way to Apex. */
  hatboxToLegendReached: z.boolean().default(false),
  // ── Lifetime stats (see lifetimeStats in gameData) ──
  /** Hunts that ended without being discovered (party gone, goal met, ship sunk, or they left). */
  huntsSurvived: z.number().int().min(0).default(0),
  /** Hunts that ended with the mimic discovered. */
  huntsFailed: z.number().int().min(0).default(0),
  /** Adventurers and companions eaten (whole, or finished off with bites). Rivals are in mimicsConsumed. */
  partyMembersEaten: z.number().int().min(0).default(0),
  /** Every form this mimic has hunted in. */
  formsUsed: z.array(z.enum(FORM_IDS)).default([]),
  /** Hunts started in each form / at each location (favorite form and hunting ground). */
  formHuntCounts: z.partialRecord(z.enum(FORM_IDS), z.number().int().min(0)).default({}),
  locationHuntCounts: z.partialRecord(
    z.enum(LOCATIONS.map((l) => l.id) as [LocationId, ...LocationId[]]), z.number().int().min(0),
  ).default({}),
  /** Highest suspicion reached in a hunt the mimic survived. */
  closestCall: z.number().int().min(0).max(10).default(0),
  /** The single kill worth the most AP. */
  biggestMeal: z.strictObject({ name: z.string(), ap: z.number().int().min(0) }).nullable().default(null),
  /** Every AP ever gained (current AP goes down when spent; this never does). */
  lifetimeApEarned: z.number().int().min(0).default(0),
  /** Adventurer templates (by name) this mimic has met in a hunt, and has eaten (Codex discovery). */
  adventurersMet: z.array(z.string()).default([]),
  adventurersEaten: z.array(z.string()).default([]),
  /**
   * Burned after being discovered: hunting at a burned location, or starting a hunt in a
   * burned form, raises starting suspicion for a couple of hunts (see gameData BURNS).
   */
  burnedLocations: z.array(z.strictObject({
    id: z.enum(LOCATIONS.map((l) => l.id) as [LocationId, ...LocationId[]]),
    huntsLeft: z.number().int().min(1),
  })).default([]),
  burnedForms: z.array(z.strictObject({
    formId: z.enum(FORM_IDS),
    huntsLeft: z.number().int().min(1),
  })).default([]),
  /** The rare location currently open to this mimic (see advanceRareLocation), or null. */
  rareLocation: z.strictObject({
    id: z.enum(LOCATIONS.map((l) => l.id) as [LocationId, ...LocationId[]]),
    huntsLeft: z.number().int().min(1),
  }).nullable().default(null),
  /** True once this mimic has swallowed the Ship's Captain (and the strongbox) whole. */
  downWithTheShipReached: z.boolean().default(false),
  /** How many devotees have converted to this mimic's worship (Cult of Personality). */
  conversions: z.number().int().min(0).default(0),
  /** How many rival mimics this mimic has devoured (Cannibal). */
  mimicsConsumed: z.number().int().min(0).default(0),
  /** True once every Cloud Kingdom giant has been consumed whole. */
  titanicFeastReached: z.boolean().default(false),
  /** ISO timestamp of the last time the mimic consumed something (used for mass decay). */
  lastFedAt: z.iso.datetime().optional(),
  isActive: z.boolean().default(true),
});

/** A stored record: game fields plus the fields the data layer manages. */
export const MimicCharacterSchema = MimicCharacterFieldsSchema.extend({
  id: z.string(),
  created_date: z.iso.datetime(),
  updated_date: z.iso.datetime(),
});

/** A stored character, as read from the data layer (defaults filled in). */
export type MimicCharacter = z.infer<typeof MimicCharacterSchema>;
/** What `create()` accepts: game fields, with defaulted ones optional. */
export type MimicCharacterInput = z.input<typeof MimicCharacterFieldsSchema>;
/** The character's current look. */
export type Appearance = MimicCharacter['currentAppearance'];
/** One of the character's chosen forms. */
export type FormRef = MimicCharacter['forms'][number];
