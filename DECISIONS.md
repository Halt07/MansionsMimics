# Decisions

Deliberate choices about how the game works. Some of them can look like gaps or bugs from
the outside; they aren't. Don't suggest "fixing" anything listed here. If a new idea runs
into one of these, mention the decision rather than proposing a change around it. Add new
entries as decisions are made, with the reason if one was given.

## Hunts

- **A hunt in progress is not saved.** Refreshing, closing the tab or leaving mid-hunt forfeits it, and that's intended: if you leave a hunt, you know what you're doing, and it wouldn't make sense to come back and find the same adventurers still waiting. The planned "Confirm New Hunt mid-hunt" dialog (IDEAS.md) is how this gets made explicit, not saving.
- **Stealth: spotted flaws only add suspicion when the check fails.** A passed check that noticed a flaw costs nothing. Something not looking quite right for a moment doesn't mean someone actually grows suspicious. (Pinned by tests/lure.test.mjs.)
- **A missed lunge costs the full penalty, even under the fireworks.** The fireworks hide a meal from onlookers, not from the one you lunged at: they saw you.

## Seasonal locations

- **Open to every tier while their holiday is on.** Nobody should miss a holiday for being too small or too big.
- **Snowbound Lodge:** warmth only changes when an adventurer _enters_ the hearth room (+1) or a cold room (−1), not for every turn spent there (which would freeze them too fast), plus the usual −1 a turn. A frozen adventurer is a cheap meal (half AP, teaches nothing), not a lost one.
- **Spell or Sweet Street:** only the mimic's house can fail to answer the door. Every other house always answers, so the procession can't rack up suspicion all the way round the loop before it reaches you.
- **Real monsters on the street are a chance, not a guarantee** (unlike, say, the Captain on the Sinking Ship).
- **The Firework Crate shares the Crate's room bonuses** (it's a seasonal variant of it), except in the Noble Estate's Armory, where it's set to nothing. The others are fine.

## Forms and magic

- **Gaps in seasonal form coverage are accepted:** Minor mimics have no Midsummer Revel or Harvest Feast form. People aren't likely to stay Minor through the whole holiday season.
- **Honeyamber doesn't track which creatures it lured.** It just makes them wander more, and toward you.

## Codex

- **Locations stay "???" until found:** Advanced, Giant and Adept ones until a mimic is big
  enough to hunt there, Rare ones until a mimic has hunted there, and Seasonal ones outside
  their holiday. Before that, the Codex knows only how many there are.
- **A location's map only appears once you've hunted there.** Until then it shows a fogged "mystery map".

## Room map

- **Rival mimic markers** are a crate, chest, barrel, chair, book or brick, picked at random. When a rival "wears your shape", it only copies your look if your form is one of those (or a variant of one); any other form leaves its random disguise alone, and that's fine.

## Code and dependencies

- **The unused shadcn UI components were removed on purpose** (including alert, skeleton, table and textarea). Don't re-add them speculatively; add a component back when a screen actually needs it.
