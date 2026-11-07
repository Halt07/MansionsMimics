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
  /**
   * A nest of rival mimics, one of them the Elder: [min, max] mimics in total, Elder included.
   * Devouring the Elder ends the hunt; losing every adventurer does not.
   */
  readonly rivalNest?: readonly [number, number];
  /** The location sinks (and the hunt ends) after this many turns. */
  readonly sinkingTurns?: number;
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
      "Waystation Building": ["Milestone Stone"],
      "Road West":           ["Milestone Stone", "Side Path"],
      "Road East":           ["Milestone Stone"],
      "Side Path":           ["Road West", "Ditch & Hedgerow"],
      "Ditch & Hedgerow":    ["Side Path"],
      "Milestone Stone":     ["Waystation Building", "Road West", "Road East"],
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
      "Giant's Kitchen":    ["Great Hall", "Sleeping Quarters", "Goose Chamber"],
      "Treasury Vault":     ["Great Hall"],
      "Goose Chamber":      ["Giant's Kitchen"],
      "Sleeping Quarters":  ["Giant's Kitchen"],
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
  {
    id: "mimic_nest", name: "The Mimic Nest", minTier: "Greater",
    description: "A derelict dockside warehouse where cargo shifts on its own and porters stop coming back. Your kind has nested here — and one of them is very old.",
    flavorText: "Too many crates. Too many chests. Some of them are breathing.",
    rooms: ["Loading Dock", "Crate Stacks", "Foreman's Office", "Cold Storage", "Rope Loft", "Bonded Vault"],
    roomGraph: {
      "Loading Dock":     ["Crate Stacks", "Foreman's Office"],
      "Crate Stacks":     ["Loading Dock", "Cold Storage", "Rope Loft"],
      "Foreman's Office": ["Loading Dock", "Bonded Vault"],
      "Cold Storage":     ["Crate Stacks"],
      "Rope Loft":        ["Crate Stacks"],
      "Bonded Vault":     ["Foreman's Office"],
    },
    partySize: [2, 3], suspicionGrowthRate: 1,
    advantageTags: ["Storage", "Coastal", "Transport"],
    imageHint: "dim dockside warehouse crammed with crates and chests, some of them slightly ajar",
    locationCreatures: [
      { id: "dock_rat", name: "Dock Rat", ap: 1, discipline: 1, description: "Bold, fat, and strangely nervous around the crates." },
      { id: "gull", name: "Harbor Gull", ap: 1, discipline: 1, description: "Wandered in through a broken skylight." },
      { id: "warehouse_cat", name: "Warehouse Cat", ap: 2, discipline: 2, description: "Hisses at certain crates and won't say why." },
      { id: "eel", name: "Bilge Eel", ap: 2, discipline: 1, description: "Slithering through the flooded corner of the dock." },
    ],
    rare: true,
    exclusiveRoster: true,
    rivalNest: [3, 4],
  },
  {
    id: "sinking_ship", name: "The Sinking Ship", minTier: "Lesser",
    description: "A merchant ship holed on the rocks and going down fast. Its captain refuses to leave without the strongbox.",
    flavorText: "Every timber groans. The water is already in the hold, and rising. Whatever you mean to eat, eat it quickly.",
    rooms: ["Main Deck", "Quarterdeck", "Captain's Cabin", "Galley", "Cargo Hold", "Bilge"],
    roomGraph: {
      "Main Deck":       ["Quarterdeck", "Galley", "Cargo Hold"],
      "Quarterdeck":     ["Main Deck", "Captain's Cabin"],
      "Captain's Cabin": ["Quarterdeck"],
      "Galley":          ["Main Deck"],
      "Cargo Hold":      ["Main Deck", "Bilge"],
      "Bilge":           ["Cargo Hold"],
    },
    partySize: [3, 4], suspicionGrowthRate: 1,
    advantageTags: ["Storage", "Coastal", "Transport"],
    imageHint: "listing merchant ship at night, water pouring into the hold, lanterns swinging",
    locationCreatures: [
      { id: "ship_rat", name: "Ship Rat", ap: 1, discipline: 1, description: "Already climbing for the rigging." },
      { id: "gull", name: "Harbor Gull", ap: 1, discipline: 1, description: "Circling, waiting to see what floats." },
      { id: "crab", name: "Rock Crab", ap: 1, discipline: 2, description: "Came in through the hole in the hull." },
      { id: "ships_cat", name: "Ship's Cat", ap: 2, discipline: 2, description: "Furious about the water." },
    ],
    rare: true,
    exclusiveRoster: true,
    alwaysIncludes: ["Ship's Captain"],
    sinkingTurns: 15,
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

/** The rooms of one location. */
export type RoomOf<L extends LocationId> = Extract<(typeof LOCATION_DATA)[number], { id: L }>["rooms"][number];

/**
 * Keyed by location, then room, then form, so rooms that share a name in different
 * locations (two "Great Hall"s, two "Nave"s) can differ. A variant form uses its own
 * entry if it has one, otherwise its base form's (see getRoomContextMod).
 */
export type RoomFormModifiers = {
  readonly [L in LocationId]?: { readonly [R in RoomOf<L>]?: Partial<Record<FormId, RoomModifier>> };
};

// Each location's header notes which mimics can hunt there and which forms they can wear
// (their own tier, one below or one above — and one tier lower still while wearing Thimblewood,
// which shrinks the mimic a tier). Modifiers for any other form could never apply;
// tests/rooms.test.mjs enforces this.
export const ROOM_FORM_MODIFIERS: RoomFormModifiers = {
  // ── Abandoned Manor · all mimics · wearable forms: Minor–Apex ──
  manor: {
    "Library":             { "lesser_bookshelf_small":  { plausibility: 1, allure: -1, note: "One bookshelf among many — expected, but unremarkable." },
                             "standard_bookshelf":      { plausibility: 1, allure: -1, note: "Fits naturally, but blends into the other shelves." },
                             "minor_book":              { plausibility: 1, note: "Books belong in libraries." },
                             "lesser_chest":            { plausibility: -1, note: "A chest seems out of place amongst shelves." } },
    "Master Bedroom":      { "greater_bed":             { plausibility: 1, note: "A bed in a bedroom raises no questions." },
                             "lesser_chest":            { plausibility: 1, note: "Storage chests are expected in bedrooms." },
                             "standard_wardrobe":       { plausibility: 1, note: "Wardrobes belong in bedrooms." },
                             "minor_jewelry_box":       { plausibility: 1, allure: 1, note: "Jewelry boxes are natural and enticing here." },
                             "standard_bookshelf":      { plausibility: -1, note: "An odd place for a full bookshelf." } },
    "Wine Cellar":         { "lesser_barrel":           { plausibility: 1, allure: 1, note: "Barrels are completely expected in a cellar." },
                             "lesser_crate":            { plausibility: 1, note: "Crates fit naturally in a cellar." },
                             "lesser_chest":            { plausibility: 1, note: "Chests are plausible storage in cellars." },
                             "standard_bookshelf":      { plausibility: -2, note: "A bookshelf in a cellar is deeply suspicious." } },
    "Trophy Hall":         { "greater_statue":          { plausibility: 1, allure: 1, note: "Statues are expected in trophy halls." },
                             "lesser_statuette":        { plausibility: 1, note: "Statuettes fit trophy display rooms." },
                             "lesser_chest":            { plausibility: -1, note: "Chests seem out of place among trophies." } },
  },
  // ── Wizard's Tower · all mimics · wearable forms: Minor–Apex ──
  wizard_tower: {
    "Arcane Library":      { "standard_bookshelf":      { plausibility: 1, allure: -1, note: "Expected, but one of many — less enticing." },
                             "lesser_bookshelf_small":  { plausibility: 1, allure: -1, note: "Blends into the stacks." },
                             "minor_book":              { plausibility: 1, note: "Books are everywhere here." },
                             "standard_writing_desk":   { plausibility: 1, allure: 1, note: "A scholar's desk in a library is perfectly placed." } },
    "Alchemy Lab":         { "minor_teapot":            { plausibility: 1, note: "Vessels are normal in a lab." },
                             "minor_goblet":            { plausibility: 1, note: "Beakers and goblets go unquestioned." },
                             "lesser_chest":            { plausibility: -1, note: "A treasure chest in a lab is odd." } },
    "Vault":               { "lesser_chest":            { plausibility: 1, allure: 1, note: "Chests are exactly what you'd expect in a vault." },
                             "grand_vault":             { plausibility: 1, allure: 1, note: "A vault within a vault — perfectly natural." },
                             "standard_bookshelf":      { plausibility: -1, note: "Books don't belong in a vault." } },
  },
  // ── Haunted Inn · all mimics · wearable forms: Minor–Apex ──
  haunted_inn: {
    "Cellar":              { "lesser_barrel":           { plausibility: 1, allure: 1, note: "Barrels are the natural currency of cellars." },
                             "lesser_rum_cask":         { plausibility: 1, allure: 2, note: "Rum Barrels are particularly loved." },
                             "lesser_crate":            { plausibility: 1, note: "Crates are expected down here." },
                             "lesser_chest":            { plausibility: 1, note: "A storage chest fits in a cellar." },
                             "standard_bookshelf":      { plausibility: -2, note: "Books in a cellar? Deeply suspicious." } },
    "Common Room":         { "lesser_chair":            { plausibility: 1, note: "Chairs are at home in a common room." },
                             "standard_grand_chair":    { plausibility: -1, note: "A grand throne-chair looks out of place at an inn." },
                             "standard_dining_table":   { plausibility: 1, note: "Tables belong in common rooms." },
                             "grand_antler_chandelier": { plausibility: 1, allure: 1, note: "A hunting-lodge chandelier suits a roadside inn." },
                             "grand_chandelier":        { plausibility: -1, note: "Crystal finery at a roadside inn? Someone would have stolen it by now." } },
    "Guest Rooms":         { "greater_bed":             { plausibility: 1, note: "A bed in a guest room is expected." },
                             "standard_wardrobe":       { plausibility: 1, note: "Wardrobes fit in guest rooms." },
                             "lesser_chest":            { plausibility: 1, note: "Chests are common in guest rooms." } },
  },
  // ── Cursed Chapel · all mimics · wearable forms: Minor–Apex ──
  cursed_chapel: {
    "Nave":                { "greater_statue":          { plausibility: 1, allure: 1, note: "Religious statues belong in a nave." },
                             "lesser_statuette":        { plausibility: 1, note: "Statuettes fit in chapels." },
                             "lesser_chest":            { plausibility: -1, note: "A treasure chest in the nave seems wrong." } },
    "Crypt":               { "lesser_chest":            { plausibility: 1, note: "Crypts sometimes hold burial chests." },
                             "grand_vault":             { plausibility: 1, note: "A sealed vault in a crypt is not unusual." },
                             "greater_statue":          { plausibility: 1, note: "Funerary statues are expected in crypts." } },
    "Vestry":              { "minor_jewelry_box":       { plausibility: 1, allure: 1, note: "Reliquary boxes are kept in vestries." },
                             "minor_candlestick":       { plausibility: 1, note: "Candlesticks belong in vestries." } },
  },
  // ── Noble Estate · all mimics · wearable forms: Minor–Apex ──
  noble_estate: {
    "Dining Room":         { "standard_dining_table":   { plausibility: 1, note: "A dining table in a dining room. Natural." },
                             "lesser_chair":            { plausibility: 1, note: "Chairs around a dining table." },
                             "standard_bookshelf":      { plausibility: -1, note: "Bookshelves don't belong at dinner." } },
    "Study":               { "standard_writing_desk":   { plausibility: 1, allure: 1, note: "A writing desk in a study is exactly right." },
                             "standard_bookshelf":      { plausibility: 1, allure: 1, note: "One bookshelf in a private study is perfectly placed — and enticing." },
                             "lesser_bookshelf_small":  { plausibility: 1, allure: 1, note: "A small bookshelf fits a private study well." },
                             "minor_book":              { plausibility: 1, note: "Books are at home in a study." } },
    "Armory":              { "lesser_chest":            { plausibility: 1, note: "Armories often have storage chests." },
                             "lesser_crate":            { plausibility: 1, note: "Equipment crates are normal in armories." },
                             "greater_throne":          { plausibility: -2, note: "A throne in an armory is deeply suspicious." } },
  },
  // ── Hidden Grove · Grand+ mimics · wearable forms: Greater–Apex (Standard with Thimblewood) ──
  hidden_grove: {
    "Ancient Altar":       { "greater_statue":          { plausibility: 1, note: "Old forest altars are often watched over by weathered statues." } },
    "Forest Path":         { "apex_abandoned_cottage":  { plausibility: 1, note: "An abandoned cottage lost to the woods." } },
    "Collapsed Shrine":    { "apex_chapel":             { plausibility: -1, note: "An intact chapel among the ruins raises questions." },
                             "apex_cathedral":          { plausibility: -2, note: "A whole cathedral where only rubble should be?" } },
    "Grove Clearing":      { "grand_chandelier":        { plausibility: -2, note: "A chandelier hanging from… nothing." },
                             "grand_antler_chandelier": { plausibility: -2, note: "Antlers belong on stags out here, not hanging from the sky." },
                             "standard_wardrobe":       { plausibility: -2, note: "A wardrobe standing alone in a forest clearing." } },
    "Old Well":            { "greater_wall":            { plausibility: 1, note: "Old well-stones are easy to mistake for a stretch of wall." } },
  },
  // ── Country Road & Waystation · Grand+ mimics · wearable forms: Greater–Apex (Standard with Thimblewood) ──
  country_road: {
    "Road West":           { "grand_carriage":          { plausibility: 1, allure: 1, note: "A stopped carriage on the road draws curious travelers." },
                             "standard_door":           { plausibility: -2, note: "A door with no house." } },
    "Road East":           { "grand_carriage":          { plausibility: 1, allure: 1, note: "A stopped carriage on the road draws curious travelers." },
                             "standard_door":           { plausibility: -2, note: "A door with no house." } },
    "Waystation Building": { "greater_bed":             { plausibility: 1, note: "Waystations keep a bed or two for travelers." },
                             "greater_throne":          { plausibility: -2, note: "A throne in a roadside waystation?" },
                             "standard_dining_table":   { plausibility: 1, note: "Travelers eat at the waystation's table." },
                             "standard_grand_chair":    { plausibility: -1, note: "Far too grand for a roadside waystation." } },
    "Side Path":           { "grand_small_outhouse":    { plausibility: 1, note: "An outhouse just off the path is exactly where you'd expect one." } },
    "Ditch & Hedgerow":    { "greater_wall":            { plausibility: 1, note: "Old field walls run along every hedgerow." },
                             "greater_piano":           { plausibility: -2, note: "Nobody leaves a piano in a ditch." } },
  },
  // ── The Crossroads · Grand+ mimics · wearable forms: Greater–Apex (Standard with Thimblewood) ──
  crossroads: {
    "Centre Stone":        { "greater_statue":          { plausibility: 1, note: "Crossroads are often marked with a statue or shrine." },
                             "standard_door":           { plausibility: -2, note: "A door standing in the middle of a crossroads." } },
    "North Road":          { "grand_carriage":          { plausibility: 1, note: "Carriages pass through every crossroads." },
                             "standard_door":           { plausibility: -2, note: "A door standing in the middle of a crossroads." } },
    "South Road":          { "grand_carriage":          { plausibility: 1, note: "Carriages pass through every crossroads." },
                             "standard_door":           { plausibility: -2, note: "A door standing in the middle of a crossroads." } },
    "East Road":           { "grand_carriage":          { plausibility: 1, note: "Carriages pass through every crossroads." },
                             "standard_door":           { plausibility: -2, note: "A door standing in the middle of a crossroads." } },
    "West Road":           { "grand_carriage":          { plausibility: 1, note: "Carriages pass through every crossroads." },
                             "standard_door":           { plausibility: -2, note: "A door standing in the middle of a crossroads." } },
    "Hanging Tree":        { "greater_gargoyle":        { plausibility: -1, note: "A gargoyle with no building to guard looks wrong out here." } },
  },
  // ── Ruined Watermill · Grand+ mimics · wearable forms: Greater–Apex (Standard with Thimblewood) ──
  ruined_mill: {
    "Smuggler's Cellar":   { "grand_vault":             { plausibility: 1, allure: 1, note: "A smuggler's stash — of course there's a vault down here." } },
    "Mill House":          { "greater_bed":             { plausibility: 1, note: "The miller had to sleep somewhere." },
                             "grand_personal_library":  { plausibility: -1, note: "A scholar's library in a mill house is out of place." },
                             "standard_dining_table":   { plausibility: 1, note: "The miller's family table." },
                             "standard_writing_desk":   { plausibility: 1, note: "Where the miller kept the ledgers." } },
    "River Crossing":      { "grand_carriage":          { plausibility: 1, note: "Carriages wait at the crossing for the ford to clear." } },
    "Grain Storage":       { "standard_wardrobe":       { plausibility: -1, note: "A wardrobe in the grain store is out of place." } },
  },
  // ── Border Guardhouse · Apex mimics only, mass 33+ · wearable forms: Grand–Apex (Greater with Thimblewood) ──
  border_guardhouse: {
    "Gate Arch":           { "apex_castle_gate":        { plausibility: 1, note: "A border post's gate is expected to be heavy and fortified." } },
    "Storeroom":           { "grand_vault":             { plausibility: 1, note: "Guardhouses lock away seized goods." } },
    "Stable Yard":         { "grand_carriage":          { plausibility: 1, note: "Carriages are inspected in the stable yard." } },
    "Barracks":            { "greater_bed":             { plausibility: 1, note: "Barracks are full of beds." } },
    "Guard Room":          { "greater_wall":            { plausibility: 1, note: "Just another stretch of guardhouse wall." } },
  },
  // ── Ruined City Quarter · Apex mimics only, mass 30+ · wearable forms: Grand–Apex (Greater with Thimblewood) ──
  ruined_city: {
    "Market Square":       { "grand_carriage":          { plausibility: 1, note: "Abandoned carts and carriages litter the old market." },
                             "greater_statue":          { plausibility: 1, note: "A market square's old statue." } },
    "Merchant Row":        { "grand_vault":             { plausibility: 1, allure: 1, note: "Merchant houses kept their strongrooms — and someone may have left something." } },
    "Collapsed Temple":    { "apex_chapel":             { plausibility: -1, note: "Too intact for a collapsed temple." },
                             "apex_cathedral":          { plausibility: -2, note: "A whole cathedral standing in the rubble of a temple?" },
                             "greater_statue":          { plausibility: 1, note: "Temple statues still stand among the rubble." },
                             "greater_gargoyle":        { plausibility: 1, note: "Fallen gargoyles litter the temple ruins." } },
    "City Gate":           { "apex_castle_gate":        { plausibility: 1, note: "A great gate is exactly what a city gate should be." } },
  },
  // ── Abandoned Castle · Apex mimics only, mass 35+ · wearable forms: Grand–Apex (Greater with Thimblewood) ──
  abandoned_castle: {
    "Great Hall":          { "grand_chandelier":        { plausibility: 1, note: "Every great hall had its chandelier." },
                             "grand_antler_chandelier": { plausibility: 1, note: "Castle halls were fond of hunting trophies." },
                             "giant_throne":            { plausibility: -2, note: "This throne was built for something much larger than any lord." },
                             "greater_throne":          { plausibility: 1, note: "The lord's throne, still in its hall." },
                             "greater_statue":          { plausibility: 1, note: "Great halls were lined with statues." } },
    "Courtyard":           { "grand_carriage":          { plausibility: 1, note: "Carriages pull into the courtyard." },
                             "greater_statue":          { plausibility: 1, note: "A statue in the castle courtyard." } },
    "Dungeon":             { "grand_chandelier":        { plausibility: -2, note: "A chandelier in the dungeon?" },
                             "greater_throne":          { plausibility: -2, note: "A throne...in the dungeon." },
                             "giant_throne":            { plausibility: -2, note: "A throne in the dungeon — and a giant one at that." } },
    "Lord's Chamber":      { "greater_bed":             { plausibility: 1, note: "The lord's own bed." } },
  },
  // ── Giant's Castle · Apex mimics only, mass 28+ · wearable forms: Grand–Apex (Greater with Thimblewood) ──
  giants_castle: {
    "Great Hall":          { "giant_throne":            { plausibility: 2, allure: 1, note: "The giant's throne, right where it belongs." },
                             "grand_chandelier":        { plausibility: -1, note: "Comically small for a giant's hall." },
                             "greater_throne":          { plausibility: -1, note: "A human-sized throne in a giant's hall is an ornament at best." } },
    "Giant's Kitchen":     { "giant_barrel":            { plausibility: 1, note: "A giant's kitchen needs giant barrels." },
                             "giant_goblet":            { plausibility: 1, note: "Giant goblets sit by the giant's hearth." } },
    "Treasury Vault":      { "giant_chest":             { plausibility: 1, allure: 1, note: "The treasury is full of chests this size." } },
    "Sleeping Quarters":   { "giant_bed":               { plausibility: 1, note: "The giant's own bed." },
                             "giant_pillow":            { plausibility: 1, note: "Pillows heaped on the giant's bed." },
                             "greater_bed":             { plausibility: -1, note: "A doll-sized bed in a giant's bedroom." } },
    "Goose Chamber":       { "giant_pillow":            { plausibility: 1, note: "Stuffed with the geese's own down." } },
  },
  // ── Cloud Kingdom Outpost · Apex mimics only, mass 38+ · wearable forms: Grand–Apex (Greater with Thimblewood) ──
  cloud_kingdom: {
    "Storm Throne Room":   { "giant_throne":            { plausibility: 2, note: "The storm lord's seat." },
                             "greater_throne":          { plausibility: -1, note: "Far too small for a storm lord." } },
    "Giant's Larder":      { "giant_barrel":            { plausibility: 1, note: "Larders are lined with barrels this size." },
                             "giant_goblet":            { plausibility: 1, note: "Giant goblets stacked for the next feast." } },
    "High Nest":           { "giant_pillow":            { plausibility: 1, note: "Soft enough to be part of the nest." } },
    "Beanstalk Landing":   { "apex_abandoned_cottage":  { plausibility: -2, note: "A cottage on a cloud landing makes no sense at all." } },
  },
  // ── Lonely Moor Shelter · Apex mimics only · wearable forms: Grand–Apex (Greater with Thimblewood) ──
  lonely_moor: {
    "Bothy Interior":      { "giant_bed":               { plausibility: -2, note: "A giant's bed in a one-room bothy?" },
                             "giant_throne":            { plausibility: -2, note: "There's barely room to stand, let alone for a throne." },
                             "greater_bed":             { plausibility: 1, note: "A simple bed in the bothy." } },
    "Standing Stones":     { "apex_castle_gate":        { plausibility: -2, note: "A castle gate among the standing stones, with no castle?" },
                             "apex_chapel":             { plausibility: -1, note: "The old stones predate any chapel." },
                             "greater_statue":          { plausibility: 1, note: "One more stone among the stones." },
                             "greater_gargoyle":        { plausibility: -1, note: "A carved gargoyle among the ancient stones looks wrong." } },
  },
  // ── The Hollow Reliquary · Standard+ mimics · wearable forms: Lesser–Apex (Minor with Thimblewood) ──
  hollow_reliquary: {
    "Reliquary Vault":     { "lesser_reliquary":        { plausibility: 2, allure: 1, note: "Exactly what the vault was built to hold." },
                             "lesser_chest":            { plausibility: 1, note: "Offerings are stored in chests here." },
                             "lesser_herbalists_chest": { plausibility: -1, note: "An herbalist's chest has no place among holy relics." },
                             "minor_jewelry_box":       { plausibility: 1, note: "Offerings of jewelry are kept with the relics." },
                             "minor_music_box":         { plausibility: -1, note: "A music box among the holy relics is in poor taste." } },
    "Candle Gallery":      { "lesser_painting":         { plausibility: 1, note: "Devotional paintings line the gallery." },
                             "lesser_statuette":        { plausibility: 1, note: "Small saints stand among the candles." },
                             "lesser_haunted_portrait": { plausibility: -1, note: "The pilgrims would notice its eyes." },
                             "minor_candlestick":       { plausibility: 2, allure: -1, note: "Just one more candle among hundreds — nobody looks twice at it." } },
    "Pilgrims' Dormitory": { "greater_bed":             { plausibility: 1, note: "Pilgrims need beds." },
                             "lesser_chair":            { plausibility: 1, note: "Plain chairs for weary pilgrims." },
                             "lesser_bookshelf_small":  { plausibility: 1, note: "Prayer books are kept here." },
                             "minor_book":              { plausibility: 1, note: "Pilgrims carry prayer books." },
                             "minor_pillow":            { plausibility: 1, note: "A pilgrim's pillow on a dormitory cot." },
                             "minor_teapot":            { plausibility: 1, note: "Someone always has a pot of tea on for the travelers." } },
    "Ossuary":             { "greater_statue":          { plausibility: 1, note: "Stone saints watch over the bones." },
                             "greater_gargoyle":        { plausibility: 1, note: "Grotesques guard the ossuary." },
                             "lesser_haunted_portrait": { plausibility: 1, note: "Among all these bones, a staring portrait fits right in." },
                             "lesser_reliquary":        { plausibility: 1, note: "Relics are often kept with the bones." } },
    "Bell Loft":           { "standard_wardrobe":       { plausibility: -2, note: "How would anyone get a wardrobe up into the bell loft?" } },
    "Nave":                { "minor_goblet":            { plausibility: 1, note: "A communion chalice belongs in the nave." },
                             "minor_grimoire":          { plausibility: -2, note: "A whispering book in the nave? Someone will want it burned." } },
  },
  // ── The Mimic Nest · Greater+ mimics · wearable forms: Standard–Apex (Lesser with Thimblewood) ──
  mimic_nest: {
    "Foreman's Office":    { "standard_writing_desk":   { plausibility: 1, note: "The foreman's desk." },
                             "standard_grand_chair":    { plausibility: -1, note: "Far too grand for a warehouse office." },
                             "lesser_chair":            { plausibility: 1, note: "The foreman's chair." },
                             "lesser_bookshelf_small":  { plausibility: 1, note: "Ledgers and manifests on a small shelf." } },
    "Bonded Vault":        { "grand_vault":             { plausibility: 2, note: "A bonded vault is exactly what this room is." } },
    "Loading Dock":        { "grand_carriage":          { plausibility: 1, note: "Carts and carriages wait at the dock to be loaded." },
                             "lesser_crate":            { plausibility: 1, note: "Crates waiting to be loaded." },
                             "lesser_barrel":           { plausibility: 1, note: "Barrels rolled off the ships." },
                             "lesser_rum_cask":         { plausibility: 1, note: "Rum comes in off the docks by the cask." } },
    "Rope Loft":           { "greater_piano":           { plausibility: -2, note: "Nobody hauls a piano up into the rope loft." } },
    "Crate Stacks":        { "lesser_crate":            { plausibility: 1, note: "One plain crate among hundreds." },
                             "lesser_barrel":           { plausibility: 1, note: "Barrels are stacked with the crates." },
                             "lesser_chest":            { plausibility: -1, note: "In a mimic nest, the hunters open every chest first." } },
    "Cold Storage":        { "lesser_barrel":           { plausibility: 1, note: "Barrels of salted goods are kept cold." },
                             "lesser_crate":            { plausibility: 1, note: "Crates of perishables line the cold room." } },
  },
  // ── The Sinking Ship · Lesser+ mimics · wearable forms: Minor–Apex ──
  sinking_ship: {
    "Cargo Hold":          { "lesser_barrel":           { plausibility: 1, note: "The hold is full of barrels." },
                             "lesser_crate":            { plausibility: 1, note: "Cargo crates, lashed down." },
                             "lesser_chest":            { plausibility: 1, note: "Sea chests stowed in the hold." },
                             "lesser_rum_cask":         { plausibility: 2, allure: 1, note: "The rum! Every sailor knows where it's kept." } },
    "Captain's Cabin":     { "lesser_chest":            { plausibility: 1, allure: 1, note: "The captain's own sea chest — surely there's something in it." },
                             "standard_writing_desk":   { plausibility: 1, note: "The captain keeps the log at this desk." },
                             "minor_book":              { plausibility: 1, note: "Charts and logbooks fill the cabin." } },
    "Galley":              { "minor_teapot":            { plausibility: 1, note: "The cook always has a pot on." },
                             "minor_goblet":            { plausibility: 1, note: "Cups and goblets rattle in the galley." },
                             "lesser_barrel":           { plausibility: 1, note: "Water and salt-pork barrels." },
                             "lesser_rum_cask":         { plausibility: 1, note: "The cook's own ration of rum." } },
    "Main Deck":           { "lesser_barrel":           { plausibility: 1, note: "Barrels lashed to the deck." },
                             "lesser_crate":            { plausibility: 1, note: "Cargo waiting to go below." },
                             "standard_wardrobe":       { plausibility: -2, note: "A wardrobe on the open deck?" } },
    "Bilge":               { "minor_pillow":            { plausibility: -2, note: "Nothing soft survives the bilge." },
                             "minor_book":              { plausibility: -2, note: "Soaked through — no book would be left down here." } },
  },
};
