// Small helpers for writing names and numbers into sentences.

/**
 * "the Abandoned Manor", "the Warrior": a name with "the" in front, unless it already has its
 * own ("The Sinking Ship", "The Princess"), which just reads "the Sinking Ship", "the Princess".
 * Pass caps for the start of a sentence: "The Warrior", "The Princess".
 */
export function the(name: string, caps = false): string {
  const s = /^the\s/i.test(name) ? name.replace(/^The/, "the") : `the ${name}`;
  return caps ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Whichever form `n` needs: `singular` for exactly 1, otherwise `pluralForm` (by default the
 * singular plus "s"). Only the word comes back, so the number can go wherever the sentence wants
 * it: `${n} ${plural(n, "hunt")}`, or plural(n, "One more turn", "Two more turns").
 */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return n === 1 ? singular : pluralForm;
}
