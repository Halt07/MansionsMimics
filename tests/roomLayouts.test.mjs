// Room layouts: every location's floor plan has one cell per room and shows every connection.
import { readFileSync } from 'node:fs';
export default async function ({ gameData: m, ok }) {
  const problems = [];
  const withStairs = [];
  for (const loc of m.LOCATIONS) {
    const plan = m.floorPlan(loc);
    const cells = new Set(plan.cells.map((c) => `${c.col},${c.row}`));
    if (cells.size !== loc.rooms.length) problems.push(`${loc.id}: two rooms share a cell`);
    if (plan.cols > 3) problems.push(`${loc.id}: ${plan.cols} columns is too wide for the side panel`);

    // Doors only between connected rooms
    const byCell = new Map(plan.cells.map((c) => [`${c.col},${c.row}`, c.room]));
    for (const c of plan.cells) {
      const right = byCell.get(`${c.col + 1},${c.row}`);
      const below = byCell.get(`${c.col},${c.row + 1}`);
      if (c.doorRight && !loc.roomGraph[c.room]?.includes(right)) problems.push(`${loc.id}: door from ${c.room} to an unconnected room`);
      if (c.doorDown && !loc.roomGraph[c.room]?.includes(below)) problems.push(`${loc.id}: door from ${c.room} to an unconnected room`);
    }

    // Every connection is a door or stairs (seen from both rooms)
    const door = (a, b) => plan.cells.some((c) =>
      (c.room === a || c.room === b) && ((c.doorRight && [a, b].includes(byCell.get(`${c.col + 1},${c.row}`))) || (c.doorDown && [a, b].includes(byCell.get(`${c.col},${c.row + 1}`)))));
    for (const c of plan.cells) {
      for (const other of loc.roomGraph[c.room] ?? []) {
        const stairs = c.stairsTo.includes(other);
        if (!door(c.room, other) && !stairs) problems.push(`${loc.id}: ${c.room} → ${other} isn't shown`);
        if (stairs) withStairs.push(loc.id);
      }
    }
  }
  ok(problems.length === 0, `floor plans are consistent${problems.length ? ` — ${problems.join('; ')}` : ''}`);
  // Only rooms in a loop of odd length can't all be placed side by side on a grid
  const stairLocations = [...new Set(withStairs)].sort().join(', ');
  ok(stairLocations === 'noble_estate, wizard_tower', `stairs only where a grid can't fit the rooms (${stairLocations})`);

  // Every adventurer and companion type gets its own marker colour on the map (index.css)
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const types = new Set(m.ADVENTURER_TEMPLATES.flatMap((t) => [t.type, ...(t.companion?.options.map((o) => o.type) ?? [])]));
  for (const t of m.ADVENTURER_TYPES) types.add(t);
  const uncoloured = [...types].filter((t) => !css.includes(`.occupant-adventurer[data-type="${t}"]`));
  ok(uncoloured.length === 0, `every adventurer type has a map colour${uncoloured.length ? ` — missing: ${uncoloured.join(', ')}` : ''}`);
}
