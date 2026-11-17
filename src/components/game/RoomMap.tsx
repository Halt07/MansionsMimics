import {
  creatureEmoji, floorPlan, getRoomDistance, RIVAL_STATS,
  type HuntLocation, type PartyMember, type RivalMimic, type RoomName,
} from "./gameData";

interface RoomMapProps {
  location: HuntLocation;
  /** Where the mimic is. Leave out (with everything below) for a bare floor plan, as in the Codex. */
  mimicRoom?: RoomName | null;
  /** How many rooms away the mimic's lure reaches. */
  lureRange?: number;
  /** Adventurers still in the hunt. */
  adventurers?: readonly PartyMember[];
  /** Small creatures still about. */
  creatures?: readonly { uid: string; name: string; location: RoomName }[];
  rivals?: readonly RivalMimic[];
  /** Adventurers frozen solid (snowbound locations), still waiting to be eaten. */
  frozen?: readonly { id: string; name: string; location: RoomName }[];
  /** Where a fallen star fragment lies (Stargazers' Hill). */
  star?: RoomName | null;
  /** The mimic's current form, for its marker's tooltip. */
  formName?: string;
}

/** Up to two letters for an adventurer's marker: "Mimic Hunter" → "MH", "Monk" → "Mo". */
function initials(name: string): string {
  const words = name.replace(/'s\b/g, "").split(/[\s-]+/).filter(w => /^[A-Z]/.test(w));
  if (words.length >= 2) return words[0][0] + words[1][0];
  return (words[0] ?? name).slice(0, 2);
}

/**
 * The hunt's floor plan: each room, with you, the adventurers, small creatures and any exposed
 * rival in it. Rooms within lure range are tinted. Layout comes from roomLayouts; all the
 * styling is under ROOM MAP in index.css, driven by the data attributes set here.
 */
export default function RoomMap({
  location, mimicRoom = null, lureRange = 0, adventurers = [], creatures = [], rivals = [], frozen = [], star = null, formName,
}: RoomMapProps) {
  const plan = floorPlan(location);
  return (
    <div className="room-map" style={{ gridTemplateColumns: `repeat(${plan.cols}, minmax(0, 1fr))` }}>
      {plan.cells.map(cell => {
        const here = cell.room === mimicRoom;
        const dist = mimicRoom ? getRoomDistance(location, mimicRoom, cell.room) : Infinity;
        const advs = adventurers.filter(a => a.location === cell.room);
        const crits = creatures.filter(c => c.location === cell.room);
        const rivalsHere = rivals.filter(r => r.room === cell.room && r.revealed && !r.consumed);
        return (
          <div
            key={cell.room}
            className="room-cell"
            style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1 }}
            data-here={here || undefined}
            data-in-range={(!here && dist <= lureRange) || undefined}
            data-door-right={cell.doorRight || undefined}
            data-door-down={cell.doorDown || undefined}
          >
            <p className="room-name">{cell.room}</p>
            <div className="room-occupants">
              {here && <span className="occupant occupant-you" title={formName ? `You (${formName})` : "You"}>You</span>}
              {rivalsHere.map(r => (
                <span key={r.id} className="occupant occupant-rival" title={RIVAL_STATS[r.kind].name}>🕸</span>
              ))}
              {advs.map(a => (
                <span
                  key={a.id}
                  className="occupant occupant-adventurer"
                  data-type={a.type}
                  data-attracted={a.isAttracted || undefined}
                  title={`${a.name} (${a.type})${a.isAttracted ? " — attracted" : ""}`}
                >
                  {initials(a.name)}
                </span>
              ))}
              {star === cell.room && <span className="occupant occupant-frozen" title="A fallen star fragment">🌠</span>}
              {frozen.filter(f => f.location === cell.room).map(f => (
                <span key={f.id} className="occupant occupant-frozen" title={`${f.name}, frozen solid`}>🧊</span>
              ))}
              {crits.map(c => (
                <span key={c.uid} className="occupant occupant-creature" title={c.name}>{creatureEmoji(c.name)}</span>
              ))}
            </div>
            {cell.stairsTo.length > 0 && (
              <p className="room-stairs" title={`Connects to ${cell.stairsTo.join(", ")}`}>⇅ {cell.stairsTo.join(", ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// A made-up floor plan for a place nobody has mapped: [col, row, door right, door down]
const MYSTERY_CELLS: readonly (readonly [number, number, boolean, boolean])[] = [
  [0, 0, true, false], [1, 0, false, true], [0, 1, false, true], [1, 1, false, false], [0, 2, true, false], [1, 2, false, false],
];

/** A fogged, unlabelled floor plan for a location the mimic hasn't hunted in yet. */
export function MysteryMap({ label = "Unmapped. Hunt here to learn its rooms." }: { label?: string }) {
  return (
    <div className="room-map room-map-mystery" role="img" aria-label={label} style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      {MYSTERY_CELLS.map(([col, row, right, down]) => (
        <div
          key={`${col}-${row}`}
          className="room-cell"
          style={{ gridColumn: col + 1, gridRow: row + 1 }}
          data-door-right={right || undefined}
          data-door-down={down || undefined}
        >
          <p className="room-name">?</p>
        </div>
      ))}
      <p className="room-map-mystery-label">{label}</p>
    </div>
  );
}
