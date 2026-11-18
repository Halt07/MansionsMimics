import {
  ALL_FORMS, STAR_FRAGMENT, creatureEmoji, effectiveFormTier, formBurn, formTier, frozenMealAp, uneatenFrozen,
  type PartyMember, type RoomName, type SmallCreature,
} from "../gameData";
import { useHunt } from "./HuntContext";
import BurnBadge from "../BurnBadge";
import HolidayBadge from "../HolidayBadge";
import KeyHint from "../KeyHint";

/** Switch to another of the mimic's forms (costs a turn's suspicion). */
export function FormSwitcher({ onChange }: { onChange: (formIndex: number) => void }) {
  const { character } = useHunt();
  if (character.forms.length === 0) return null;
  return (
    <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
      <p className="text-[11px] text-muted-foreground font-cinzel uppercase tracking-widest">Select Active Form (costs 1 suspicion)</p>
      {character.forms.map((ref, i) => {
        const form = ALL_FORMS.find(f => f.id === ref.formId);
        if (!form) return null;
        const isActive = i === (character.activeFormIndex ?? 0);
        return (
          <button
            key={ref.formId}
            onClick={() => !isActive && onChange(i)}
            data-holiday={form.holiday}
            className={`${form.holiday ? "holiday-card" : ""} w-full text-left px-3 py-2 rounded border text-xs transition-all ${
              isActive ? "border-primary bg-primary/10 text-primary cursor-default" :
              "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-cinzel">{form.name}</span>
              <div className="flex gap-1">
                <span className="text-[10px] border border-border rounded px-1">{effectiveFormTier(form, formTier(character))}</span>
                {isActive && <span className="text-[10px] text-primary">Active</span>}
              </div>
            </div>
            <HolidayBadge form={form} />
            <p className="text-[11px] text-muted-foreground mt-0.5">{form.description}</p>
            <div className="mt-1"><BurnBadge huntsLeft={formBurn(character, form.id)} /></div>
          </button>
        );
      })}
    </div>
  );
}

/** Pick an empty room next door, numbered for the 1–9 keys. */
export function RelocatePanel({ rooms, onRelocate }: { rooms: readonly RoomName[]; onRelocate: (room: RoomName) => void }) {
  return (
    <div className="bg-muted/20 border border-blue-400/20 rounded-lg p-3 space-y-2">
      <p className="text-[11px] text-blue-400/70 font-cinzel uppercase tracking-widest">Relocate — Choose Destination</p>
      {rooms.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">There are too many people nearby — moving now would be too risky.</p>
      ) : (
        rooms.map((room, i) => (
          <button
            key={room}
            onClick={() => onRelocate(room)}
            className="w-full text-left px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:border-blue-400/40 hover:text-foreground transition-all"
          >
            {i < 9 && <KeyHint k={String(i + 1)} className="mr-2" />}
            <span className="font-cinzel">{room}</span>
            <span className="text-[10px] text-muted-foreground ml-2">(+1 suspicion)</span>
          </button>
        ))
      )}
    </div>
  );
}

const MEAL_BUTTON = "disabled:opacity-50 disabled:pointer-events-none text-xs px-3 py-1.5 rounded border bg-card transition-all text-muted-foreground";

interface MealsHereProps {
  onEatCreature: (creature: SmallCreature) => void;
  onEatStar: () => void;
  onEatFrozen: (body: PartyMember) => void;
}

/** Easy meals lying about in the mimic's room: small creatures, a fallen star, frozen adventurers. */
export function MealsHere({ onEatCreature, onEatStar, onEatFrozen }: MealsHereProps) {
  const hunt = useHunt();
  const { mimicRoom, acting: disabled } = hunt;
  const creatures = hunt.creatures.filter(c => !c.isConsumed && c.location === mimicRoom);
  const frozen = uneatenFrozen(hunt.party).filter(a => a.location === mimicRoom);
  const starHere = !!hunt.location?.starfall && !!hunt.starFragment && hunt.starFragment === mimicRoom && !hunt.huntOver;
  return (
    <>
      {creatures.length > 0 && (
        <div className="bg-muted/10 border border-border rounded-lg p-3">
          <p className="text-[11px] text-muted-foreground font-cinzel uppercase tracking-widest mb-2">
            Creatures of Opportunity
          </p>
          <div className="flex flex-wrap gap-2">
            {creatures.map(creature => (
              <button
                key={creature.uid}
                onClick={() => onEatCreature(creature)}
                disabled={disabled}
                className={`${MEAL_BUTTON} border-border hover:border-primary/40 hover:text-primary`}
                title={creature.description}
              >
                {creatureEmoji(creature.name)} {creature.name} <span className="text-primary ml-1">+{creature.ap} AP</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {starHere && (
        <div className="bg-indigo-400/5 border border-indigo-300/30 rounded-lg p-3">
          <p className="text-[11px] text-indigo-200 font-cinzel uppercase tracking-widest mb-2">Fallen Star</p>
          <button
            onClick={onEatStar}
            disabled={disabled}
            className={`${MEAL_BUTTON} border-indigo-300/30 hover:border-indigo-200/60 hover:text-indigo-100`}
            title="Swallow it before anyone else gets here, or leave it as bait: whoever comes for it walks right up to you."
          >
            🌠 Star fragment <span className="text-primary ml-1">+{STAR_FRAGMENT.ap} AP</span>
          </button>
        </div>
      )}

      {frozen.length > 0 && (
        <div className="bg-sky-400/5 border border-sky-400/30 rounded-lg p-3">
          <p className="text-[11px] text-sky-300 font-cinzel uppercase tracking-widest mb-2">Frozen Solid</p>
          <div className="flex flex-wrap gap-2">
            {frozen.map(body => (
              <button
                key={body.id}
                onClick={() => onEatFrozen(body)}
                disabled={disabled}
                className={`${MEAL_BUTTON} border-sky-400/30 hover:border-sky-300/60 hover:text-sky-200`}
                title="Frozen meals are easy to take, but worth half as much and teach you nothing."
              >
                🧊 {body.name} <span className="text-primary ml-1">+{frozenMealAp(body)} AP</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
