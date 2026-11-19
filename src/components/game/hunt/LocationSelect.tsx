import { useId } from "react";
import type { MimicCharacter } from "@/api/schemas/mimicCharacter";
import {
  HOLIDAYS, LOCATIONS, TIER_ORDER, formTier, getAdjacentRooms, getSeasonalForms, isLocationAvailable, locationBurn, plural, seasonEnd, today,
  type Holiday, type HuntLocation, type RoomName,
} from "@/data/gameData";
import { Card, CardContent } from "@/components/ui/card";
import { asButton, FOCUS_RING } from "@/lib/asButton";
import BurnBadge from "../BurnBadge";
import { useHunt } from "./HuntContext";

/** In-season seasonal forms the mimic isn't carrying yet, as "a Jack-o'-Lantern or a Haunted Tree" (null if none). */
function seasonalHintFor(character: MimicCharacter): { holiday: Holiday; names: string } | null {
  const carried = new Set<string>(character.forms.map(f => f.formId));
  const fresh = getSeasonalForms(formTier(character), today()).filter(f => !carried.has(f.id));
  const holiday = fresh[0]?.holiday;
  if (!holiday) return null;
  const names = fresh.map(f => `a ${f.name}`);
  return { holiday: HOLIDAYS[holiday], names: names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0] };
}

interface LocationSelectProps {
  onChoose: (location: HuntLocation) => void;
  onChooseForms: () => void;
}

/** Setup: pick where to hunt (the grounds this mimic can reach today). Seasonal grounds come first, then rare ones. */
export function LocationSelect({ onChoose, onChooseForms }: LocationSelectProps) {
  const { character } = useHunt();
  const locations = LOCATIONS.filter(loc => isLocationAvailable(loc, character.tier, character.mass, character.rareLocation));
  const seasonalHint = seasonalHintFor(character);
  const sorted = [...locations].sort((a, b) => Number(!!b.holiday) - Number(!!a.holiday) || Number(!!b.rare) - Number(!!a.rare));
  // Each card is named by its place, and described by its status, what it is and its party size
  const ids = useId();
  return (
    <div>
      <h2 className="font-cinzel text-xl text-foreground mb-1">Choose Your Hunting Ground</h2>
      <p className="text-muted-foreground text-sm mb-1 flavor-text italic">Where will you lie in wait?</p>
      {TIER_ORDER.indexOf(character.tier) < TIER_ORDER.indexOf("Grand") && (
        <p className="text-[11px] text-muted-foreground/60 mb-4 italic">Wilderness territories unlock at Grand tier and beyond.</p>
      )}
      {seasonalHint && (
        <button
          onClick={onChooseForms}
          data-holiday={seasonalHint.holiday.id}
          className="holiday-card w-full text-left mb-4 px-3 py-2 rounded-lg border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="holiday-badge text-xs font-cinzel">{seasonalHint.holiday.icon} {seasonalHint.holiday.name}</span>
          {" "}· Something in the air: you could take the shape of {seasonalHint.names}. <span className="text-primary">Choose forms →</span>
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map(loc => {
          const id = (part: string) => `${ids}-${loc.id}-${part}`;
          return (
            <Card
              key={loc.id}
              {...asButton(() => onChoose(loc), { labelledBy: id("name"), describedBy: [id("status"), id("about"), id("size")] })}
              data-holiday={loc.holiday}
              className={`cursor-pointer bg-card transition-all group ${FOCUS_RING} ${loc.holiday ? "holiday-card border-border" : loc.rare
                ? "border-amber-400/50 hover:border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                : "border-border hover:border-primary/40"}`}
            >
              <CardContent className="p-4">
                <div id={id("status")}>
                  <BurnBadge huntsLeft={locationBurn(character, loc.id)} />
                  {loc.holiday && (
                    <p className="holiday-badge text-[11px] font-cinzel uppercase tracking-wide mb-1">
                      {HOLIDAYS[loc.holiday].icon} {HOLIDAYS[loc.holiday].name} · open to all until {seasonEnd(loc.holiday)}
                    </p>
                  )}
                  {loc.rare && character.rareLocation && (
                    <p className="text-[11px] font-cinzel uppercase tracking-wide text-amber-400 mb-1">
                      ✦ Rare · leaves after {character.rareLocation.huntsLeft} more {plural(character.rareLocation.huntsLeft, "hunt")} elsewhere
                    </p>
                  )}
                </div>
                <h3 id={id("name")} className="font-cinzel text-foreground group-hover:text-primary transition-colors mb-1">{loc.name}</h3>
                <p id={id("about")} className="text-xs text-muted-foreground mb-2">{loc.description}</p>
                <p className="flavor-text text-[11px] text-muted-foreground/70 italic mb-3 line-clamp-2">{loc.flavorText}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span id={id("size")} className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {loc.partySize[0]}–{loc.partySize[1]} adventurers
                  </span>
                  {loc.advantageTags.slice(0, 2).map(t => (
                    <span key={t} className="text-[11px] text-primary border border-primary/20 bg-primary/5 rounded px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface RoomSelectProps {
  onConfirm: (room: RoomName, location: HuntLocation) => void;
  onBack: () => void;
}

/** Setup, second step: pick the room to wait in at the chosen location. */
export function RoomSelect({ onConfirm, onBack }: RoomSelectProps) {
  const { location } = useHunt();
  // Each card is named by its room, and described by the rooms next to it
  const ids = useId();
  if (!location) return null;
  return (
    <div>
      <h2 className="font-cinzel text-xl text-foreground mb-1">{location.name}</h2>
      <p className="text-muted-foreground text-sm mb-1 flavor-text italic">{location.flavorText}</p>
      <p className="text-xs text-muted-foreground mb-4">Choose the room where you will take your form and wait.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {location.rooms.map((room, i) => (
          <Card
            key={room}
            {...asButton(() => onConfirm(room, location), { labelledBy: `${ids}-${i}-name`, describedBy: [`${ids}-${i}-next`] })}
            className={`cursor-pointer border-border hover:border-primary/40 bg-card transition-all group ${FOCUS_RING}`}
          >
            <CardContent className="p-4">
              <h3 id={`${ids}-${i}-name`} className="font-cinzel text-sm text-foreground group-hover:text-primary transition-colors mb-1">{room}</h3>
              <p id={`${ids}-${i}-next`} className="text-[11px] text-muted-foreground">
                Adjacent: {getAdjacentRooms(location, room).join(", ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <button
        onClick={onBack}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
      >
        ← Back to location select
      </button>
    </div>
  );
}
