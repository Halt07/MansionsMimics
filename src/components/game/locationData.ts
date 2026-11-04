// ============================================================
// MANSIONS & MIMICS — Location data
// Hunting grounds: rooms, room graphs, local creatures, and how forms fit each room.
// Room helpers (distance, adjacency, context modifiers) live in ./gameData.
// ============================================================
import type { Tier, UtilityTag } from "./vocabulary";
import type { FormId } from "./mimicData";

// ============================================================
// LOCATIONS
// ============================================================
// roomGraph: adjacency list — each room connects to others by name
// distance is computed at runtime via BFS from this graph
// minTier: minimum mimic tier to access this location (undefined = always available)
export interface LocationCreature {
  readonly id: string;
  readonly name: string;
  readonly ap: number;
  readonly discipline: number;
  readonly description: string;
}

interface LocationDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly minTier: Tier;
  readonly minMass?: number;
  readonly flavorText: string;
  readonly rooms: readonly string[];
  readonly roomGraph: Readonly<Record<string, readonly string[]>>;
  readonly partySize: readonly [number, number];
  readonly suspicionGrowthRate: number;
  readonly advantageTags: readonly UtilityTag[];
  readonly imageHint: string;
  readonly locationCreatures: readonly LocationCreature[];
  readonly isGiantRealm?: boolean;
  /** Only adventurers that list this location in their `locations` can appear here. */
  readonly exclusiveRoster?: boolean;
  /**
   * Rare locations aren't always on the map: after a hunt there's a small chance one opens
   * for a couple of hunts (see advanceRareLocation in ./gameData).
   */
  readonly rare?: boolean;
  /** Adventurers (template names) guaranteed a place in every party here. */
  readonly alwaysIncludes?: readonly string[];
}

const LOCATION_DATA = [
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
      { id: "cloud_gosling", name: "Cloud Gosling", ap: 5, discipline: 2, description: "A downy gosling the size of a pony, strayed from the giant's flock." },
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
    exclusiveRoster: true,
    locationCreatures: [
      { id: "storm_elemental", name: "Storm Elemental", ap: 2, discipline: 3, description: "A restless knot of wind and lightning. Edible, technically — though it fills you about as much as a gulp of air." },
      { id: "cloud_eagle", name: "Cloud Eagle", ap: 4, discipline: 3, description: "A vast raptor that nests in the high rafters — even giants give it space." },
      { id: "cloud_gosling", name: "Cloud Gosling", ap: 5, discipline: 2, description: "A fluffy cloud gosling, fattened on cloud-grain." },
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

  // ── Rare locations (open briefly at random; see advanceRareLocation) ──
  {
    id: "hollow_reliquary", name: "The Hollow Reliquary", minTier: "Standard",
    description: "A half-ruined shrine built around a sacred chest that once \"consumed the unworthy.\" Pilgrims still come.",
    flavorText: "The altar where the chest once stood is bare, scrubbed clean, and waiting. The faithful say it will return.",
    rooms: ["Nave", "Reliquary Vault", "Candle Gallery", "Pilgrims' Dormitory", "Bell Loft", "Ossuary"],
    roomGraph: {
      "Nave":                ["Reliquary Vault", "Candle Gallery", "Pilgrims' Dormitory"],
      "Reliquary Vault":     ["Nave", "Ossuary"],
      "Candle Gallery":      ["Nave", "Bell Loft"],
      "Pilgrims' Dormitory": ["Nave"],
      "Bell Loft":           ["Candle Gallery"],
      "Ossuary":             ["Reliquary Vault"],
    },
    partySize: [3, 4], suspicionGrowthRate: 1,
    advantageTags: ["Religious", "Valuable", "Storage"],
    imageHint: "candlelit ruined shrine with an empty altar and kneeling pilgrims",
    locationCreatures: [
      { id: "church_mouse", name: "Church Mouse", ap: 1, discipline: 1, description: "Fat on spilled communion bread." },
      { id: "dove", name: "Temple Dove", ap: 1, discipline: 1, description: "Kept for releasing at blessings." },
      { id: "bell_bat", name: "Bell-Loft Bat", ap: 1, discipline: 1, description: "Deaf from the bells, and unbothered by anything." },
      { id: "temple_cat", name: "Temple Cat", ap: 2, discipline: 2, description: "A sleek mouser the pilgrims think is lucky." },
      { id: "votive_lamb", name: "Votive Lamb", ap: 3, discipline: 1, description: "Brought by a pilgrim as an offering. To whom, it does not know." },
    ],
    rare: true,
    exclusiveRoster: true,
    alwaysIncludes: ["Wide-Eyed Pilgrim"],
  },
] as const satisfies readonly LocationDef[];

/** Every location id, derived from the location data above. */
export type LocationId = (typeof LOCATION_DATA)[number]["id"];
/** Every room name across all locations. */
export type RoomName = (typeof LOCATION_DATA)[number]["rooms"][number];

/** A hunting ground. (Named HuntLocation to avoid clashing with the browser's Location type.) */
export interface HuntLocation extends Omit<LocationDef, "id" | "rooms" | "roomGraph"> {
  readonly id: LocationId;
  readonly rooms: readonly RoomName[];
  readonly roomGraph: Readonly<Partial<Record<RoomName, readonly RoomName[]>>>;
}

export const LOCATIONS: readonly HuntLocation[] = LOCATION_DATA;

// Forms that ARE a room (Grand/Apex tier) — used for duplicate-room plausibility check
export const ROOM_FORM_IDS: ReadonlySet<FormId> = new Set<FormId>([
  "grand_personal_library", "grand_parlor", "grand_small_outhouse",
  "apex_roadside_inn", "apex_stable", "apex_chapel", "apex_watchtower", "apex_abandoned_cottage",
  "apex_castle_gate", "apex_lighthouse",
]);

// Mapping from form id → room type keyword for duplicate detection
export const FORM_ROOM_TYPE: Partial<Record<FormId, string>> = {
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
export interface RoomModifier {
  readonly plausibility?: number;
  readonly allure?: number;
  readonly note: string;
}

export interface RoomContextMod {
  plausibility: number;
  allure: number;
  note?: string;
}

export const ROOM_FORM_MODIFIERS: Partial<Record<RoomName, Partial<Record<FormId, RoomModifier>>>> = {
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
