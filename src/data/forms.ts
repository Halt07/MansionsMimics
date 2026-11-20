// ============================================================
// MANSIONS & MIMICS — Forms
// Which forms a mimic can take: the tier and mass rules, the one-form-above limit, variant
// forms and what unlocks them, seasonal forms and when they slip away, and the penalties for
// wearing a form from the tier above or below. Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { ALL_MATERIALS, TIER_ORDER, type Material, type Tier, type Trait } from "./vocabulary";
import { MASTER_FORMS, SEASONAL_FORMS, TIER_CONFIG, type Form, type SeasonalForm } from "./mimicData";
import { HOLIDAYS, isInSeason, seasonStart } from "./holidays";
import { plural } from "./text";
import { hasMagic, knowsTrait, type AppearanceLike } from "./core";

// ---------- which forms a mimic can take ----------
// Forms from the tier below, the current tier and the tier above are available
// (with plausibility penalties for the adjacent tiers — see stealthCheck).
// A form's minimum mass only gates it when it is higher than its own tier's starting
// mass (e.g. Giant forms, Chapel, Castle Gate, Lighthouse). Otherwise every form in the
// tier above would be unreachable, since a mimic is always below that tier's starting mass.
// The upper bound of baseMassRange is display/flavor only.

export function isFormMassGated(form: Form): boolean {
  return form.baseMassRange[0] > TIER_CONFIG[form.tier].massRange[0];
}

/**
 * The tier a mimic's forms are judged against. Thimblewood shrinks it one tier (never below
 * Minor): every form-range and form-penalty rule then treats the mimic as that smaller size.
 */
export function formTier(character: { tier: Tier; currentAppearance?: AppearanceLike }): Tier {
  const idx = TIER_ORDER.indexOf(character.tier);
  return hasMagic(character.currentAppearance, "Thimblewood") ? TIER_ORDER[Math.max(0, idx - 1)] : character.tier;
}

/**
 * Which of a mimic's forms it may still carry at this size (tier, mass, variant unlocks, the
 * one-form-above limit, and seasonal forms only in season on `date`), in their current order.
 * Used after a tier-up or a Thimblewood change.
 */
export function formsStillAllowed<T extends { formId: string }>(
  forms: readonly T[], tier: Tier, mass: number, knowledge: FormKnowledge, date?: Date,
): T[] {
  const valid = getValidForms(tier, mass, knowledge, date);
  const kept: T[] = [];
  const keptForms: Form[] = [];
  for (const ref of forms) {
    const form = valid.find(f => f.id === ref.formId);
    if (form && canAddForm(keptForms, form, tier)) {
      kept.push(ref);
      keptForms.push(form);
    }
  }
  return kept;
}

// Only one of a mimic's forms may come from the tier above its own.
export const MAX_FORMS_ABOVE_TIER = 1;

/** How many forms a mimic can hold at once. */
export const MAX_FORMS = 3;

/** How many forms a new mimic chooses to start with. */
export const STARTING_FORMS = 2;

/** The parts of a form that decide which tier it counts as. */
type TieredForm = Pick<Form, "tier" | "holidayTiers">;

/**
 * The tier a form counts as for a mimic of `mimicTier`: a seasonal form open to that tier
 * counts as the mimic's own (no penalty, never "above"); any other form, its own tier.
 */
export function effectiveFormTier(form: TieredForm, mimicTier: Tier): Tier {
  return form.holidayTiers?.includes(mimicTier) ? mimicTier : form.tier;
}

export function isFormAboveTier(form: TieredForm, mimicTier: Tier): boolean {
  return TIER_ORDER.indexOf(effectiveFormTier(form, mimicTier)) === TIER_ORDER.indexOf(mimicTier) + 1;
}

/** Whether `form` may be added to `selectedForms` without breaking the one-form-above rule. */
export function canAddForm(selectedForms: readonly TieredForm[], form: TieredForm, mimicTier: Tier): boolean {
  if (!isFormAboveTier(form, mimicTier)) return true;
  return selectedForms.filter(f => isFormAboveTier(f, mimicTier)).length < MAX_FORMS_ABOVE_TIER;
}

// ---------- variant forms ----------
// A variant (e.g. Grimoire, a variant of Book) is available whenever its base form is,
// once the mimic knows any one of its unlockedBy materials or traits. It shares its
// base form's burn and room modifiers; "forms used" counts it separately.

// Only ordinary forms: seasonal variants (e.g. the Harvest Feast Table) are unlocked by the
// date, not by learning (and Curiosity Cabinet can't wait for November).
export const VARIANT_FORMS: readonly Form[] = TIER_ORDER.flatMap(t => MASTER_FORMS[t]).filter(f => f.variantOf);

export function isVariantForm(form: Pick<Form, "variantOf">): boolean {
  return !!form.variantOf;
}

/** What a mimic knows, for unlocking variant forms. */
export type FormKnowledge = Pick<MimicCharacter, "learnedMaterials" | "learnedTraits">;

/** Whether the mimic knows any of the materials or traits that unlock this variant. */
export function isVariantUnlocked(form: Pick<Form, "unlockedBy">, knowledge: FormKnowledge): boolean {
  return (form.unlockedBy ?? []).some(x =>
    (ALL_MATERIALS as readonly string[]).includes(x)
      ? knowledge.learnedMaterials.includes(x as Material)
      : knowsTrait(knowledge, x as Trait));
}

/** Ordinary forms whose tier and mass rules allow them, ignoring variant unlocks. */
function formsInRange(tierStr: Tier, massVal: number): Form[] {
  const currentTierIndex = TIER_ORDER.indexOf(tierStr);
  if (currentTierIndex === -1) return [];
  const forms: Form[] = [];
  TIER_ORDER.forEach((tier, tierIndex) => {
    if (Math.abs(tierIndex - currentTierIndex) > 1) return;
    MASTER_FORMS[tier].forEach((form) => {
      if (isFormMassGated(form) && massVal < form.baseMassRange[0]) return;
      forms.push(form);
    });
  });
  return forms;
}

// ---------- seasonal forms ----------
// Offered only while their holiday is in season (./holidays), and only to the tiers in
// holidayTiers, where they count as the mimic's own tier. When the season ends, the mimic
// loses the form (see expiredSeasonalForms); it's offered again next year.

/** Seasonal forms open to a mimic of this tier on `date` (none without a date). */
export function getSeasonalForms(tierStr: Tier, date?: Date): SeasonalForm[] {
  if (!date) return [];
  return SEASONAL_FORMS.filter(f => f.holidayTiers.includes(tierStr) && isInSeason(f.holiday, date));
}

/** The seasonal forms among `forms` whose season is over on `date`: the mimic loses these. */
export function expiredSeasonalForms<T extends { formId: string }>(forms: readonly T[], date: Date): SeasonalForm[] {
  return forms.flatMap(ref => {
    const form = SEASONAL_FORMS.find(f => f.id === ref.formId);
    return form && !isInSeason(form.holiday, date) ? [form] : [];
  });
}

/**
 * Takes away seasonal forms whose season is over, keeping the active form selected if it stays.
 * Null when nothing has expired. `message` is the notice to show the player.
 */
export function dropExpiredSeasonalForms<T extends { formId: string }>(
  forms: readonly T[], activeFormIndex: number, date: Date,
): { forms: T[]; activeFormIndex: number; lost: SeasonalForm[]; message: string } | null {
  const lost = expiredSeasonalForms(forms, date);
  if (lost.length === 0) return null;
  const activeId = forms[activeFormIndex]?.formId;
  const kept = forms.filter(f => !lost.some(l => l.id === f.formId));
  const lines = [...new Set(lost.map(f => f.holiday))].map(h => {
    const names = lost.filter(f => f.holiday === h).map(f => f.name);
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
    return `${HOLIDAYS[h].icon} ${HOLIDAYS[h].name} is over. Your ${list} ${plural(names.length, "shape slips", "shapes slip")} away until next ${seasonStart(h)}.`;
  });
  return {
    forms: kept,
    activeFormIndex: Math.max(0, kept.findIndex(f => f.formId === activeId)),
    lost,
    message: lines.join(" ") + (kept.length === 0 ? " Choose new forms before you hunt." : ""),
  };
}

/**
 * Forms a mimic can choose. Base forms by tier and mass; variant forms only when `knowledge`
 * is given and unlocks them (omit it, e.g. at character creation, for base forms only); seasonal
 * forms only when `date` is given and they're in season.
 */
export function getValidForms(tierStr: Tier, massVal: number, knowledge?: FormKnowledge, date?: Date): Form[] {
  return [
    ...formsInRange(tierStr, massVal).filter(f =>
      !isVariantForm(f) || (knowledge !== undefined && isVariantUnlocked(f, knowledge))),
    ...getSeasonalForms(tierStr, date),
  ];
}

/** Variants whose base form is in range but which the mimic hasn't unlocked yet (shown locked). */
export function getLockedVariants(tierStr: Tier, massVal: number, knowledge: FormKnowledge): Form[] {
  return formsInRange(tierStr, massVal).filter(f => isVariantForm(f) && !isVariantUnlocked(f, knowledge));
}

// ---------- form tier penalties ----------
// Tier above: less mass stretched into a larger form, so the disguise is never quite
//   perfect (–2 Plausibility on stealth checks).
// Tier below: more mass crammed into a smaller form, so the mimic is restless
//   (–1 Patience, applied to everything Patience affects).

export function getFormTierPenalties(formTier: Tier, mimicTier: Tier): { plausibility: number; patience: number } {
  const delta = TIER_ORDER.indexOf(formTier) - TIER_ORDER.indexOf(mimicTier);
  return {
    plausibility: delta === 1 ? 2 : 0,
    patience: delta === -1 ? 1 : 0,
  };
}
