// ============================================================
// MANSIONS & MIMICS — Stats and achievements
// What a mimic's stats are worth right now, how it wastes away unfed, the achievements and
// the lifetime stats on the character sheet. Re-exported from ./gameData.
// ============================================================
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import { ALL_MATERIALS, LEARNABLE_TRAITS, TIER_ORDER, type CombatStat, type LearnableTrait, type Material, type Tier } from "./vocabulary";
import { ALL_FORMS, SEASONAL_FORMS, TIER_CONFIG, type Form, type FormId, type Sickness } from "./mimicData";
import { ADVENTURER_TEMPLATES } from "./adventurerData";
import { LOCATIONS, type LocationId } from "./locationData";
import { HOLIDAYS, today, type HolidayId } from "./holidays";
import { hasMagic, knowsTrait } from "./core";
import {
  VARIANT_FORMS, dropExpiredSeasonalForms, effectiveFormTier, formsStillAllowed, formTier, getFormTierPenalties,
} from "./forms";

// ============================================================
// EFFECTIVE STATS
// What a mimic's stats are worth right now, after everything weighing on them: being small for
// its tier, a sickness, and wearing a form from the tier above or below.
// ============================================================
/** The most any combat stat can be raised to. */
export const STAT_CAP = 6;

/** The form the mimic is wearing, if any. */
export function getActiveForm(character: Pick<MimicCharacter, "forms" | "activeFormIndex"> | null | undefined): Form | null {
  const ref = character?.forms[character.activeFormIndex];
  return ref ? ALL_FORMS.find(f => f.id === ref.formId) ?? null : null;
}

/**
 * Plausibility lost for being small for its tier (usually from mass decay): 1 below the tier's
 * minimum mass, 2 below the minimum of the tier under it as well.
 */
export function massPenalty(character: Pick<MimicCharacter, "tier" | "mass">): number {
  const tierIdx = TIER_ORDER.indexOf(character.tier);
  const tierMin = TIER_CONFIG[character.tier].massRange[0];
  const tierBelowMin = tierIdx > 0 ? TIER_CONFIG[TIER_ORDER[tierIdx - 1]].massRange[0] : 0;
  if (character.mass < tierBelowMin) return 2;
  if (character.mass < tierMin) return 1;
  return 0;
}

/** How many rooms away a Lure reaches: 1, or 2 with high base Allure (5+), plus 1 for Aether Crystal. */
export function lureRange(character: Pick<MimicCharacter, "baseAllure" | "currentAppearance"> | null | undefined): number {
  return ((character?.baseAllure ?? 2) >= 5 ? 2 : 1) + (hasMagic(character?.currentAppearance, "Aether Crystal") ? 1 : 0);
}

export interface EffectiveStats {
  /** For stealth and allure checks (at least 1). Stealth checks take the form-tier penalty off themselves. */
  plausibility: number;
  /** For strikes and bites (at least 1). */
  adhesion: number;
  /** For waiting and holding on (at least 1), form-tier penalty included. */
  patience: number;
  /** Each penalty on its own, for showing where the points went. */
  penalties: {
    mass: number;
    sickness: { plausibility: number; adhesion: number; patience: number };
    formTier: { plausibility: number; patience: number };
  };
}

export function effectiveStats(
  character: Pick<MimicCharacter, "tier" | "mass" | "plausibility" | "adhesion" | "patience" | "currentAppearance">,
  sickness: Pick<Sickness, "penalties"> | null | undefined,
  form: Form | null | undefined,
): EffectiveStats {
  const mass = massPenalty(character);
  const sick = {
    plausibility: sickness?.penalties.plausibility ?? 0,
    adhesion: sickness?.penalties.adhesion ?? 0,
    patience: sickness?.penalties.patience ?? 0,
  };
  const ownTier = formTier(character);
  const formTierPenalty = form ? getFormTierPenalties(effectiveFormTier(form, ownTier), ownTier) : { plausibility: 0, patience: 0 };
  return {
    plausibility: Math.max(1, character.plausibility - mass - sick.plausibility),
    adhesion: Math.max(1, character.adhesion - sick.adhesion),
    patience: Math.max(1, character.patience - sick.patience - formTierPenalty.patience),
    penalties: { mass, sickness: sick, formTier: formTierPenalty },
  };
}

// ============================================================
// MASS DECAY
// A mimic that goes unfed loses 1 mass per MASS_DECAY_DAYS days (never below 1). The time
// that's been charged for moves lastFedAt forward, so loading the mimic again doesn't charge
// the same days twice.
// ============================================================
export const MASS_DECAY_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function massDecay(
  mass: number, lastFedAt: string | null | undefined, now: Date = new Date(),
): { massLost: number; mass: number; lastFedAt: string; daysAway: number } | null {
  if (!lastFedAt || mass <= 1) return null;
  const fed = new Date(lastFedAt).getTime();
  const daysAway = (now.getTime() - fed) / DAY_MS;
  const massLost = Math.min(Math.floor(daysAway / MASS_DECAY_DAYS), mass - 1);
  if (massLost <= 0) return null;
  return {
    massLost,
    mass: mass - massLost,
    lastFedAt: new Date(fed + massLost * MASS_DECAY_DAYS * DAY_MS).toISOString(),
    daysAway: Math.floor(daysAway),
  };
}

/**
 * What's happened since a mimic was last opened: mass lost while it was away unfed (see
 * massDecay), and seasonal forms whose season has ended slipping away (see
 * dropExpiredSeasonalForms). The mimic as it is now, what to save, and the notices to show.
 */
export function welcomeBack(
  character: MimicCharacter, { now = new Date(), day = today() }: { now?: Date; day?: Date } = {},
): { character: MimicCharacter; changes: Partial<MimicCharacter>; massDecayNotice: string | null; seasonNotice: string | null } {
  let changes: Partial<MimicCharacter> = {};
  let massDecayNotice: string | null = null;
  const decay = massDecay(character.mass, character.lastFedAt, now);
  // The decay-free stretch starts the first time a mimic is opened (older saves included)...
  if (!character.decayFreeDate) changes = { decayFreeDate: now.toISOString() };
  if (decay) {
    // ...and starts over from the last mass decay taken
    changes = { mass: decay.mass, lastFedAt: decay.lastFedAt, decayFreeDate: decay.lastFedAt };
    massDecayNotice = `You have been away for ${decay.daysAway} days without feeding. Your mass has diminished by ${decay.massLost} (now ${decay.mass}). Hunger gnaws at your form.`;
  }
  const dropped = dropExpiredSeasonalForms(character.forms, character.activeFormIndex, day);
  if (dropped) changes = { ...changes, forms: dropped.forms, activeFormIndex: dropped.activeFormIndex };
  return { character: { ...character, ...changes }, changes, massDecayNotice, seasonNotice: dropped?.message ?? null };
}

// ============================================================
// ACHIEVEMENTS
// The single list the Home badges, in-game banners and Codex all read from.
// Each is earned from the saved character, so nothing else needs to track it.
// ============================================================
export const CULT_CONVERSIONS = 3;
export const CANNIBAL_MIMICS = 10;

export type AchievementId =
  "hatboxToLegend" | "apexPeak" | "titanicFeast" | "downWithTheShip" | "cultOfPersonality" | "cannibal" |
  "connoisseur" | "masterOfDisguise" | "curiosityCabinet" | "festive" | "forAllSeasons" | "seasonedTraveler";

type AchievementProgress = Pick<MimicCharacter,
  "hatboxToLegendReached" | "apexPeakReached" | "titanicFeastReached" | "downWithTheShipReached" |
  "conversions" | "mimicsConsumed" | "adventurersEaten" | "learnedMaterials" | "learnedTraits" | "formsUsed" |
  "locationHuntCounts">;

/**
 * Every material and trait an adventurer (or companion, or treasure) can teach. Master of
 * Disguise needs ALL_MATERIALS and LEARNABLE_TRAITS, so anything missing from these lists is a
 * content bug: it can never be learned (tests/achievements.test.mjs checks this).
 */
export function obtainableMaterialsAndTraits(): { materials: Set<Material>; traits: Set<LearnableTrait> } {
  const materials = new Set<Material>();
  const traits = new Set<LearnableTrait>();
  for (const t of ADVENTURER_TEMPLATES) {
    t.lootMaterials.forEach(x => materials.add(x));
    t.lootTraits.forEach(x => traits.add(x));
    t.treasure?.materials.forEach(x => materials.add(x));
    t.treasure?.traits.forEach(x => traits.add(x));
    for (const o of t.companion?.options ?? []) {
      o.lootMaterials?.forEach(x => materials.add(x));
      o.lootTraits?.forEach(x => traits.add(x));
    }
  }
  return { materials, traits };
}

export interface Achievement {
  id: AchievementId;
  name: string;
  icon: string;
  /** How to earn it (Codex). */
  description: string;
  /** Banner flavor text for a mimic that has earned it. */
  flavor: (mimicName: string) => string;
  isEarned: (character: AchievementProgress) => boolean;
  /**
   * Where its banner appears during a hunt (only while hunting there). Achievements without
   * one have no in-game banner; every earned achievement is listed on the character sheet.
   */
  bannerLocation?: LocationId;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "hatboxToLegend", name: "From Hatbox to Legend", icon: "📦",
    description: "Begin as a Minor mimic and evolve all the way to the Apex tier. Mimics that started at Lesser don't qualify.",
    // A mimic named Hatbox was promised this at creation ("You'll be a legend in no time")
    flavor: (n) => n.trim().toLowerCase() === "hatbox"
      ? "Told you. Hatbox, the legend."
      : `${n} was once small enough to overlook. No one makes that mistake anymore.`,
    isEarned: (c) => c.hatboxToLegendReached,
  },
  {
    id: "apexPeak", name: "Peak of the Apex", icon: "🏆",
    description: "Reach mass 40 at the Apex tier.",
    flavor: (n) => `${n} has consumed entire roads. Cartographers have stopped trying.`,
    isEarned: (c) => c.apexPeakReached,
  },
  {
    id: "titanicFeast", name: "Titanic Feast", icon: "🍖",
    description: "Consume all five Cloud Kingdom giants whole — finishing one off with bites doesn't count.",
    flavor: () => "The Cloud Kingdom's halls stand empty. Its lords, smiths and riders went in whole, and nothing came back out.",
    isEarned: (c) => c.titanicFeastReached,
    bannerLocation: "cloud_kingdom",
  },
  {
    id: "downWithTheShip", name: "Down With the Ship", icon: "⚓",
    description: "Swallow the Ship's Captain whole, strongbox and all, aboard The Sinking Ship.",
    flavor: (n) => `The captain never did abandon ship. ${n} made sure of it.`,
    isEarned: (c) => c.downWithTheShipReached,
    bannerLocation: "sinking_ship",
  },
  {
    id: "cultOfPersonality", name: "Cult of Personality", icon: "🕯️",
    description: `Convert ${CULT_CONVERSIONS} devotees to your worship at The Hollow Reliquary.`,
    flavor: (n) => `Candles burn for ${n} in three different hands now. The faithful are learning the hymns.`,
    isEarned: (c) => c.conversions >= CULT_CONVERSIONS,
    bannerLocation: "hollow_reliquary",
  },
  {
    id: "cannibal", name: "Cannibal", icon: "🦷",
    description: `Devour ${CANNIBAL_MIMICS} other mimics — nest mimics, Elders and lone rivals all count.`,
    flavor: (n) => `${n} has eaten its own kind ${CANNIBAL_MIMICS} times over. The others have learned to hide from it.`,
    isEarned: (c) => c.mimicsConsumed >= CANNIBAL_MIMICS,
    bannerLocation: "mimic_nest",
  },
  {
    id: "connoisseur", name: "Connoisseur", icon: "🍽️",
    description: "Eat at least one of every kind of adventurer (companions don't count). The Codex tracks your progress.",
    flavor: (n) => `There is no one left that ${n} hasn't tasted. It has opinions about all of them.`,
    isEarned: (c) => ADVENTURER_TEMPLATES.every(t => c.adventurersEaten.includes(t.name)),
  },
  {
    id: "masterOfDisguise", name: "Master of Disguise", icon: "🎭",
    description: "Learn every material and every learnable trait (surface, symbolic, condition, and scent) in the game.",
    flavor: (n) => `${n} can be anything, made of anything. Nobody will ever be sure of a chair again.`,
    isEarned: (c) => ALL_MATERIALS.every(x => c.learnedMaterials.includes(x)) &&
      LEARNABLE_TRAITS.every(x => knowsTrait(c, x)),
  },
  {
    id: "curiosityCabinet", name: "Curiosity Cabinet", icon: "🗝️",
    description: "Hunt in every variant form at least once — the shapes you can only take after learning something new.",
    flavor: (n) => `${n} has been a whispering grimoire, a weeping portrait and a grinning gargoyle. Collectors would pay a fortune — if they knew.`,
    isEarned: (c) => VARIANT_FORMS.every(f => c.formsUsed.includes(f.id as FormId)),
  },
  {
    id: "festive", name: "Festive", icon: "🎊",
    description: "Hunt in a seasonal form: one of the shapes that only appear around a holiday.",
    flavor: (n) => `${n} spent the holiday as part of the decorations. Nobody noticed. Nobody ever does.`,
    isEarned: (c) => SEASONAL_FORMS.some(f => c.formsUsed.includes(f.id)),
  },
  {
    id: "forAllSeasons", name: "A Mimic for All Seasons", icon: "🗓️",
    description: "Hunt in at least one seasonal form from every holiday season of the year.",
    flavor: (n) => `${n} has been a lantern, an egg, a bonfire and a gift. The calendar has learned to fear it.`,
    isEarned: (c) => (Object.keys(HOLIDAYS) as HolidayId[]).every(h =>
      SEASONAL_FORMS.some(f => f.holiday === h && c.formsUsed.includes(f.id))),
  },
  {
    id: "seasonedTraveler", name: "Seasoned Traveler", icon: "🧳",
    description: "Hunt at least once in every seasonal location, each open only around its holiday.",
    flavor: (n) => `${n} has been snowed in, starstruck, set off with the fireworks and handed out as a sweet. Wherever the holiday goes, it gets there first.`,
    // Every location with a holiday, so new seasonal locations join the list on their own
    isEarned: (c) => LOCATIONS.filter(l => l.holiday).every(l => (c.locationHuntCounts?.[l.id] ?? 0) > 0),
  },
];

// ============================================================
// LIFETIME STATS (character sheet)
// ============================================================
export interface LifetimeStats {
  huntsSurvived: number;
  huntsFailed: number;
  huntsTotal: number;
  /** Adventurers, companions and rival mimics eaten. */
  entitiesEaten: number;
  formsUsed: number;
  closestCall: number;
  biggestMeal: { name: string; ap: number } | null;
  lifetimeApEarned: number;
  favoriteForm: { name: string; hunts: number } | null;
  favoriteHuntingGround: { name: string; hunts: number } | null;
}

/** The key with the highest count (first one wins a tie), or null if nothing has been counted. */
export function mostCounted<K extends string>(counts: Partial<Record<K, number>>): { key: K; count: number } | null {
  let best: { key: K; count: number } | null = null;
  for (const [key, count] of Object.entries(counts) as [K, number][]) {
    if (count > 0 && (!best || count > best.count)) best = { key, count };
  }
  return best;
}

/** Adds a form to the list of forms a mimic has hunted in. */
export function withFormUsed(list: readonly FormId[], formId: FormId | null | undefined): FormId[] {
  return formId && !list.includes(formId) ? [...list, formId] : [...list];
}

/** Adds one to a key's count. */
export function withCount<K extends string>(counts: Partial<Record<K, number>>, key: K | null | undefined): Partial<Record<K, number>> {
  if (!key) return { ...counts };
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

/** The bigger of the current biggest meal and this one. */
export function withBiggestMeal(
  current: { name: string; ap: number } | null, name: string, ap: number,
): { name: string; ap: number } | null {
  return !current || ap > current.ap ? { name, ap } : current;
}

// ============================================================
// BEYOND APEX (groundwork)
// The hidden tiers past Apex aren't in the game yet (see "Beyond Apex" in IDEAS.md), but the
// records they'll be judged on are kept from now on:
// - timeTearCounter: magic users (see isMagicUser) eaten while wearing a time form (toward the Tear in Time)
// - decayFreeDate: when the current stretch without losing mass to decay began (toward Eternal)
// ============================================================
/** Forms that count as time forms for the Tear in Time. */
export const TIME_FORMS: readonly FormId[] = ["minor_hourglass", "greater_midnight_orb", "greater_grandfather_clock", "apex_clocktower"];
/** Days without losing mass to decay that Eternal will ask for. */
export const ETERNAL_DECAY_FREE_DAYS = 45;

/** Adventurer types whose members are all magic users. */
export const MAGIC_USER_TYPES: readonly string[] = ["Wizard", "Fey"];
/** Magic users of other types, by name. */
export const MAGIC_USER_EXCEPTIONS: readonly string[] = ["Tiefling Hexblade"];

/** Whether an adventurer counts as a magic user for the Tear in Time (pass them unmasked). */
export function isMagicUser(member: { name: string; type: string }): boolean {
  return MAGIC_USER_TYPES.includes(member.type) || MAGIC_USER_EXCEPTIONS.includes(member.name);
}

/** The Tear in Time's counter after eating `member`: one more if it's a magic user and the mimic is wearing a time form. */
export function withTimeTear(
  character: Pick<MimicCharacter, "timeTearCounter" | "forms" | "activeFormIndex">, member: { name: string; type: string },
): number {
  const worn = character.forms[character.activeFormIndex]?.formId;
  const counts = !!worn && TIME_FORMS.includes(worn) && isMagicUser(member);
  return character.timeTearCounter + (counts ? 1 : 0);
}

/** Whole days since the mimic last lost mass to decay (0 if the stretch hasn't started). */
export function decayFreeDays(decayFreeDate: string | null | undefined, now: Date = new Date()): number {
  if (!decayFreeDate) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(decayFreeDate).getTime()) / DAY_MS));
}

export function lifetimeStats(c: Pick<MimicCharacter,
  "huntsSurvived" | "huntsFailed" | "partyMembersEaten" | "mimicsConsumed" | "formsUsed" | "closestCall" |
  "biggestMeal" | "lifetimeApEarned" | "formHuntCounts" | "locationHuntCounts">): LifetimeStats {
  const form = mostCounted(c.formHuntCounts);
  const place = mostCounted(c.locationHuntCounts);
  return {
    huntsSurvived: c.huntsSurvived,
    huntsFailed: c.huntsFailed,
    huntsTotal: c.huntsSurvived + c.huntsFailed,
    entitiesEaten: c.partyMembersEaten + c.mimicsConsumed,
    formsUsed: c.formsUsed.length,
    closestCall: c.closestCall,
    biggestMeal: c.biggestMeal,
    lifetimeApEarned: c.lifetimeApEarned,
    favoriteForm: form ? { name: ALL_FORMS.find(f => f.id === form.key)?.name ?? form.key, hunts: form.count } : null,
    favoriteHuntingGround: place ? { name: LOCATIONS.find(l => l.id === place.key)?.name ?? place.key, hunts: place.count } : null,
  };
}

// ============================================================
// UPGRADES
// What the mimic can spend its AP on once it reaches its tier's threshold: grow (+2 mass,
// tier-up past the tier's top mass) or raise a stat (+1, up to STAT_CAP). Pure: Game writes
// the log and saves the changes.
// ============================================================
export type UpgradeChoice = "mass" | CombatStat;

/** Mass gained per growth upgrade. */
export const MASS_PER_UPGRADE = 2;
/** The Peak of the Apex: this much mass at Apex. */
export const APEX_PEAK_MASS = 40;

export type UpgradeResult =
  /** A stat already at STAT_CAP: nothing changes, no AP spent. */
  | { kind: "capped"; stat: CombatStat }
  /** +1 to a stat. */
  | { kind: "stat"; stat: CombatStat; value: number; changes: Partial<MimicCharacter> }
  /** More mass, same tier. */
  | { kind: "grew"; mass: number; apexPeak: boolean; changes: Partial<MimicCharacter> }
  /** Grown past the tier's top mass: on to the next tier. */
  | {
      kind: "evolved"; tier: Tier; mass: number;
      /** The highest stat gives a point to the strain of growth (never below 1). */
      weakened: { stat: CombatStat; value: number };
      hatboxToLegend: boolean;
      /** Some forms no longer fit the new size and are gone (pick replacements). */
      formsLost: boolean;
      changes: Partial<MimicCharacter>;
    };

/**
 * Spend AP on one upgrade. Growing costs the tier's apToEvolve; a stat costs its apToUpgrade.
 * On a tier-up the highest stat (one of them at random, if tied) drops by 1, and forms that no
 * longer fit (at the new size, with Thimblewood still shrinking it, on `date`) are lost.
 */
export function applyUpgrade(
  character: MimicCharacter, choice: UpgradeChoice, date: Date = today(), random: () => number = Math.random,
): UpgradeResult {
  const cfg = TIER_CONFIG[character.tier];

  if (choice !== "mass") {
    if (character[choice] >= STAT_CAP) return { kind: "capped", stat: choice };
    const value = character[choice] + 1;
    return { kind: "stat", stat: choice, value, changes: { [choice]: value, assimilationPoints: character.assimilationPoints - cfg.apToUpgrade } };
  }

  const assimilationPoints = character.assimilationPoints - cfg.apToEvolve;
  const grown = character.mass + MASS_PER_UPGRADE;
  const nextTier: Tier | undefined = TIER_ORDER[TIER_ORDER.indexOf(character.tier) + 1];
  if (!nextTier || grown <= cfg.massRange[1]) {
    // Peak of the Apex: crossing the line at Apex (not landing in Apex by evolving)
    const apexPeak = character.tier === "Apex" && grown >= APEX_PEAK_MASS && character.mass < APEX_PEAK_MASS;
    return {
      kind: "grew", mass: grown, apexPeak,
      changes: { mass: grown, assimilationPoints, tier: character.tier, ...(apexPeak ? { apexPeakReached: true } : {}) },
    };
  }

  const mass = TIER_CONFIG[nextTier].massRange[0];
  const changes: Partial<MimicCharacter> = { mass, assimilationPoints, tier: nextTier };
  const hatboxToLegend = earnsHatboxToLegend(character, nextTier);
  if (hatboxToLegend) changes.hatboxToLegendReached = true;

  const stats: CombatStat[] = ["plausibility", "adhesion", "patience"];
  const top = Math.max(...stats.map(s => character[s]));
  const highest = stats.filter(s => character[s] === top);
  const stat = highest[Math.floor(random() * highest.length)];
  const weakened = { stat, value: Math.max(1, top - 1) };
  changes[stat] = weakened.value;

  const kept = formsStillAllowed(character.forms, formTier({ ...character, tier: nextTier }), mass, character, date);
  const formsLost = kept.length < character.forms.length;
  if (formsLost) {
    changes.forms = kept;
    // Keep wearing the same form if it survived (otherwise the first one left)
    const activeId = character.forms[character.activeFormIndex]?.formId;
    changes.activeFormIndex = Math.max(0, kept.findIndex(f => f.formId === activeId));
  }
  return { kind: "evolved", tier: nextTier, mass, weakened, hatboxToLegend, formsLost, changes };
}

// ============================================================
// FROM HATBOX TO LEGEND
// Achievement for a mimic that began as a Minor and evolved all the way to Apex.
// Starting at Lesser doesn't count, and reaching Apex is enough (Peak of the Apex
// separately rewards reaching mass 40).
// ============================================================
export function earnsHatboxToLegend(
  character: Pick<MimicCharacter, "startingType" | "hatboxToLegendReached">, newTier: Tier,
): boolean {
  return newTier === "Apex" && character.startingType === "Minor" && !character.hatboxToLegendReached;
}

// ============================================================
// TITANIC FEAST
// Achievement for consuming every giant of the Cloud Kingdom Outpost whole
// (finishing one off with bites doesn't count).
// ============================================================
export const TITANIC_FEAST_GIANTS: readonly string[] = ADVENTURER_TEMPLATES
  .filter(t => t.group === "giantKin" && t.locations?.includes("cloud_kingdom"))
  .map(t => t.name);

export function isTitanicFeastComplete(consumedWhole: readonly string[]): boolean {
  return TITANIC_FEAST_GIANTS.every(name => consumedWhole.includes(name));
}
