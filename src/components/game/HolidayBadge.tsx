import { HOLIDAYS, isInSeason, seasonEnd, seasonStart, today, type Form } from "./gameData";

/**
 * Props that dress a card as a seasonal form: the `holiday-card` border and glow from index.css,
 * themed by `data-holiday`. Spread onto the card element; ordinary forms get nothing.
 */
export function holidayCardProps(form: Pick<Form, "holiday">): { "data-holiday"?: string; className: string } {
  return form.holiday ? { "data-holiday": form.holiday, className: "holiday-card" } : { className: "" };
}

/** "🎃 All Hallows' Eve · until Nov 1" (or, out of season, when it comes back). */
export default function HolidayBadge({ form }: { form: Pick<Form, "holiday"> }) {
  if (!form.holiday) return null;
  const h = HOLIDAYS[form.holiday];
  const inSeason = isInSeason(form.holiday, today());
  return (
    <span className="holiday-badge" data-holiday={form.holiday}>
      {h.icon} {h.name} · {inSeason ? `until ${seasonEnd(form.holiday)}` : `out of season, returns ${seasonStart(form.holiday)}`}
    </span>
  );
}
