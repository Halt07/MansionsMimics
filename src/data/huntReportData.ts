// ============================================================
// END-OF-HUNT REPORT
// What the world says about the hunt once it's over, written from the survivors' side:
// a Guild incident notice when the mimic was discovered, a missing-party notice when no one
// came back, a bard's verse when some did, and tavern gossip when the party just got bored.
// Some locations tell it their own way (see LOCATION_REPORTS), in the same four shapes.
// Pure and seeded, so the same hunt always reads the same (and tests can pin it down).
// ============================================================
import type { Tier } from "./vocabulary";
import { plural, the } from "./text";

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
  /** Roasted (isConsumed too if eaten after) or burned up by an eruption (the Tear in Time). */
  readonly isRoasted?: boolean;
  readonly isBurned?: boolean;
  /** Sank into the tar (the Tear in Time). */
  readonly isSunk?: boolean;
  /** AP bitten off them: if they were eaten, it was a bite at a time, not swallowed whole. */
  readonly biteAp?: number;
  /** In costume, `name` is the costume (all anyone knew them by); the same as trueName for a real monster. */
  readonly costume?: string;
  readonly trueName?: string;
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
  /** For locations that tell their own story (LOCATION_REPORTS). */
  readonly locationId?: string;
  /** The volcano erupted this hunt (the Tear in Time): the tablet comes out scorched. */
  readonly erupted?: boolean;
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
  /** What's pressed into the wax seal on a notice: the Guild's "G" unless it says otherwise (the Crown's 👑). */
  readonly seal?: string;
  /**
   * What it's on: paper (the default), a stone tablet (the Tear in Time, long before paper), or a
   * museum placard (the Long After, long after: by then the whole hunt is an exhibit).
   */
  readonly material?: "paper" | "stone" | "placard";
  /** Smeared with soot (the volcano erupted). */
  readonly scorched?: boolean;
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

/** Past this many people, a report stops naming them and counts regiments. */
export const REGIMENT_SIZE = 8;

/**
 * People named in a report: their names ("the Herald and the Archmage"), or past REGIMENT_SIZE
 * (a siege can bring dozens), "a regiment", "two regiments"… about one for every REGIMENT_SIZE.
 */
export function namesOrRegiments(names: readonly string[]): string {
  return regiments(names.length) ?? listOf(names);
}

/** "A regiment", "Two regiments"… for more than REGIMENT_SIZE people; null for fewer (name or count them). */
export function regiments(people: number): string | null {
  if (people <= REGIMENT_SIZE) return null;
  const count = Math.max(1, Math.round(people / REGIMENT_SIZE));
  return count === 1 ? "A regiment" : `${numberWord(count)} regiments`;
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
  // Frozen solid and left where they fell (eaten after, they count as devoured)
  const frozen = people.filter(a => a.isFrozen && !a.isConsumed);
  // Lost to an eruption: burned up, or roasted and left uneaten
  // ...or sunk in the tar
  const erupted = people.filter(a => a.isBurned || a.isSunk || (a.isRoasted && !a.isConsumed));
  const lost = devoured.length + vanished.length + frozen.length + erupted.length;
  // Anyone not eaten, vanished, frozen, roasted, burned or converted walked (or ran) out
  const survivors = people.filter(a => !a.isConsumed && !a.isDisappeared && !a.isConverted && !a.isFrozen && !a.isRoasted && !a.isBurned && !a.isSunk);
  const witness = survivors.length ? pick(survivors).name : null;

  const form = input.formName ? input.formName.toLowerCase() : "furniture";
  const place = the(input.locationName);
  const tavern = pick(TAVERNS);
  const room = input.lastRoom;
  const meal = input.biggestMeal && input.biggestMeal.ap > 0 ? input.biggestMeal.name : null;
  const mealPerson = meal ? people.find(a => a.name === meal) : undefined;
  const mealWasPerson = !!mealPerson;
  // Eaten a bite at a time (a Minor mimic, or a giant too big to swallow), not swallowed whole
  const mealBitten = !!mealPerson?.biteAp;

  // Costumes that weren't (Spell or Sweet Street): a real werewolf among the party
  const realMonsters = people.filter(a => !!a.costume && a.costume === a.trueName);

  const ctx = { input, rand, pick, people, devoured, vanished, frozen, converted, lost, survivors, witness, form, place, tavern, room, meal, mealWasPerson, mealBitten, realMonsters };

  const tell = (input.locationId && LOCATION_REPORTS[input.locationId]) || GUILD_REPORTS;
  if (input.ending === "discovered") return tell.incident(ctx);
  if (input.ending === "abandoned") return tell.gossip(ctx);
  return survivors.length > 0 ? tell.verse(ctx) : tell.missing(ctx);
}

/** One way of telling each ending. */
interface ReportTeller {
  incident: (c: Ctx) => HuntReport;
  missing: (c: Ctx) => HuntReport;
  verse: (c: Ctx) => HuntReport;
  gossip: (c: Ctx) => HuntReport;
}

type Ctx = {
  input: HuntReportInput;
  rand: () => number;
  pick: <T>(xs: readonly T[]) => T;
  people: readonly ReportPartyMember[];
  devoured: readonly ReportPartyMember[];
  vanished: readonly ReportPartyMember[];
  /** Froze to death and were left uneaten. */
  frozen: readonly ReportPartyMember[];
  converted: readonly ReportPartyMember[];
  /** Everyone who didn't come back: devoured, vanished or frozen. */
  lost: number;
  survivors: readonly ReportPartyMember[];
  witness: string | null;
  form: string;
  place: string;
  tavern: string;
  room: string | null;
  meal: string | null;
  mealWasPerson: boolean;
  /** The biggest meal was a person eaten a bite at a time (not swallowed whole). */
  mealBitten: boolean;
  /** Party members whose costume was no costume at all. */
  realMonsters: readonly ReportPartyMember[];
};

function casualtyLine({ devoured, vanished, frozen, converted }: Ctx): string {
  const parts: string[] = [];
  if (devoured.length) parts.push(`${numberWord(devoured.length)} devoured`);
  if (vanished.length) parts.push(`${numberWord(vanished.length)} missing`);
  if (frozen.length) parts.push(`${numberWord(frozen.length)} frozen solid`);
  if (converted.length) parts.push(`${numberWord(converted.length)} gone strange, praying to the furniture`);
  return parts.length ? listOf(parts.map((p, i) => (i ? lower(p) : p))) : "None, by the grace of the gods";
}

/** Discovered: the survivors made it to the Guild, and now everyone knows. */
function incidentNotice(c: Ctx): HuntReport {
  const { input, pick, form, place, witness, meal, mealWasPerson, mealBitten, survivors, lost } = c;
  const noticeNo = 100 + Math.floor(c.rand() * 900);
  const quotes = [
    `I'm telling you, the ${form} breathed.`,
    `It was a ${form}. It had teeth. A ${form} does not have teeth.`,
    `Don't sit on anything. Don't open anything. Don't trust the ${form}.`,
    `We all looked right at it. Every one of us. It looked back.`,
    `It was warm. Why was it warm?`,
    ...(meal && mealWasPerson
      ? [mealBitten ? `It went at ${the(meal)} a bite at a time. We heard every one.` : `It took ${the(meal)} whole. Just… folded around them.`]
      : []),
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
      { label: "Survivors", value: survivors.length ? namesOrRegiments(survivors.map(s => the(s.name))) : "None reported" },
      { label: "Threat", value: threat },
      { label: "Reward", value: `${reward.toLocaleString("en-US")} crowns, on proof of destruction` },
    ],
    body,
    quote: witness ? { text: pick(quotes), by: the(witness) } : undefined,
    signoff: "By order of the Guildmaster",
    stamp: input.bounty ? "Bounty raised" : threat === "Extreme" ? "Do not engage" : "Avoid",
  };
}

/** Cleared, nobody left to tell it: just a missing-party notice. */
function missingNotice(c: Ctx): HuntReport {
  const { input, people, converted, pick, place, form } = c;
  const body = [
    `${numberWord(people.length)} went into ${place} and have not been seen since. Their gear has not turned up for sale. Their tab at ${c.tavern} remains unpaid.`,
    ...(converted.length ? [`${the(converted[0].name, true)} was found wandering the road, asking strangers whether they have heard the good news about the ${form}. They are not considered a reliable witness.`] : []),
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
    title: plural(people.length, "Missing", "Missing Party"),
    subtitle: `Last seen entering ${place}`,
    fields: [
      { label: "Names", value: namesOrRegiments(people.map(p => the(p.name))) },
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
  if (meal && mealWasPerson) {
    stanzas.push(pick([
      `They sang of gold and glory,\nthey sang of steel and flame;\nthey did not sing about ${the(meal)},\nwho went in, and never came.`,
      `Raise a cup for ${the(meal)},\nwho went to look around;\nthey looked, and something looked back,\nand they were never found.`,
    ]));
  } else if (meal) {
    stanzas.push(`Not one of the party was eaten,\nthough ${the(meal).toLowerCase()} was, they say;\nand somehow that is worse, my friends,\nfor what does it eat the next day?`);
  }
  stanzas.push(pick([
    `So mind the ${form}, children,\nand mind the quiet chair;\n${room ? `the ${room} stood empty` : "the room stood empty"}\ntill something else was there.`,
    `Now never trust a ${form},\nhowever plain it seems;\n${the(survivors[0].name)} sleeps with a lamp lit\nand screams, some nights, in dreams.`,
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
    signoff: `As sung by ${witness ? the(witness) : "the survivors"}, for drinks. The bard admits the meter needs work.`,
  };
}

/** Abandoned: they got bored and left. The tavern's take depends on how close they came. */
function tavernGossip(c: Ctx): HuntReport {
  const { input, pick, form, place, witness, lost, meal, mealWasPerson } = c;
  const who = witness ? the(witness) : "one of them";
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
    lines.push(meal && mealWasPerson
      ? `“Came back one short, mind. Said ${the(meal)} must've wandered off. Wandered off. In there.”`
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

const GUILD_REPORTS: ReportTeller = { incident: incidentNotice, missing: missingNotice, verse: bardsVerse, gossip: tavernGossip };

// ---------- Spell or Sweet Street ----------
// The village tells this one, not the Guild: notices from the Mayor's door, a rhyme the children
// skip to, and talk at the baker's. Everyone is named by their costume, since that's all the
// village ever saw.

/** "a werewolf", "an ogre" */
const aOrAn = (noun: string) => /^the\s/i.test(noun) ? the(noun) : `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;

/** Discovered: the Mayor cancels spell-or-sweeting. */
function streetNotice(c: Ctx): HuntReport {
  const { input, pick, form, witness, survivors, lost, room, realMonsters, meal, mealWasPerson } = c;
  const reward = REWARD_BY_TIER[input.tier];
  const quotes = [
    `I said ‘spell or sweet’ and the ${form} said ‘sweet.’ It wasn't asking.`,
    `I reached in for a sweet and it closed on my wrist.`,
    `Nobody on this street owns a ${form}. Nobody. I asked.`,
    `It had a bowl of sweets. Why would it need a bowl of sweets?`,
    ...(meal && mealWasPerson ? [`${the(meal, true)} went up the step ahead of me. Then there wasn't a ${meal.replace(/^The /, "")} any more.`] : []),
  ];
  return {
    kind: "incident",
    postedAt: "Nailed to the door of the Mayor's House",
    heading: "By Order of the Mayor · Village Notice",
    title: pick(["Spell or Sweet Is Cancelled", "Do Not Knock", "Mind the Doorstep"]),
    subtitle: `Something on ${input.locationName} was handing out more than sweets`,
    fields: [
      { label: "Where", value: room ? `The ${room}` : "Somewhere on the lane" },
      { label: "Looked like", value: input.formName ? `A ${form}. It was not a decoration` : "Something on a doorstep" },
      { label: "Size", value: SIZE_BY_TIER[input.tier] },
      { label: "Taken", value: lost ? `${numberWord(lost)}, sweet bags and all` : "Nobody, this time" },
      { label: "Got home", value: survivors.length ? namesOrRegiments(survivors.map(s => the(s.name))) : "Nobody" },
      { label: "Reward", value: `${reward.toLocaleString("en-US")} crowns and the Mayor's own pumpkin` },
    ],
    body: [
      `Spell-or-sweeting on the lane is cancelled until further notice. Households are to leave nothing on the step, answer nothing that knocks, and count their furniture before bed.`,
      ...(input.formName ? [`Any ${form} found on a doorstep is to be left alone. It is not full of sweets.`] : []),
      ...(realMonsters.length ? [`The Mayor also wishes it known that ${the(realMonsters[0].name)} was not anybody's cousin in a costume, and that next year costumes will be checked at the gate.`] : []),
    ],
    quote: witness ? { text: pick(quotes), by: the(witness) } : undefined,
    signoff: "By order of the Mayor (and the Guild, who were very firm about it)",
    stamp: "No sweets",
  };
}

/** Cleared, nobody left: the lane went quiet. */
function streetMissing(c: Ctx): HuntReport {
  const { pick, people, room, realMonsters, form } = c;
  const eatenReal = realMonsters.filter(a => a.isConsumed);
  return {
    kind: "missing",
    postedAt: "Tacked to the lamppost at the end of the lane",
    heading: "Village Notice",
    title: "No More Spell or Sweeters",
    subtitle: "The lane went quiet long before midnight",
    fields: [
      { label: "Last seen dressed as", value: listOf(people.map(p => aOrAn(p.name))) },
      ...(room ? [{ label: "Last door knocked", value: `The ${room}` }] : []),
    ],
    body: [
      `${numberWord(people.length)} went door to door on Spell or Sweet Street and never reached the end of it. Their sweet bags were found on ${room ? `the step of the ${room}` : "a doorstep"}, still full.`,
      // On All Hallows' Eve, a whole party vanishing looks a lot like a prank
      pick([
        `Half the village is sure it's a prank: that they're all hiding behind the ${pick(["Crooked House", "Candlemaker's House", "old tree on the green"])}, waiting to jump out. The other half has stopped laughing.`,
        `The Baker says it's a joke and they'll all leap out of a hedge come morning. The Baker has been saying that for three days.`,
        `Some on the lane think they're hiding to give everyone a fright. If so, it's a very good prank. Nobody has found them, and nobody has stopped looking over their shoulder.`,
      ]),
      ...(eatenReal.length ? [`Under the ${eatenReal[0].name} costume, the search party swears, there was no person at all. Just ${aOrAn(eatenReal[0].name.toLowerCase())}. Nobody can explain where that went either.`] : []),
      pick([
        `Children are to be home before the lanterns go out. Grown-ups too.`,
        `Next year the village will be handing out sweets from the windows. Doors stay shut.`,
        `Whoever left the ${form} on the step is asked to come and collect it. Carefully.`,
      ]),
    ],
    signoff: "Posted by the Lamplighter, who saw nothing and would like that noted",
    stamp: "Never came home",
  };
}

/** Cleared, someone got home: the children make a rhyme of it. */
function streetRhyme(c: Ctx): HuntReport {
  const { pick, form, meal, mealWasPerson, survivors, realMonsters, people } = c;
  const stanzas = [
    pick([
      `Spell or sweet, spell or sweet,\nknock on every door on the street;\nbut if the ${form} opens wide,\nyou're the sweet it takes inside.`,
      `Spell or sweet, knock knock knock,\nwho's on the step at twelve o'clock?\nNot a pumpkin, not a cat,\njust a ${form}. Fancy that.`,
    ]),
  ];
  if (meal && mealWasPerson) {
    stanzas.push(`${the(meal, true)} knocked, ${the(meal)} went in,\n${the(meal)} didn't come out again.`);
  }
  const realSurvivor = realMonsters.find(a => !a.isConsumed);
  const realEaten = realMonsters.find(a => a.isConsumed);
  if (realSurvivor) {
    stanzas.push(`And ${the(realSurvivor.name)}? Nobody asks.\nNot every one of them wore a mask.`);
  } else if (realEaten) {
    stanzas.push(`${the(realEaten.name, true)} was real, and the ${form} was too;\none ate the other. Which one are you?`);
  }
  stanzas.push(survivors.length === people.length
    ? `All of them came home, bags heavy with treats,\nand not one has gone out since on those streets.`
    : `${numberWord(survivors.length)} came home, bags heavy with treats.\nThe rest are still knocking, somewhere on the street.`);
  return {
    kind: "verse",
    postedAt: "Chanted in the schoolyard the morning after",
    heading: "A Skipping Rhyme",
    title: "Spell or Sweet",
    fields: [],
    body: stanzas,
    signoff: "Every child on the lane knows it. None of them will say who taught them.",
  };
}

/** Abandoned: talk at the baker's. */
function streetGossip(c: Ctx): HuntReport {
  const { input, pick, form, witness, room, lost, meal, mealWasPerson, realMonsters } = c;
  const who = witness ? the(witness) : "one of them";
  const lines = [
    pick([
      `“Hardly anyone came knocking this year. More sweets for me.”`,
      `“They got bored halfway down the lane and went home. In my day we did the whole street.”`,
      `“Quiet night. Someone had put out a ${form}, and that was about the most exciting thing on the lane.”`,
    ]),
  ];
  if (input.peakSuspicion >= 7) {
    lines.push(`“${who.charAt(0).toUpperCase() + who.slice(1)} swears the ${form}${room ? ` on the ${room} step` : ""} asked them for a sweet. Asked them.”`);
  } else if (input.peakSuspicion >= 4) {
    lines.push(`“Somebody's ${form} kept turning up on a different doorstep. Kids, I expect.”`);
  } else {
    lines.push(`“Lovely costumes, though. That ${witness ?? "Bedsheet Ghost"} was very convincing.”`);
  }
  const realLeft = realMonsters.find(a => !a.isConsumed);
  if (realLeft) {
    lines.push(`“Did you see ${the(realLeft.name)}? Very convincing. Didn't eat a single sweet, mind. Kept looking at the neighbours.”`);
  }
  if (lost) {
    lines.push(meal && mealWasPerson
      ? `“Came back one short, mind. Said ${the(meal)} must have gone home early. Nobody's seen them go home.”`
      : `“Came back short, mind. Nobody wants to say who.”`);
  }
  return {
    kind: "gossip",
    postedAt: "Overheard at the Baker's House",
    heading: "Village Talk",
    title: "A Quiet All Hallows' Eve",
    fields: [],
    body: lines,
    signoff: "Told over the counter, with a free biscuit",
  };
}

/** Locations that tell their own story. Any not listed get the Guild's. */
// ---------- the Tear in Time: carved in stone, in the words of people who only just got words ----------
// Short words, blunt sayings. Before paper, so it's a stone tablet (and sooty if the mountain blew).

/** "TWO" for the tablet; numbers past what anyone here can count are "MANY". */
const caveCount = (n: number) => (n > 5 ? "Many" : numberWord(n));
/** The form, as a cave person would say it ("Grandfather Clock" is just "thing"). */
const caveThing = (c: Ctx) => (c.input.formName && c.input.formName.split(" ").length === 1 ? c.input.formName.toLowerCase() : "thing");
const tablet = (c: Ctx, report: Omit<HuntReport, "material" | "scorched">): HuntReport => ({ ...report, material: "stone", scorched: !!c.input.erupted });

/** Discovered: the ones who got away carved a warning. */
function tearWarning(c: Ctx): HuntReport {
  const { pick, witness, meal, mealWasPerson, lost, room } = c;
  const thing = caveThing(c);
  const quotes = [
    `Rock have mouth. Rock bite.`,
    `Me poke ${thing}. ${thing.charAt(0).toUpperCase() + thing.slice(1)} poke back.`,
    `It warm. Rock not warm. Why rock warm?`,
    `We look at it. It look at us. We run.`,
    ...(meal && mealWasPerson ? [`It eat ${meal}. One bite. ${meal} gone.`] : []),
  ];
  return tablet(c, {
    kind: "incident",
    postedAt: "Carved on a slab at the mouth of the cave",
    heading: "Stone of Warning",
    title: `Bad ${thing}`,
    subtitle: "Tribe see. Tribe know.",
    fields: [
      { label: "Where", value: room ?? "Far" },
      { label: "What", value: `${thing.charAt(0).toUpperCase() + thing.slice(1)}. Not ${thing}` },
      { label: "Gone", value: lost ? caveCount(lost) : "None. This time" },
    ],
    body: [
      `No sit on ${thing}. No touch ${thing}. Poke with long stick. Then run.`,
      ...(c.input.erupted ? [`Mountain mad too. Fire fall. Ash on all.`] : []),
    ],
    quote: witness ? { text: pick(quotes), by: witness } : undefined,
    signoff: "Elder say. Tribe do.",
  });
}

/** Cleared, nobody left: the fire waited, and nobody came back to it. */
function tearMissing(c: Ctx): HuntReport {
  const { pick, people } = c;
  const thing = caveThing(c);
  return tablet(c, {
    kind: "missing",
    postedAt: "Scratched on a stone by the cold fire",
    heading: "Stone of the Lost",
    title: pick(["None Come Back", "Hunt Not Come Home", "All Gone"]),
    subtitle: `${caveCount(people.length)} go out. None come back.`,
    fields: [
      { label: "Who", value: people.length ? listOf(people.map(p => p.name)) : "Hunt" },
      { label: "Last seen", value: c.room ?? "Far" },
    ],
    body: [
      `Fire wait. Fire go cold. No one come.`,
      `Big thing eat them. Thing that look like ${thing}.`,
      ...(c.input.erupted ? [`Mountain roar. Ash fall. Sky go black.`] : []),
    ],
    signoff: "Firekeeper mark this. Firekeeper not forget.",
  });
}

/** Cleared, some got away: a chant, the way the tribe remembers things. */
function tearChant(c: Ctx): HuntReport {
  const { pick, devoured, survivors, meal } = c;
  const thing = caveThing(c);
  const went = survivors.length + c.lost;
  const stanzas = [
    `${caveCount(went)} go out.
${caveCount(survivors.length)} come back.
Hunt come back small.`,
    `Big ${thing}. Still ${thing}.
It wait. It wait.
Then it eat.`,
    ...(meal ? [`It eat ${meal}.
No more ${meal}.
We sing, so we know.`] : []),
    ...(c.input.erupted ? [`Mountain wake.
Fire run down.
Mountain eat too.`] : []),
    pick([`No sleep near ${thing}.
No sleep near rock.
No sleep.`, `Drum slow. Drum low.
We go home.
We not go back.`]),
  ];
  return tablet(c, {
    kind: "verse",
    postedAt: "Scratched on a stone by the fire, to be sung",
    heading: "Song of the Hunt",
    title: `Song of the ${thing}`,
    fields: [],
    body: stanzas,
    signoff: devoured.length ? `For the ${caveCount(devoured.length).toLowerCase()} that not come home` : undefined,
  });
}

/** Abandoned: the hunt got bored and went home, and the fire heard all about it. */
function tearTalk(c: Ctx): HuntReport {
  const { pick, witness } = c;
  const thing = caveThing(c);
  return tablet(c, {
    kind: "gossip",
    postedAt: "Scratched on a stone by the fire, after",
    heading: "Fire Talk",
    title: pick(["Bored", "Long Walk", "No Meat"]),
    fields: [],
    body: [
      `Hunt walk. Hunt sit. Hunt walk more. No meat.`,
      `${witness ?? "One"} say ${thing} look at them. Tribe laugh. ${thing.charAt(0).toUpperCase() + thing.slice(1)} not look.`,
      ...(c.input.erupted ? [`Then mountain go boom. Then hunt go home fast.`] : []),
      pick([`Next sun, more meat.`, `Next time, bring more stick.`, `Elder say: rock is rock. Elder old.`]),
    ],
  });
}

// ---------- the Long After: by then, it's all a museum exhibit ----------
// Each ending is a placard in the museum the dig was for, written in a curator's careful voice.

/** The exhibit number, seeded so the same hunt always hangs in the same place. */
const exhibitNo = (c: Ctx) => 10 + Math.floor(c.rand() * 90);
const exhibit = (report: Omit<HuntReport, "material">): HuntReport => ({ ...report, material: "placard" });
/** The museum's own Curator went to oversee the dig, and was eaten there. */
const curatorLost = (c: Ctx) => c.devoured.some(a => a.name === "The Curator");
const CURATOR_NOTE = "The museum regrets that its Curator, who oversaw the dig in person, did not return.";

/** Discovered: the find turned out to be a mimic, and it's on display (behind glass). */
function placardFound(c: Ctx): HuntReport {
  const { input, pick, form, witness, lost, room } = c;
  const n = exhibitNo(c);
  return exhibit({
    kind: "incident",
    postedAt: "On a placard in the Long After Gallery, beside an empty plinth",
    heading: `Exhibit ${n} · The Long After Collection`,
    title: `A ${input.formName ?? "Thing"}, Believed to Be a Mimic`,
    subtitle: `Recovered from ${room ? `the ${room}` : "the ruins"}, the Long After dig`,
    fields: [
      { label: "Found", value: room ? `In the ${room}, among the ruins of an older court` : "Among the ruins of an older court" },
      { label: "Described as", value: `A ${form}. Thought decorative, until it was not` },
      { label: "Expedition losses", value: lost ? `${numberWord(lost)}, recorded with regret` : "None, remarkably" },
      { label: "Present location", value: "Unknown. The plinth is empty" },
    ],
    body: [
      `This ${form} was catalogued as an ordinary furnishing of the ruined court until members of the expedition noticed it was not where they had left it.`,
      pick([`Visitors are asked not to touch the exhibit, and to report it if it moves.`, `Please do not lean on any of the furniture in this gallery.`]),
      ...(curatorLost(c) ? [CURATOR_NOTE] : []),
    ],
    quote: witness ? { text: pick([`It was older than the walls around it. And it was hungry.`, `We dug it out. We should have left it buried.`, `I catalogued it myself. It watched me do it.`]), by: the(witness) } : undefined,
    signoff: "The Museum of the Long After",
  });
}

/** Cleared, nobody left: all the museum has is the expedition's last field journal. */
function placardJournal(c: Ctx): HuntReport {
  const { pick, form, people, room } = c;
  const day = 40 + Math.floor(c.rand() * 20);
  return exhibit({
    kind: "missing",
    postedAt: "On a placard in the Long After Gallery, beside a glass case",
    heading: `Exhibit ${exhibitNo(c)} · The Long After Collection`,
    title: "The Last Field Journal",
    subtitle: "Of the Long After Expedition, recovered from its abandoned camp",
    fields: [
      { label: "Expedition", value: people.length ? namesOrRegiments(people.map(p => the(p.name))) : "Unrecorded" },
      { label: "Returned", value: "None" },
    ],
    body: [
      `Day ${day}: ${room ? `The ${room} is open at last.` : "Another room open."} There is a ${form} in it that was not on yesterday's survey. Noted for cataloguing.`,
      `Day ${day + 1}: ${pick(["Fewer of us at breakfast.", "Someone has moved the " + form + ". Nobody admits to it.", "The jungle has gone very quiet."])}`,
      `Day ${day + 2}:`,
      ...(curatorLost(c) ? [CURATOR_NOTE] : []),
    ],
    signoff: "The Museum of the Long After",
  });
}

/** Cleared, some got away: the find, as one of them remembers it. */
function placardRemembered(c: Ctx): HuntReport {
  const { input, pick, form, survivors, devoured, meal } = c;
  const teller = survivors.length ? the(survivors[0].name) : "a survivor";
  return exhibit({
    kind: "verse",
    postedAt: "On a placard in the Long After Gallery, at the end of a long corridor",
    heading: `Exhibit ${exhibitNo(c)} · The Long After Collection`,
    title: `A ${input.formName ?? "Thing"}, as Remembered`,
    fields: [],
    body: [
      `Nothing of this find survives but an account, given by ${teller} on returning from the dig.`,
      `“We took it for a ${form}. It had stood in that court since before the jungle, and it would stand there long after us. ${devoured.length ? `It took ${numberWord(devoured.length).toLowerCase()} of us before we understood.` : "We understood just in time."}”`,
      ...(meal ? [`The expedition's records note the loss of ${the(meal)} in particular.`] : []),
      pick([`The museum has not attempted a second expedition.`, `The site has been reburied, at the museum's expense.`]),
      ...(curatorLost(c) ? [CURATOR_NOTE] : []),
    ],
    signoff: "The Museum of the Long After",
  });
}

/** Abandoned: the dig moved on, and the find was judged unremarkable. */
function placardUnremarkable(c: Ctx): HuntReport {
  const { input, pick, form } = c;
  return exhibit({
    kind: "gossip",
    postedAt: "On a placard in a quiet corner of the Long After Gallery",
    heading: `Exhibit ${exhibitNo(c)} · The Long After Collection`,
    title: `A ${input.formName ?? "Thing"}. Of No Particular Interest`,
    fields: [],
    body: [
      `A ${form} of the ruined court, recovered intact. The expedition found nothing remarkable about it, and moved on to more promising rooms.`,
      pick([`It has been placed in storage.`, `Visitors rarely stop at this case.`, `It is occasionally reported to be in a slightly different place than it was the day before.`]),
      ...(curatorLost(c) ? [CURATOR_NOTE] : []),
    ],
  });
}

// ---------- the Hollow Court: told by the crusade ----------
// Found out on your own throne, the crusade has won; any other ending, the court still stands.

/** "Three", or "Two regiments", for the crusade's numbers. */
const crusadeCount = (n: number) => regiments(n) ?? numberWord(n);

/** Discovered: the crusade has found the Mimic King out, and won. */
function crusadeVictorious(c: Ctx): HuntReport {
  const { input, pick, form, survivors, lost, room, witness } = c;
  return {
    kind: "incident",
    postedAt: "Read out in every square, and nailed to every church door",
    heading: "Proclamation of the Crusade",
    title: pick(["The Hollow Court Has Fallen", "The Siege Is Won", "The Crusade Is Victorious"]),
    subtitle: "The Mimic King is found out, on its own throne",
    fields: [
      { label: "Where", value: room ? `The ${room}, at the heart of the Hollow Court` : "The heart of the Hollow Court" },
      { label: "Disguised as", value: input.formName ? `A ${form}, as if a king would hide in plain sight` : "Its own furniture" },
      { label: "Fallen", value: lost ? `${crusadeCount(lost)}, remembered with honor` : "None" },
      { label: "Victorious", value: survivors.length ? namesOrRegiments(survivors.map(s => the(s.name))) : "The crusade" },
    ],
    body: [
      `Let it be known that the crusade has done what was sworn: the court of the Mimic King is broken, and its king driven out before every eye.`,
      `Its subjects, the chests and coffers and quiet chairs of that court, are to be burned where they stand.`,
    ],
    quote: witness ? { text: pick([`It sat on the throne like it had always been there. Maybe it had.`, `Every chair in that hall was watching us. Every single one.`]), by: the(witness) } : undefined,
    signoff: "By order of the Crusade",
    stamp: "Victory",
  };
}

/** Cleared, nobody left: the crusade marched in, and never marched out. */
function crusadeLost(c: Ctx): HuntReport {
  const { people, form } = c;
  return {
    kind: "missing",
    postedAt: "Nailed to the gate of the last town before the court",
    heading: "Notice of the Crusade",
    title: "The Crusade Never Returned",
    subtitle: "Marched on the Hollow Court, and was not seen again",
    fields: [
      { label: "Marched", value: people.length ? namesOrRegiments(people.map(p => the(p.name))) : "The whole crusade" },
      { label: "Returned", value: "None" },
    ],
    body: [
      `The crusade marched on the Hollow Court to end the Mimic King. The gate closed behind them.`,
      `Travelers are warned: the court still stands. Do not rest against any ${form} you find there.`,
    ],
    signoff: "By order of the Crown",
    seal: "👑",
  };
}

/** Cleared, some got away: they sing about it, and they don't go back. */
function crusadeLament(c: Ctx): HuntReport {
  const { survivors, lost, devoured } = c;
  return {
    kind: "verse",
    postedAt: "Sung in the taverns by the crusade's survivors",
    heading: "A Lament for the Crusade",
    title: "The King Who Was a Chair",
    fields: [],
    body: [
      `We marched to end the Mimic King\nwith banners and with steel;\n${crusadeCount(survivors.length + lost).toLowerCase()} went in to break its court,\nand found its court was real.`,
      `The chests, the chairs, the coffers all\nwere hungry, every one;\n${lost ? `and ${crusadeCount(lost).toLowerCase()} of us are with them still,` : "but all of us came home,"}\n${devoured.length ? "who never saw the sun." : "who barely saw the sun."}`,
      `So if you pass the Hollow Court,\ndon't stop, and don't sit down:\nits king still waits upon its throne\nand wears its hungry crown.`,
    ],
    signoff: "As sung at the Broken Banner",
  };
}

/** Abandoned: the crusade gave up looking, and lifted the siege. */
function crusadeWithdrawn(c: Ctx): HuntReport {
  const { pick } = c;
  return {
    kind: "gossip",
    postedAt: "Overheard at the Broken Banner",
    heading: "Tavern Talk",
    title: "The Siege Is Lifted",
    fields: [],
    body: [
      `They say the crusade searched the Hollow Court top to bottom and never found the King. Just furniture. A great deal of furniture.`,
      pick([`They've gone home. Nobody's saying who won.`, `The Champion swears it was there. Nobody believes the Champion.`, `Some of them say the throne was warm.`]),
    ],
  };
}

const LOCATION_REPORTS: Partial<Record<string, ReportTeller>> = {
  spell_or_sweet_street: { incident: streetNotice, missing: streetMissing, verse: streetRhyme, gossip: streetGossip },
  tear_in_time: { incident: tearWarning, missing: tearMissing, verse: tearChant, gossip: tearTalk },
  the_long_after: { incident: placardFound, missing: placardJournal, verse: placardRemembered, gossip: placardUnremarkable },
  hollow_court: { incident: crusadeVictorious, missing: crusadeLost, verse: crusadeLament, gossip: crusadeWithdrawn },
};
