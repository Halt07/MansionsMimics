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

- **Magic users, for the Tear in Time, are the Wizard and Fey types, plus the Tiefling Hexblade** (`isMagicUser` in `src/data/stats.ts`). That's the Arcane Scholar, Hedge Witch, Elven Arcanist, Grand Arcanist, Pact-Bound Warlock, Doubting Scholar and Astronomer; the Fey Changeling and Swamp Hag; and the Hexblade, whose pact magic is a warlock's in all but name. Other casters (the Draconic Bounty Hunter, Giant-Blood Shaman, Pilgrim Elder) don't count. It gives the types a real use: a new caster that should count is made a Wizard or Fey, and only a clear case like the Hexblade is named as an exception.
- **When a branch tier is taken:** Sovereign only by growing to 100 mass (mass only goes up in play, so the player is always there to see it); Eternal only when the mimic is opened, since its 45 days pass while the player is away. So the two can't come due together (short of editing the save). Primordial is never taken automatically: the mimic has to hunt through the Tear in Time. A mimic already past 100 mass from before Sovereign existed becomes Sovereign on its next growth, not when opened.
- **The branch locations' adventurers don't count toward Connoisseur or Master of Disguise,** and teach only what can be learned elsewhere: only one branch can ever meet them, so counting them would make those achievements branch-only. In the Codex, the hidden adventurers are listed one by one as they're met (no "???" for the rest), so the Time Caster stays a surprise.
- **Branch forms belong to their branch.** Offered only to a mimic on it (the Colossus to all three), kept out of the Codex for anyone else, and lost along with Sovereign by a Sovereign that shrinks below 100 (the decay notice says so). A Primordial mimic keeps its forms wherever it hunts; only the Tear in Time has room modifiers for them so far.
- **The Cave isn't a room-shaped form:** two caves in a jungle aren't suspicious, so wearing it at the Tear in Time (which has a Cave Mouth) doesn't draw the duplicate-room suspicion that a second chapel or tower would.
- **The eruption at the Tear in Time:** half of hunts there, once at most, on a turn rolled when the hunt starts, with a warning only the turn before (otherwise it's a surprise). Anyone on the Smoking Slopes is killed, nothing left to eat; anyone in the rooms next to it is roasted, a cheap meal like the Lodge's frozen ones. A mimic caught in it (not wearing the Volcano, which is immune) loses 1 mass one time in four, otherwise 2–3 stat points spread at random; the loss is permanent, like the strain of a tier-up, and nothing goes below 1.
- **The tar pits at the Tear in Time:** an adventurer who ends a turn in the Tar Pits has a 35% chance of getting stuck. Stuck, they can't move, can't be drawn into another room, and a Strike on them always holds; a mimic in the Tar Pits can Strike them without luring them first. After 3 turns stuck they sink, with nothing left to eat. The mimic never sticks.
- **The Old Academy's roster is magic users only:** any magic user not tied to another location (so not the fey or the Time Caster), plus the Astronomer and the Doubting Scholar, who also visit, and its own Academy Dropout. The Dropout is a Commoner on purpose: eating them doesn't count toward the Tear in Time. Pact companions (the Warlock's imp) still come along, and don't count either.
- **The Hollow Court's siege has no cap on how many crusaders can be in the court at once:** a cap would let a mimic wait out the waves and face only so many in all.
- **The siege's pressure is +1 suspicion a wave, and resting still works at the Hollow Court.** No-rest would make the siege unwinnable (a few meals would put a mimic near 9 with no way back down before the last waves), and +2 a wave, or a Champion who won't engage while their escort is near, would punish a mimic that's actually hunting (and the Champion's rally keeps pulling the escort back to them anyway). If idling through the waves proves too easy, see IDEAS.md.
- **The breach comes before the wave on turn 10,** so that wave already comes in through a broken wall. Only a moat with a living Serpent breaks through, once per hunt.
- **A Relocate can slip into, or out of, a moat with a Moat Serpent in it** (at the usual +1 suspicion): down in the murky water it never notices, so it doesn't count as someone in the room and doesn't get a stealth check on the mimic arriving. Anyone else in the moat still counts. Otherwise a Serpent would be out of reach (it can't be lured out of its moat).
- **The Gargoyle "never leaves its perch", yet a Lure can draw it off.** That's intended: it stays put on its own (Waits, scents), and it takes a Lure to move it. Unlike a Moat Serpent, it still counts when relocating, and its stone watch still notices moves nearby.
- **The Siege Champion is unshakeable:** never lured, but reachable by a Strike whenever they're in the mimic's room; a miss makes them rally everyone in the rooms next door into theirs.
- **The Long After is the Hollow Court, renamed by time.** The two share one floor plan room for room. In the Long After the Gatehouse is the Toppled Arch, the Courtyard the Jungle Camp, the Great Hall the Old Hall and the Shrine the Derelict Shrine; the Treasury, Royal Chambers, Throne Hall and Barracks keep their names. The differing names aren't an inconsistency to tidy up: the shared layout, and which names survive, are what carry the lore.
- **What the dig lets out:** opening the Treasury wakes a small mimic 40% of the time (out in the open, there to be eaten: 6 AP, and it counts toward Cannibal); any other room lets out one of the ruins' creatures 60% of the time. Rival mimics don't otherwise come to branch grounds; this one was there all along.
- **The Long After's dig:** its sealed rooms aren't part of the hunt until they open (the hunt's location is a view of the place without them), so nobody starts, wanders or is lured into them; the map shows them as buried or overgrown, unnamed. The Curator's luck: an extra die against a Strike, and a miss goes unnoticed (+1 suspicion for the commotion instead of 4, no bolting; they just lose interest).
- **Hunting at the Tear in Time is the choice to become Primordial.** Its card says so ("step through and you become Primordial. The other paths close behind you"); there's no separate confirmation.
- **The branch tiers beyond Apex (Eternal, Primordial, Sovereign) stay hidden until a mimic reaches one.** They're a reward for players who keep going, so they're kept in their own list, apart from `TIER_ORDER`, and the Codex's tier list, the achievement list and the upgrade screen don't mention them beforehand. Their absence isn't a missing entry. Once one is reached, the Codex may show it, with a teaser that there's more out there. (See "Beyond Apex" in IDEAS.md.)

## Room map

- **Rival mimic markers** are a crate, chest, barrel, chair, book or brick, picked at random. When a rival "wears your shape", it only copies your look if your form is one of those (or a variant of one); any other form leaves its random disguise alone, and that's fine.

## Code and dependencies

- **The unused shadcn UI components were removed on purpose** (including alert, skeleton, table and textarea). Don't re-add them speculatively; add a component back when a screen actually needs it.
