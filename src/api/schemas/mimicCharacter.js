/**
 * MimicCharacter schema — the single source of truth for the character record.
 *
 * - `.parse()` validates a record and fills in defaults for missing fields, so saves
 *   made before a field existed still load correctly.
 * - The objects are strict: unknown keys (e.g. a misspelled field name in an
 *   `update()` call) are rejected rather than silently stored or dropped.
 * - If database tooling needs JSON Schema, generate it with
 *   `z.toJSONSchema(MimicCharacterSchema)` instead of maintaining a second copy.
 */
import { z } from 'zod';

export const TIERS = ['Minor', 'Lesser', 'Standard', 'Greater', 'Grand', 'Apex'];
export const STARTING_TYPES = ['Minor', 'Lesser'];

const FormRefSchema = z.strictObject({
  formId: z.string(),
  name: z.string(),
  tier: z.string(),
  learned: z.boolean().default(true),
});

// Magic materials go in the primary/secondary slots (the tier's magicalMaterials limit caps
// how many of them may be magic), so there is no separate magic slot.
const AppearanceSchema = z.strictObject({
  primaryMaterials: z.array(z.string()).default([]),
  secondaryMaterials: z.array(z.string()).default([]),
  surfaceTraits: z.array(z.string()).default([]),
  symbolicTraits: z.array(z.string()).default([]),
  conditionTraits: z.array(z.string()).default([]),
});


/** Fields the game controls. Used to validate `create()` input. */
export const MimicCharacterFieldsSchema = z.strictObject({
  name: z.string().trim().min(1, 'Name is required'),
  tier: z.enum(TIERS).default('Minor'),
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
  learnedMaterials: z.array(z.string()).default([]),
  learnedTraits: z.array(z.string()).default([]),
  currentAppearance: AppearanceSchema.default(() => AppearanceSchema.parse({})),
  /** True when the mimic has reached mass 40 at Apex tier. */
  apexPeakReached: z.boolean().default(false),
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
