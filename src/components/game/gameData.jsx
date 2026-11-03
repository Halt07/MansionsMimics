// ============================================================
// MANSIONS & MIMICS — Core Game Data
// ============================================================

export const TIER_ORDER = ["Minor", "Lesser", "Standard", "Greater", "Grand", "Apex"];

export const MASTER_FORMS = {
  Minor: [
    {
      id: "minor_pillow", name: "Pillow", tier: "Minor", baseMassRange: [1, 4],
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
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Knowledge"],
      materialSlots: 2, digestCapacityRequired: 1, description: "Highly effective on scholars.",
      flawProfiles: [
        { type: "text", description: "Letters subtly malformed or repeating in patterns" },
        { type: "structure", description: "Pages repeat the same paragraph every few leaves" },
        { type: "material", description: "Ink tone inconsistent between pages" },
      ],
    },
    {
      id: "minor_jewelry_box", name: "Jewelry Box", tier: "Minor", baseMassRange: [1, 4],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Valuable", "Storage"],
      materialSlots: 3, digestCapacityRequired: 2, description: "Extremely tempting if ornate.",
      flawProfiles: [
        { type: "material", description: "Wood grain pattern appears mirrored on both sides" },
        { type: "structure", description: "Hinges align slightly crooked when opened" },
        { type: "weight", description: "Feels too heavy or too light for its size" },
      ],
    },
    {
      id: "minor_teapot", name: "Teapot", tier: "Minor", baseMassRange: [1, 4],
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
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Storage", "Valuable"],
      materialSlots: 3, digestCapacityRequired: 3, description: "Classic treasure lure.",
      flawProfiles: [
        { type: "material", description: "Wood grain patterns aren't present" },
        { type: "structure", description: "Lid opens slightly too smoothly, without natural hinge resistance" },
        { type: "weight", description: "Feels heavier than its apparent contents suggest" },
      ],
    },
    {
      id: "lesser_barrel", name: "Barrel", tier: "Lesser", baseMassRange: [5, 8],
      baseAllureModifier: 1, plausibilityModifier: 0, utilityTags: ["Storage"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Common in cellars and cargo holds.",
      flawProfiles: [
        { type: "material", description: "Metal bands lack realistic hammering marks" },
        { type: "structure", description: "Staves align too perfectly with no warping" },
        { type: "sound", description: "Produces a dull, inconsistent echo when tapped" },
      ],
    },
    {
      id: "lesser_crate", name: "Crate", tier: "Lesser", baseMassRange: [5, 8],
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
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Seating"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Invites close and prolonged contact.",
      flawProfiles: [
        { type: "structure", description: "Legs remain perfectly level even on uneven flooring" },
        { type: "material", description: "Cushion padding resists compression slightly too long" },
        { type: "sound", description: "Fails to creak under a seated person's weight" },
      ],
    },
    {
      id: "lesser_painting", name: "Painting", tier: "Lesser", baseMassRange: [5, 8],
      baseAllureModifier: 2, plausibilityModifier: 1, utilityTags: ["Valuable", "Decor"],
      materialSlots: 2, digestCapacityRequired: 2, description: "Decorative and plausibly ignored.",
      flawProfiles: [
        { type: "material", description: "Brush strokes lack natural variation in thickness" },
        { type: "structure", description: "Canvas does not sag slightly within the frame" },
        { type: "visual", description: "Eyes in the portrait seem subtly misaligned" },
      ],
    },
    {
      id: "lesser_statuette", name: "Statuette", tier: "Lesser", baseMassRange: [5, 8],
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
      baseAllureModifier: 2, plausibilityModifier: 0, utilityTags: ["Dining"],
      materialSlots: 3, digestCapacityRequired: 4, description: "Central to gathering spaces.",
      flawProfiles: [
        { type: "structure", description: "Remains perfectly level even on uneven flooring" },
        { type: "material", description: "Surface scratches lack depth variation" },
        { type: "sound", description: "Produces a muted, inconsistent tone when knocked upon" },
      ],
    },
    {
      id: "standard_door", name: "Door", tier: "Standard", baseMassRange: [9, 12],
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
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Decor", "Valuable"],
      materialSlots: 3, digestCapacityRequired: 5, description: "Imposing and monumental.",
      flawProfiles: [
        { type: "material", description: "Surface weathering appears evenly distributed rather than directional" },
        { type: "structure", description: "Weight distribution feels subtly unbalanced at the base" },
        { type: "environmental", description: "Does not collect dust or bird droppings naturally over time" },
      ],
    },
    {
      id: "greater_piano", name: "Piano", tier: "Greater", baseMassRange: [13, 16],
      baseAllureModifier: 3, plausibilityModifier: 0, utilityTags: ["Entertainment"],
      materialSlots: 4, digestCapacityRequired: 5, description: "Elegant, complex, and sonically dangerous.",
      flawProfiles: [
        { type: "sound", description: "Notes resonate slightly longer than acoustically appropriate" },
        { type: "structure", description: "Internal strings appear too uniformly spaced" },
        { type: "material", description: "Polish reflects light with unnatural clarity" },
      ],
    },
    {
      id: "greater_wall", name: "Wall Section", tier: "Greater", baseMassRange: [13, 16],
      baseAllureModifier: 0, plausibilityModifier: 2, utilityTags: ["Structural"],
      materialSlots: 2, digestCapacityRequired: 5, description: "Blends into architecture seamlessly.",
      flawProfiles: [
        { type: "structure", description: "Mortar seams subtly misalign with adjacent masonry" },
        { type: "environmental", description: "Fails to transmit vibrations when struck like surrounding walls" },
        { type: "spatial", description: "Thickness feels inconsistent when measured or knocked upon" },
      ],
    },
    {
      id: "greater_throne", name: "Throne", tier: "Greater", baseMassRange: [13, 16],
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
      id: "grand_parlor", name: "Parlor", tier: "Grand", baseMassRange: [17, 25],
      baseAllureModifier: 3, plausibilityModifier: 1, utilityTags: ["Structural", "Social"],
      materialSlots: 6, digestCapacityRequired: 6, description: "Designed for comfort, conversation, and subtle entrapment.",
      flawProfiles: [
        { type: "environmental", description: "Airflow feels slightly stagnant regardless of window position" },
        { type: "structure", description: "Furniture arrangement remains subtly symmetrical beyond reason" },
        { type: "sound", description: "Conversation carries strangely, dampened in certain corners" },
        { type: "presence", description: "Room temperature remains faintly warm even without a hearth" },
      ],
    },
    {
      id: "grand_carriage", name: "Carriage", tier: "Grand", baseMassRange: [17, 25],
      baseAllureModifier: 4, plausibilityModifier: 0, utilityTags: ["Transport"],
      materialSlots: 5, digestCapacityRequired: 6, description: "Elegant transport with predatory patience.",
      flawProfiles: [
        { type: "structure", description: "Suspension absorbs movement too smoothly over rough ground" },
        { type: "sound", description: "Wheel rotation lacks expected rhythmic variation" },
        { type: "material", description: "Interior upholstery shows no signs of wear despite age" },
        { type: "spatial", description: "Interior dimensions feel subtly larger than exterior suggests" },
      ],
    },
    {
      id: "grand_chandelier", name: "Chandelier", tier: "Grand", baseMassRange: [17, 25],
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
      id: "grand_vault", name: "Vault", tier: "Grand", baseMassRange: [17, 25],
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
      id: "apex_watchtower", name: "Watchtower", tier: "Apex", baseMassRange: [25, 38],
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
      baseAllureModifier: 2, plausibilityModifier: 1, utilityTags: ["Storage"],
      materialSlots: 4, digestCapacityRequired: 7, description: "A barrel that could hold a whole tavern's supply — and something far more dangerous.",
      flawProfiles: [
        { type: "material", description: "The iron bands have no rust or stress marks despite apparent age" },
        { type: "structure", description: "The staves are uniformly perfect — no warping or swelling from liquid" },
        { type: "sound", description: "Produces a resonant, living echo when struck" },
      ],
    },
    {
      id: "giant_throne", name: "Giant Throne", tier: "Apex", baseMassRange: [35, 99],
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
};

// ============================================================
// MATERIALS
// ============================================================
export const MATERIALS = {
  mundane: ["Oak","Pine","Walnut","Birch","Iron","Steel","Brass","Cotton","Wool","Burlap","Linen","Cowhide","Goatskin","Limestone","Clear Glass","Horn"],
  valuable: ["Mahogany","Silver","Gold","Silk","Velvet","Satin","Deerskin","Tanned Hide","Granite","Marble","Stained Glass"],
  rare: ["Ebonwood","Ironwood","Mithril","Blacksteel","Boarhide","Obsidian","Basalt","Smoked Glass","Crystal","Bloodoak"],
  magic: ["Feywood","Shadowwood","Bonesteel","Starforged Iron","Dragonhide","Direwolf Pelt","Spellweave Silk","Gravecloth","Runestone","Void Marble","Soulglass","Aether Crystal"],
  // ── Giant-realm materials (unlocked via Giant's Castle location) ──
  giant: ["Giant Oak","Giant Iron","Giant Gold","Giant Marble","Giant Granite","Beanstalk Timber","Beanstalk Leather","Cloud Fleece","Golden Goose Down","Stormforged Iron"],
};

export const ALL_MATERIALS_FLAT = [...MATERIALS.mundane, ...MATERIALS.valuable, ...MATERIALS.rare, ...MATERIALS.magic, ...MATERIALS.giant];

export const MATERIAL_RARITY = {};
Object.entries(MATERIALS).forEach(([rarity, mats]) => {
  mats.forEach(m => { MATERIAL_RARITY[m] = rarity; });
});

// Tailwind classes for material badges, keyed by rarity. Add an entry here
// whenever a new rarity is added to MATERIALS.
export const MATERIAL_COLORS = {
  mundane: "border-border text-muted-foreground",
  valuable: "border-yellow-400/40 text-yellow-400 bg-yellow-400/5",
  rare: "border-blue-400/40 text-blue-400 bg-blue-400/5",
  magic: "border-purple-400/40 text-purple-400 bg-purple-400/5",
  giant: "border-amber-400/40 text-amber-400 bg-amber-400/5",
};

// ============================================================
// APPEARANCE LIMITS
// ============================================================
export const APPEARANCE_LIMITS = {
  Minor:    { primaryMaterials: 1, secondaryMaterials: 0, magicalMaterials: 1, surfaceTraits: 1, symbolicTraits: 0, conditionTraits: 0 },
  Lesser:   { primaryMaterials: 1, secondaryMaterials: 0, magicalMaterials: 1, surfaceTraits: 1, symbolicTraits: 0, conditionTraits: 1 },
  Standard: { primaryMaterials: 1, secondaryMaterials: 1, magicalMaterials: 1, surfaceTraits: 2, symbolicTraits: 1, conditionTraits: 1 },
  Greater:  { primaryMaterials: 1, secondaryMaterials: 1, magicalMaterials: 2, surfaceTraits: 2, symbolicTraits: 1, conditionTraits: 2 },
  Grand:    { primaryMaterials: 1, secondaryMaterials: 2, magicalMaterials: 2, surfaceTraits: 3, symbolicTraits: 2, conditionTraits: 2 },
  Apex:     { primaryMaterials: 2, secondaryMaterials: 2, magicalMaterials: 3, surfaceTraits: 4, symbolicTraits: 3, conditionTraits: 3 },
};

// ============================================================
// TRAITS
// ============================================================
export const TRAITS = {
  surface:    ["Polished", "Tarnished", "Gilded", "Etched", "Inlaid", "Lacquered", "Rough-Hewn", "Soft", "Wrinkled", "Smooth", "Pitted", "Mossy"],
  symbolic:   ["Runescript", "Sacred Symbol", "Heraldic Crest", "Arcane Sigil", "Guild Mark"],
  condition:  ["Worn", "Pristine", "Cracked", "Weathered", "Bloodstained", "Dusty", "Shadowed Presence"],
  structural: ["Reinforced", "Carved", "Ornate", "Minimalist", "Heavy-Lidded", "Iron-Banded"],
  aura:       ["Faint Glow", "Cold to Touch", "Warm to Touch", "Whispering", "Radiant"],
};

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
];

// ============================================================
// ADVENTURER TEMPLATES
// constitution: bonus HP / max hits before fleeing (default 3, tough = 4)
// ============================================================
export const ADVENTURER_TEMPLATES = [
  // ── Rogues ──
  {
    name: "Greedy Rogue", type: "Rogue", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Inspects valuables closely", "Tests hinges and seams"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Polished", "Gilded"], tags: ["Valuable"] },
    perceptionAffinity: { material: 1, structure: 2, weight: 1, text: 0, magical: 0, social: 1, spatial: 1, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Tanned Hide", "Steel", "Goatskin"],
    lootTraits: [],
    partialLoot: ["scrap of leather armor", "torn belt", "a boot heel"],
  },
  {
    name: "Wary Cutpurse", type: "Rogue", discipline: 2, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Rarely touches anything directly", "Scans exits first"],
    alluringQualities: { materials: ["Gold", "Silver", "Silk"], traits: [], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 0, social: 1, spatial: 2, environmental: 1, acoustic: 1, presence: 0 },
    lootMaterials: ["Goatskin", "Iron", "Linen"],
    lootTraits: [],
    partialLoot: ["strip of cloak", "torn glove", "a coin pouch fragment"],
  },
  // ── Clerics ──
  {
    name: "Paranoid Cleric", type: "Cleric", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Blesses suspicious objects", "Avoids direct skin contact"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 2, social: 1, spatial: 1, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Gold", "Silver", "Cotton"],
    lootTraits: ["Sacred Symbol"],
    partialLoot: ["torn vestment", "prayer bead string", "patch of holy cloth"],
  },
  {
    name: "Young Acolyte", type: "Cleric", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Whispers prayers when nervous", "Easily distracted by relics"],
    alluringQualities: { materials: ["Gold", "Silver", "Marble"], traits: ["Sacred Symbol", "Runescript"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 1, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 1 },
    lootMaterials: ["Cotton", "Silver", "Linen"],
    lootTraits: ["Sacred Symbol"],
    partialLoot: ["torn robe hem", "a cloth belt", "strip of parchment"],
  },
  // ── Bards ──
  {
    name: "Naive Bard", type: "Bard", discipline: 2, baseSuspicion: 1, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Talks to inanimate objects", "Distracted by comfort"],
    alluringQualities: { materials: ["Velvet", "Silk", "Gold"], traits: ["Tarnished", "Worn"], tags: ["Comfort", "Valuable", "Social"] },
    perceptionAffinity: { material: 0, structure: 1, weight: 0, text: 1, magical: 0, social: 2, spatial: 0, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Silk", "Velvet", "Mahogany"],
    lootTraits: ["Gilded"],
    partialLoot: ["strip of velvet cape", "torn silk sleeve", "a lute string"],
  },
  {
    name: "Seasoned Troubadour", type: "Bard", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Records observations in verse", "Draws comparisons to old stories"],
    alluringQualities: { materials: ["Mahogany", "Silk", "Gold"], traits: ["Tarnished", "Heraldic Crest"], tags: ["Social", "Knowledge"] },
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
    alluringQualities: { materials: [], traits: ["Runescript", "Arcane Sigil"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 2, magical: 2, social: 0, spatial: 2, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Feywood", "Spellweave Silk", "Runestone"],
    lootTraits: ["Runescript", "Arcane Sigil"],
    partialLoot: ["torn spellbook page", "a runed sleeve patch", "scrap of enchanted robe"],
  },
  {
    name: "Hedge Witch", type: "Wizard", discipline: 2, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Sniffs objects for magical residue", "Mutters to herself"],
    alluringQualities: { materials: ["Feywood", "Crystal"], traits: ["Cracked", "Arcane Sigil"], tags: ["Knowledge"] },
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
    lootTraits: ["Reinforced"],
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
    alluringQualities: { materials: ["Tanned Hide", "Oak"], traits: [], tags: ["Structural"] },
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
    quirks: ["Marks exits mentally", "Stays near walls"],
    alluringQualities: { materials: ["Oak", "Deerskin"], traits: ["Weathered", "Worn"], tags: ["Structural"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 0, spatial: 2, environmental: 2, acoustic: 2, presence: 0 },
    lootMaterials: ["Goatskin", "Linen", "Oak"],
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
    quirks: ["Detects evil presence", "Slow to trust but fierce when provoked"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol"], tags: ["Religious", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 2, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Gold", "Silver", "Granite"],
    lootTraits: ["Sacred Symbol", "Heraldic Crest"],
    partialLoot: ["torn surcoat panel", "a holy symbol chain link", "scrap of blessed tabard"],
  },
  // ── Artificers ──
  {
    name: "Curious Artificer", type: "Artificer", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Takes notes on unusual objects", "Taps and measures everything"],
    alluringQualities: { materials: ["Iron", "Brass", "Crystal"], traits: ["Arcane Sigil"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 2, text: 1, magical: 1, social: 0, spatial: 2, environmental: 0, acoustic: 1, presence: 0 },
    lootMaterials: ["Brass", "Iron", "Crystal"],
    lootTraits: ["Arcane Sigil"],
    partialLoot: ["torn work apron strip", "a brass button", "scrap of tool belt"],
  },
  // ── Druids ──
  {
    name: "Wandering Druid", type: "Druid", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Speaks to animals before entering", "Uncomfortable indoors"],
    alluringQualities: { materials: ["Oak", "Feywood"], traits: [], tags: ["Structural"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 3, acoustic: 1, presence: 2 },
    lootMaterials: ["Feywood", "Oak", "Wool"],
    lootTraits: [],
    partialLoot: ["strip of bark-cloth robe", "a vine cord", "torn leaf-pattern cloak"],
  },
  // ── Thieves / Assassins ──
  {
    name: "Silent Assassin", type: "Assassin", discipline: 4, baseSuspicion: 2, constitution: 3, interactionStyle: "sight",
    group: "common",
    quirks: ["Never announces presence", "Studies shadows carefully"],
    alluringQualities: { materials: ["Shadowwood", "Silk"], traits: [], tags: ["Valuable"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 1, social: 0, spatial: 2, environmental: 1, acoustic: 2, presence: 1 },
    lootMaterials: ["Shadowwood", "Goatskin", "Steel"],
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
    lootMaterials: ["Iron", "Granite", "Blacksteel"],
    lootTraits: ["Iron-Banded"],
    partialLoot: ["torn mining smock strip", "a belt buckle", "scrap of heavy wool tunic"],
  },
  {
    name: "Elven Arcanist", type: "Wizard", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Detects enchantments passively", "Questions everything out of place"],
    alluringQualities: { materials: ["Feywood", "Aether Crystal"], traits: ["Arcane Sigil", "Runescript"], tags: ["Knowledge"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 0, text: 2, magical: 3, social: 0, spatial: 2, environmental: 1, acoustic: 0, presence: 2 },
    lootMaterials: ["Feywood", "Aether Crystal", "Spellweave Silk"],
    lootTraits: ["Runescript", "Arcane Sigil"],
    partialLoot: ["scrap of elven-woven robe", "a runed button", "torn enchanted sleeve"],
  },
  {
    name: "Halfling Treasure Hunter", type: "Rogue", discipline: 3, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "common",
    quirks: ["Pockets small items instinctively", "Underestimates danger"],
    alluringQualities: { materials: ["Gold", "Silver", "Crystal"], traits: [], tags: ["Valuable", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 2, text: 0, magical: 0, social: 1, spatial: 1, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Silk", "Silver", "Linen"],
    lootTraits: [],
    partialLoot: ["torn waistcoat patch", "a brace button", "scrap of foot-wrap wool"],
  },

  // ── Elite / Greater+ only ──
  {
    name: "Mimic Hunter", type: "Hunter", discipline: 5, baseSuspicion: 5, constitution: 5, interactionStyle: "touch",
    group: "huntersElites",
    minTier: "Greater", isMimicHunter: true,
    quirks: ["Taps every surface methodically", "Carries a vial of acid for testing", "Never touches anything without gloves"],
    alluringQualities: { materials: ["Gold"], traits: [], tags: ["Valuable"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 3, text: 1, magical: 2, social: 0, spatial: 3, environmental: 2, acoustic: 2, presence: 3 },
    lootMaterials: ["Blacksteel", "Mithril", "Dragonhide"],
    lootTraits: ["Reinforced"],
    partialLoot: ["vial of mimic acid", "a silver detection rod shard", "strip of warded leather coat"],
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
    alluringQualities: { materials: ["Iron", "Bone", "Horn", "Boarhide"], traits: ["Bloodstained", "Worn", "Reinforced"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 3, text: 0, magical: 0, social: 0, spatial: 2, environmental: 3, acoustic: 1, presence: 2 },
    lootMaterials: ["Boarhide", "Iron", "Horn"],
    lootTraits: ["Reinforced"],
    partialLoot: ["strip of studded hide armor", "a bone talisman shard", "torn tusk-leather belt"],
  },
  {
    name: "Tiefling Hexblade", type: "Hunter", discipline: 5, baseSuspicion: 4, constitution: 4, interactionStyle: "spell",
    group: "huntersElites",
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
    minTier: "Grand",
    quirks: ["Casts detect magic on entry", "Marks rooms with chalk sigils", "Interrogates every object aloud"],
    alluringQualities: { materials: ["Gold", "Silver"], traits: ["Sacred Symbol", "Runescript"], tags: ["Religious"] },
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
    lootMaterials: ["Aether Crystal", "Feywood", "Soulglass"],
    lootTraits: ["Runescript", "Arcane Sigil"],
    partialLoot: ["torn archmage robe panel", "a crystalline focus shard", "scrap of runed glove"],
  },

  // ── Commoners / Non-combatants ──
  {
    name: "Frightened Peasant", type: "Commoner", discipline: 1, baseSuspicion: 1, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    quirks: ["Jumps at shadows", "Clutches holy symbol", "Easily startled by unusual things"],
    alluringQualities: { materials: ["Cotton", "Wool", "Linen"], traits: ["Worn", "Dusty"], tags: ["Comfort", "Storage"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Wool", "Linen", "Burlap"],
    lootTraits: [],
    partialLoot: ["torn wool smock", "a rope belt", "scrap of burlap sack"],
  },
  {
    name: "Road Vagabond", type: "Commoner", discipline: 2, baseSuspicion: 2, constitution: 3, interactionStyle: "touch",
    group: "commoners",
    quirks: ["Rifles through anything unlocked", "Sleeps anywhere flat", "Interested in anything left behind"],
    alluringQualities: { materials: ["Iron", "Brass", "Cotton"], traits: ["Worn", "Weathered", "Tarnished"], tags: ["Storage", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 0 },
    lootMaterials: ["Linen", "Cowhide", "Iron"],
    lootTraits: ["Worn"],
    partialLoot: ["patched travelling cloak strip", "a worn boot sole", "scrap of road-stained linen"],
  },

  // ── Escort targets (non-combatants carried by parties) ──
  {
    name: "The King", type: "Nobility", discipline: 2, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "commoners",
    quirks: ["Demands everything be inspected by guards first", "Attracted to displays of wealth", "Expects furnishings worthy of royalty"],
    alluringQualities: { materials: ["Gold", "Marble", "Silk", "Velvet"], traits: ["Gilded", "Inlaid", "Polished"], tags: ["Valuable", "Authority", "Comfort"] },
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
    quirks: ["Reaches out to touch pretty things", "Easily enchanted by ornate objects", "Wanders from her escort"],
    alluringQualities: { materials: ["Gold", "Silver", "Silk", "Crystal"], traits: ["Gilded", "Inlaid", "Polished", "Etched"], tags: ["Valuable", "Comfort", "Decor"] },
    perceptionAffinity: { material: 0, structure: 0, weight: 0, text: 1, magical: 1, social: 1, spatial: 0, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Silk", "Silver", "Crystal"],
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
    quirks: ["Mentally appraises everything", "Tests material quality with fingers", "Offers to buy things on the spot"],
    alluringQualities: { materials: ["Gold", "Silver", "Mahogany", "Silk"], traits: ["Polished", "Lacquered", "Gilded"], tags: ["Valuable", "Storage", "Dining"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 1, spatial: 0, environmental: 0, acoustic: 0, presence: 0 },
    lootMaterials: ["Gold", "Silver", "Mahogany"],
    lootTraits: ["Gilded", "Polished"],
    partialLoot: ["torn merchant coat lining", "a wax seal stamp", "scrap of velvet money pouch"],
  },

  // ── Warlock with familiar ──
  {
    name: "Pact-Bound Warlock", type: "Wizard", discipline: 3, baseSuspicion: 3, constitution: 3, interactionStyle: "spell",
    group: "common",
    quirks: ["Speaks to unseen entities", "Prefers shadowy corners", "Reacts strangely near magical objects"],
    alluringQualities: { materials: ["Shadowwood", "Obsidian", "Gravecloth"], traits: ["Arcane Sigil", "Shadowed Presence"], tags: ["Knowledge", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 1, magical: 3, social: 0, spatial: 1, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Shadowwood", "Gravecloth", "Obsidian"],
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

  // ── Supernatural / Monster types ──
  {
    name: "Vampire Noble", type: "Undead", discipline: 5, baseSuspicion: 3, constitution: 4, interactionStyle: "sight",
    group: "supernatural",
    locations: ["noble_estate", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle"],
    quirks: ["Drawn to bloodstained objects", "Cannot enter without invitation — waits at thresholds", "Hypersensitive to magical auras"],
    alluringQualities: { materials: ["Gold", "Silver", "Silk", "Gravecloth", "Bloodoak"], traits: ["Bloodstained", "Tarnished", "Gilded"], tags: ["Valuable", "Comfort", "Religious"] },
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
    lootTraits: ["Reinforced"],
    partialLoot: ["a broken horn shard", "strip of iron-studded leather", "scrap of rough ox-hide"],
  },
  {
    name: "Cursed Revenant", type: "Undead", discipline: 3, baseSuspicion: 2, constitution: 4, interactionStyle: "touch",
    group: "supernatural",
    locations: ["manor", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle", "lonely_moor"],
    quirks: ["Fixated on objects from their past life", "Ignores most things unless they trigger recognition", "Slow but relentless — its body is intact, unlike a zombie"],
    alluringQualities: { materials: ["Oak", "Linen", "Iron"], traits: ["Bloodstained", "Worn", "Cracked", "Dusty"], tags: ["Comfort", "Structural"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 0, magical: 1, social: 0, spatial: 1, environmental: 0, acoustic: 0, presence: 2 },
    lootMaterials: ["Gravecloth", "Iron", "Linen", "Cowhide"],
    lootTraits: ["Bloodstained", "Worn"],
    partialLoot: ["strip of burial shroud", "a rusted iron clasp", "scrap of grave-dirt-stained wool", "torn leather boot from its past life"],
  },

  {
    name: "Wailing Banshee", type: "Undead", discipline: 4, baseSuspicion: 3, constitution: 2, interactionStyle: "sight",
    group: "supernatural",
    locations: ["haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle", "lonely_moor"],
    behavior: "keenHearing",
    quirks: ["A gaunt, grave-pale crone — flesh and bone, whatever the stories say", "Turns toward every creak and footstep", "Keens softly when something nearby moves"],
    alluringQualities: { materials: ["Gravecloth", "Soulglass", "Silver"], traits: ["Tarnished", "Etched"], tags: ["Religious"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 0, text: 0, magical: 2, social: 0, spatial: 1, environmental: 1, acoustic: 4, presence: 3 },
    lootMaterials: ["Gravecloth", "Soulglass"],
    lootTraits: ["Tarnished"],
    partialLoot: ["a lock of grave-white hair", "strip of tattered burial veil", "a cracked, yellowed fingernail"],
  },
  {
    name: "Ghoul", type: "Undead", discipline: 2, baseSuspicion: 1, constitution: 4, interactionStyle: "touch",
    group: "supernatural",
    locations: ["manor", "haunted_inn", "cursed_chapel", "ruined_city", "abandoned_castle"],
    behavior: "carrionScent",
    quirks: ["Sniffs at cupboards and larders", "Gnaws on anything that smells of meat", "Follows the scent of a fresh kill"],
    alluringQualities: { materials: ["Bonesteel", "Cowhide"], traits: ["Pitted"], tags: ["Dining", "Storage"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 3, text: 0, magical: 0, social: 0, spatial: 1, environmental: 2, acoustic: 1, presence: 1 },
    lootMaterials: ["Bonesteel", "Cowhide"],
    lootTraits: ["Bloodstained"],
    partialLoot: ["strip of grave-soiled rags", "a gnawed knucklebone", "a clump of matted hair"],
  },
  {
    name: "Fey Changeling", type: "Fey", discipline: 4, baseSuspicion: 4, constitution: 3, interactionStyle: "spell",
    minTier: "Standard",
    group: "supernatural",
    locations: ["wizard_tower", "noble_estate", "hidden_grove", "crossroads"],
    behavior: "shapeSense",
    quirks: ["Its face never quite settles on one shape", "Feels the moment anything nearby changes its form", "Cannot resist pretty, delicate things"],
    alluringQualities: { materials: ["Feywood", "Silk"], traits: ["Mossy", "Inlaid"], tags: ["Decor", "Comfort"] },
    perceptionAffinity: { material: 1, structure: 1, weight: 1, text: 1, magical: 2, social: 3, spatial: 1, environmental: 1, acoustic: 1, presence: 3 },
    lootMaterials: ["Feywood", "Spellweave Silk"],
    lootTraits: ["Mossy"],
    partialLoot: ["a lock of shifting, silver hair", "scrap of dew-damp silk", "a petal-shaped scale"],
  },
  {
    name: "Gargoyle", type: "Construct", discipline: 3, baseSuspicion: 2, constitution: 6, interactionStyle: "sight",
    minTier: "Standard",
    group: "supernatural",
    locations: ["wizard_tower", "noble_estate", "cursed_chapel", "ruined_city", "abandoned_castle"],
    behavior: "stoneWatch",
    quirks: ["Never moves from its perch", "Memorizes where every object in sight sits", "Watches without blinking for hours"],
    alluringQualities: { materials: ["Marble", "Granite", "Basalt"], traits: ["Etched", "Pitted", "Sacred Symbol"], tags: ["Structural", "Religious"] },
    perceptionAffinity: { material: 2, structure: 2, weight: 1, text: 0, magical: 1, social: 0, spatial: 4, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Basalt", "Runestone"],
    lootTraits: ["Etched"],
    partialLoot: ["a chip of weathered stone", "a broken stone talon", "grit from a cracked wing"],
  },
  {
    name: "Werewolf", type: "Beast", discipline: 5, baseSuspicion: 2, constitution: 6, interactionStyle: "touch",
    minTier: "Greater",
    group: "supernatural",
    locations: ["manor", "hidden_grove", "country_road", "ruined_mill", "lonely_moor"],
    behavior: "bloodScent",
    quirks: ["Follows the smell of blood through walls", "Paces restlessly between rooms", "Snarls at anything that smells wrong"],
    alluringQualities: { materials: ["Direwolf Pelt", "Oak"], traits: ["Mossy", "Rough-Hewn"], tags: ["Rural"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 0, social: 0, spatial: 2, environmental: 4, acoustic: 2, presence: 2 },
    lootMaterials: ["Direwolf Pelt", "Boarhide"],
    lootTraits: ["Rough-Hewn"],
    partialLoot: ["a tuft of coarse grey fur", "a cracked claw", "strip of torn, half-shifted hide"],
  },

  // ── Giant-kin (Apex only, minMass gated) ──
  {
    name: "Half-Giant Mercenary", type: "Warrior", discipline: 4, baseSuspicion: 1, constitution: 7, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 28,
    quirks: ["Shoves furniture to test sturdiness", "Sits on things without asking", "Drawn to large, sturdy objects"],
    alluringQualities: { materials: ["Giant Oak", "Giant Iron", "Beanstalk Leather"], traits: ["Reinforced", "Iron-Banded", "Heavy-Lidded"], tags: ["Structural", "Valuable"] },
    perceptionAffinity: { material: 2, structure: 4, weight: 4, text: 0, magical: 0, social: 0, spatial: 2, environmental: 1, acoustic: 2, presence: 0 },
    lootMaterials: ["Giant Oak", "Giant Iron", "Beanstalk Leather"],
    lootTraits: ["Reinforced"],
    partialLoot: ["a massive belt buckle", "strip of giant-hide jerkin", "enormous boot sole"],
  },
  {
    name: "Giant-Blood Shaman", type: "Druid", discipline: 4, baseSuspicion: 3, constitution: 6, interactionStyle: "spell",
    group: "giantKin",
    minTier: "Apex", minMass: 28,
    quirks: ["Chants at suspicious objects", "Smells for earth-magic residue", "Distrustful of anything too neat or symmetrical"],
    alluringQualities: { materials: ["Beanstalk Timber", "Giant Oak", "Cloud Fleece"], traits: ["Mossy", "Weathered", "Rough-Hewn"], tags: ["Structural", "Rural"] },
    perceptionAffinity: { material: 2, structure: 1, weight: 2, text: 0, magical: 3, social: 0, spatial: 2, environmental: 4, acoustic: 1, presence: 3 },
    lootMaterials: ["Beanstalk Timber", "Cloud Fleece", "Giant Oak"],
    lootTraits: ["Mossy"],
    partialLoot: ["a woven reed charm", "strip of bark-wrapped hide", "pouch of giant-fern spores"],
  },
  {
    name: "Cloud Giant Scout", type: "Warrior", discipline: 5, baseSuspicion: 2, constitution: 9, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 35,
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
    minTier: "Apex", minMass: 40,
    quirks: ["Shakes the ground when walking", "Can sense electrical charge — mimic bio-electricity makes them cautious", "Attracted to enormous structural objects"],
    alluringQualities: { materials: ["Stormforged Iron", "Giant Granite", "Beanstalk Timber"], traits: ["Iron-Banded", "Rough-Hewn", "Carved"], tags: ["Structural", "Defensive"] },
    perceptionAffinity: { material: 3, structure: 5, weight: 5, text: 0, magical: 2, social: 0, spatial: 3, environmental: 3, acoustic: 4, presence: 2 },
    lootMaterials: ["Stormforged Iron", "Giant Granite", "Beanstalk Timber"],
    lootTraits: ["Iron-Banded"],
    partialLoot: ["a stormforged iron rivet", "shard of giant granite block", "length of beanstalk rope"],
  },
  {
    name: "Giant's Goose-Keeper", type: "Commoner", discipline: 2, baseSuspicion: 1, constitution: 5, interactionStyle: "sight",
    group: "giantKin",
    minTier: "Apex", minMass: 28,
    quirks: ["Wanders after escaped geese", "Easily distracted by shiny objects", "Terrified of small spaces"],
    alluringQualities: { materials: ["Golden Goose Down", "Giant Oak", "Cloud Fleece"], traits: ["Soft", "Warm to Touch", "Gilded"], tags: ["Comfort", "Valuable"] },
    perceptionAffinity: { material: 1, structure: 0, weight: 1, text: 0, magical: 0, social: 1, spatial: 0, environmental: 1, acoustic: 0, presence: 1 },
    lootMaterials: ["Golden Goose Down", "Cloud Fleece", "Giant Oak"],
    lootTraits: ["Soft"],
    partialLoot: ["a golden feather", "scrap of cloud-weave apron", "length of giant twine"],
  },
  {
    name: "Giant Treasure Hoarder", type: "Nobility", discipline: 3, baseSuspicion: 2, constitution: 8, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 35,
    quirks: ["Appraises everything by picking it up and sniffing it", "Obsessed with gold and gemstone items", "Drops things carelessly — they are very large"],
    alluringQualities: { materials: ["Giant Gold", "Giant Marble", "Soulglass"], traits: ["Gilded", "Inlaid", "Polished", "Warm to Touch"], tags: ["Valuable", "Storage", "Authority"] },
    perceptionAffinity: { material: 3, structure: 2, weight: 4, text: 0, magical: 1, social: 1, spatial: 1, environmental: 0, acoustic: 1, presence: 1 },
    lootMaterials: ["Giant Gold", "Giant Marble", "Soulglass"],
    lootTraits: ["Gilded", "Inlaid"],
    partialLoot: ["a fragment of giant's golden ring", "shard of enormous gemstone", "scrap of giant velvet robe"],
  },
  {
    name: "Beanstalk Climber", type: "Rogue", discipline: 4, baseSuspicion: 3, constitution: 4, interactionStyle: "touch",
    group: "giantKin",
    minTier: "Apex", minMass: 30,
    quirks: ["Has climbed the stalk before — checks everything for traps", "Moves silently for their size", "Paranoid about giant detection — checks ceilings constantly"],
    alluringQualities: { materials: ["Giant Gold", "Golden Goose Down", "Giant Marble"], traits: ["Gilded", "Polished"], tags: ["Valuable"] },
    perceptionAffinity: { material: 3, structure: 3, weight: 3, text: 1, magical: 1, social: 1, spatial: 3, environmental: 2, acoustic: 3, presence: 1 },
    lootMaterials: ["Beanstalk Leather", "Giant Oak", "Giant Gold"],
    lootTraits: [],
    partialLoot: ["a length of beanstalk vine", "scrap of beanstalk-leather pack", "a giant's golden coin fragment"],
  },
];

// ============================================================
// LOCATIONS
// ============================================================
// roomGraph: adjacency list — each room connects to others by name
// distance is computed at runtime via BFS from this graph
// minTier: minimum mimic tier to access this location (undefined = always available)
export const LOCATIONS = [
  {
    id: "manor", name: "Abandoned Manor", description: "A crumbling noble estate on the edge of civilization.", minTier: "Minor",
    flavorText: "Ivy chokes the stone walls. Every visitor seeks something — coin, glory, or forgotten secrets.",
    rooms: ["Grand Foyer", "Drawing Room", "Library", "Master Bedroom", "Wine Cellar", "Trophy Hall"],
    roomGraph: {
      "Grand Foyer":    ["Drawing Room", "Trophy Hall"],
      "Drawing Room":   ["Grand Foyer", "Library", "Master Bedroom"],
      "Library":        ["Drawing Room", "Wine Cellar"],
      "Master Bedroom": ["Drawing Room", "Trophy Hall"],
      "Wine Cellar":    ["Library"],
      "Trophy Hall":    ["Grand Foyer", "Master Bedroom"],
    },
    partySize: [4, 5], suspicionGrowthRate: 1,
    advantageTags: ["Storage", "Valuable", "Knowledge", "Comfort"],
    imageHint: "dark gothic manor house",
    locationCreatures: [
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A fat cellar rat." },
      { id: "cat", name: "Cat", ap: 2, discipline: 2, description: "A wary manor cat." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "A rooftop crow, watching from the rafters." },
      { id: "bat", name: "Bat", ap: 1, discipline: 1, description: "A skittish bat from the upper floors." },
      { id: "spider", name: "Giant Spider", ap: 2, discipline: 2, description: "A large spider from the wine cellar." },
    ],
  },
  {
    id: "wizard_tower", name: "Wizard's Tower", description: "The abandoned spire of an eccentric arcanist.", minTier: "Minor",
    flavorText: "The smell of old spellwork clings to everything. Scholars come seeking tomes, apprentices seeking power.",
    rooms: ["Entrance Hall", "Alchemy Lab", "Arcane Library", "Observation Deck", "Vault", "Summoning Chamber"],
    roomGraph: {
      "Entrance Hall":      ["Alchemy Lab", "Vault"],
      "Alchemy Lab":        ["Entrance Hall", "Arcane Library"],
      "Arcane Library":     ["Alchemy Lab", "Observation Deck", "Summoning Chamber"],
      "Observation Deck":   ["Arcane Library"],
      "Vault":              ["Entrance Hall", "Summoning Chamber"],
      "Summoning Chamber":  ["Arcane Library", "Vault"],
    },
    partySize: [3, 4], suspicionGrowthRate: 2,
    advantageTags: ["Knowledge", "Valuable", "Structural"],
    imageHint: "tall dark wizard tower",
    locationCreatures: [
      { id: "imp", name: "Imp", ap: 3, discipline: 3, description: "A mischievous imp bound to the tower, now unruly." },
      { id: "familiar_cat", name: "Wizard's Familiar", ap: 2, discipline: 3, description: "An unnervingly intelligent cat." },
      { id: "arcane_rat", name: "Glowing Rat", ap: 1, discipline: 1, description: "A rat that absorbed too much residual magic." },
      { id: "homunculus", name: "Broken Homunculus", ap: 2, discipline: 2, description: "A failed creation, still lurching about." },
      { id: "ink_sprite", name: "Ink Sprite", ap: 1, discipline: 2, description: "A tiny creature made of escaped spell-ink." },
    ],
  },
  {
    id: "haunted_inn", name: "Haunted Roadside Inn", description: "A travelers' inn rumored to swallow guests whole.", minTier: "Minor",
    flavorText: "The sign creaks in windless air. The fireplace is always lit. Nobody checks out.",
    rooms: ["Common Room", "Kitchen", "Guest Rooms", "Cellar", "Stable", "Innkeeper's Quarters"],
    roomGraph: {
      "Common Room":         ["Kitchen", "Stable", "Guest Rooms"],
      "Kitchen":             ["Common Room", "Cellar", "Innkeeper's Quarters"],
      "Guest Rooms":         ["Common Room", "Innkeeper's Quarters"],
      "Cellar":              ["Kitchen"],
      "Stable":              ["Common Room"],
      "Innkeeper's Quarters":["Kitchen", "Guest Rooms"],
    },
    partySize: [4, 6], suspicionGrowthRate: 1,
    advantageTags: ["Comfort", "Social", "Storage", "Hospitality"],
    imageHint: "dark cozy haunted inn at night",
    locationCreatures: [
      { id: "zombie_guest", name: "Zombie Guest", ap: 3, discipline: 1, description: "A former patron who never left — in a manner of speaking." },
      { id: "plague_rat", name: "Plague Rat", ap: 2, discipline: 1, description: "A bloated rat with glazed eyes and slow, wrong movements." },
      { id: "zombie_cat", name: "Zombie Cat", ap: 2, discipline: 2, description: "A gaunt, reanimated kitchen cat — still meowing, somehow." },
      { id: "crawling_hand", name: "Crawling Hand", ap: 1, discipline: 1, description: "Something left behind by a previous guest. Just a hand." },
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "An ordinary rat. Probably." },
    ],
  },
  {
    id: "cursed_chapel", name: "Cursed Chapel", description: "A remote shrine where the faithful stopped returning.", minTier: "Minor",
    flavorText: "Candles burn without wax. The altar is cold. Something old breathes in the walls.",
    rooms: ["Narthex", "Nave", "Vestry", "Crypt", "Bell Tower", "Cemetery"],
    roomGraph: {
      "Narthex":    ["Nave", "Cemetery"],
      "Nave":       ["Narthex", "Vestry", "Bell Tower"],
      "Vestry":     ["Nave", "Crypt"],
      "Crypt":      ["Vestry"],
      "Bell Tower": ["Nave"],
      "Cemetery":   ["Narthex"],
    },
    partySize: [3, 5], suspicionGrowthRate: 2,
    advantageTags: ["Religious", "Structural", "Valuable"],
    imageHint: "dark gothic chapel ruins",
    locationCreatures: [
      { id: "skeleton", name: "Animated Skeleton", ap: 2, discipline: 1, description: "A chapel guardian, long since unmoored from purpose." },
      { id: "crow", name: "Carrion Crow", ap: 1, discipline: 1, description: "A crow nesting in the bell tower." },
      { id: "zombie", name: "Grave Zombie", ap: 3, discipline: 1, description: "Clawed its way up from the cemetery. Slow but persistent." },
      { id: "bat", name: "Bat", ap: 1, discipline: 1, description: "Roosting in the vaulted ceiling." },
      { id: "bone_crow", name: "Bone Crow", ap: 2, discipline: 2, description: "A crow whose flesh has long since rotted — wings of bare bone, still flying." },
    ],
  },
  {
    id: "noble_estate", name: "Noble Estate", description: "A functioning estate whose lord has mysteriously vanished.", minTier: "Minor",
    flavorText: "The servants still go about their duties — or something wearing their faces does.",
    rooms: ["Entrance Hall", "Dining Room", "Study", "Armory", "Gardens", "Secret Passage"],
    roomGraph: {
      "Entrance Hall":  ["Dining Room", "Armory", "Gardens"],
      "Dining Room":    ["Entrance Hall", "Study"],
      "Study":          ["Dining Room", "Secret Passage"],
      "Armory":         ["Entrance Hall", "Secret Passage"],
      "Gardens":        ["Entrance Hall"],
      "Secret Passage": ["Study", "Armory"],
    },
    partySize: [5, 6], suspicionGrowthRate: 1,
    advantageTags: ["Valuable", "Comfort", "Social", "Authority"],
    imageHint: "grand dark noble estate mansion",
    locationCreatures: [
      { id: "cat", name: "Estate Cat", ap: 2, discipline: 2, description: "A pampered cat, now aimlessly wandering." },
      { id: "parrot", name: "Parrot", ap: 1, discipline: 2, description: "The lord's parrot. Still reciting overheard conversations." },
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "Emboldened by the lord's absence." },
      { id: "weasel", name: "Weasel", ap: 1, discipline: 2, description: "Slipped in through the garden wall." },
      { id: "hound", name: "Stray Hound", ap: 2, discipline: 2, description: "A guard dog with nobody left to guard for." },
    ],
  },

  // ── Grand+ outdoor / wilderness locations ──
  {
    id: "hidden_grove", name: "Hidden Grove", minTier: "Grand",
    description: "A sacred clearing deep in old-growth forest, known to druids and the lost.",
    flavorText: "The trees here grow too straight. The silence is wrong. Something vast has been waiting for a very long time.",
    rooms: ["Grove Clearing", "Ancient Altar", "Forest Path", "Streamside Bank", "Old Well", "Collapsed Shrine"],
    roomGraph: {
      "Grove Clearing":   ["Ancient Altar", "Forest Path", "Streamside Bank"],
      "Ancient Altar":    ["Grove Clearing", "Collapsed Shrine"],
      "Forest Path":      ["Grove Clearing", "Old Well"],
      "Streamside Bank":  ["Grove Clearing", "Old Well"],
      "Old Well":         ["Forest Path", "Streamside Bank"],
      "Collapsed Shrine": ["Ancient Altar"],
    },
    partySize: [3, 5], suspicionGrowthRate: 1,
    advantageTags: ["Structural", "Religious", "Rural"],
    imageHint: "dark magical forest grove with ancient stone altar",
    locationCreatures: [
      { id: "wood_sprite", name: "Wood Sprite", ap: 2, discipline: 2, description: "A nimble fairy-like creature of living bark and leaf, darting between the roots." },
      { id: "fox", name: "Forest Fox", ap: 1, discipline: 2, description: "Curious and fast." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Watching from the branches above." },
      { id: "feral_boar", name: "Feral Boar", ap: 3, discipline: 2, description: "Ill-tempered and territorial." },
      { id: "will_o_wisp", name: "Will-o'-Wisp", ap: 2, discipline: 1, description: "A drifting light, leading the unwary astray." },
    ],
  },
  {
    id: "country_road", name: "Country Road & Waystation", minTier: "Grand",
    description: "A lonely stretch of road with a crumbling waystation and a well-worn crossing.",
    flavorText: "Every traveler passes through. Few arrive where they planned. The road does not always lead where it once did.",
    rooms: ["Waystation Building", "Road West", "Road East", "Side Path", "Ditch & Hedgerow", "Milestone Stone"],
    roomGraph: {
      "Waystation Building": ["Road West", "Road East", "Side Path"],
      "Road West":           ["Waystation Building", "Milestone Stone"],
      "Road East":           ["Waystation Building", "Milestone Stone"],
      "Side Path":           ["Waystation Building", "Ditch & Hedgerow"],
      "Ditch & Hedgerow":    ["Side Path"],
      "Milestone Stone":     ["Road West", "Road East"],
    },
    partySize: [3, 6], suspicionGrowthRate: 1,
    advantageTags: ["Structural", "Rural", "Transport"],
    imageHint: "misty dark country road with old stone waystation at night",
    locationCreatures: [
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A road rat, scrounging from abandoned packs." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Perched on the milestone, watching travellers." },
      { id: "stray_dog", name: "Stray Dog", ap: 2, discipline: 2, description: "Following the road, hoping for scraps." },
      { id: "weasel", name: "Weasel", ap: 1, discipline: 2, description: "Darting through the hedgerow." },
      { id: "rabbit", name: "Rabbit", ap: 1, discipline: 1, description: "Surprisingly calm for something in a mimic's territory." },
    ],
  },
  {
    id: "crossroads", name: "The Crossroads", minTier: "Grand",
    description: "Four roads meet under a dead oak. Travelers pause here — and some never leave.",
    flavorText: "Locals avoid it after dark. Merchants lower their eyes at the centre stone. Smart people. Delicious people.",
    rooms: ["Centre Stone", "North Road", "South Road", "East Road", "West Road", "Hanging Tree"],
    roomGraph: {
      "Centre Stone":  ["North Road", "South Road", "East Road", "West Road"],
      "North Road":    ["Centre Stone", "Hanging Tree"],
      "South Road":    ["Centre Stone"],
      "East Road":     ["Centre Stone"],
      "West Road":     ["Centre Stone", "Hanging Tree"],
      "Hanging Tree":  ["North Road", "West Road"],
    },
    partySize: [4, 6], suspicionGrowthRate: 2,
    advantageTags: ["Transport", "Rural", "Structural"],
    imageHint: "dark crossroads at night with dead oak tree and stone marker",
    locationCreatures: [
      { id: "imp", name: "Crossroads Imp", ap: 3, discipline: 3, description: "Drawn by the old bargaining magic of the crossroads." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Seven of them, circling the hanging tree." },
      { id: "will_o_wisp", name: "Will-o'-Wisp", ap: 2, discipline: 1, description: "Luring travellers off the main road." },
      { id: "stray_dog", name: "Stray Dog", ap: 2, discipline: 2, description: "Bony and wary, living off scraps." },
    ],
  },
  {
    id: "ruined_mill", name: "Ruined Watermill", minTier: "Grand",
    description: "An abandoned mill on a forgotten river bend, frequented by smugglers and wanderers.",
    flavorText: "The wheel still turns. Nobody remembers why. The grindstone is never warm.",
    rooms: ["Mill House", "Millpond Bank", "Grain Storage", "River Crossing", "Smuggler's Cellar", "Overgrown Track"],
    roomGraph: {
      "Mill House":       ["Millpond Bank", "Grain Storage", "Overgrown Track"],
      "Millpond Bank":    ["Mill House", "River Crossing"],
      "Grain Storage":    ["Mill House", "Smuggler's Cellar"],
      "River Crossing":   ["Millpond Bank"],
      "Smuggler's Cellar":["Grain Storage"],
      "Overgrown Track":  ["Mill House"],
    },
    partySize: [3, 5], suspicionGrowthRate: 1,
    advantageTags: ["Storage", "Rural", "Structural"],
    imageHint: "dark ruined watermill by a misty river at night",
    locationCreatures: [
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A mill rat, fat on old grain." },
      { id: "otter", name: "River Otter", ap: 2, discipline: 2, description: "Slipped in from the millpond." },
      { id: "frog", name: "Giant Frog", ap: 2, discipline: 1, description: "An enormous frog from the boggy millpond bank." },
      { id: "water_sprite", name: "Water Sprite", ap: 2, discipline: 2, description: "A small river spirit, displaced by the mill's ruin." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Roosting in the rotted mill beams." },
    ],
  },
  // ── Mass-gated Apex locations ──
  {
    id: "border_guardhouse", name: "Border Guardhouse", minTier: "Apex", minMass: 33,
    description: "A squat stone gatehouse on a lonely mountain pass, where soldiers check every traveler's papers.",
    flavorText: "Everyone passes through. Everyone is checked. The gate has never once failed to open — until now.",
    rooms: ["Gate Arch", "Guard Room", "Barracks", "Watch Tower", "Storeroom", "Stable Yard"],
    roomGraph: {
      "Gate Arch":   ["Guard Room", "Stable Yard"],
      "Guard Room":  ["Gate Arch", "Barracks", "Watch Tower"],
      "Barracks":    ["Guard Room", "Storeroom"],
      "Watch Tower": ["Guard Room"],
      "Storeroom":   ["Barracks"],
      "Stable Yard": ["Gate Arch"],
    },
    partySize: [4, 6], suspicionGrowthRate: 2,
    advantageTags: ["Structural", "Defensive", "Authority"],
    imageHint: "dark stone guardhouse gatehouse on mountain pass at night",
    locationCreatures: [
      { id: "guard_dog", name: "Guard Dog", ap: 3, discipline: 3, description: "A trained military hound, alert and aggressive." },
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "Scrounging through the storeroom." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Perched on the battlement." },
      { id: "horse", name: "Warhorse", ap: 3, discipline: 2, description: "A soldier's mount, nervous and powerful." },
    ],
  },
  {
    id: "ruined_city", name: "Ruined City Quarter", minTier: "Apex", minMass: 30,
    description: "A collapsed district of a once-great city, now haunted by scavengers and the desperate.",
    flavorText: "The streets remember the sound of thousands. Now only footsteps of the bold — and the hungry — echo here.",
    rooms: ["Market Square", "Collapsed Temple", "Merchant Row", "Sewer Entrance", "Guard Tower Ruin", "City Gate"],
    roomGraph: {
      "Market Square":      ["Collapsed Temple", "Merchant Row", "City Gate"],
      "Collapsed Temple":   ["Market Square", "Sewer Entrance"],
      "Merchant Row":       ["Market Square", "Guard Tower Ruin"],
      "Sewer Entrance":     ["Collapsed Temple"],
      "Guard Tower Ruin":   ["Merchant Row", "City Gate"],
      "City Gate":          ["Market Square", "Guard Tower Ruin"],
    },
    partySize: [4, 7], suspicionGrowthRate: 1,
    advantageTags: ["Structural", "Valuable", "Defensive", "Authority"],
    imageHint: "dark ruined ancient city street at night with crumbling stone buildings",
    locationCreatures: [
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "A city rat, bold and fat on ruin-scraps." },
      { id: "stray_dog", name: "Stray Dog", ap: 2, discipline: 2, description: "A pack dog gone feral in the ruins." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Nesting in collapsed rooftops." },
      { id: "giant_spider", name: "Giant Spider", ap: 3, discipline: 2, description: "Settled in the old sewer tunnels." },
      { id: "imp", name: "Scavenger Imp", ap: 3, discipline: 3, description: "Picking through rubble for shinies." },
    ],
  },
  {
    id: "abandoned_castle", name: "Abandoned Castle", minTier: "Apex", minMass: 35,
    description: "A crumbling fortress whose lord died without heir. Its gates still stand. Its walls still hold.",
    flavorText: "It has not fallen. It has simply been waiting for something worthy of its halls.",
    rooms: ["Great Hall", "Courtyard", "Gatehouse", "Lord's Chamber", "Dungeon", "Battlements"],
    roomGraph: {
      "Great Hall":    ["Courtyard", "Lord's Chamber", "Dungeon"],
      "Courtyard":     ["Great Hall", "Gatehouse", "Battlements"],
      "Gatehouse":     ["Courtyard"],
      "Lord's Chamber":["Great Hall", "Battlements"],
      "Dungeon":       ["Great Hall"],
      "Battlements":   ["Courtyard", "Lord's Chamber"],
    },
    partySize: [5, 7], suspicionGrowthRate: 1,
    advantageTags: ["Structural", "Defensive", "Authority", "Valuable"],
    imageHint: "dark abandoned medieval castle at night with torchlit courtyard",
    locationCreatures: [
      { id: "guard_dog", name: "Feral Hound", ap: 3, discipline: 2, description: "Once a castle guard dog, now wild." },
      { id: "bat", name: "Bat", ap: 1, discipline: 1, description: "Swarming from the dungeon." },
      { id: "rat", name: "Rat", ap: 1, discipline: 1, description: "Castle rats, bold and numerous." },
      { id: "skeleton", name: "Castle Shade", ap: 3, discipline: 2, description: "A soldier who never got the order to stand down." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Nesting in the battlements." },
    ],
  },
  // ── Giant realm locations ──
  {
    id: "giants_castle", name: "Giant's Castle", minTier: "Apex", minMass: 28,
    description: "A castle whose ceilings brush the clouds and whose doors are sized for creatures twenty feet tall.",
    flavorText: "Fe, fi, fo, fum. The giant smells something far too still. Something patient. Something hungry.",
    rooms: ["Great Hall", "Giant's Kitchen", "Treasury Vault", "Goose Chamber", "Sleeping Quarters", "Cloud Battlement"],
    roomGraph: {
      "Great Hall":         ["Giant's Kitchen", "Treasury Vault", "Cloud Battlement"],
      "Giant's Kitchen":    ["Great Hall", "Sleeping Quarters"],
      "Treasury Vault":     ["Great Hall", "Goose Chamber"],
      "Goose Chamber":      ["Treasury Vault", "Sleeping Quarters"],
      "Sleeping Quarters":  ["Giant's Kitchen", "Goose Chamber"],
      "Cloud Battlement":   ["Great Hall"],
    },
    partySize: [2, 4], suspicionGrowthRate: 1,
    advantageTags: ["Structural", "Valuable", "Comfort", "Authority"],
    imageHint: "enormous giant castle interior with oversized furniture and golden light",
    locationCreatures: [
      { id: "giant_goose", name: "Golden Goose", ap: 5, discipline: 2, description: "A fat, enchanted goose that lays golden eggs — and weighs as much as a pony." },
      { id: "cloud_sprite", name: "Cloud Sprite", ap: 3, discipline: 2, description: "A wispy spirit of condensed cloud-magic, drifting through the upper halls." },
      { id: "giant_rat", name: "Castle Rat (Giant-Sized)", ap: 3, discipline: 2, description: "As large as a dog, nesting in the kitchen stores." },
      { id: "giant_cat", name: "Giant's Cat", ap: 4, discipline: 3, description: "The giant's pet — the size of a lion, with a lion's temperament." },
      { id: "beanstalk_beetle", name: "Beanstalk Beetle", ap: 2, discipline: 1, description: "A beetle the size of a shield, clicking along the flagstones." },
    ],
    isGiantRealm: true,
  },
  {
    id: "cloud_kingdom", name: "Cloud Kingdom Outpost", minTier: "Apex", minMass: 38,
    description: "A floating fortress of cloud-stone and stormforged iron, reachable only by beanstalk or sorcery.",
    flavorText: "The floor is cloud. The walls are storm. The giants who live here have never feared anything — until now.",
    rooms: ["Storm Throne Room", "Cloud Forge", "Beanstalk Landing", "Giant's Larder", "Storm Battery", "High Nest"],
    roomGraph: {
      "Storm Throne Room": ["Cloud Forge", "Beanstalk Landing", "Giant's Larder"],
      "Cloud Forge":        ["Storm Throne Room", "Storm Battery"],
      "Beanstalk Landing":  ["Storm Throne Room", "High Nest"],
      "Giant's Larder":     ["Storm Throne Room"],
      "Storm Battery":      ["Cloud Forge"],
      "High Nest":          ["Beanstalk Landing"],
    },
    partySize: [2, 3], suspicionGrowthRate: 2,
    advantageTags: ["Structural", "Defensive", "Authority", "Valuable"],
    imageHint: "floating cloud fortress with storm giant throne room and lightning-lit sky",
    locationCreatures: [
      { id: "storm_elemental", name: "Storm Elemental", ap: 6, discipline: 3, description: "A crackling elemental of living lightning — restless and territorial." },
      { id: "cloud_eagle", name: "Cloud Eagle", ap: 4, discipline: 3, description: "A vast raptor that nests in the high rafters — even giants give it space." },
      { id: "giant_goose", name: "Golden Goose", ap: 5, discipline: 2, description: "Another enchanted goose, fattened on cloud-grain." },
      { id: "beanstalk_beetle", name: "Stormwood Beetle", ap: 3, discipline: 2, description: "Crackling faintly with static charge." },
    ],
    isGiantRealm: true,
  },
  {
    id: "lonely_moor", name: "Lonely Moor Shelter", minTier: "Apex",
    description: "A shepherd's bothy on an exposed moorland, the only shelter for miles.",
    flavorText: "The wind never stops. Travelers come desperate and grateful. Gratitude is delicious.",
    rooms: ["Bothy Interior", "Peat Stack", "Moorland Path North", "Moorland Path South", "Standing Stones", "Boggy Hollow"],
    roomGraph: {
      "Bothy Interior":       ["Peat Stack", "Moorland Path North"],
      "Peat Stack":           ["Bothy Interior", "Boggy Hollow"],
      "Moorland Path North":  ["Bothy Interior", "Standing Stones"],
      "Moorland Path South":  ["Standing Stones", "Boggy Hollow"],
      "Standing Stones":      ["Moorland Path North", "Moorland Path South"],
      "Boggy Hollow":         ["Peat Stack", "Moorland Path South"],
    },
    partySize: [2, 4], suspicionGrowthRate: 2,
    advantageTags: ["Structural", "Rural", "Comfort"],
    imageHint: "isolated stone bothy on a dark foggy moorland at night",
    locationCreatures: [
      { id: "moor_hound", name: "Moor Hound", ap: 3, discipline: 2, description: "A shaggy, half-wild dog that roams the bog paths." },
      { id: "bog_sprite", name: "Bog Sprite", ap: 2, discipline: 1, description: "A murky little spirit from the boggy hollow." },
      { id: "crow", name: "Crow", ap: 1, discipline: 1, description: "Black against grey sky, always watching." },
      { id: "adder", name: "Moorland Adder", ap: 1, discipline: 2, description: "A venomous snake basking near the peat stack." },
    ],
  },
];

// Forms that ARE a room (Grand/Apex tier) — used for duplicate-room plausibility check
export const ROOM_FORM_IDS = new Set([
  "grand_personal_library", "grand_parlor", "grand_small_outhouse",
  "apex_roadside_inn", "apex_stable", "apex_chapel", "apex_watchtower", "apex_abandoned_cottage",
  "apex_castle_gate", "apex_lighthouse",
]);

// Mapping from form id → room type keyword for duplicate detection
export const FORM_ROOM_TYPE = {
  grand_personal_library: "library",
  grand_parlor: "parlor",
  grand_small_outhouse: "outhouse",
  apex_roadside_inn: "inn",
  apex_stable: "stable",
  apex_chapel: "chapel",
  apex_watchtower: "tower",
  apex_abandoned_cottage: "cottage",
  apex_castle_gate: "gate",
  apex_lighthouse: "lighthouse",
};

// ============================================================
// ROOM CONTEXT MODIFIERS
// Each location room can have plausibilityBonus/penalty and allureBonus/penalty
// for specific form IDs. These are applied at runtime in stealthCheck & allureCheck.
// format: { formId: { plausibility?: number, allure?: number, note?: string } }
// positive = bonus, negative = penalty
// ============================================================
export const ROOM_FORM_MODIFIERS = {
  // ── Abandoned Manor ──
  "Library":        { "lesser_bookshelf_small": { plausibility: 1, allure: -1, note: "One bookshelf among many — expected, but unremarkable." },
                      "standard_bookshelf":     { plausibility: 1, allure: -1, note: "Fits naturally, but blends into the other shelves." },
                      "minor_book":             { plausibility: 1, note: "Books belong in libraries." },
                      "lesser_chest":           { plausibility: -1, note: "A chest seems out of place amongst shelves." } },
  "Master Bedroom": { "greater_bed":            { plausibility: 1, note: "A bed in a bedroom raises no questions." },
                      "lesser_chest":           { plausibility: 1, note: "Storage chests are expected in bedrooms." },
                      "standard_wardrobe":      { plausibility: 1, note: "Wardrobes belong in bedrooms." },
                      "minor_jewelry_box":      { plausibility: 1, allure: 1, note: "Jewelry boxes are natural and enticing here." },
                      "standard_bookshelf":     { plausibility: -1, note: "An odd place for a full bookshelf." } },
  "Wine Cellar":    { "lesser_barrel":          { plausibility: 1, allure: 1, note: "Barrels are completely expected in a cellar." },
                      "lesser_crate":           { plausibility: 1, note: "Crates fit naturally in a cellar." },
                      "lesser_chest":           { plausibility: 1, note: "Chests are plausible storage in cellars." },
                      "standard_bookshelf":     { plausibility: -2, note: "A bookshelf in a cellar is deeply suspicious." } },
  "Trophy Hall":    { "greater_statue":         { plausibility: 1, allure: 1, note: "Statues are expected in trophy halls." },
                      "lesser_statuette":       { plausibility: 1, note: "Statuettes fit trophy display rooms." },
                      "lesser_chest":           { plausibility: -1, note: "Chests seem out of place among trophies." } },
  // ── Wizard's Tower ──
  "Arcane Library": { "standard_bookshelf":     { plausibility: 1, allure: -1, note: "Expected, but one of many — less enticing." },
                      "lesser_bookshelf_small": { plausibility: 1, allure: -1, note: "Blends into the stacks." },
                      "minor_book":             { plausibility: 1, note: "Books are everywhere here." },
                      "standard_writing_desk":  { plausibility: 1, allure: 1, note: "A scholar's desk in a library is perfectly placed." } },
  "Alchemy Lab":    { "minor_teapot":           { plausibility: 1, note: "Vessels are normal in a lab." },
                      "minor_goblet":           { plausibility: 1, note: "Beakers and goblets go unquestioned." },
                      "lesser_chest":           { plausibility: -1, note: "A treasure chest in a lab is odd." } },
  "Vault":          { "lesser_chest":           { plausibility: 1, allure: 1, note: "Chests are exactly what you'd expect in a vault." },
                      "grand_vault":            { plausibility: 1, allure: 1, note: "A vault within a vault — perfectly natural." },
                      "standard_bookshelf":     { plausibility: -1, note: "Books don't belong in a vault." } },
  // ── Haunted Inn ──
  "Cellar":         { "lesser_barrel":          { plausibility: 1, allure: 1, note: "Barrels are the natural currency of cellars." },
                      "lesser_crate":           { plausibility: 1, note: "Crates are expected down here." },
                      "lesser_chest":           { plausibility: 1, note: "A storage chest fits in a cellar." },
                      "standard_bookshelf":     { plausibility: -2, note: "Books in a cellar? Deeply suspicious." } },
  "Common Room":    { "lesser_chair":           { plausibility: 1, note: "Chairs are at home in a common room." },
                      "standard_grand_chair":   { plausibility: -1, note: "A grand throne-chair looks out of place at an inn." },
                      "standard_dining_table":  { plausibility: 1, note: "Tables belong in common rooms." } },
  "Guest Rooms":    { "greater_bed":            { plausibility: 1, note: "A bed in a guest room is expected." },
                      "standard_wardrobe":      { plausibility: 1, note: "Wardrobes fit in guest rooms." },
                      "lesser_chest":           { plausibility: 1, note: "Chests are common in guest rooms." } },
  // ── Cursed Chapel ──
  "Nave":           { "greater_statue":         { plausibility: 1, allure: 1, note: "Religious statues belong in a nave." },
                      "lesser_statuette":       { plausibility: 1, note: "Statuettes fit in chapels." },
                      "lesser_chest":           { plausibility: -1, note: "A treasure chest in the nave seems wrong." } },
  "Crypt":          { "lesser_chest":           { plausibility: 1, note: "Crypts sometimes hold burial chests." },
                      "grand_vault":            { plausibility: 1, note: "A sealed vault in a crypt is not unusual." },
                      "greater_statue":         { plausibility: 1, note: "Funerary statues are expected in crypts." } },
  "Vestry":         { "minor_jewelry_box":      { plausibility: 1, allure: 1, note: "Reliquary boxes are kept in vestries." },
                      "minor_candlestick":      { plausibility: 1, note: "Candlesticks belong in vestries." } },
  // ── Noble Estate ──
  "Dining Room":    { "standard_dining_table":  { plausibility: 1, note: "A dining table in a dining room. Natural." },
                      "lesser_chair":           { plausibility: 1, note: "Chairs around a dining table." },
                      "standard_bookshelf":     { plausibility: -1, note: "Bookshelves don't belong at dinner." } },
  "Study":          { "standard_writing_desk":  { plausibility: 1, allure: 1, note: "A writing desk in a study is exactly right." },
                      "standard_bookshelf":     { plausibility: 1, allure: 1, note: "One bookshelf in a private study is perfectly placed — and enticing." },
                      "lesser_bookshelf_small": { plausibility: 1, allure: 1, note: "A small bookshelf fits a private study well." },
                      "minor_book":             { plausibility: 1, note: "Books are at home in a study." } },
  "Armory":         { "lesser_chest":           { plausibility: 1, note: "Armories often have storage chests." },
                      "lesser_crate":           { plausibility: 1, note: "Equipment crates are normal in armories." },
                      "greater_throne":         { plausibility: -2, note: "A throne in an armory is deeply suspicious." } },
};

// Get room context modifier for a form in a specific room
export function getRoomContextMod(formId, roomName) {
  const roomMods = ROOM_FORM_MODIFIERS[roomName];
  if (!roomMods) return { plausibility: 0, allure: 0 };
  const mod = roomMods[formId];
  if (!mod) return { plausibility: 0, allure: 0 };
  return { plausibility: mod.plausibility || 0, allure: mod.allure || 0, note: mod.note };
}

// BFS distance between two rooms using a location's roomGraph
export function getRoomDistance(location, roomA, roomB) {
  if (roomA === roomB) return 0;
  const graph = location.roomGraph;
  if (!graph) return 1;
  const visited = new Set([roomA]);
  const queue = [[roomA, 0]];
  while (queue.length) {
    const [current, dist] = queue.shift();
    for (const neighbor of (graph[current] || [])) {
      if (neighbor === roomB) return dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  return 99; // unreachable
}

// Get adjacent rooms (distance 1) from a given room
export function getAdjacentRooms(location, room) {
  return (location.roomGraph?.[room] || []);
}

// ============================================================
// STARTING STATS
// ============================================================
export const STARTING_STATS = {
  Minor:  { plausibility: 4, adhesion: 3, patience: 4, mass: 2, digestiveCapacity: 3, baseAllure: 2 },
  Lesser: { plausibility: 2, adhesion: 4, patience: 2, mass: 6, digestiveCapacity: 5, baseAllure: 3 },
};

// ============================================================
// TIER CONFIG
// ============================================================
export const TIER_CONFIG = {
  Minor:    { massRange: [1, 4],   apToEvolve: 10, apToUpgrade: 3,  description: "Tiny, deceptive, patient",         lore: "A fledgling mimic, barely larger than a hatbox. Dangerous only to the unwary." },
  Lesser:   { massRange: [5, 8],   apToEvolve: 20, apToUpgrade: 5,  description: "Small but deadly",                  lore: "Capable of consuming a full humanoid. Still learning the art of perfect deception." },
  Standard: { massRange: [9, 12],  apToEvolve: 35, apToUpgrade: 8,  description: "Proven predator",                   lore: "A mid-tier mimic has shed its vulnerability. Now a true ambush hunter." },
  Greater:  { massRange: [13, 16], apToEvolve: 55, apToUpgrade: 12, description: "Formidable illusionist",             lore: "Its patience is geological. It has consumed dozens and learned their secrets." },
  Grand:    { massRange: [17, 25], apToEvolve: 80, apToUpgrade: 18, description: "Architectural predator",             lore: "A room is not a hiding place. A room IS the mimic." },
  Apex:     { massRange: [26, 99], apToEvolve: 120, apToUpgrade: 25, description: "Legendary shapeshifter",       lore: "Travelers speak of entire buildings that vanish overnight. They are not wrong." },
};

// ============================================================
// DICE ENGINE
// ============================================================
export function rollDice(numDice) {
  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * 6) + 1;
  }
  return total;
}

export function rollDiceVerbose(numDice) {
  const rolls = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * 6) + 1);
  }
  return { total: rolls.reduce((a, b) => a + b, 0), rolls };
}

// ============================================================
// HELPER: Get valid forms for a mimic
// For the current tier, filter by mass. For adjacent tiers, show all forms (no mass filter).
// ============================================================
export function getValidForms(tierStr, massVal) {
  const currentTierIndex = TIER_ORDER.indexOf(tierStr);
  if (currentTierIndex === -1) return [];
  const validForms = [];
  TIER_ORDER.forEach((tier, tierIndex) => {
    const delta = tierIndex - currentTierIndex;
    if (Math.abs(delta) <= 1) {
      MASTER_FORMS[tier]?.forEach((form) => {
        // Mass-gated forms: baseMassRange[0] acts as minimum mass required
        if (massVal < form.baseMassRange[0]) return;
        // All forms that meet the mass minimum are valid — no upper-bound exclusion.
        // (Upper bound of baseMassRange is only used for display/flavor, not gating.)
        validForms.push(form);
      });
    }
  });
  return validForms;
}

// ============================================================
// COMBAT ENGINE
// ============================================================
// roomContextMod: { plausibility: number, allure: number } — from getRoomContextMod()
export function stealthCheck(plausibility, patience, formTier, mimicTier, form, adventurer, roomContextMod = {}) {
  const currentTierIndex = TIER_ORDER.indexOf(mimicTier);
  const formTierIndex = TIER_ORDER.indexOf(formTier);
  let basePlausi = plausibility;

  if (formTierIndex === currentTierIndex + 1) basePlausi -= 2;
  else if (formTierIndex === currentTierIndex - 1) basePlausi -= 1;
  // Apply room context plausibility modifier
  basePlausi += (roomContextMod.plausibility || 0);
  basePlausi = Math.max(1, basePlausi);

  // Patience adds bonus dice to the mimic's stealth roll (stillness aids deception)
  const patienceBonus = Math.floor((patience || 1) / 2);

  let flawCount = 0;
  if (plausibility <= 2) flawCount = 2;
  else if (plausibility <= 3) flawCount = 1;

  const detectedFlaws = [];
  const shuffled = [...form.flawProfiles].sort(() => Math.random() - 0.5).slice(0, flawCount);
  shuffled.forEach((flaw) => {
    const affinityBonus = adventurer.perceptionAffinity[flaw.type] || 0;
    const advRollResult = rollDice(adventurer.discipline + affinityBonus);
    const mimicRollResult = rollDice(basePlausi + patienceBonus);
    if (advRollResult > mimicRollResult) detectedFlaws.push(flaw.description);
  });

  const mimicRoll = rollDice(basePlausi + patienceBonus);
  const advRoll = rollDice(adventurer.discipline + adventurer.suspicion);
  const success = mimicRoll >= advRoll;
  const suspicionChange = detectedFlaws.length + (success ? 0 : 1);

  return {
    success, mimicRoll, advRoll, suspicionChange, detectedFlaws,
    narrative: success
      ? `${adventurer.name} glances at the ${form.name} and moves on.`
      : `${adventurer.name} pauses, eyes narrowing at the ${form.name}.`,
  };
}

// Returns interest score [0-N] without rolling — used for targeting priority
export function calcAllureInterest(form, currentAppearance, adventurer) {
  const appearanceMats = [
    ...(currentAppearance.primaryMaterials || []),
    ...(currentAppearance.secondaryMaterials || []),
  ];
  const appearanceTraits = [
    ...(currentAppearance.surfaceTraits || []),
    ...(currentAppearance.symbolicTraits || []),
  ];
  let score = 0;
  (adventurer.alluringQualities.materials || []).forEach(mat => { if (appearanceMats.includes(mat)) score += 1; });
  (adventurer.alluringQualities.traits || []).forEach(trait => { if (appearanceTraits.includes(trait)) score += 1; });
  (adventurer.alluringQualities.tags || []).forEach(tag => { if (form.utilityTags.includes(tag)) score += 1; });
  return score;
}

// roomContextMod: { plausibility: number, allure: number } — from getRoomContextMod()
export function allureCheck(baseAllure, plausibility, form, currentAppearance, adventurer, roomContextMod = {}) {
  // Base mimic allure dice = baseAllure + form modifier + room context
  let allureDice = baseAllure + (form.baseAllureModifier || 0) + (roomContextMod.allure || 0);

  const interestBonus = calcAllureInterest(form, currentAppearance, adventurer);

  let suspicionChange = 0;
  // Only add interest bonus if plausibility supports it; excess causes suspicion
  const usableBonus = Math.min(interestBonus, plausibility);
  if (interestBonus > plausibility) suspicionChange += 1;
  allureDice += usableBonus;
  allureDice = Math.max(1, allureDice);

  // Adventurer resists with discipline + suspicion (wariness makes luring harder)
  const resistDice = adventurer.discipline + Math.ceil(adventurer.suspicion / 2);
  const mimicRoll = rollDice(allureDice);
  const advRoll = rollDice(resistDice);
  const success = mimicRoll >= advRoll;

  return {
    success, mimicRoll, advRoll, interestBonus, suspicionChange, detectedFlaws: [],
    narrative: success
      ? `${adventurer.name} is drawn toward the ${form.name}, eyes gleaming with interest.`
      : `${adventurer.name} glances at the ${form.name} but shows no interest.`,
  };
}

export function adhesionCheck(adhesion, form, adventurer) {
  const mimicRoll = rollDice(adhesion);
  const advRoll = rollDice(adventurer.discipline);
  const success = mimicRoll >= advRoll;
  return {
    success, mimicRoll, advRoll, suspicionChange: 0, detectedFlaws: [],
    narrative: success
      ? `The ${form.name} snaps shut! ${adventurer.name} is caught!`
      : `${adventurer.name} recoils just in time, evading your grasp!`,
  };
}

// AP rewards per adventurer type
export const AP_REWARDS = {
  Rogue: 4, Cleric: 5, Bard: 3, Wizard: 5, Warrior: 3, Ranger: 4, Paladin: 5, Artificer: 4,
  Druid: 4, Assassin: 5, Hunter: 8, Commoner: 2, Nobility: 6, Undead: 5, AnimalCompanion: 2, Familiar: 3,
  Fey: 5, Construct: 6, Beast: 6,
  Giant: 12, // Giant-kin yield significantly more AP (applied by group, see getApReward)
};

// AP for fully consuming an adventurer. Giant-kin use the Giant reward regardless of
// their class type (a Half-Giant Mercenary is type "Warrior" but is worth far more).
export function getApReward(adventurer) {
  if (adventurer.group === "giantKin") return AP_REWARDS.Giant;
  return AP_REWARDS[adventurer.type] || 3;
}

// ============================================================
// PARTY ELIGIBILITY
// Whether a template may appear in a party at this location for this mimic.
// ============================================================
export function isTemplateEligible(template, location, mimicTier, mimicMass) {
  const tierIdx = TIER_ORDER.indexOf(mimicTier || "Minor");
  if (template.minTier && TIER_ORDER.indexOf(template.minTier) > tierIdx) return false;
  if (template.minMass && (mimicMass ?? 0) < template.minMass) return false;
  if (template.locations && !template.locations.includes(location.id)) return false;
  // Giant-kin only appear in giant-realm locations
  if (template.group === "giantKin" && !location.isGiantRealm) return false;
  return true;
}

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
  bloodScent: {
    label: "Blood Scent",
    description: "When you feed on a party member, it stalks one room toward you, growing more suspicious as it comes.",
  },
};

/** Adventurers with this behavior never wander on their own. */
export function isStationary(adventurer) {
  return adventurer.behavior === "stoneWatch";
}

const isActive = (adv) => adv.isAlive && !adv.isConsumed && !adv.fled;

/** The adjacent room that brings `fromRoom` closest to `targetRoom` (or fromRoom if already there). */
function stepToward(location, fromRoom, targetRoom) {
  if (fromRoom === targetRoom) return fromRoom;
  const options = getAdjacentRooms(location, fromRoom);
  if (options.length === 0) return fromRoom;
  return options.reduce((best, room) =>
    getRoomDistance(location, room, targetRoom) < getRoomDistance(location, best, targetRoom) ? room : best
  );
}

/**
 * Work out how party members with behaviors react to a mimic action.
 * Pure: returns changes for the caller to apply.
 *
 * ctx: { party, location, mimicRoom, fromRoom?, excludeIds? }
 * returns {
 *   patches:  { [advId]: { location?, isAttracted?, suspicionDelta? } },
 *   suspicion: number,          // party-wide suspicion to add
 *   events:   [{ type, text }], // event log lines
 *   arrivals: [adventurer],     // adventurers who moved into the mimic's room (need stealth checks)
 * }
 */
export function getBehaviorReactions(trigger, { party, location, mimicRoom, fromRoom, excludeIds = [] }) {
  const result = { patches: {}, suspicion: 0, events: [], arrivals: [] };
  if (!location || !mimicRoom) return result;
  const dist = (a, b) => getRoomDistance(location, a, b);

  party.forEach((adv) => {
    if (!adv.behavior || !isActive(adv) || excludeIds.includes(adv.id)) return;

    switch (adv.behavior) {
      case "keenHearing": {
        if (trigger !== "relocate" && trigger !== "strike") return;
        if (dist(adv.location, mimicRoom) > 2) return;
        result.patches[adv.id] = { suspicionDelta: 1 };
        result.suspicion += 1;
        result.events.push({ type: "alert", text: `${adv.name}'s head snaps toward the sound from the ${mimicRoom}. (+1 suspicion)` });
        return;
      }
      case "shapeSense": {
        if (trigger !== "formChange") return;
        if (dist(adv.location, mimicRoom) > 2) return;
        result.patches[adv.id] = { suspicionDelta: 2 };
        result.suspicion += 2;
        result.events.push({ type: "alert", text: `${adv.name} shivers — something nearby just changed its shape. (+2 suspicion)` });
        return;
      }
      case "stoneWatch": {
        if (trigger !== "relocate" || !fromRoom) return;
        const saw = dist(adv.location, fromRoom) <= 1 || dist(adv.location, mimicRoom) <= 1;
        if (!saw) return;
        result.patches[adv.id] = { suspicionDelta: 1 };
        result.suspicion += 2;
        result.events.push({ type: "alert", text: `${adv.name}'s stone eyes track the change — something in the ${fromRoom} is no longer where it was. (+2 suspicion)` });
        return;
      }
      case "carrionScent":
      case "bloodScent": {
        if (trigger !== "feed") return;
        const newRoom = stepToward(location, adv.location, mimicRoom);
        const arrived = newRoom === mimicRoom;
        const moved = newRoom !== adv.location;
        if (adv.behavior === "carrionScent") {
          result.patches[adv.id] = { location: newRoom, isAttracted: arrived };
          result.events.push({
            type: arrived ? "allure" : "info",
            text: arrived
              ? `${adv.name} catches the scent of the kill and shambles into the ${mimicRoom}, drawn to the meal.`
              : `${adv.name} catches the scent of the kill and shambles toward the ${newRoom}.`,
          });
        } else {
          result.patches[adv.id] = { location: newRoom, suspicionDelta: 1 };
          result.events.push({
            type: "alert",
            text: moved
              ? `${adv.name} smells blood and stalks into the ${newRoom}, hackles raised.`
              : `${adv.name} smells blood. Its hackles rise.`,
          });
        }
        if (arrived && moved) result.arrivals.push({ ...adv, location: newRoom });
        return;
      }
      default:
        return;
    }
  });

  return result;
}

// ============================================================
// LEGENDARY REPUTATION
// Returns true if the current hunt should be a Bounty Hunt (mimic hunters specifically targeting the mimic)
// Chance scales with mass. At mass 30+ it becomes possible; at 36+ it is more common.
// ============================================================
export function shouldTriggerBountyHunt(mass) {
  if (mass < 30) return false;
  if (mass >= 36) return Math.random() < 0.50; // 50% chance at mass 36+
  return Math.random() < 0.25; // 25% chance at mass 30-35
}

// Build a Bounty Hunt party — all members are mimic hunter variants
export function generateBountyParty(location, mimicMass) {
  const hunterTemplates = ADVENTURER_TEMPLATES.filter(t => t.isMimicHunter);
  const size = mimicMass >= 36 ? 4 : 3;
  const shuffled = [...hunterTemplates].sort(() => Math.random() - 0.5);
  const members = [];
  for (let i = 0; i < size; i++) {
    const t = shuffled[i % shuffled.length];
    const room = location.rooms[Math.floor(Math.random() * location.rooms.length)];
    members.push({
      ...t,
      id: `bounty_${Date.now()}_${i}`,
      suspicion: t.baseSuspicion,
      isAlive: true,
      isConsumed: false,
      isAttracted: false,
      location: room,
    });
  }
  return members;
}

// Materials / traits learned from FULL consumption — pulled directly from adventurer template now
// These are fallback values if template lootMaterials is missing
export const ADVENTURER_MATERIALS = {
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
export const ADVENTURER_TRAITS = {
  Rogue: [],
  Cleric: ["Sacred Symbol"],
  Bard: ["Gilded"],
  Wizard: ["Runescript", "Arcane Sigil"],
  Warrior: ["Reinforced"],
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
  Beast: ["Rough-Hewn"],
  Giant: ["Rough-Hewn", "Iron-Banded"],
};

// ============================================================
// SICKNESS SYSTEM
// Triggers when all 3 combat stats (plausibility, adhesion, patience) are at cap (6).
// 20% chance per hunt to contract one sickness for the duration of the hunt only.
// ============================================================
export const SICKNESSES = [
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

// Returns a sickness if all stats are capped and the random roll hits (20% chance)
export function rollForSickness(character) {
  const STAT_CAP = 6;
  const allCapped = character.plausibility >= STAT_CAP &&
                    character.adhesion >= STAT_CAP &&
                    character.patience >= STAT_CAP;
  if (!allCapped) return null;
  if (Math.random() > 0.20) return null;
  return SICKNESSES[Math.floor(Math.random() * SICKNESSES.length)];
}