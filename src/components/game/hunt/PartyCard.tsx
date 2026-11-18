import { FROST_WARNING, distractedRooms, getRoomDistance, isTheRealThing, uneatenFrozen, type HuntLocation, type RoomName } from "../gameData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RoomMap from "../RoomMap";
import { useHunt, type HuntState } from "./HuntContext";

/** The hunt, once there's a location and a room. */
type ViewProps = HuntState & { location: HuntLocation; mimicRoom: RoomName };

/** The party as a list (where everyone is, how far, their state) or as the room map. One card, click to switch. */
export default function PartyCard({ onToggle }: { onToggle: () => void }) {
  const hunt = useHunt();
  const { location, mimicRoom, party, activeAdventurers, character } = hunt;
  if (!location || !mimicRoom) return null;
  const props: ViewProps = { ...hunt, location, mimicRoom };
  const showMap = character.sidebarView === "map";
  const consumed = party.filter(a => a.isConsumed).length;
  const counts = `(${activeAdventurers.length} active / ${consumed} consumed)`;
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={showMap ? "Show the party list" : "Show the room map"}
      onClick={onToggle}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
      }}
      className={"sidebar-view-card bg-card border-border fx-shake"}
    >
      <CardHeader className={`${showMap ? "pb-2" : "pb-1"} pt-3 px-4`}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xs font-cinzel text-muted-foreground uppercase tracking-wide">
            {showMap ? <>{location.name} <span className="normal-case tracking-normal">{counts}</span></> : <>Party {counts}</>}
          </CardTitle>
          {showMap
            ? <span className="view-toggle-icon" aria-hidden>Aa</span>
            : <span className="view-toggle-icon view-toggle-map" aria-hidden><i /><i /><i /><i /><i /><i /></span>}
        </div>
      </CardHeader>
      {showMap ? <MapView {...props} /> : <ListView {...props} />}
    </Card>
  );
}

function MapView({ location, mimicRoom, lureRange, activeAdventurers, creatures, rivals, party, starFragment, fireworksRoom, activeForm }: ViewProps) {
  return (
    <CardContent className="px-4 pb-4">
      <RoomMap
        location={location}
        mimicRoom={mimicRoom}
        lureRange={lureRange}
        adventurers={activeAdventurers}
        creatures={creatures.filter(c => !c.isConsumed)}
        rivals={rivals}
        frozen={uneatenFrozen(party)}
        distracted={location.fireworks && fireworksRoom ? distractedRooms(location, fireworksRoom) : []}
        markers={[
          ...(location.starfall && starFragment ? [{ room: starFragment, icon: "🌠", title: "A fallen star fragment" }] : []),
          ...(location.fireworks && fireworksRoom ? [{ room: fireworksRoom, icon: "🎆", title: "Fireworks overhead: everyone here and next door is looking up" }] : []),
        ]}
        formName={activeForm?.name}
      />
    </CardContent>
  );
}

function ListView({ location, mimicRoom, party, lureRange }: ViewProps) {
  return (
    <CardContent className="px-4 pb-3 space-y-2">
      {party.map(adv => {
        const dist = adv.isAlive && !adv.isConsumed ? getRoomDistance(location, mimicRoom, adv.location) : null;
        const inRange = dist !== null && dist <= lureRange;
        const fled = adv.fled && !adv.isConsumed;
        const disappeared = adv.isDisappeared && !adv.isConsumed;
        const frozen = adv.isFrozen && !adv.isConsumed;
        const maxHits = adv.constitution || 3;
        return (
          <div key={adv.id} className={`text-xs flex items-center justify-between ${adv.isConsumed || fled || disappeared ? "opacity-40" : ""}`}>
            <span className={
              adv.isConsumed ? "line-through text-muted-foreground" :
              fled ? "text-muted-foreground italic" :
              disappeared ? "text-purple-400/60 italic" :
              frozen ? "text-sky-300/80 italic" :
              adv.isAttracted ? "text-yellow-400" : "text-foreground"
            }>
              {adv.isConsumed && isTheRealThing(adv) ? `${adv.name} (a real one!)`
                : adv.isConsumed && adv.trueName ? `${adv.trueName} (the ${adv.costume})` : adv.name}
            </span>
            <div className="flex items-center gap-1">
              {fled && <span className="text-[10px] text-muted-foreground">Fled</span>}
              {disappeared && <span className="text-[10px] text-purple-400/60">Disappeared</span>}
              {frozen && <span title={adv.location} className="text-[10px] text-sky-300/80">🧊 Frozen · {adv.location}</span>}
              {adv.warmth !== undefined && adv.isAlive && !adv.isConsumed && (
                <span
                  title={`Warmth ${adv.warmth}/${adv.maxWarmth ?? adv.warmth}: freezes at 0`}
                  className={`text-[10px] whitespace-nowrap ${adv.warmth <= FROST_WARNING ? "text-sky-300" : "text-muted-foreground"}`}
                >
                  ❄️ {adv.warmth}
                </span>
              )}
              {adv.isConsumed && <span className="text-[10px] text-muted-foreground">Consumed</span>}
              {adv.isAttracted && !adv.isConsumed && (
                <Badge className="text-[10px] bg-yellow-400/10 text-yellow-400 border-yellow-400/20 border px-1 py-0">Attracted</Badge>
              )}
              {(adv.hitsTaken ?? 0) > 0 && !adv.isConsumed && !fled && (
                <span className="text-[10px] text-destructive/70">{maxHits - (adv.hitsTaken ?? 0)}/{maxHits}hp</span>
              )}
              {dist !== null && (
                <span title={adv.location} className={`text-[10px] whitespace-nowrap ${inRange ? "text-green-400/80" : "text-muted-foreground"}`}>
                  <span className="inline-block max-w-[6.5rem] truncate align-bottom">{adv.location}</span> ({dist})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </CardContent>
  );
}
