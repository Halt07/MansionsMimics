# Ideas

A running list of things that could make Mansions & Mimics more fun. Nothing here is committed to.

## Features

- **Trophy room / hoard.** Keep the special things you swallow (the Captain's strongbox, the porter's token, the Doubting Scholar's notes, biggest meals) as objects you can look at on the character sheet or Home, so easter eggs leave a souvenir behind.
- **Mass and AP progress on Home.** Show them on each mimic's card, not just PL/AD/PA.
- **Seeded daily hunt.** Everyone gets the same location and party that day, which gives a reason to come back.
- **Search and filter the hunting grounds.** The list keeps growing (there's already a hide button for grounds you aren't interested in). A search field, or filter chips, to narrow it to the grounds where certain adventurers can turn up: by type (Wizard, to work toward the Tear in Time; Giant-kin; Undead), by a specific adventurer (the Tiefling Hexblade, the Ship's Captain), or by what they might bring (a companion, a familiar). Needs the list of who can turn up at each ground for the mimic's size (see isTemplateEligible), and it should only filter by adventurers the mimic has met, so it doesn't give away the Codex's secrets.
- **Should "every X" achievements stick once earned?** Connoisseur (every adventurer eaten), Master of Disguise (every material and trait), Curiosity Cabinet (every variant), For All Seasons and Seasoned Traveler are worked out from what the mimic has done, not saved when earned, so new content (an adventurer, trait, variant, holiday or seasonal location) takes them away until the mimic catches up. Fine while there are no outside players; before there are, decide between keeping that (new content gives veterans something to chase) and saving them once earned, the way Peak of the Apex is.

## Difficulty

- **Veterans at the Apex grounds.** If Apex hunting still feels easy, give the ordinary adventurers at Apex-only grounds (the Border Guardhouse, Ruined City Quarter, Abandoned Castle, Lonely Moor) +1 Discipline: only seasoned travelers make it that far out. A location setting (say `veterans: 1`) applied when the party is drawn, so other grounds could use it too. Simulated: with the third elite slot already in, it takes the average resist from about 4.1 to 4.5 dice (a 6-Adhesion mimic landing about 81% of Strikes, down from 84%). The Codex would want to say so, since it shows each adventurer's own Discipline.

## New hunting grounds for the middle tiers

Minor, Lesser, Standard and Greater mimics all hunted the same five starter grounds (the Abandoned Manor, Wizard's Tower, Haunted Roadside Inn, Cursed Chapel and Noble Estate); nothing new opens until Grand, which jumps to nine. New grounds at Standard and Greater would fill that gap, and show new players early that there's much more out there to find.

- **The Old Academy (Greater).** _Built._ A school of magic around a cloister (a 3×3 grid, the courtyard in the middle). Everyone who turns up is a magic user (toward the Tear in Time), drawn from the magic users who don't belong elsewhere, plus the visiting Astronomer and the Doubting Scholar; the one exception is its own **Academy Dropout**, a Commoner who tried very hard to be a wizard. Owls, library mice, lab rats, bookworms and a stray familiar.
- **The Deep Mine (Standard).** Miners, a foreman, ore carts, a dwarf or two; dark tunnels, so sight-based adventurers notice less; Earthy, Reinforced and Iron-Banded matter. **Its twist: a strike.** Every so often a miner hits a vein, and everyone nearby rushes over (like the falling stars drawing the party).
- **Other mid-tier ideas:** a Travelling Menagerie (wagons, cages, escaped animals, a ringmaster), a Hunting Lodge (rangers and trophy hunters; the Antler Chandelier belongs here).

## More for Briny

Briny is the thinnest scent (3 adventurers drawn, 1 put off), and it only matters where there's water.

- **A moat at The Hollow Court** (Sovereign's ground), with a water beast in it that likes Briny.
- **A sunken city as a rare location** (rather than as Eternal's ground, which is leaning toward The Long After). Its adventurers are the ones who can get down there: merfolk, fish-men, divers in diving suits or bells. **Its twist: currents.** Every so often a current sweeps through and pushes everything in a room (small creatures, adventurers, and the mimic itself) into another room, sometimes as far as two rooms away. Like the falling stars, a warning a turn ahead (the water starts to pull) would let the player brace or use it.
- Lonmouth (above) is the main fix.

## Twists for future locations

Ideas for a location's twist (like the Lodge's cold or the Fair's fireworks), not yet tied to a place. Better suited to a rare, branch or seasonal location than an ordinary one.

- **A room that comes and goes.** A ship comes in to dock: for a few turns it's a room you can move into (with whoever is aboard), then it casts off and the room is gone. A mimic aboard when it leaves sails away with it, and the hunt is over. A gamble: a few turns of fresh prey, against getting carried off before you've eaten.
- **New arrivals.** Every N turns a ship (or coach, or caravan) arrives with more adventurers or commoners, so the hunt can run longer than usual because people keep coming. Needs a cap on the number of arrivals in a hunt, and on how many people can be there at once (new ones wait until there's room).
- **The tide.** Every few turns the water rises and floods the lower rooms: anyone there has to move up or be swept out, and a mimic waiting in one is underwater until it ebbs. Would suit a coastal rare location, a sea cave, or the Hollow Court's moat.

## Beyond Apex: Eternal, Primordial or Sovereign

A hidden tier for players who keep going after the Peak of the Apex (mass 40). Today an Apex mimic can keep growing forever (120 AP per +2 mass) with nothing more to earn; this gives that grind somewhere to go.

- **Branch tiers, kept in their own list** apart from `TIER_ORDER` (Minor to Apex). That keeps them out of the Codex's tier list and lets every Apex rule keep working for a branch mimic. Once a mimic has reached one, the Codex can show it with a teaser beside it, something like "What else don't you know?"
- **A fork, not a rung.** A mimic becomes **Eternal**, **Primordial** or **Sovereign**, one at a time. Whichever it qualifies for first locks out the others (the one exception is a fallen Sovereign, below), which gives devoted players a reason to raise more mimics to see the other paths.
- **Eternal: the mimic that never ends.** Earned by endurance: 45 days without losing mass to decay (in practice, feeding at least every 3 days). Its reward (built): mass decay comes four times slower, 1 mass every 12 days unfed instead of every 3 (`ETERNAL_MASS_DECAY_DAYS`).
- **Primordial: the original horror.** A choice rather than something that just happens. The Tear in Time appears among its hunting grounds once the mimic has (1) eaten 50 magic users while wearing a time form (the Hourglass, the Midnight Orb, the Grandfather Clock or the Clocktower), and (2) reached 50 mass at Apex (`TIME_TEAR_MAGIC_USERS`, `TIME_TEAR_MASS`). The count can be met at any tier, often long before the mass, and needs its own saved counter. Eating magic users alone would be too easy, since most players eat everyone they can. It becomes Primordial only when it goes through to hunt there, with flavor text about being the very first mimic in history. Until then it can ignore the Tear and take another path, which closes the Tear for good. Its reward beyond the location is still open; something about appetite would mirror Eternal's.
- **Sovereign: the mimic that is the building.** Earned by reaching 100 mass, which gives Apex's "26–99" mass range in the Codex its meaning: 99 is the last Apex mass. The only tier that can be lost: if mass decay takes a Sovereign below 100, it devolves back to Apex, and has to grow back to reclaim it. Devolving shows as a line on the "welcome back" mass-decay notice, about the mimic losing its standing as Ruler of All Mimics. (Eternal, the decay-proof path, is the opposite trade-off.)
- **A fallen Sovereign may take another path.** Back at Apex, it can still become Eternal or Primordial, and keeps the Sovereign achievement if it does. But taking one closes Sovereign for good: it can't grow back to it. Until it takes one, it can still grow back to Sovereign.
- **Each branch gets its own content:** one hunting ground, with adventurers found nowhere else, and up to 4 forms (no more). The forms matter more than usual: the branch's hunting ground is somewhere most Apex forms don't belong (a roadside inn in a prehistoric jungle makes no sense), so they're what the mimic actually wears there. One form, the Colossus, is shared across the branches.
- **Year-round time forms** (added): the Hourglass and Midnight Orb are seasonal, so the Grandfather Clock (Greater) and the Clocktower (an Apex variant of the Watchtower, unlocked by Brass or the Maker's Mark) let the Tear be worked toward in any season. An Apex mimic can wear the Clocktower, or the Grandfather Clock through Thimblewood.
- **Primordial's hunting ground: the Tear in Time.** A rip in space and time opens onto a prehistoric world, with dinosaurs, mammoths and cave-dwelling hunters. Now and then an ordinary adventurer who stumbled through the same tear turns up too, badly out of place. Far rarer still is the one who opened the tear in the first place: the Time Caster, a time wizard or warlock stranded (or exploring) on the far side of their own spell. The mimic quite literally becomes the first mimic ever to exist on the planet.
- **Primordial's forms (all four):** a **Volcano** (at 50+ mass, a mountain is a fair size for a mimic), the shared **Colossus**, a **T. rex carcass** (a feast for scavengers and hunters, so it lures by being meat) and a **Cave** (shelter for the cave-dwellers).
- **Eternal's hunting ground: The Long After.** _Built._ The Hollow Court (Sovereign's), thousands of years on: half buried, half swallowed by jungle, with the same plan, room for room. Four rooms are renamed for what's left of them (the Gatehouse is the Toppled Arch, the Courtyard the Jungle Camp, the Great Hall the Old Hall, the Shrine the Derelict Shrine); the Treasury, Royal Chambers, Throne Hall and Barracks keep their names. The matching layout and the names that survive are what tell the story: a player who has ruled the Hollow Court will recognize it. Primordial makes you the first mimic; Eternal, the last. Four rooms open at the start; every 4 turns the dig opens another: the Great Hall (vines cut back), then the Treasury and Royal Chambers in either order (dug out), the Throne Hall last (vines). Its own seven: the Archaeologist, Relic-Digger, Scavenger, Lorekeeper, Tomb Automaton, Jungle Guide, and rarely (1 hunt in 12) **the Curator**, absurdly lucky (an extra die, and never notices a miss), who leaves once the Throne Hall opens; eating them first is **Closing Time**. Opening a room lets something out: a creature (60%), or in the Treasury a small mimic, dormant since the court fell (40%). Age is the disguise: they all like something old and distrust anything new-looking. The end-of-hunt report is a museum placard in the Long After Gallery (by then the whole hunt is an exhibit), noting if the Curator never came back. Still to come: its own forms (Sarcophagus, Monolith, Sealed Vault, with the Colossus).
- **Sovereign's hunting ground: The Hollow Court.** _Built so far:_ the place (`hollow_court`) on the Long After's plan room for room, plus a moat either side of the Gatehouse (long since silted up in the Long After); its gold-and-purple card; and the crusade. Its own eight: the Crusader Knight, Dragon-Slayer, Crusade Archmage, Royal Sapper, Mimic-Slayer, Herald (the easy meal), the **Moat Serpents** (1 or 2 from the start, never in the same moat, never leaving it, fond of Briny) and **the Siege Champion**. **The siege:** a wave every 5 turns, 5 in all, 2–3 crusaders each through the Gatehouse; the last is the Champion and four more; the hunt isn't cleared while waves are still to come. **The Champion:** 7 dice, unshakeable (can't be lured, but can be Struck in your room without luring), and a miss rallies everyone next door into their room. Eating them is **Long Live the King**. Still to come:
  - **Minions:** with each wave, one mimic of your own arrives, and you place it: never in the Gatehouse, Courtyard or Great Hall (the choke points), one to a room. It can't lure or move; it eats up to 2 who wander in (you get half the AP), and then the crusaders find and destroy it (a log line). You can't eat your own minions.
  - **The breach:** 10 turns in, a Moat Serpent batters through the wall next to its moat (Western Moat to the Barracks, Eastern Moat to the Shrine), only where there's a Serpent. Eating the Serpent first stops it. After a breach, each wave brings 2–3 more, some through the broken wall. Whether more Serpents come with later waves: undecided. No cap on how many can be in the court at once (a cap would let you wait out the waves).
  - **If waiting out the siege proves too easy:** each wave already adds +1 suspicion, but Waits can rest it away, so a mimic could idle through every wave and take one or two cheap shots at the Champion. The fix to try first: wave suspicion can't be waited off (suspicion never drops below the number of waves that have arrived). Raising each wave to +2 would punish a mimic that's actually hunting too much.
  - The courtiers, the forms (Citadel, Palace, Throne Hall) and the report.
- **The shared form: the Colossus,** described differently in each branch: a primeval idol (Primordial), an ancient ruin's forgotten guardian (Eternal), a monument to the Mimic King (Sovereign).
- **Two hidden achievements per branch**, absent from the achievement list until earned:
  - one for reaching the tier. Sovereign's is **Ruler of All Mimics**, so the devolving line on the welcome-back notice echoes it; the achievement stays earned after devolving, like the others;
  - one more for each: eating the Time Caster for Primordial; Eternal's and Sovereign's are still to be decided.
- **Built so far:** the branch tiers (`BRANCH_TIERS`, saved as `branchTier`, shown in place of Apex on Home, the character sheet and the game page); taking and losing them (`sovereignOnGrowth`, `branchOnOpening`, `tearInTimeOpen`, `becomePrimordial` in `src/data/stats.ts`), with Sovereign remembered in `sovereignReached`; and the hidden achievements Eternal, Primordial and Ruler of All Mimics (`hidden: true`, listed only once earned; see `achievementsShown`). The Tear in Time (`tear_in_time`): its roster of six plus the rare Time Caster, lost strays, room modifiers against anything built by later hands, becoming Primordial on the first hunt there, A Stitch in Time, and its torn blue card (`.tear-card`). Primordial's four forms (Colossus, Volcano, T. Rex Carcass, Cave; `branches` on the form, with the Colossus told per branch through `branchDescriptions` and `formDescription`). Room modifiers for them at the Tear, and a few elsewhere (the Cave in open wild places, the Volcano plainly wrong at the crossroads, a castle courtyard and the Cloud Kingdom's landing, the Colossus among ruins). The eruption (see DECISIONS.md). The end-of-hunt report there is a cracked stone tablet in cave-speak, sooty after an eruption (a singed hide/pelt was the other idea, if the tablet ever wants a sibling). The tar pits (see DECISIONS.md). Not yet: Eternal's and Sovereign's own forms and locations, Eternal's and Sovereign's second achievements, Eternal's slower decay, and the branches' locations and forms (so nothing can become Primordial yet).
- **Already tracked** (in the save, from now on, so mimics are on their way before the tiers exist): `timeTearCounter` (magic users eaten in a time form) and `decayFreeDate` (when the current stretch without decay began), with `TIME_FORMS` and `ETERNAL_DECAY_FREE_DAYS` in `src/data/stats.ts`.
- **Open questions:**
  - Eternal's and Sovereign's other forms (up to 3 each besides the Colossus).

## Seasonal locations

Like the Snowbound Lodge: open to every tier while their holiday is in season, each with its own twist. Drafted so far: the Snowbound Lodge (Midwinter), Stargazers' Hill (Night of Falling Stars) the Founders' Fair (Founders' Day) and Spell or Sweet Street (All Hallows' Eve).

### Year's Turning ⏳

- **The Old Year's Wake.** A village hall where the old year is burned in effigy at midnight. Every few turns the revelers grab something to throw on the bonfire, and wooden or decorative forms are first in line, so you may have to move before they reach you.
- **The Clocktower at Midnight.** A countdown to the stroke of twelve. When the bells ring, every head turns to the clock face: one free turn where a Strike has no witnesses, if you're in place when it comes.

### Lantern Festival 🏮

- **Lantern River Market.** Floating lanterns drift past the stalls, so rooms take turns being lit and dark. Sight-based adventurers are sharp in the light and nearly blind in the dark. The Paper Lantern and Lantern Arch forms are at home here.
- **The Dragon Parade Route.** The parade winds through the rooms on a set path. Anyone in the parade's room is swept up in the crowd and distracted (lower perception), and the noise covers a Strike. The Dragon Dance Costume could join the parade.

### Springtide 🥚

- **The Egg Hunt Grounds.** The party is searching for hidden eggs, so they sweep each room in turn and handle anything egg-sized. Small forms get picked up; the Painted Egg and Egg Basket get the most attention.
- **The Hedge Maze Gardens.** The hedges are overgrown, so every few turns a path closes and another opens: the room connections change mid-hunt. Pairs with the Hedge Maze and Hedge Rabbit forms.

### Midsummer Revel ☀️

- **The Bonfire Meadow.** The shortest night of the year: dawn ends the hunt after a fixed number of turns, but the revelers are dancing and half-drunk, so perception is low all night. The Maypole and Bonfire forms fit right in.
- **Fairy Ring Glade.** The fey come out at Midsummer. Fey adventurers appear more often, and a mimic standing inside the ring is either blessed (an allure bonus) or seen straight through, at random.

### Founders' Day 🎆

- **The Founders' Fair.** _Drafted._ Fireworks go off every few turns. A Strike timed with the bangs makes no sound anyone notices (no acoustic suspicion). The Picnic Basket, Firework Crate and Parade Float forms are at home here.
- **The Town Hall Banquet.** Speeches at set times draw the whole party into one room, so you know exactly where the crowds will be, and where they won't.

### Night of Falling Stars 🌠

- **Stargazers' Hill.** _Drafted._ An observatory and its lawn. Every few turns a star fragment lands in a random room and the party rushes to it: a free Lure you can predict and ambush.
- **Starfall Crater.** A smoking meadow at night. It's dark, so sight-based adventurers struggle except during meteor flashes, which light everything up for a turn.

### Brewfest 🍺

- **Brewers' Fairground.** Tents and stalls. The opposite of the Lodge: the party gets drunker each turn, so their perception drops and the hunt gets easier, but drunks wander and brawl, moving between rooms unpredictably. The Beer Stein, Festival Keg and Beer Tent forms are at home here.
- **Abbey Brewhouse.** Monks brewing in a cloister. Fumes build up in the vat rooms and dull anyone who lingers. Slow, patient monks reward waiting.
- **The Tapped Cellar.** A tavern's under-cellar during the festival. Kegs keep getting rolled in and out, so objects come and go, and a new "barrel" turning up raises less suspicion.

### All Hallows' Eve 🎃

- **Gloaming Hall Masquerade.** A costume ball. Everything is decorated, so an odd object looks like part of the party (a plausibility bonus). The catch: guests are masked, so they show as "???" until one enters your room, and some of them are real monsters in costume.
- **Spell or Sweet Street.** _Drafted._ A village lane of eight houses in a loop (a ring around the village green), with costumed parties going door to door.
  - _The procession:_ instead of wandering, everyone walks the loop clockwise, one house per Wait, so you can see who's coming and lie in wait ahead of them.
  - _Spell or sweet:_ when they reach your house they knock and call "Spell or sweet!" Answer as a Door (or a Jack-o'-Lantern on the step) and they come right up for their sweet, ready to be struck without a Lure. Anywhere else, nobody answers, so they cast a "spell" (a prank) and take a closer look around: an extra stealth check.
  - _Costumes:_ every party member shows only as their costume (Dracula, Bugbear, Bedsheet Ghost, Pumpkin-Head, Witch, Mummy…). Their type, what lures them and their Codex entry stay hidden until you eat one: "Under the Dracula cape: a Paranoid Cleric!" Now and then the costume isn't a costume (a real Werewolf, dressed as a werewolf).
  - _The empty lot:_ one of the eight is an empty lot. A building form there (Haunted Mansion, Abandoned Cottage, Small Outhouse) gets a big bonus, since nobody questions a house appearing on All Hallows' Eve, and the procession knocks on it like any other.
  - _Small mimics:_ the Door is a Standard form, so Minor mimics can't answer the door. A Minor Halloween "Sweets Bowl" form (left on the step) would give them a way in.
- **The Hollow Hayride.** A cart route through a haunted orchard, with the rooms as stops along the way. Every few turns the cart moves the party on, so you plan where to lie in wait instead of chasing.

### Harvest Feast 🌾

- **The Granary Feast Hall.** The feast comes in courses. At each course the whole party gathers at the table, and afterwards they're slower and duller (lower discipline) for the rest of the hunt. The Harvest Feast Table and Scarecrow forms belong here.
- **The Corn Maze.** Tall, rustling rows where nobody can see more than a room away. Lures reach less far, but neither does anyone's suspicion: a disappearance goes unnoticed unless someone was in the same row.

### Midwinter 🎁

- **Snowbound Lodge.** _Drafted._ Nobody can leave, and the cold freezes them one by one.
- **Frozen Toy Workshop.**
- **The Frozen Lake Fair.** Skating and stalls on the ice. Every few turns the ice cracks and a room closes for good, so the hunting ground shrinks as the hunt goes on.

## Easter eggs

- **Eat the cat that knew.** If you eat a cat after it has stared at you (`CAT_KNOWS_LINE`), add a payoff line ("It took the secret with it").
- **Real-world dates.** A full moon or Friday the 13th could change the mood or add a modifier. A Halloween hunt could have all adventurers that enter your room while you are in the form of a door knock and say "Trick or Treat!".
- **More name remarks.** Naming your mimic after an adventurer template, or after a location ("Manor"), could get a reply.
- **A hidden page.** Something like "Field notes of the Doubting Scholar", reached by a secret input (a Konami code, or clicking something unlikely).

Not started:

- **Confirm "New Hunt" mid-hunt.** It currently leaves without asking and quietly skips recording the hunt.

## Code

- **Narration in its own file.** The hunt's log lines live with the rules that write them (about 90 in `src/data/turns.ts`, 25 in `src/data/hunt.ts`). A `narration.ts` could hold the wording instead, grouped by action (one entry per line, taking only the values it prints), the way `huntReportData.ts` holds the report text; the rules would pick which line and when. Tried once and reverted: it separates writing from rules, but each line then takes a jump to another file to read. Worth another look only if a lot more text is coming. (The `t.alert(...)` / `t.info(...)` shorthands on `Turn` came out of that try.)
