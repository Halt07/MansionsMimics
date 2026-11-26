// ============================================================
// MANSIONS & MIMICS — Easter eggs and flavor
// Little touches that don't change the rules much: remarks on the mimic's name, rivals
// wearing your shape, the porter's token and the scholar's notes, the cat that knows, the
// spiderweb, adventurers' quirks, and the emoji for small creatures. Re-exported from ./gameData.
// ============================================================
import type { PartyMember } from "./adventurerData";

/** Chance that a rival mimic, when found, turns out to be wearing your shape. */
export const RIVAL_SAME_SHAPE_CHANCE = 0.2;
export const RIVAL_SAME_SHAPE_LINE = "It's wearing your shape. You both pretend not to notice.";

/**
 * Remarks on particular names, shown as a toast when the mimic is created and as a
 * subtitle on its character sheet. Names match ignoring case and extra spaces; `line`
 * gets the name as the player typed it.
 */
const NAME_REMARKS: readonly { names: readonly string[]; line: (name: string) => string }[] = [
  { names: ["hatbox"], line: () => "Hatbox the mimic, eh? You'll be a legend in no time." },
  { names: ["mimic"], line: () => "Mimic… how original." },
  {
    names: ["puny", "mini", "tiny", "teeny", "teeny-tiny", "itty-bitty", "wee", "little", "smol", "petite", "pip", "squeak"],
    line: (n) => `${n}, how cute!`,
  },
  { names: ["rex", "rover", "buddy", "lucky"], line: (n) => `${n}? You're a mimic, not a dog.` },
  // Too honest for a disguise
  { names: ["jaws", "chomper", "teeth", "fangs"], line: () => "A little on the nose for something that's meant to look harmless." },
  { names: ["trap", "bait"], line: () => "Well, at least you're honest." },
  { names: ["not a mimic", "definitely a chest", "just a chair"], line: () => "Very convincing. No notes." },
  { names: ["hungry", "starving"], line: () => "Aren't we all." },
  // Named after the furniture
  { names: ["chest", "box", "trunk"], line: (n) => `A ${n.toLowerCase()} named ${n}. Subtle.` },
  { names: ["chair", "barrel", "crate"], line: () => "Bold, naming yourself after your best disguise." },
  // Aggressively ordinary
  { names: ["bob", "steve", "gary", "dave"], line: () => "A perfectly ordinary name for a perfectly ordinary chest. Nothing to see here." },
  // Wishful thinking
  { names: ["treasure", "loot", "gold"], line: () => "Truth in advertising — just not the way they think." },
  { names: ["snack", "lunch", "dinner"], line: () => "Planning the menu already?" },
  { names: ["hero", "adventurer"], line: () => "The best disguise yet." },
  // Nods to the game
  { names: ["elder"], line: () => "Ambitious. The Elder Mimic may have something to say about that." },
  { names: ["captain"], line: () => "The captain never abandons ship. Neither, it seems, do you." },
  { names: ["gargoyle"], line: () => "Wrong monster. Though in time, you might pass for one." },
  { names: ["thimble"], line: () => "Shrinking already? You'll want some Thimblewood for that." },
  { names: ["pandora"], line: () => "Some boxes should stay closed." },
  { names: ["luggage"], line: () => "It has hundreds of little legs, and it will follow you anywhere." },
  { names: ["wardrobe"], line: () => "Is that a forest in there?" },
  { names: ["spare oom", "spareoom", "sparoom", "spare um", "spareum", "sparum"], line: () => "Definitely not in Narnia." },
  { names: ["devil", "diablo", "diable", "diavolo", "diavola"], line: () => "You're in disguise all right. But I think Elvis may be on to you..." },
];

/** A remark on the mimic's name — or null for an unremarkable name. */
export function nameFlavor(rawName: string): string | null {
  const name = rawName.trim().replace(/\s+/g, " ");
  const key = name.toLowerCase();
  return NAME_REMARKS.find(r => r.names.includes(key))?.line(name) ?? null;
}

/** Devouring the Elder Mimic with the Missing Porter's Sister in the hunt: what became of her brother. */
export const PORTER_SISTER = "Missing Porter's Sister";
export const PORTER_TOKEN_LINE = "Deep inside the Elder, something small and tin: a porter's token.";

/** A conversion at the Reliquary with the Doubting Scholar in the party. */
export const DOUBTING_SCHOLAR = "Doubting Scholar";
export const SCHOLAR_NOTES_LINE = "The Doubting Scholar's notes are found later, the last page reading only: it was real.";

/** Any small creature that's a cat (Cat, Estate Cat, Temple Cat, Ship's Cat, Giant's Cat…). */
export function isCat(creature: { name: string }): boolean {
  return /\bCat$/.test(creature.name);
}
/** Emoji for small creatures, matched on a word in the name. The first match wins. */
const CREATURE_EMOJI: readonly [RegExp, string][] = [
  [/\bZombie Cat\b/, "🐈‍⬛"],
  [/\bCat\b/, "🐈"],
  [/\bMouse\b/, "🐁"],
  [/\bRat\b/, "🐀"],
  [/\bBat\b/, "🦇"],
  [/\b(Crow|Gull|Parrot|Pigeon|Archaeopteryx)\b/, "🐦"],
  [/\bMonkey\b/, "🐒"],
  [/\bDove\b/, "🕊️"],
  [/\bEagle\b/, "🦅"],
  [/\bGosling\b/, "🪿"],
  [/\bBeetle\b/, "🪲"],
  [/\bSpider\b/, "🕷️"],
  [/\b(Eel|Adder|Snake)\b/, "🐍"],
  [/\bWill-o'-Wisp\b/, "🔥"],
  [/\bSprite\b/, "🧚"],
  [/\bSkeleton\b/, "💀"],
  [/\bZombie\b/, "🧟"],
  [/\bHand\b/, "✋"],
  [/\b(Imp|Familiar)\b/, "😈"],
  [/\bHomunculus\b/, "🧸"],
  [/\bShade\b/, "👻"],
  [/\b(Hound|Dog)\b/, "🐕"],
  [/\bBoar\b/, "🐗"],
  [/\bFox\b/, "🦊"],
  [/\bFrog\b/, "🐸"],
  [/\b(Rabbit|Hare)\b/, "🐇"],
  [/\bReindeer\b/, "🦌"],
  [/\bOwl\b/, "🦉"],
  [/\bHedgehog\b/, "🦔"],
  [/\bGoose\b/, "🪿"],
  [/\bToad\b/, "🐸"],
  [/\bPig\b/, "🐖"],
  [/\bSquirrel\b/, "🐿️"],
  [/\bMoth\b/, "🦋"],
  [/\bOtter\b/, "🦦"],
  [/\b(Weasel|Ermine)\b/, "🦡"], // no weasel emoji; the badger is family
  [/\bCrab\b/, "🦀"],
  [/\bLamb\b/, "🐑"],
  [/\b(Warhorse|Horse)\b/, "🐎"],
  [/\bLizard\b/, "🦎"],
  [/\bCompsognathus\b/, "🦖"],
  [/\bSeal\b/, "🦭"],
  [/\bBookworm\b/, "🪱"],
  [/\bElemental\b/, "🌩️"],
];
/** Fallback when no word in the name matches. */
export const CREATURE_EMOJI_FALLBACK = "🐾";

/** The emoji shown for a small creature in the hunt. */
export function creatureEmoji(name: string): string {
  return CREATURE_EMOJI.find(([pattern]) => pattern.test(name))?.[1] ?? CREATURE_EMOJI_FALLBACK;
}

/** Shown once per cat per hunt when one is in the mimic's room. Nobody listens to the cat. */
export const CAT_KNOWS_LINE = "The cat stares directly at you. It knows.";

/** Consecutive Waits with nobody entering the mimic's room before it's taken for furniture. */
export const STILLNESS_TURNS = 15;
export const STILLNESS_LINE = "You've held still so long that a spider has strung a web across you.";

/** How often an adventurer entering the mimic's room acts out one of its quirks in the log. */
export const QUIRK_LINE_CHANCE = 0.3;

/** The adventurer's applied quirk, filled in for this form — or null if it has none or the roll misses. */
export function quirkLine(
  adventurer: Pick<PartyMember, "name" | "appliedQuirk">, formName: string, random: () => number = Math.random,
): string | null {
  if (!adventurer.appliedQuirk || random() >= QUIRK_LINE_CHANCE) return null;
  return adventurer.appliedQuirk.replaceAll("{name}", adventurer.name).replaceAll("{form}", formName);
}
