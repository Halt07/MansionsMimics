import type { ReactNode } from "react";
import {
  ACTION_LIMIT, ACTION_WARNING, RIVAL_STATS, answersDoor, distractedRooms, fireworksRummage, housesAway, plural, stillInHunt, turnsUntil,
  type HuntLocation, type RoomName,
} from "@/data/gameData";
import { Card, CardContent } from "@/components/ui/card";
import { useHunt, type HuntState } from "./HuntContext";

/** The small status strip each location twist shows: a title line and a note under it. */
function Banner({ tone, title, children }: { tone: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className={`px-3 py-2 rounded border text-xs ${tone}`}>
      <span className="font-cinzel">{title}</span>
      {children}
    </div>
  );
}
const Note = ({ children }: { children: ReactNode }) => <p className="text-[11px] mt-0.5 opacity-80">{children}</p>;
const turns = (n: number) => `${n} ${plural(n, "turn")}`;

/** Each banner reads the hunt, at a location known to be set. */
type BannerProps = HuntState & { location: HuntLocation };

/**
 * The left column's hunt status strips, one per thing going on at this location: rival mimics,
 * the sinking ship, the door-to-door procession, fireworks, falling stars, the cold, and the
 * party getting restless. Only shown during a hunt.
 */
export default function LocationBanners() {
  const hunt = useHunt();
  const { location, huntOver, actionCount } = hunt;
  if (!location) return null;
  const props: BannerProps = { ...hunt, location };
  const live = !huntOver;
  const actionsLeft = ACTION_LIMIT - actionCount;
  return (
    <>
      {live && props.rivals.some(r => !r.consumed) && <RivalStatus {...props} />}
      {live && location.sinkingTurns && <SinkingBanner total={location.sinkingTurns} turn={props.huntTurn} />}
      {live && location.procession && props.mimicRoom && <ProcessionBanner {...props} mimicRoom={props.mimicRoom} />}
      {live && location.fireworks && <FireworksBanner {...props} />}
      {live && location.starfall && <StarfallBanner {...props} />}
      {live && location.snowbound && <SnowboundBanner {...props} />}
      {live && location.eruption && props.eruptionTurn === props.huntTurn + 1 && <EruptionBanner {...props} />}
      {live && location.tarPits && props.party.some(a => a.tarStuck !== undefined && stillInHunt(a)) && <TarBanner {...props} />}
      {/* The party gets bored and leaves (not when snowed in: the cold is the clock there) */}
      {!location.snowbound && actionsLeft <= ACTION_WARNING && (
        <Banner
          tone={actionsLeft <= ACTION_WARNING / 2 ? "border-destructive/40 bg-destructive/5 text-destructive/80" : "border-yellow-400/30 bg-yellow-400/5 text-yellow-400/80"}
          title={`⏳ ${actionsLeft} ${plural(actionsLeft, "action")} remaining`}
        >
          <p className="text-[11px] mt-0.5 opacity-70">The adventurers grow restless. Strike soon or they will leave.</p>
        </Banner>
      )}
    </>
  );
}

function RivalStatus({ location, rivals }: BannerProps) {
  const isNest = !!location.rivalNest;
  const remaining = rivals.filter(r => !r.consumed);
  const exposed = remaining.filter(r => r.revealed);
  const tracked = remaining.some(r => r.clueGiven && !r.revealed);
  const devoured = rivals.filter(r => r.consumed).length;
  const elder = remaining.find(r => r.kind === "elder");
  return (
    <Card className={`border ${exposed.length > 0 ? "border-orange-400/50 bg-orange-400/5" : "border-purple-400/20 bg-card"}`}>
      <CardContent className="p-3 space-y-1">
        <p className="font-cinzel text-xs text-orange-400/90">{isNest ? "🕸 The Nest" : "⚠ Rival Mimic"}</p>
        {isNest && (
          <p className="text-[11px] text-muted-foreground">
            Mimics devoured: {devoured}{elder && !elder.revealed ? " · The Elder still hides." : ""}
          </p>
        )}
        {exposed.map(r => (
          <p key={r.id} className="text-[11px] text-orange-400/80">
            {r.kind === "elder" ? "The Elder Mimic" : `A ${RIVAL_STATS[r.kind].name}`} is exposed in the <span className="font-bold">{r.room}</span>. Strike to devour it!
          </p>
        ))}
        {tracked && (
          <p className="text-[11px] text-muted-foreground italic">Something consumed one of the party. Track the predator — relocate to where they vanished.</p>
        )}
        {!tracked && exposed.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 italic">A presence lurks... Wait and observe.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SinkingBanner({ total, turn }: { total: number; turn: number }) {
  const left = total - turn;
  const urgent = left <= 3;
  return (
    <Banner
      tone={urgent ? "border-destructive/40 bg-destructive/5 text-destructive/80" : "border-sky-400/30 bg-sky-400/5 text-sky-400/80"}
      title={`🌊 ${turns(left)} until she goes under`}
    >
      <div className="h-1 mt-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${urgent ? "bg-destructive/70" : "bg-sky-400/60"} transition-all duration-500`} style={{ width: `${(turn / total) * 100}%` }} />
      </div>
    </Banner>
  );
}

function ProcessionBanner({ location, mimicRoom, activeForm, activeAdventurers }: BannerProps & { mimicRoom: RoomName }) {
  const sweet = answersDoor(location, activeForm);
  const onGreen = !(location.procession?.order as readonly string[] | undefined)?.includes(mimicRoom);
  const coming = activeAdventurers
    .map(a => ({ a, away: housesAway(location, a.location, mimicRoom) }))
    .filter(x => x.away > 0)
    .sort((x, y) => x.away - y.away);
  const nextUp = coming.length ? coming.filter(x => x.away === coming[0].away) : [];
  return (
    <Banner tone="border-orange-400/30 bg-orange-400/5 text-orange-200/90" title="🎃 Spell or sweet! The costumed crowd goes door to door, one house each time you wait.">
      <Note>
        {onGreen
          ? `You're out on the ${mimicRoom}: nobody knocks here, so lure them over.`
          : sweet
          ? `As a ${activeForm?.name}, you've got sweets: whoever knocks comes right up to you.`
          : "Nobody's answering at your house: whoever knocks will prank it (+1 suspicion). A Door, Goblet, Chest, Jack-o'-Lantern, Gargoyle or Haunted Mansion hands out sweets."}
        {nextUp.length > 0 && ` Next at your door: ${nextUp.map(x => x.a.name).join(" and ")}, ${nextUp[0].away === 1 ? "next turn" : `in ${nextUp[0].away} houses`}.`}
      </Note>
    </Banner>
  );
}

function FireworksBanner({ location, huntTurn, fireworksRoom, activeForm, skyward }: BannerProps) {
  const every = location.fireworks?.every ?? 1;
  const crate = fireworksRummage(location, activeForm) !== null;
  return (
    <Banner tone="border-rose-300/30 bg-rose-400/5 text-rose-200/90" title={`🎆 Fireworks every ${every} turns, over a different part of the fair.`}>
      <Note>
        {fireworksRoom
          ? `Everyone in the ${distractedRooms(location, fireworksRoom).join(", ")} is looking up: a meal there now has no witnesses${skyward ? ", and you can Strike anyone in your room without luring them first" : ""}.`
          : `The next volley goes up in ${turns(turnsUntil(every, huntTurn))}.`}
        {crate ? " The crew is short of rockets: a crate under the fireworks will get opened." : ""}
      </Note>
    </Banner>
  );
}

// The Tear in Time: who's stuck in the tar, and how long before they're gone
function TarBanner({ location, party, mimicRoom }: BannerProps) {
  const pits = location.tarPits;
  if (!pits) return null;
  const stuck = party.filter(a => a.tarStuck !== undefined && stillInHunt(a));
  return (
    <Banner tone="border-amber-600/40 bg-amber-900/10 text-amber-400/90" title={`🕳️ Stuck in the ${pits.room}`}>
      <Note>
        {stuck.map(a => `${a.name} (${turns(pits.sinkTurns - (a.tarStuck ?? 0))} until they sink)`).join(", ")}.{" "}
        {mimicRoom === pits.room ? "They can't get away: Strike while they're still there." : "They can't move. Get there before the tar takes them."}
      </Note>
    </Banner>
  );
}

// The Tear in Time: only the turn before it blows (the rumbling); it's otherwise a surprise
function EruptionBanner({ location }: BannerProps) {
  const crater = location.eruption?.crater;
  return (
    <Banner tone="border-orange-500/40 bg-orange-500/10 text-orange-300" title={`🌋 The ${crater} are about to erupt!`}>
      <Note>Next turn, fire pours down the {crater}: anyone there dies, and the rooms next to it are roasted. Get clear, or don't.</Note>
    </Banner>
  );
}

function StarfallBanner({ location, huntTurn, starFragment }: BannerProps) {
  const every = location.starfall?.every ?? 1;
  return (
    <Banner tone="border-indigo-300/30 bg-indigo-400/5 text-indigo-200/90" title="🌠 Stars are falling. When one lands, the whole party runs for it.">
      <Note>
        {starFragment
          ? `A fragment glows in the ${starFragment}. Each time you wait, they all move a room closer to it.`
          : `The next one should fall in ${turns(turnsUntil(every, huntTurn))}.`}
      </Note>
    </Banner>
  );
}

function SnowboundBanner({ location, party }: BannerProps) {
  const frozenCount = party.filter(a => a.isFrozen).length;
  const snow = location.snowbound;
  if (!snow) return null;
  return (
    <Banner tone="border-sky-400/30 bg-sky-400/5 text-sky-300/90" title="❄️ Snowed in. Nobody can leave, and the cold is getting to them.">
      <Note>
        {frozenCount > 0 ? `${frozenCount} frozen solid so far. ` : ""}The {snow.hearth} warms whoever walks in; the {snow.cold.join(" and ")} chill them.
      </Note>
    </Banner>
  );
}
