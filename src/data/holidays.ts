// ============================================================
// HOLIDAYS
// Real-world date windows that unlock seasonal forms (see `holiday` on forms in ./mimicData).
// Windows are inclusive month/day ranges in the player's local time, and may wrap past New Year.
// ============================================================

export type HolidayId =
  | "new_year" | "lunar_new_year" | "easter" | "midsummer" | "independence_day" | "falling_stars" | "brewfest"
  | "halloween" | "thanksgiving" | "christmas";

export interface Holiday {
  readonly id: HolidayId;
  /** In-world name, shown on seasonal forms. */
  readonly name: string;
  readonly icon: string;
  /** [month (1–12), day], inclusive. */
  readonly start: readonly [number, number];
  readonly end: readonly [number, number];
}

// In calendar order. Every window leaves a gap before the next (except Midwinter into the
// Year's Turning), so there are stretches with no seasonal forms at all.
export const HOLIDAYS: Readonly<Record<HolidayId, Holiday>> = {
  new_year:         { id: "new_year",         name: "Year's Turning",          icon: "⏳", start: [12, 31], end: [1, 6] },
  lunar_new_year:   { id: "lunar_new_year",   name: "Lantern Festival",        icon: "🏮", start: [1, 20],  end: [2, 15] },
  // Easter always falls between Mar 22 and Apr 25
  easter:           { id: "easter",           name: "Springtide",              icon: "🥚", start: [3, 22],  end: [4, 25] },
  midsummer:        { id: "midsummer",        name: "Midsummer Revel",         icon: "☀️", start: [6, 14],  end: [6, 24] },
  independence_day: { id: "independence_day", name: "Founders' Day",           icon: "🎆", start: [7, 1],   end: [7, 7] },
  // Around the real Perseid meteor shower
  falling_stars:    { id: "falling_stars",    name: "Night of Falling Stars",  icon: "🌠", start: [8, 10],  end: [8, 20] },
  brewfest:         { id: "brewfest",         name: "Brewfest",                icon: "🍺", start: [9, 10],  end: [9, 26] },
  halloween:    { id: "halloween",    name: "All Hallows' Eve", icon: "🎃", start: [10, 3],  end: [11, 1] },
  thanksgiving: { id: "thanksgiving", name: "Harvest Feast",    icon: "🌾", start: [11, 12],  end: [11, 30] },
  christmas:    { id: "christmas",    name: "Midwinter",        icon: "🎁", start: [12, 10], end: [12, 30] },
};

const monthDay = (m: number, d: number) => m * 100 + d;

/** Whether `date` (local time) falls inside the holiday's window. */
export function isInSeason(holiday: HolidayId, date: Date): boolean {
  const { start, end } = HOLIDAYS[holiday];
  const today = monthDay(date.getMonth() + 1, date.getDate());
  const from = monthDay(...start);
  const to = monthDay(...end);
  // A window like Dec 28 – Jan 3 wraps past New Year
  return from <= to ? today >= from && today <= to : today >= from || today <= to;
}

/** The holidays in season on `date`. */
export function activeHolidays(date: Date): HolidayId[] {
  return (Object.keys(HOLIDAYS) as HolidayId[]).filter(h => isInSeason(h, date));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = ([m, d]: readonly [number, number]) => `${MONTHS[m - 1]} ${d}`;

/** "Oct 3 – Nov 1" */
export function seasonRange(holiday: HolidayId): string {
  return `${fmt(HOLIDAYS[holiday].start)} – ${fmt(HOLIDAYS[holiday].end)}`;
}
/** "Nov 1", the last day of the window. */
export function seasonEnd(holiday: HolidayId): string {
  return fmt(HOLIDAYS[holiday].end);
}
/** "Oct 3", the first day of the window. */
export function seasonStart(holiday: HolidayId): string {
  return fmt(HOLIDAYS[holiday].start);
}

/**
 * Today's date for seasonal checks. In development, `localStorage["mm.debugDate"] = "12-15"`
 * (month-day) pretends it's that day, to preview a season.
 */
export function today(): Date {
  const now = new Date();
  if (!import.meta.env?.DEV) return now;
  try {
    const debug = window.localStorage.getItem("mm.debugDate");
    const match = debug?.match(/^(\d{1,2})-(\d{1,2})$/);
    if (match) return new Date(now.getFullYear(), Number(match[1]) - 1, Number(match[2]));
  } catch {
    // Storage unavailable: use the real date
  }
  return now;
}
