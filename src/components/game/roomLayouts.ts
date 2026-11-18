// ============================================================
// MANSIONS & MIMICS — Room layouts
// Where each location's rooms sit on the hunt's floor plan (see RoomMap). Positions are
// [column, row] on a small grid. Connected rooms placed side by side get a door between
// them; a connection between rooms that aren't side by side is shown as stairs instead.
// ============================================================
import type { HuntLocation, LocationId, RoomName, RoomOf } from "./locationData";

type Cell = readonly [col: number, row: number];

/** Every room of every location needs a cell (checked by the type). */
const ROOM_LAYOUTS: { readonly [L in LocationId]: Readonly<Record<RoomOf<L>, Cell>> } = {
  manor: { "Grand Foyer": [0, 0], "Trophy Hall": [1, 0], "Drawing Room": [0, 1], "Master Bedroom": [1, 1], "Library": [0, 2], "Wine Cellar": [1, 2] },
  wizard_tower: { "Entrance Hall": [0, 0], "Observation Deck": [1, 0], "Alchemy Lab": [0, 1], "Arcane Library": [1, 1], "Vault": [0, 2], "Summoning Chamber": [1, 2] },
  haunted_inn: { "Guest Rooms": [0, 0], "Innkeeper's Quarters": [1, 0], "Common Room": [0, 1], "Kitchen": [1, 1], "Stable": [0, 2], "Cellar": [1, 2] },
  cursed_chapel: { "Cemetery": [0, 0], "Bell Tower": [1, 0], "Narthex": [0, 1], "Nave": [1, 1], "Crypt": [0, 2], "Vestry": [1, 2] },
  noble_estate: { "Dining Room": [0, 0], "Study": [1, 0], "Entrance Hall": [0, 1], "Armory": [1, 1], "Gardens": [0, 2], "Secret Passage": [1, 2] },
  hidden_grove: { "Ancient Altar": [0, 0], "Collapsed Shrine": [1, 0], "Grove Clearing": [0, 1], "Forest Path": [1, 1], "Streamside Bank": [0, 2], "Old Well": [1, 2] },
  country_road: { "Waystation Building": [1, 0], "Road West": [0, 1], "Milestone Stone": [1, 1], "Road East": [2, 1], "Side Path": [0, 2], "Ditch & Hedgerow": [1, 2] },
  crossroads: { "Hanging Tree": [0, 0], "North Road": [1, 0], "West Road": [0, 1], "Centre Stone": [1, 1], "East Road": [2, 1], "South Road": [1, 2] },
  ruined_mill: { "Millpond Bank": [0, 0], "River Crossing": [1, 0], "Mill House": [0, 1], "Grain Storage": [1, 1], "Overgrown Track": [0, 2], "Smuggler's Cellar": [1, 2] },
  border_guardhouse: { "Stable Yard": [0, 0], "Watch Tower": [1, 0], "Gate Arch": [0, 1], "Guard Room": [1, 1], "Storeroom": [0, 2], "Barracks": [1, 2] },
  ruined_city: { "Guard Tower Ruin": [0, 0], "Merchant Row": [1, 0], "City Gate": [0, 1], "Market Square": [1, 1], "Sewer Entrance": [0, 2], "Collapsed Temple": [1, 2] },
  abandoned_castle: { "Battlements": [0, 0], "Lord's Chamber": [1, 0], "Courtyard": [0, 1], "Great Hall": [1, 1], "Gatehouse": [0, 2], "Dungeon": [1, 2] },
  giants_castle: { "Cloud Battlement": [0, 0], "Goose Chamber": [1, 0], "Great Hall": [0, 1], "Giant's Kitchen": [1, 1], "Treasury Vault": [0, 2], "Sleeping Quarters": [1, 2] },
  cloud_kingdom: { "High Nest": [0, 0], "Giant's Larder": [1, 0], "Beanstalk Landing": [0, 1], "Storm Throne Room": [1, 1], "Storm Battery": [0, 2], "Cloud Forge": [1, 2] },
  lonely_moor: { "Moorland Path North": [0, 0], "Bothy Interior": [1, 0], "Standing Stones": [0, 1], "Peat Stack": [1, 1], "Moorland Path South": [0, 2], "Boggy Hollow": [1, 2] },
  hollow_reliquary: { "Pilgrims' Dormitory": [0, 0], "Bell Loft": [1, 0], "Nave": [0, 1], "Candle Gallery": [1, 1], "Reliquary Vault": [0, 2], "Ossuary": [1, 2] },
  mimic_nest: { "Rope Loft": [1, 0], "Loading Dock": [0, 1], "Crate Stacks": [1, 1], "Foreman's Office": [0, 2], "Cold Storage": [1, 2], "Bonded Vault": [0, 3] },
  sinking_ship: { "Quarterdeck": [0, 0], "Captain's Cabin": [1, 0], "Main Deck": [0, 1], "Galley": [1, 1], "Cargo Hold": [0, 2], "Bilge": [1, 2] },
  // A loop of houses around the village green
  spell_or_sweet_street: {
    "Crooked House": [0, 0], "Empty Lot": [1, 0], "Baker's House": [2, 0],
    "Mayor's House": [0, 1], "Village Green": [1, 1], "Widow's Cottage": [2, 1],
    "Candlemaker's House": [0, 2], "Pumpkin Farmhouse": [1, 2], "Doctor's House": [2, 2],
  },
  founders_fair: { "Town Gate": [0, 0], "Ale Stall": [1, 0], "Village Green": [0, 1], "Bandstand": [1, 1], "Pie-Judging Tent": [0, 2], "Riverbank": [1, 2] },
  stargazers_hill: { "Observatory Dome": [0, 0], "Star-Chart Room": [1, 0], "Stair Hall": [0, 1], "Lens Workshop": [1, 1], "Hilltop Lawn": [0, 2], "Stone Circle": [1, 2] },
  snowbound_lodge: { "Bunk Loft": [0, 0], "Kitchen & Larder": [1, 0], "Great Hearth": [0, 1], "Boot Room": [1, 1], "Woodshed": [0, 2], "Snowed-In Courtyard": [1, 2] },
};

export interface RoomCell {
  room: RoomName;
  col: number;
  row: number;
  /** A door to the room on the right / below. */
  doorRight: boolean;
  doorDown: boolean;
  /** Connected rooms that aren't next to this one on the grid. */
  stairsTo: RoomName[];
}

export interface FloorPlan {
  cols: number;
  rows: number;
  cells: RoomCell[];
}

/** The floor plan for a location: each room's cell, its doors, and any stairs. */
export function floorPlan(location: HuntLocation): FloorPlan {
  const layout = ROOM_LAYOUTS[location.id] as Readonly<Partial<Record<RoomName, Cell>>>;
  const at = (room: RoomName) => layout[room] ?? ([0, 0] as const);
  const connected = (a: RoomName, b: RoomName) => location.roomGraph[a]?.includes(b) ?? false;
  const roomAt = (col: number, row: number) => location.rooms.find(r => at(r)[0] === col && at(r)[1] === row);
  const cells = location.rooms.map((room): RoomCell => {
    const [col, row] = at(room);
    const right = roomAt(col + 1, row);
    const below = roomAt(col, row + 1);
    const stairsTo = (location.roomGraph[room] ?? []).filter(other => {
      const [c, r] = at(other);
      return Math.abs(c - col) + Math.abs(r - row) !== 1;
    });
    return {
      room, col, row,
      doorRight: !!right && connected(room, right),
      doorDown: !!below && connected(room, below),
      stairsTo,
    };
  });
  return {
    cols: Math.max(...cells.map(c => c.col)) + 1,
    rows: Math.max(...cells.map(c => c.row)) + 1,
    cells,
  };
}
