// ============================================================
// END-OF-HUNT REPORT
// What the world says about the hunt once it's over, written from the survivors' side:
// a Guild incident notice when the mimic was discovered, a missing-party notice when no one
// came back, a bard's verse when some did, and tavern gossip when the party just got bored.
// Pure and seeded, so the same hunt always reads the same (and tests can pin it down).
// ============================================================
import type { Tier } from "./vocabulary";

export type HuntEnding = "discovered" | "abandoned" | "cleared";

/** Just the parts of a party member the report reads. */
export interface ReportPartyMember {
  readonly name: string;
  readonly isCompanion?: boolean;
  readonly isConsumed: boolean;
  readonly fled?: boolean;
  readonly isConverted?: boolean;
  readonly isDisappeared?: boolean;
  /** Froze to death (snowbound locations); isConsumed too if the mimic ate them after. */
  readonly isFrozen?: boolean;
}

export interface HuntReportInput {
  readonly ending: HuntEnding;
  /** Fixed per hunt, so the report doesn't reshuffle on re-render. */
  readonly seed: number;
  readonly locationName: string;
  /** The room the mimic was last in. */
  readonly lastRoom: string | null;
  /** The form the mimic was wearing at the end. */
  readonly formName: string | null;
  readonly tier: Tier;
  /** The mimic's own name: only bounty hunters know it. */
  readonly mimicName: string;
  readonly bounty: boolean;
  readonly peakSuspicion: number;
  /** Biggest single meal this hunt. */
  readonly biggestMeal: { readonly name: string; readonly ap: number } | null;
  readonly party: readonly ReportPartyMember[];
  /** Rival mimics devoured (nest hunts). */
  readonly mimicsDevoured: number;
  /** The Sinking Ship went down. */
  readonly sank: boolean;
}

export type HuntReportKind = "incident" | "missing" | "verse" | "gossip";

export interface HuntReport {
  readonly kind: HuntReportKind;
  /** Where it was found, e.g. "Nailed to the board at the Adventurers' Guild". */
  readonly postedAt: string;
  /** Small line above the title. */
  readonly heading: string;
  readonly title: string;
  readonly subtitle?: string;
  /** Label/value rows (notices). */
  readonly fields: readonly { readonly label: string; readonly value: string }[];
  /** Paragraphs (notices, gossip) or stanzas with "\n" line breaks (verse). */
  readonly body: readonly string[];
  readonly quote?: { readonly text: string; readonly by: string };
  readonly signoff?: string;
  /** A big rubber stamp across the notice. */
  readonly stamp?: string;
}

// ---------- helpers ----------

/** mulberry32: small seeded PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NUMBER_WORDS = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
/** "Three" (capitalized) or the digits past twelve. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "a, b and c" */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "the Abandoned Manor" — every location name reads fine with "the" except ones that start with it. */
function the(place: string): string {
  return /^the\s/i.test(place) ? place.replace(/^The/, "the") : `the ${place}`;
}

const SIZE_BY_TIER: Record<Tier, string> = {
  Minor: "Small enough to sit on a shelf",
  Lesser: "About the size of a chest",
  Standard: "Large as a piece of furniture",
  Greater: "Large as a wardrobe, or larger",
  Grand: "The size of a room. Possibly the room itself",
  Apex: "The size of a building. Check the building",
};
const REWARD_BY_TIER: Record<Tier, number> = { Minor: 20, Lesser: 50, Standard: 120, Greater: 300, Grand: 800, Apex: 2500 };

const TAVERNS = ["the Gilded Tankard", "the Drowned Lantern", "the Three-Legged Stool", "the Honest Goblet", "the Sleeping Wyvern", "the Pilgrim's Lantern", "the Emerald Arrow", "the Pilgrim's Rest", "the Dancing Hearth", "the Laughing Smith", "the Merchant's Table", "the Wandering Tankard", "the Ivory Swan"];

// ---------- the report ----------

export function buildHuntReport(input: HuntReportInput): HuntReport {
  const rand = rng(input.seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];

  const people = input.party.filter(a => !a.isCompanion);
  const devoured = people.filter(a => a.isConsumed);
  const vanished = people.filter(a => a.isDisappeared);
  const converted = people.filter(a => a.isConverted);
  const lost = devoured.length + vanished.length;
  // Anyone not eaten, vanished or converted walked (or ran) out
  const survivors = people.filter(a => !a.isConsumed && !a.isDisappeared && !a.isConverted && !a.isFrozen);
  const witness = survivors.length ? pick(survivors).name : null;

  const form = input.formName ? input.formName.toLowerCase() : "furniture";
  const place = the(input.locationName);
  const tavern = pick(TAVERNS);
  const room = input.lastRoom;
  const meal = input.biggestMeal && input.biggestMeal.ap > 0 ? input.biggestMeal.name : null;
  const mealWasPerson = !!meal && people.some(a => a.name === meal);

  const ctx = { input, rand, pick, people, devoured, vanished, converted, lost, survivors, witness, form, place, tavern, room, meal, mealWasPerson };

  if (input.ending === "discovered") return incidentNotice(ctx);
  if (input.ending === "abandoned") return tavernGossip(ctx);
  return survivors.length > 0 ? bardsVerse(ctx) : missingNotice(ctx);
}

type Ctx = {
  input: HuntReportInput;
  rand: () => number;
  pick: <T>(xs: readonly T[]) => T;
  people: readonly ReportPartyMember[];
  devoured: readonly ReportPartyMember[];
  vanished: readonly ReportPartyMember[];
  converted: readonly ReportPartyMember[];
  lost: number;
  survivors: readonly ReportPartyMember[];
  witness: string | null;
  form: string;
  place: string;
  tavern: string;
  room: string | null;
  meal: string | null;
  mealWasPerson: boolean;
};

function casualtyLine({ devoured, vanished, converted }: Ctx): string {
  const parts: string[] = [];
  if (devoured.length) parts.push(`${numberWord(devoured.length)} devoured`);
  if (vanished.length) parts.push(`${numberWord(vanished.length)} missing`);
  if (converted.length) parts.push(`${numberWord(converted.length)} gone strange, praying to the furniture`);
  return parts.length ? listOf(parts.map((p, i) => (i ? lower(p) : p))) : "None, by the grace of the gods";
}

/** Discovered: the survivors made it to the Guild, and now everyone knows. */
function incidentNotice(c: Ctx): HuntReport {
  const { input, pick, form, place, witness, meal, mealWasPerson, survivors, lost } = c;
  const noticeNo = 100 + Math.floor(c.rand() * 900);
  const quotes = [
    `I'm telling you, the ${form} breathed.`,
    `It was a ${form}. It had teeth. A ${form} does not have teeth.`,
    `Don't sit on anything. Don't open anything. Don't trust the ${form}.`,
    `We all looked right at it. Every one of us. It looked back.`,
    `It was warm. Why was it warm?`,
    ...(mealWasPerson ? [`It took the ${meal} whole. Just… folded around them.`] : []),
    ...(input.peakSuspicion >= 10 && lost === 0 ? [`It never touched us. It just knew we knew.`] : []),
  ];
  const threat = lost >= 3 || input.tier === "Grand" || input.tier === "Apex" ? "Extreme"
    : lost >= 1 || input.tier === "Greater" ? "Severe" : "Moderate";
  const reward = REWARD_BY_TIER[input.tier] * (input.bounty ? 3 : 1);

  const body = [
    `Members are advised to avoid ${place} until further notice. Those who must enter are to prod every ${form} with a ten-foot pole before touching it, sitting on it, or turning their back on it.`,
    ...(input.bounty ? [`The hunters engaged for this contract have returned without it. The bounty stands, and has been raised.`] : []),
    ...(c.vanished.length ? [`Note: something else may be living in there too. The witnesses disagree about how many there were.`] : []),
    ...(input.sank ? [`Survivors were pulled from the lifeboats at dawn. The wreck is not to be salvaged.`] : []),
  ];

  return {
    kind: "incident",
    postedAt: "Nailed to the board at the Adventurers' Guild",
    heading: `Adventurers' Guild · Incident Notice No. ${noticeNo}`,
    title: input.bounty ? "Wanted" : pick(["Danger: Mimic", "Beware of Mimic", "Mimic Sighted"]),
    subtitle: input.bounty ? `The mimic known as “${input.mimicName}”` : undefined,
    fields: [
      { label: "Location", value: `${input.locationName}${c.room ? `, the ${c.room}` : ""}` },
      { label: "Disguised as", value: input.formName ? pick([`An ordinary-looking ${form}`, `A ${form}`]) : "Unknown. It changed" },
      { label: "Size", value: SIZE_BY_TIER[input.tier] },
      { label: "Casualties", value: casualtyLine(c) },
      { label: "Survivors", value: survivors.length ? listOf(survivors.map(s => `the ${s.name}`)) : "None reported" },
      { label: "Threat", value: threat },
      { label: "Reward", value: `${reward.toLocaleString("en-US")} crowns, on proof of destruction` },
    ],
    body,
    quote: witness ? { text: pick(quotes), by: `the ${witness}` } : undefined,
    signoff: "By order of the Guildmaster",
    stamp: input.bounty ? "Bounty raised" : threat === "Extreme" ? "Do not engage" : "Avoid",
  };
}

/** Cleared, nobody left to tell it: just a missing-party notice. */
function missingNotice(c: Ctx): HuntReport {
  const { input, people, converted, pick, place, form } = c;
  const body = [
    `${numberWord(people.length)} went into ${place} and have not been seen since. Their gear has not turned up for sale. Their tab at ${c.tavern} remains unpaid.`,
    ...(converted.length ? [`The ${converted[0].name} was found wandering the road, asking strangers whether they have heard the good news about the ${form}. They are not considered a reliable witness.`] : []),
    ...(input.mimicsDevoured ? [`Locals report the screaming from inside has stopped, which they had not expected to find more worrying.`] : []),
    ...(input.sank ? [`The ship they boarded has gone down. No lifeboats were recovered.`] : []),
    pick([
      `Anyone with information is asked to report to the Guild. Do not go looking yourself.`,
      `The Guild reminds members to sign out before entering a site, so we know where to stop looking.`,
      `Search parties will not be sent at this time.`,
    ]),
  ];
  return {
    kind: "missing",
    postedAt: "Pinned to the door of the Adventurers' Guild",
    heading: "Adventurers' Guild · Notice",
    title: people.length === 1 ? "Missing" : "Missing Party",
    subtitle: `Last seen entering ${place}`,
    fields: [
      { label: "Names", value: listOf(people.map(p => `the ${p.name}`)) },
      ...(c.room ? [{ label: "Last heard from", value: `The ${c.room}` }] : []),
    ],
    body,
    signoff: "Filed by the Guild Clerk",
    stamp: "Unaccounted for",
  };
}

/** Cleared, and somebody got out to sing about it. */
function bardsVerse(c: Ctx): HuntReport {
  const { input, people, survivors, pick, form, place, room, meal, mealWasPerson, witness, lost } = c;
  const verbs = ["breathed", "blinked", "had teeth", "was smiling", "was hungry", "moved when no one looked", "was warm to the touch"];
  const out = survivors.length;
  const opening = out === people.length
    ? `${numberWord(people.length)} entered ${place}.\nAll ${lower(numberWord(out))} came out, and none will say a word\nexcept to swear the ${form} ${pick(verbs)}.`
    : `${numberWord(people.length)} entered ${place}.\n${numberWord(out)} came out, insisting the ${form} ${pick(verbs)}.`;

  const stanzas = [opening];
  if (mealWasPerson) {
    stanzas.push(pick([
      `They sang of gold and glory,\nthey sang of steel and flame;\nthey did not sing about the ${meal},\nwho went in, and never came.`,
      `Raise a cup for the ${meal},\nwho went to look around;\nthey looked, and something looked back,\nand they were never found.`,
    ]));
  } else if (meal) {
    stanzas.push(`Not one of the party was eaten,\nthough the ${meal.toLowerCase()} was, they say;\nand somehow that is worse, my friends,\nfor what does it eat the next day?`);
  }
  stanzas.push(pick([
    `So mind the ${form}, children,\nand mind the quiet chair;\n${room ? `the ${room} stood empty` : "the room stood empty"}\ntill something else was there.`,
    `Now never trust a ${form},\nhowever plain it seems;\nthe ${survivors[0].name} sleeps with a lamp lit\nand screams, some nights, in dreams.`,
  ]));
  if (input.mimicsDevoured) {
    stanzas.push(`And deeper in, the old ones hid,\n${numberWord(input.mimicsDevoured).toLowerCase()} more of the hungry kind;\nbut something hungrier came through\nand left not one behind.`);
  }
  if (input.sank) {
    stanzas.push(`The ship went down with all her gold,\nthe lifeboats pulled away;\nand something swam beneath them\nall the long way to the bay.`);
  }

  return {
    kind: "verse",
    postedAt: `Copied down at ${c.tavern}`,
    heading: lost ? "A Lament" : "A Ballad",
    title: `The ${input.formName ?? "Thing"} of ${the(input.locationName)}`,
    fields: [],
    body: stanzas,
    signoff: `As sung by the ${witness}, for drinks. The bard admits the meter needs work.`,
  };
}

/** Abandoned: they got bored and left. The tavern's take depends on how close they came. */
function tavernGossip(c: Ctx): HuntReport {
  const { input, pick, form, place, witness, lost, meal, mealWasPerson } = c;
  const who = witness ? `the ${witness}` : "one of them";
  const lines: string[] = [
    pick([
      `“Went all the way out to ${place} and found nothing. Not a coin, not a ghost. Just dust.”`,
      `“That lot from ${place}? Came back empty-handed and in a mood. Drinking on credit, too.”`,
      `“They say ${place} is cleaned out. Nothing left in there worth the walk.”`,
    ]),
  ];
  if (input.peakSuspicion >= 7) {
    lines.push(pick([
      `“${who.charAt(0).toUpperCase() + who.slice(1)} won't go back, though. Swears the ${form} was watching. Swears it on their mother.”`,
      `“Ask ${who} about the ${form}. Go on. Watch them go pale.”`,
    ]));
  } else if (input.peakSuspicion >= 4) {
    lines.push(`“Though ${who} keeps saying the ${form} was in a different spot on the way out. Had too much, if you ask me.”`);
  } else {
    lines.push(`“Dullest job of the season, ${who} reckons. Sat on a ${form} for an hour and nothing happened.”`);
  }
  if (lost) {
    lines.push(mealWasPerson
      ? `“Came back one short, mind. Said the ${meal} must've wandered off. Wandered off. In there.”`
      : `“Came back short, mind. Nobody wants to talk about that part.”`);
  } else if (meal) {
    lines.push(`“Funny thing — not a ${meal.toLowerCase()} left in the whole place. Not one. Where'd they all go?”`);
  }
  return {
    kind: "gossip",
    postedAt: `Overheard at ${c.tavern}`,
    heading: "Tavern Talk",
    title: `Nothing in ${the(input.locationName)}`,
    fields: [],
    body: lines,
    signoff: "Scrawled on the back of a bar tab",
  };
}
