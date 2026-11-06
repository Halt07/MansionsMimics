// ============================================================
// MANSIONS & MIMICS — Mimic data
// Everything about the mimic itself: forms, materials, appearance limits,
// starting stats, tier progression, magic material effects and sicknesses.
// Rules that use this data live in ./gameData.
// ============================================================
import {
  MATERIALS, TIER_ORDER,
  type BuiltInTrait, type CombatStat, type FlawType, type MagicMaterial, type Material, type Trait,
  type MaterialRarity, type StartingType, type Tier, type UtilityTag,
} from "./vocabulary";

// ============================================================
// FORMS
// ============================================================
export interface FlawProfile {
  readonly type: FlawType;
  readonly description: string;
}

interface FormDef {
  readonly id: string;
  readonly name: string;
  readonly tier: Tier;
  /** [minimum, maximum] mass. The minimum only gates the form when it is above its tier's starting mass (see isFormMassGated). */
  readonly baseMassRange: readonly [number, number];
  readonly builtInTraits: readonly BuiltInTrait[];
  readonly baseAllureModifier: number;
  readonly plausibilityModifier: number;
  readonly utilityTags: readonly UtilityTag[];
  readonly materialSlots: number;
  readonly digestCapacityRequired: number;
  readonly description: string;
  readonly flawProfiles: readonly FlawProfile[];
  /**
   * Variant forms: the base form's id. A variant is available whenever its base is (same tier and
   * mass rules) AND the mimic knows any one of `unlockedBy`. It shares the base form's burn.
   */
  readonly variantOf?: string;
  readonly unlockedBy?: readonly (Material | Trait)[];
}

const FORM_DATA = {
  Minor: [
    {
      id: "minor_pillow", name: "Pillow", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Minimalist", "Warm to Touch"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Comfort", "Bedroom"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Soft, inviting, often overlooked.",
      flawProfiles: [
        { type: "material", description: "Fabric texture feels slightly synthetic or uneven" },
        { type: "weight", description: "Heavier than expected when lifted" },
        { type: "structure", description: "Does not compress naturally under pressure" },
      ],
    },
    {
      id: "minor_goblet", name: "Goblet", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Ornate"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Valuable", "Dining"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Tempting when gilded.",
      flawProfiles: [
        { type: "material", description: "Metal sheen dulls inconsistently in the light" },
        { type: "weight", description: "Balance feels slightly off when held" },
        { type: "structure", description: "Stem thickness subtly uneven" },
      ],
    },
    {
      id: "minor_boot", name: "Boot", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Minimalist"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Wearable"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Requires close contact to be effective.",
      flawProfiles: [
        { type: "material", description: "Leather grain pattern repeats unnaturally" },
        { type: "structure", description: "Stitching lines are uneven on close inspection" },
        { type: "weight", description: "Feels unusually rigid when flexed" },
      ],
    },
    {
      id: "minor_book", name: "Book", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Ornate"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Knowledge"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Highly effective on scholars.",
      flawProfiles: [
        { type: "text", description: "Letters subtly malformed or repeating in patterns" },
        { type: "structure", description: "Pages repeat the same paragraph every few leaves" },
        { type: "material", description: "Ink tone inconsistent between pages" },
      ],
    },
    {
      id: "minor_grimoire", name: "Grimoire", tier: "Minor", baseMassRange: [1, 4],
      variantOf: "minor_book", unlockedBy: ["Faint Glow", "Arcane Sigil", "Runescript"],
      builtInTraits: ["Ornate", "Whispering"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Knowledge"],
      materialSlots: 2, digestCapacityRequired: 1, description: "A book that murmurs to itself. Irresistible to anyone who dabbles — and unsettling to anyone who prays.",
      flawProfiles: [
        { type: "text", description: "The marginalia rearranges itself between readings" },
        { type: "acoustic", description: "The whispering stops the moment someone listens closely" },
        { type: "material", description: "The binding is warm, like something recently held" },
      ],
    },
    {
      id: "minor_jewelry_box", name: "Jewelry Box", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Ornate", "Heavy-Lidded", "Locked"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Valuable", "Storage"],
      materialSlots: 3, digestCapacityRequired: 2, description: "Extremely tempting if ornate.",
      flawProfiles: [
        { type: "material", description: "Wood grain pattern appears mirrored on both sides" },
        { type: "structure", description: "Hinges align slightly crooked when opened" },
        { type: "weight", description: "Feels too heavy or too light for its size" },
      ],
    },
    {
      id: "minor_music_box", name: "Music Box", tier: "Minor", baseMassRange: [1, 4],
      variantOf: "minor_jewelry_box", unlockedBy: ["Inlaid", "Lacquered"],
      builtInTraits: ["Ornate", "Heavy-Lidded", "Whispering"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Entertainment", "Valuable"],
      materialSlots: 3, digestCapacityRequired: 2, description: "Plays a half-remembered tune when the lid lifts. Nobody can resist lifting the lid.",
      flawProfiles: [
        { type: "acoustic", description: "The tune never quite repeats the same way twice" },
        { type: "structure", description: "There's no winding key, yet it never runs down" },
        { type: "weight", description: "Far too heavy for a box of tiny gears" },
      ],
    },
    {
      id: "minor_teapot", name: "Teapot", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Ornate"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Dining"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Common in civilized spaces.",
      flawProfiles: [
        { type: "material", description: "Glaze has tiny cracks that do not follow natural patterns" },
        { type: "structure", description: "Lid does not sit flush when placed on top" },
        { type: "weight", description: "Spout angle feels slightly incorrect when pouring" },
      ],
    },
    {
      id: "minor_candlestick", name: "Candlestick", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Carved", "Radiant"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Lighting", "Valuable"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Attractive if silver or gold.",
      flawProfiles: [
        { type: "material", description: "Metal tarnish pattern looks artificially uniform" },
        { type: "structure", description: "Base slightly uneven on flat surfaces" },
        { type: "weight", description: "Feels hollow when tapped" },
      ],
    },
    {
      id: "minor_brick", name: "Brick", tier: "Minor", baseMassRange: [1, 4],
      builtInTraits: ["Minimalist", "Cold to Touch"],
      baseAllureModifier: 0, plausibilityModifier: 1, utilityTags: ["Structural"],
      materialSlots: 1, digestCapacityRequired: 1, description: "Low allure, high plausibility.",
      flawProfiles: [
        { type: "material", description: "Surface texture slightly smoother than surrounding bricks" },
        { type: "structure", description: "Mortar seam does not perfectly align" },
        { type: "weight", description: "Shifts slightly when pressure is applied" },
      ],
    },
  ],

  Lesser: [
    {
      id: "lesser_chest", name: "Chest", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Iron-Banded", "Heavy-Lidded", "Locked"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Storage", "Valuable"],
      materialSlots: 3, digestCapacityRequired: 3, description: "Classic treasure lure.",
      flawProfiles: [
        { type: "material", description: "Wood grain patterns aren't present" },
        { type: "structure", description: "Lid opens slightly too smoothly, without natural hinge resistance" },
        { type: "weight", description: "Feels heavier than its apparent contents suggest" },
      ],
    },
    {
      id: "lesser_reliquary", name: "Reliquary", tier: "Lesser", baseMassRange: [5, 8],
      variantOf: "lesser_chest", unlockedBy: ["Sacred Symbol", "Stained Glass"],
      builtInTraits: ["Heavy-Lidded", "Locked", "Radiant"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Religious", "Valuable", "Storage"],
      materialSlots: 3, digestCapacityRequired: 3, description: "A holy chest for holy remains. The faithful lean in close to pray over it.",
      flawProfiles: [
        { type: "light", description: "Its glow brightens when someone reaches toward it" },
        { type: "structure", description: "The relic inside is never quite visible through the glass" },
        { type: "presence", description: "Candles nearby lean toward it, as if drawn" },
      ],
    },
    {
      id: "lesser_herbalists_chest", name: "Herbalist's Chest", tier: "Lesser", baseMassRange: [5, 8],
      variantOf: "lesser_chest", unlockedBy: ["Earthy", "Fragrant"],
      builtInTraits: ["Heavy-Lidded", "Rustic"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Storage", "Rural"],
      materialSlots: 3, digestCapacityRequired: 3, description: "A chest of little drawers and stoppered jars, sweet with dried herbs. Druids and hedge-folk can't walk past one.",
      flawProfiles: [
        { type: "environmental", description: "The herbs never wilt, crumble or lose their smell" },
        { type: "material", description: "Every drawer smells of the same herb, whatever its label says" },
        { type: "structure", description: "The drawers slide open without the usual sticking" },
      ],
    },
    {
      id: "lesser_barrel", name: "Barrel", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Iron-Banded", "Rustic"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Storage"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Common in cellars and cargo holds.",
      flawProfiles: [
        { type: "material", description: "Metal bands lack realistic hammering marks" },
        { type: "structure", description: "Staves align too perfectly with no warping" },
        { type: "acoustic", description: "Produces a dull, inconsistent echo when tapped" },
      ],
    },
    {
      id: "lesser_rum_cask", name: "Rum Cask", tier: "Lesser", baseMassRange: [5, 8],
      variantOf: "lesser_barrel", unlockedBy: ["Pitted", "Lacquered"],
      builtInTraits: ["Iron-Banded", "Rustic"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Storage", "Coastal", "Dining"],
      materialSlots: 2, digestCapacityRequired: 2, description: "A sea-worn cask that smells of spice and molasses. Sailors find it from across the hold.",
      flawProfiles: [
        { type: "acoustic", description: "Sounds full when knocked, but nothing sloshes" },
        { type: "material", description: "The salt crust stops exactly at the waterline, like a painted line" },
        { type: "environmental", description: "The rum smell is strongest where no tap is" },
      ],
    },
    {
      id: "lesser_crate", name: "Crate", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Reinforced", "Minimalist", "Rustic"],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Storage"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Stacked and overlooked in storage rooms.",
      flawProfiles: [
        { type: "material", description: "Nail heads appear slightly misaligned or duplicated" },
        { type: "structure", description: "Does not creak or flex under shifting weight" },
        { type: "weight", description: "Too evenly balanced when lifted from one corner" },
      ],
    },
    {
      id: "lesser_chair", name: "Chair", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Carved", "Upholstered"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Seating"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Invites close and prolonged contact.",
      flawProfiles: [
        { type: "structure", description: "Legs remain perfectly level even on uneven flooring" },
        { type: "material", description: "Cushion padding resists compression slightly too long" },
        { type: "acoustic", description: "Fails to creak under a seated person's weight" },
      ],
    },
    {
      id: "lesser_painting", name: "Painting", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Ornate"],
      baseAllureModifier: 2, plausibilityModifier: 1, utilityTags: ["Valuable", "Decor"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Decorative and plausibly ignored.",
      flawProfiles: [
        { type: "material", description: "Brush strokes lack natural variation in thickness" },
        { type: "structure", description: "Canvas does not sag slightly within the frame" },
        { type: "visual", description: "Eyes in the portrait seem subtly misaligned" },
      ],
    },
    {
      id: "lesser_haunted_portrait", name: "Haunted Portrait", tier: "Lesser", baseMassRange: [5, 8],
      variantOf: "lesser_painting", unlockedBy: ["Shadowed Presence", "Gravecloth"],
      builtInTraits: ["Ornate", "Whispering", "Cold to Touch"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Decor", "Valuable"],
      materialSlots: 2, digestCapacityRequired: 2, description: "A portrait whose eyes follow you. The dead adore it; the devout want it burned.",
      flawProfiles: [
        { type: "visual", description: "The eyes follow people a little too eagerly" },
        { type: "presence", description: "The room feels watched even with the portrait turned to the wall" },
        { type: "temperature", description: "The frame is colder than the wall it hangs on" },
      ],
    },
    {
      id: "lesser_statuette", name: "Statuette", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Carved"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Valuable"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Small but enticingly valuable.",
      flawProfiles: [
        { type: "material", description: "Surface patina appears too evenly distributed" },
        { type: "structure", description: "Fine details lack tool marks expected from carving" },
        { type: "weight", description: "Feels slightly warm despite ambient temperature" },
      ],
    },
    {
      id: "lesser_bookshelf_small", name: "Small Bookshelf", tier: "Lesser", baseMassRange: [5, 8],
      builtInTraits: ["Carved"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Knowledge", "Storage"],
      materialSlots: 3, digestCapacityRequired: 3, description: "Blends into studies and libraries.",
      flawProfiles: [
        { type: "structure", description: "Shelves do not bow under the weight of books" },
        { type: "material", description: "Dust accumulation pattern appears artificial or too uniform" },
        { type: "weight", description: "Does not shift slightly when leaned against" },
      ],
    },
  ],

  Standard: [
    {
      id: "standard_wardrobe", name: "Wardrobe", tier: "Standard", baseMassRange: [9, 12],
      builtInTraits: ["Carved", "Ornate"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Storage"],
      materialSlots: 3, digestCapacityRequired: 4, description: "Tall and imposing storage, ideal for ambush.",
      flawProfiles: [
        { type: "structure", description: "Doors do not swing with natural weight or hinge resistance" },
        { type: "material", description: "Interior wood lacks the expected scent of aged timber" },
        { type: "spatial", description: "Interior depth feels subtly larger than exterior dimensions allow" },
      ],
    },
    {
      id: "standard_bookshelf", name: "Bookshelf", tier: "Standard", baseMassRange: [9, 12],
      builtInTraits: ["Carved", "Arched", "Whispering"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Knowledge"],
      materialSlots: 4, digestCapacityRequired: 4, description: "A scholar's temptation.",
      flawProfiles: [
        { type: "structure", description: "Shelves do not sag under heavy tomes" },
        { type: "material", description: "Dust gathers evenly rather than in neglected corners" },
        { type: "text", description: "Several book spines repeat identical titles on close inspection" },
      ],
    },
    {
      id: "standard_writing_desk", name: "Writing Desk", tier: "Standard", baseMassRange: [9, 12],
      builtInTraits: ["Carved"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Knowledge"],
      materialSlots: 3, digestCapacityRequired: 4, description: "Invites prolonged interaction.",
      flawProfiles: [
        { type: "structure", description: "Drawers slide too smoothly without sticking" },
        { type: "material", description: "Ink stains appear decorative rather than absorbed into the grain" },
        { type: "weight", description: "Desk does not shift slightly when leaned upon" },
      ],
    },
    {
      id: "standard_dining_table", name: "Dining Table", tier: "Standard", baseMassRange: [9, 12],
      builtInTraits: ["Carved", "Reinforced"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Dining"],
      materialSlots: 3, digestCapacityRequired: 4, description: "Central to gathering spaces.",
      flawProfiles: [
        { type: "structure", description: "Remains perfectly level even on uneven flooring" },
        { type: "material", description: "Surface scratches lack depth variation" },
        { type: "acoustic", description: "Produces a muted, inconsistent tone when knocked upon" },
      ],
    },
    {
      id: "standard_door", name: "Door", tier: "Standard", baseMassRange: [9, 12],
      builtInTraits: ["Reinforced", "Iron-Banded", "Locked", "Arched"],
      baseAllureModifier: 1, plausibilityModifier: 1, utilityTags: ["Structural"],
      materialSlots: 2, digestCapacityRequired: 4, description: "Blends seamlessly into architecture.",
      flawProfiles: [
        { type: "structure", description: "Does not align perfectly with the frame when closed" },
        { type: "material", description: "Grain direction shifts subtly near the edges" },
        { type: "environmental", description: "Fails to block drafts or sound naturally" },
      ],
    },
    {
      id: "standard_grand_chair", name: "Grand Chair", tier: "Standard", baseMassRange: [9, 12],
      builtInTraits: ["Ornate", "Carved", "Upholstered"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Seating", "Valuable"],
      materialSlots: 3, digestCapacityRequired: 4, description: "Ornate and commanding.",
      flawProfiles: [
        { type: "structure", description: "Ornamental carvings repeat in identical patterns" },
        { type: "material", description: "Cushion fabric feels slightly warm to the touch" },
        { type: "weight", description: "Does not creak under significant seated weight" },
      ],
    },
  ],

  Greater: [
    {
      id: "greater_statue", name: "Statue", tier: "Greater", baseMassRange: [13, 16],
      builtInTraits: ["Carved", "Cold to Touch"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Decor", "Valuable"],
      materialSlots: 3, digestCapacityRequired: 5, description: "Imposing and monumental.",
      flawProfiles: [
        { type: "material", description: "Surface weathering appears evenly distributed rather than directional" },
        { type: "structure", description: "Weight distribution feels subtly unbalanced at the base" },
        { type: "environmental", description: "Does not collect dust or bird droppings naturally over time" },
      ],
    },
    {
      id: "greater_gargoyle", name: "Gargoyle", tier: "Greater", baseMassRange: [13, 16],
      variantOf: "greater_statue", unlockedBy: ["Etched", "Basalt"],
      builtInTraits: ["Carved", "Cold to Touch", "Arched"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Decor", "Defensive"],
      materialSlots: 3, digestCapacityRequired: 5, description: "A grinning stone guardian. Real gargoyles have been known to stop and stare.",
      flawProfiles: [
        { type: "structure", description: "No drainage channel runs through its mouth" },
        { type: "environmental", description: "Pigeons refuse to perch on it" },
        { type: "visual", description: "Its grin is a little wider every time you look" },
      ],
    },
    {
      id: "greater_piano", name: "Piano", tier: "Greater", baseMassRange: [13, 16],
      builtInTraits: ["Ornate", "Heavy-Lidded"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Entertainment"],
      materialSlots: 4, digestCapacityRequired: 5, description: "Elegant, complex, and sonically dangerous.",
      flawProfiles: [
        { type: "acoustic", description: "Notes resonate slightly longer than acoustically appropriate" },
        { type: "structure", description: "Internal strings appear too uniformly spaced" },
        { type: "material", description: "Polish reflects light with unnatural clarity" },
      ],
    },
    {
      id: "greater_wall", name: "Wall Section", tier: "Greater", baseMassRange: [13, 16],
      builtInTraits: ["Reinforced"],
      baseAllureModifier: 0, plausibilityModifier: 2, utilityTags: ["Structural"],
      materialSlots: 2, digestCapacityRequired: 5, description: "Blends into architecture seamlessly.",
      flawProfiles: [
        { type: "structure", description: "Mortar seams to subtly misalign with adjacent masonry" },
        { type: "environmental", description: "Fails to transmit vibrations when struck like surrounding walls" },
        { type: "spatial", description: "Thickness feels inconsistent when measured or knocked upon" },
      ],
    },
    {
      id: "greater_throne", name: "Throne", tier: "Greater", baseMassRange: [13, 16],
      builtInTraits: ["Ornate", "Carved"],
      baseAllureModifier: 4, plausibilityModifier: 0, utilityTags: ["Valuable", "Authority"],
      materialSlots: 4, digestCapacityRequired: 5, description: "Symbol of power and temptation.",
      flawProfiles: [
        { type: "material", description: "Gem inlays reflect identical internal fractures" },
        { type: "structure", description: "Carved motifs repeat in mathematically perfect symmetry" },
        { type: "presence", description: "Produces a faint warmth even in cold chambers" },
      ],
    },
    {
      id: "greater_bed", name: "Bed", tier: "Greater", baseMassRange: [13, 16],
      builtInTraits: ["Carved", "Warm to Touch", "Upholstered"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Comfort"],
      materialSlots: 3, digestCapacityRequired: 5, description: "Invites vulnerability.",
      flawProfiles: [
        { type: "structure", description: "Frame does not creak or shift under full body weight" },
        { type: "material", description: "Sheets wrinkle in patterns that subtly reset when unobserved" },
        { type: "temperature", description: "Mattress retains warmth unnaturally long" },
      ],
    },
  ],

  Grand: [
    {
      id: "grand_personal_library", name: "Personal Library", tier: "Grand", baseMassRange: [17, 25],
      builtInTraits: ["Carved", "Ornate"],
      baseAllureModifier: 4, plausibilityModifier: 0, utilityTags: ["Structural", "Knowledge"],
      materialSlots: 6, digestCapacityRequired: 6, description: "An enclosed sanctuary of scholarship.",
      flawProfiles: [
        { type: "text", description: "Several volumes repeat identical passages across different books" },
        { type: "environmental", description: "Dust patterns reset subtly between extended observations" },
        { type: "acoustic", description: "Footsteps echo inconsistently relative to wall spacing" },
        { type: "spatial", description: "Shelf depth exceeds plausible wall thickness" },
      ],
    },
    {
      id: "grand_atheneum", name: "Atheneum", tier: "Grand", baseMassRange: [17, 25],
      variantOf: "grand_personal_library", unlockedBy: ["Musty", "Runescript"],
      builtInTraits: ["Carved", "Ornate", "Arched", "Whispering"],
      baseAllureModifier: 5, plausibilityModifier: 0, utilityTags: ["Structural", "Knowledge", "Authority"],
      materialSlots: 6, digestCapacityRequired: 6, description: "A domed hall of learning, older than the house around it. Scholars come in and forget to leave.",
      flawProfiles: [
        { type: "text", description: "The catalogue lists more books than the shelves could ever hold" },
        { type: "spatial", description: "The dome is taller inside than the roof is outside" },
        { type: "acoustic", description: "Pages turn somewhere in the stacks when no one is there" },
        { type: "environmental", description: "The dust never settles on the reading tables" },
      ],
    },
    {
      id: "grand_parlor", name: "Parlor", tier: "Grand", baseMassRange: [17, 25],
      builtInTraits: ["Ornate", "Upholstered"],
      baseAllureModifier: 3, plausibilityModifier: 1, utilityTags: ["Structural", "Social"],
      materialSlots: 6, digestCapacityRequired: 6, description: "Designed for comfort, conversation, and subtle entrapment.",
      flawProfiles: [
        { type: "environmental", description: "Airflow feels slightly stagnant regardless of window position" },
        { type: "structure", description: "Furniture arrangement remains subtly symmetrical beyond reason" },
        { type: "acoustic", description: "Conversation carries strangely, dampened in certain corners" },
        { type: "presence", description: "Room temperature remains faintly warm even without a hearth" },
      ],
    },
    {
      id: "grand_carriage", name: "Carriage", tier: "Grand", baseMassRange: [17, 25],
      builtInTraits: ["Reinforced", "Iron-Banded", "Upholstered"],
      baseAllureModifier: 4, plausibilityModifier: 0, utilityTags: ["Transport"],
      materialSlots: 5, digestCapacityRequired: 6, description: "Elegant transport with predatory patience.",
      flawProfiles: [
        { type: "structure", description: "Suspension absorbs movement too smoothly over rough ground" },
        { type: "acoustic", description: "Wheel rotation lacks expected rhythmic variation" },
        { type: "material", description: "Interior upholstery shows no signs of wear despite age" },
        { type: "spatial", description: "Interior dimensions feel subtly larger than exterior suggests" },
      ],
    },
    {
      id: "grand_chandelier", name: "Chandelier", tier: "Grand", baseMassRange: [17, 25],
      builtInTraits: ["Ornate", "Radiant"],
      baseAllureModifier: 3, plausibilityModifier: 1, utilityTags: ["Lighting", "Valuable"],
      materialSlots: 4, digestCapacityRequired: 6, description: "A glittering centerpiece suspended above prey.",
      flawProfiles: [
        { type: "light", description: "Candlelight flickers in unison rather than independently" },
        { type: "structure", description: "Chain bears no stress despite significant weight" },
        { type: "material", description: "Crystal prisms refract identical rainbow patterns" },
        { type: "presence", description: "Subtle warmth radiates even when unlit" },
      ],
    },
    {
      id: "grand_antler_chandelier", name: "Antler Chandelier", tier: "Grand", baseMassRange: [17, 25],
      variantOf: "grand_chandelier", unlockedBy: ["Horn", "Earthy"],
      builtInTraits: ["Ornate", "Rustic"],
      baseAllureModifier: 3, plausibilityModifier: 1, utilityTags: ["Lighting", "Rural", "Decor"],
      materialSlots: 4, digestCapacityRequired: 6, description: "A great crown of antlers hung with candles: a hunting lodge's pride, and a hunter's weakness.",
      flawProfiles: [
        { type: "material", description: "No two antlers should match, yet several do" },
        { type: "structure", description: "The chain doesn't creak under all that bone" },
        { type: "light", description: "The candles never drip wax" },
      ],
    },
    {
      id: "grand_vault", name: "Vault", tier: "Grand", baseMassRange: [17, 25],
      builtInTraits: ["Reinforced", "Iron-Banded", "Heavy-Lidded", "Locked", "Cold to Touch"],
      baseAllureModifier: 5, plausibilityModifier: 0, utilityTags: ["Storage", "Valuable"],
      materialSlots: 6, digestCapacityRequired: 6, description: "Massive, secure, and hungry.",
      flawProfiles: [
        { type: "structure", description: "Door weight does not match hinge strain" },
        { type: "acoustic", description: "Interior absorbs sound more completely than masonry should allow" },
        { type: "material", description: "Metal surface lacks microscopic tool marks" },
        { type: "spatial", description: "Interior capacity exceeds architectural footprint" },
      ],
    },
    {
      id: "grand_small_outhouse", name: "Small Outhouse", tier: "Grand", baseMassRange: [17, 22],
      builtInTraits: ["Minimalist", "Rustic"],
      baseAllureModifier: 1, plausibilityModifier: 2, utilityTags: ["Structural"],
      materialSlots: 4, digestCapacityRequired: 6, description: "Unassuming, isolated, and rarely questioned.",
      flawProfiles: [
        { type: "environmental", description: "Odor lacks natural variation over time" },
        { type: "structure", description: "Door swings with unnatural silence" },
        { type: "grounding", description: "Structure casts a shadow inconsistent with its roof pitch" },
        { type: "presence", description: "Interior warmth persists even in winter conditions" },
      ],
    },
  ],

  Apex: [
    {
      id: "apex_roadside_inn", name: "Roadside Inn", tier: "Apex", baseMassRange: [26, 40],
      builtInTraits: ["Reinforced"],
      baseAllureModifier: 5, plausibilityModifier: 1, utilityTags: ["Structural", "Social", "Hospitality"],
      materialSlots: 8, digestCapacityRequired: 8, description: "Warm lights, soft beds, and a hunger behind every wall.",
      flawProfiles: [
        { type: "social", description: "Staff mannerisms repeat in subtle conversational loops" },
        { type: "acoustic", description: "Footsteps upstairs do not align with visible occupants" },
        { type: "environmental", description: "Chimney smoke drifts regardless of wind direction" },
        { type: "spatial", description: "Hallway length exceeds exterior wall dimensions" },
      ],
    },
    {
      id: "apex_stable", name: "Stable", tier: "Apex", baseMassRange: [24, 35],
      builtInTraits: ["Minimalist", "Reinforced", "Rustic"],
      baseAllureModifier: 3, plausibilityModifier: 2, utilityTags: ["Structural", "Agricultural"],
      materialSlots: 7, digestCapacityRequired: 8, description: "Warm hay, heavy beams, and the quiet patience of a trap.",
      flawProfiles: [
        { type: "environmental", description: "Animal sounds echo inconsistently between stalls" },
        { type: "material", description: "Hay piles never reduce in volume despite disturbance" },
        { type: "structure", description: "Support beams show no stress under roof weight" },
        { type: "presence", description: "Horses appear calm regardless of predator proximity" },
      ],
    },
    {
      id: "apex_chapel", name: "Chapel", tier: "Apex", baseMassRange: [28, 45],
      builtInTraits: ["Carved", "Ornate"],
      baseAllureModifier: 4, plausibilityModifier: 1, utilityTags: ["Structural", "Religious"],
      materialSlots: 8, digestCapacityRequired: 9, description: "Sanctuary to some. Sanctuary from none.",
      flawProfiles: [
        { type: "acoustic", description: "Whispers carry too clearly from altar to entrance" },
        { type: "light", description: "Stained glass projects identical light patterns each day" },
        { type: "material", description: "Stone floor lacks natural wear near pew entrances" },
        { type: "presence", description: "Sacred symbols feel faintly warm or pulse subtly" },
      ],
    },
    {
      id: "apex_cathedral", name: "Cathedral", tier: "Apex", baseMassRange: [28, 45],
      variantOf: "apex_chapel", unlockedBy: ["Stained Glass"],
      builtInTraits: ["Carved", "Ornate", "Arched", "Radiant"],
      baseAllureModifier: 5, plausibilityModifier: 0, utilityTags: ["Structural", "Religious", "Authority"],
      materialSlots: 8, digestCapacityRequired: 9, description: "Vaulted, glowing, vast. The faithful arrive by the hundred — and not all of them leave.",
      flawProfiles: [
        { type: "light", description: "The rose window throws the same colors at every hour" },
        { type: "acoustic", description: "The bells ring a beat before the rope is pulled" },
        { type: "spatial", description: "The nave is longer walking in than walking out" },
        { type: "presence", description: "Every saint in the glass seems to be looking at the same pew" },
      ],
    },
    {
      id: "apex_watchtower", name: "Watchtower", tier: "Apex", baseMassRange: [25, 38],
      builtInTraits: ["Reinforced", "Iron-Banded"],
      baseAllureModifier: 2, plausibilityModifier: 2, utilityTags: ["Structural", "Defensive"],
      materialSlots: 7, digestCapacityRequired: 8, description: "A solitary sentinel with a view — and an appetite.",
      flawProfiles: [
        { type: "spatial", description: "Staircase steps do not align perfectly with exterior height" },
        { type: "environmental", description: "Wind intensity does not increase at higher levels" },
        { type: "acoustic", description: "Echo delay inconsistent with tower height" },
        { type: "structure", description: "Arrow slits fail to admit correct light angles" },
      ],
    },
    {
      id: "apex_abandoned_cottage", name: "Abandoned Cottage", tier: "Apex", baseMassRange: [22, 34],
      builtInTraits: ["Minimalist", "Rustic"],
      baseAllureModifier: 3, plausibilityModifier: 3, utilityTags: ["Structural", "Rural"],
      materialSlots: 7, digestCapacityRequired: 8, description: "Lonely, quiet, and patiently waiting.",
      flawProfiles: [
        { type: "environmental", description: "Dust accumulation appears undisturbed despite entry" },
        { type: "structure", description: "Floorboards do not creak independently" },
        { type: "light", description: "Sunlight through windows does not shift with time" },
        { type: "presence", description: "Interior temperature remains constant day and night" },
      ],
    },
    // ── Mass-gated Apex forms ──
    {
      id: "apex_castle_gate", name: "Castle Gate", tier: "Apex", baseMassRange: [35, 99],
      builtInTraits: ["Reinforced", "Iron-Banded", "Arched", "Cold to Touch"],
      baseAllureModifier: 3, plausibilityModifier: 2, utilityTags: ["Structural", "Defensive", "Authority"],
      materialSlots: 9, digestCapacityRequired: 10, description: "Imposing, inevitable, and patient as stone.",
      flawProfiles: [
        { type: "structure", description: "Portcullis raises with unnatural silence and no chain effort" },
        { type: "material", description: "Stone blocks lack chisel marks and weathering variation" },
        { type: "spatial", description: "Archway depth feels inconsistent with visible wall thickness" },
        { type: "environmental", description: "No murder-holes admit the expected draughts of cold air" },
        { type: "presence", description: "The gate radiates a faint warmth despite its stone exterior" },
      ],
    },
    {
      id: "apex_lighthouse", name: "Lighthouse", tier: "Apex", baseMassRange: [38, 99],
      builtInTraits: ["Reinforced", "Radiant"],
      baseAllureModifier: 4, plausibilityModifier: 1, utilityTags: ["Structural", "Coastal", "Lighting"],
      materialSlots: 9, digestCapacityRequired: 10, description: "A beacon in the dark. A trap for the hopeful.",
      flawProfiles: [
        { type: "light", description: "The lamp rotates at perfectly even intervals without mechanical variance" },
        { type: "acoustic", description: "The interior swallows the sound of crashing waves entirely" },
        { type: "spatial", description: "The staircase has more steps than exterior height allows" },
        { type: "environmental", description: "No salt residue or gull droppings accumulate on the outer walls" },
        { type: "presence", description: "The lens room radiates warmth far beyond what a lamp should produce" },
      ],
    },
    // ── Giant's Castle forms (mass 28+, giant-realm only) ──
    {
      id: "giant_pillow", name: "Giant Pillow", tier: "Apex", baseMassRange: [28, 99],
      builtInTraits: ["Warm to Touch"],
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Comfort", "Bedroom"],
      materialSlots: 4, digestCapacityRequired: 6, description: "Enormous, soft, and utterly inviting to giant-folk seeking rest.",
      flawProfiles: [
        { type: "material", description: "Cloud-fleece texture is subtly too uniform — no natural clumping" },
        { type: "weight", description: "Shifts without any compression when a giant sits nearby" },
        { type: "structure", description: "The stitching patterns repeat with mathematical perfection" },
      ],
    },
    {
      id: "giant_goblet", name: "Giant Goblet", tier: "Apex", baseMassRange: [28, 99],
      builtInTraits: ["Ornate"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Valuable", "Dining"],
      materialSlots: 4, digestCapacityRequired: 6, description: "A goblet the size of a barrel — gleaming with giant's gold.",
      flawProfiles: [
        { type: "material", description: "The gold-alloy sheen is too consistent — no hammer marks" },
        { type: "weight", description: "Rings hollow when a giant taps it with a finger" },
        { type: "structure", description: "The base sits perfectly level on any surface without wobbling" },
      ],
    },
    {
      id: "giant_chest", name: "Giant Chest", tier: "Apex", baseMassRange: [30, 99],
      builtInTraits: ["Iron-Banded", "Heavy-Lidded", "Locked"],
      baseAllureModifier: 4, plausibilityModifier: 0, utilityTags: ["Storage", "Valuable"],
      materialSlots: 5, digestCapacityRequired: 8, description: "A treasure chest large enough to swallow a horse — and hungry for giants.",
      flawProfiles: [
        { type: "material", description: "The giant oak grain doesn't follow the natural curve of the trunk" },
        { type: "structure", description: "The lid opens with no hinge resistance despite its enormous weight" },
        { type: "weight", description: "The chest doesn't creak or settle when enormous weight is placed on top" },
      ],
    },
    {
      id: "giant_book", name: "Giant Tome", tier: "Apex", baseMassRange: [30, 99],
      builtInTraits: ["Ornate", "Whispering"],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Knowledge"],
      materialSlots: 4, digestCapacityRequired: 6, description: "A tome taller than a man — giants read standing up.",
      flawProfiles: [
        { type: "text", description: "The runes on the spine repeat in an impossible loop" },
        { type: "material", description: "Beanstalk-paper pages lack the natural yellowing and foxing of old volumes" },
        { type: "structure", description: "The spine is too rigid — real giant tomes warp from handling" },
      ],
    },
    {
      id: "giant_barrel", name: "Giant Barrel", tier: "Apex", baseMassRange: [28, 99],
      builtInTraits: ["Iron-Banded", "Rustic"],
      baseAllureModifier: 2, plausibilityModifier: 1, utilityTags: ["Storage"],
      materialSlots: 4, digestCapacityRequired: 7, description: "A barrel that could hold a whole tavern's supply — and something far more dangerous.",
      flawProfiles: [
        { type: "material", description: "The iron bands have no rust or stress marks despite apparent age" },
        { type: "structure", description: "The staves are uniformly perfect — no warping or swelling from liquid" },
        { type: "acoustic", description: "Produces a resonant, living echo when struck" },
      ],
    },
    {
      id: "giant_throne", name: "Giant Throne", tier: "Apex", baseMassRange: [35, 99],
      builtInTraits: ["Carved", "Ornate", "Upholstered"],
      baseAllureModifier: 5, plausibilityModifier: 0, utilityTags: ["Valuable", "Authority"],
      materialSlots: 6, digestCapacityRequired: 10, description: "A seat of giant power — carved from beanstalk timber and inlaid with gold. Nothing is more tempting to a giant lord.",
      flawProfiles: [
        { type: "material", description: "The beanstalk-timber grain spirals in the wrong direction" },
        { type: "structure", description: "Carvings repeat in perfect symmetry without any artisan variation" },
        { type: "presence", description: "Radiates a faint warmth — far more than the torchlit hall should explain" },
        { type: "weight", description: "Does not shift or creak under a giant's full seated weight" },
      ],
    },
    {
      id: "giant_bed", name: "Giant Bed", tier: "Apex", baseMassRange: [33, 99],
      builtInTraits: ["Warm to Touch", "Carved", "Upholstered"],
      baseAllureModifier: 4, plausibilityModifier: 0, utilityTags: ["Comfort"],
      materialSlots: 5, digestCapacityRequired: 9, description: "Piled with golden goose down and cloud fleece — the most vulnerable moment for any giant.",
      flawProfiles: [
        { type: "material", description: "The golden goose down doesn't shift or float when disturbed" },
        { type: "structure", description: "The frame doesn't groan or flex under enormous weight" },
        { type: "temperature", description: "The mattress maintains unnatural warmth even hours after last use" },
        { type: "presence", description: "A faint, rhythmic warmth pulses from beneath the bedding" },
      ],
    },
  ],
} as const satisfies Record<Tier, readonly FormDef[]>;

/** Every form id in the game, derived from the form data above. */
export type FormId = (typeof FORM_DATA)[Tier][number]["id"];

export interface Form extends FormDef {
  readonly id: FormId;
}

export const MASTER_FORMS: Readonly<Record<Tier, readonly Form[]>> = FORM_DATA;
export const ALL_FORMS: readonly Form[] = TIER_ORDER.flatMap((tier) => MASTER_FORMS[tier]);
export const FORM_IDS = ALL_FORMS.map((form) => form.id) as [FormId, ...FormId[]];

// ============================================================
// MATERIALS (the lists themselves are in ./vocabulary)
// ============================================================
export const ALL_MATERIALS_FLAT: readonly Material[] = [
  ...MATERIALS.mundane, ...MATERIALS.valuable, ...MATERIALS.rare, ...MATERIALS.magic, ...MATERIALS.giant,
];

export const MATERIAL_RARITY = Object.fromEntries(
  (Object.entries(MATERIALS) as [MaterialRarity, readonly Material[]][])
    .flatMap(([rarity, mats]) => mats.map((mat) => [mat, rarity] as const)),
) as Record<Material, MaterialRarity>;

// Tailwind classes for material badges, keyed by rarity. Add an entry here
// whenever a new rarity is added to MATERIALS.
export const MATERIAL_COLORS: Record<MaterialRarity, string> = {
  mundane: "border-border text-muted-foreground",
  valuable: "border-yellow-400/40 text-yellow-400 bg-yellow-400/5",
  rare: "border-blue-400/40 text-blue-400 bg-blue-400/5",
  magic: "border-purple-400/40 text-purple-400 bg-purple-400/5",
  giant: "border-amber-400/40 text-amber-400 bg-amber-400/5",
};

// ============================================================
// APPEARANCE LIMITS
// ============================================================
// magicalMaterials: how many of the primary + secondary materials may be magic.
// Minor mimics are too inexperienced to mimic magical materials at all.
export interface AppearanceLimits {
  primaryMaterials: number;
  secondaryMaterials: number;
  /** How many of the primary + secondary materials may be magic. */
  magicalMaterials: number;
  surfaceTraits: number;
  symbolicTraits: number;
  conditionTraits: number;
  /** Scents: none at Minor; at Apex a mimic is big enough to smell two ways at once. */
  scentTraits: number;
}

export const APPEARANCE_LIMITS: Record<Tier, AppearanceLimits> = {
  Minor:    { primaryMaterials: 1, secondaryMaterials: 0, magicalMaterials: 0, surfaceTraits: 1, symbolicTraits: 0, conditionTraits: 1, scentTraits: 0 },
  Lesser:   { primaryMaterials: 1, secondaryMaterials: 0, magicalMaterials: 1, surfaceTraits: 1, symbolicTraits: 0, conditionTraits: 1, scentTraits: 1 },
  Standard: { primaryMaterials: 1, secondaryMaterials: 1, magicalMaterials: 1, surfaceTraits: 2, symbolicTraits: 1, conditionTraits: 1, scentTraits: 1 },
  Greater:  { primaryMaterials: 1, secondaryMaterials: 1, magicalMaterials: 2, surfaceTraits: 2, symbolicTraits: 1, conditionTraits: 2, scentTraits: 1 },
  Grand:    { primaryMaterials: 1, secondaryMaterials: 2, magicalMaterials: 2, surfaceTraits: 3, symbolicTraits: 2, conditionTraits: 2, scentTraits: 1 },
  Apex:     { primaryMaterials: 2, secondaryMaterials: 2, magicalMaterials: 3, surfaceTraits: 4, symbolicTraits: 3, conditionTraits: 3, scentTraits: 2 },
};

// ============================================================
// STARTING STATS
// ============================================================
export interface StartingStats {
  plausibility: number;
  adhesion: number;
  patience: number;
  mass: number;
  digestiveCapacity: number;
  baseAllure: number;
}

export const STARTING_STATS: Record<StartingType, StartingStats> = {
  Minor:  { plausibility: 4, adhesion: 3, patience: 4, mass: 2, digestiveCapacity: 3, baseAllure: 2 },
  Lesser: { plausibility: 2, adhesion: 4, patience: 2, mass: 6, digestiveCapacity: 5, baseAllure: 3 },
};

/** Materials each origin knows from creation. */
export const STARTING_MATERIALS: Record<StartingType, readonly [Material, ...Material[]]> = {
  Minor: ["Pine", "Iron", "Cotton"],
  Lesser: ["Oak", "Iron", "Cowhide"],
};

// ============================================================
// TIER CONFIG
// ============================================================
export interface TierConfig {
  readonly massRange: readonly [number, number];
  readonly apToEvolve: number;
  readonly apToUpgrade: number;
  readonly description: string;
  readonly lore: string;
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  Minor:    { massRange: [1, 4],   apToEvolve: 10, apToUpgrade: 3,  description: "Tiny, deceptive, patient",         lore: "A fledgling mimic, barely larger than a hatbox. Dangerous only to the unwary." },
  Lesser:   { massRange: [5, 8],   apToEvolve: 20, apToUpgrade: 5,  description: "Small but deadly",                  lore: "Capable of consuming a full humanoid. Still learning the art of perfect deception." },
  Standard: { massRange: [9, 12],  apToEvolve: 35, apToUpgrade: 8,  description: "Proven predator",                   lore: "A mid-tier mimic has shed its vulnerability. Now a true ambush hunter." },
  Greater:  { massRange: [13, 16], apToEvolve: 55, apToUpgrade: 12, description: "Formidable illusionist",             lore: "Its patience is geological. It has consumed dozens and learned their secrets." },
  Grand:    { massRange: [17, 25], apToEvolve: 80, apToUpgrade: 18, description: "Architectural predator",             lore: "A room is not a hiding place. A room IS the mimic." },
  Apex:     { massRange: [26, 99], apToEvolve: 120, apToUpgrade: 25, description: "Legendary shapeshifter",       lore: "Travelers speak of entire buildings that vanish overnight. They are not wrong." },
};

// ============================================================
// MAGICAL MATERIAL EFFECTS
// Magic materials are worn in the primary/secondary slots like any other material; the
// tier's APPEARANCE_LIMITS.magicalMaterials caps how many of those may be magic.
// Wearing one grants its effect.
// The cost: every worn magic material gives off arcane residue, an extra "magical"
// flaw check against adventurers with magical perception 2+ (see stealthCheck).
// ============================================================
// Typed as a full Record so adding a magic material without an effect is a compile error.
export const MAGIC_EFFECTS: Record<MagicMaterial, string> = {
  "Void Marble":     "Muffles you. Banshees' Keen Hearing doesn't trigger, and acoustic flaws can't be spotted.",
  "Direwolf Pelt":   "Masks your scent. Werewolves' Blood Scent doesn't trigger, and environmental flaw checks get –1 die.",
  "Feywood":         "Changing form costs no suspicion, and Changelings' Shape Sense doesn't trigger.",
  "Gravecloth":      "Undead take you for one of their own and never make stealth checks against you.",
  "Shadowwood":      "+1 die on stealth rolls.",
  "Spellweave Silk": "+1 allure die.",
  "Aether Crystal":  "+1 lure range.",
  "Bonesteel":       "+1 die on strike rolls.",
  "Dragonhide":      "A failed strike costs +3 suspicion instead of +4.",
  "Runestone":       "+1 die on Wait's roll to reduce suspicion.",
  "Starforged Iron": "Mimic hunters roll 2 fewer dice on every stealth and flaw check against you.",
  "Soulglass":       "Reveals which room a hidden rival mimic is lurking in.",
  "Thimblewood":     "Shrinks you one tier: forms two tiers below become available (−1 Patience), forms one tier below lose their penalty, and your own tier's forms count as one above (−2 Plausibility).",
};

// ============================================================
// SICKNESS SYSTEM
// Triggers when all 3 combat stats (plausibility, adhesion, patience) are at cap (6).
// 20% chance per hunt to contract one sickness for the duration of the hunt only.
// ============================================================
export interface Sickness {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly flavorText: string;
  readonly penalties: Readonly<Partial<Record<CombatStat, number>>>;
}

export const SICKNESSES: readonly Sickness[] = [
  {
    id: "mimic_pox",
    name: "Mimic Pox",
    description: "Unsightly blisters ripple across your mimicked surface — your disguise looks off.",
    flavorText: "Your form shimmers wrongly. The illness betrays you.",
    penalties: { plausibility: 3 },
  },
  {
    id: "adhesion_palsy",
    name: "Adhesion Palsy",
    description: "Your gripping enzymes fail to cohere — your grasp is weak and unreliable.",
    flavorText: "Prey slips through fingers you should be able to hold.",
    penalties: { adhesion: 3 },
  },
  {
    id: "torpor_rot",
    name: "Torpor Rot",
    description: "A creeping stillness infects your patience — you fidget and shift involuntarily.",
    flavorText: "Every moment of waiting feels like agony. You cannot hold yourself still.",
    penalties: { patience: 3 },
  },
  {
    id: "surface_decay",
    name: "Surface Decay",
    description: "Both your disguise and your grip suffer as your outer membrane degrades.",
    flavorText: "You look wrong. You feel worse.",
    penalties: { plausibility: 2, adhesion: 2 },
  },
  {
    id: "mimic_ague",
    name: "Mimic Ague",
    description: "Feverish shuddering undermines your deception and your stillness.",
    flavorText: "You shiver within your form. Adventurers notice.",
    penalties: { plausibility: 2, patience: 2 },
  },
  {
    id: "grip_fatigue",
    name: "Grip Fatigue",
    description: "Exhaustion in your adhesion muscles bleeds into your patience as well.",
    flavorText: "You cannot hold on, and you cannot hold still.",
    penalties: { adhesion: 2, patience: 2 },
  },
];
