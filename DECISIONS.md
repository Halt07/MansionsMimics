# Decisions

Deliberate choices about how the game works. Some of them can look like gaps or bugs from
the outside; they aren't. Don't suggest "fixing" anything listed here. If a new idea runs
into one of these, mention the decision rather than proposing a change around it. Add new
entries as decisions are made, with the reason if one was given.

## Hunts

- **A hunt in progress is not saved.** Refreshing, closing the tab or leaving mid-hunt forfeits it, and that's intended: if you leave a hunt, you know what you're doing, and it wouldn't make sense to come back and find the same adventurers still waiting. The planned "Confirm New Hunt mid-hunt" dialog (IDEAS.md) is how this gets made explicit, not saving.
- **Stealth: spotted flaws only add suspicion when the check fails.** A passed check that noticed a flaw costs nothing. Something not looking quite right for a moment doesn't mean someone actually grows suspicious. (Pinned by tests/lure.test.mjs.)
- **A missed lunge costs the full penalty, even under the fireworks.** The fireworks hide a meal from onlookers, not from the one you lunged at: they saw you.
- **Starfall waits a turn after a star is claimed.** If a star fragment was lying about when the turn began, no new one falls that turn, even if it's due and someone pockets the old one mid-turn. (Pinned by tests/hunt.test.mjs.)
- **Eating a star fragment doesn't keep the party interested.** Meals reset the count of actions until the party gets bored and leaves, but swallowing a star doesn't: the mimic hasn't gone after anything living, let alone an adventurer, and with the star gone the party has one less thing to look for. (Pinned by tests/hunt.test.mjs.)
- **A rival mimic that has been found is still hungry.** Revealing it doesn't stop it hunting: anyone who walks into its room on a Wait is eaten, and so is anyone you Lure into your room while it's there with you. They never reach you. In your own room you see it happen ("The rival mimic snatched up the Bard before you could get to them."); in another room they just don't come out. (Pinned by tests/hunt.test.mjs.)

## Seasonal locations

- **Open to every tier while their holiday is on.** Nobody should miss a holiday for being too small or too big.
- **Holidays that move get a window covering every date they can fall on.** Springtide covers every possible Easter (Mar 22 – Apr 25), and the Lantern Festival every possible Lunar New Year (Jan 21 – Feb 20): the season is about the New Year itself, so it always includes it, rather than tracking the exact date each year. (Pinned by tests/holidays.test.mjs.)
- **Seasons are named for the game's world, not the real holiday.** The Lantern Festival covers Lunar New Year without being called that, just as Springtide covers Easter and Founders' Day covers Independence Day.
- **Snowbound Lodge:** warmth only changes when an adventurer _enters_ the hearth room (+1) or a cold room (−1), not for every turn spent there (which would freeze them too fast), plus the usual −1 a turn. A frozen adventurer is a cheap meal (half AP, teaches nothing), not a lost one.
- **Spell or Sweet Street:** only the mimic's house can fail to answer the door. Every other house always answers, so the procession can't rack up suspicion all the way round the loop before it reaches you.
- **Real monsters on the street are a chance, not a guarantee** (unlike, say, the Captain on the Sinking Ship).
- **The Firework Crate shares the Crate's room bonuses** (it's a seasonal variant of it), except in the Noble Estate's Armory, where it's set to nothing. The others are fine.

## Forms and magic

- **Gaps in seasonal form coverage are accepted:** Minor mimics have no Midsummer Revel or Harvest Feast form. People aren't likely to stay Minor through the whole holiday season.
- **Honeyamber doesn't track which creatures it lured.** It just makes them wander more, and toward you.

- **Guild Mark and Maker's Mark appeal to mostly different people.** Guild Mark is the trade's seal (artificers and merchants); Maker's Mark is one craftsman's name, a sign of quality the guild's stamp doesn't give (royalty, collectors, and the few makers who sign their own work). At most half of either trait's fans may also like the other; `tests/traits.test.mjs` checks it.

## Codex

- **Locations stay "???" until found:** Advanced, Giant and Adept ones until a mimic is big
  enough to hunt there, Rare ones until a mimic has hunted there, and Seasonal ones outside
  their holiday. Before that, the Codex knows only how many there are.
- **A location's map only appears once you've hunted there.** Until then it shows a fogged "mystery map".

## Room map

- **Rival mimic markers** are a crate, chest, barrel, chair, book or brick, picked at random. When a rival "wears your shape", it only copies your look if your form is one of those (or a variant of one); any other form leaves its random disguise alone, and that's fine.

## Code and dependencies

- **The unused shadcn UI components were removed on purpose** (including alert, skeleton, table and textarea). Don't re-add them speculatively; add a component back when a screen actually needs it.
