# Mansions & Mimics

A text-based RPG where you play the mimic. Built with React, TypeScript (strict), Vite and Tailwind.

## Running locally

Prerequisites: Node.js 22.22+ or 24.15+ (what Vite 8 and jsdom, used by the tests, require).

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run typecheck`, `npm test`.

## Where things are

The game's content and rules live in `src/data/`; the screens that show them are in `src/pages/`
and `src/components/game/` (the hunt's pieces in `hunt/`, the Codex's in `codex/`). The game page's
larger jobs are hooks beside them: `useLoadedMimic`, and in `hunt/`, `useDevotionCeremony` and `useHuntKeys`.

| File | Contains |
|---|---|
| `vocabulary.ts` | Word lists: tiers (and the hidden branch tiers past Apex), materials, traits, tags, senses, adventurer types |
| `mimicData.ts` | Forms (and each variant's base form), appearance limits, starting stats, tier config, magic effects, sicknesses |
| `adventurerData.ts` | Adventurer groups and templates, companions, behaviors, AP rewards, loot fallbacks; who's still in the hunt |
| `locationData.ts` | Hunting grounds, rooms, local creatures, room/form modifiers |
| `roomLayouts.ts` | Where each location's rooms sit on the hunt's floor plan (doors and stairs follow from the room graph) |
| `holidays.ts` | Holiday seasons and the dates they run |
| `gameData.ts` | The front door: re-exports everything in this folder, so the app and the tests import from here. The modules themselves import from each other directly (never through this file), so nothing loops back |
| `core.ts` | The core rules: rooms, dice and shuffling, magic materials and what a mimic knows, choosing what to wear, burns, which locations are open |
| `forms.ts` | Which forms a mimic can take: tiers and mass, the one-form-above rule, variants, seasonal forms, branch forms, form-tier penalties |
| `hunt.ts` | A hunt in progress (`Hunt`) and what every turn shares (`Turn`): suspicion and being found out, meals, the end of a turn |
| `turns.ts` | Each hunt action, from starting the hunt to Relocate, Lure, Strike, Wait, eating, and changing form or look |
| `lure.ts` | Luring, and the stealth and allure checks |
| `strike.ts` | Strikes: rival mimics, partial bites, swallowing whole, and the adhesion check |
| `movement.ts` | Where the party and the small creatures go each Wait |
| `behaviors.ts` | How adventurers with a behavior react to what the mimic does |
| `events.ts` | Location events: rival mimics, the Sinking Ship, and the seasonal locations' twists |
| `devotion.ts` | Devotion at the Hollow Reliquary: who's ready, the offerings, and the whole ceremony |
| `mealPrep.ts` | Setting up a hunt: the party, companions, small creatures, sickness |
| `stats.ts` | Effective stats, mass decay (and what's changed when a mimic is opened again), upgrades, achievements and lifetime stats; the records kept for the branch tiers beyond Apex, and the tier a mimic is shown as |
| `codex.ts` | What the Codex knows: adventurers met and eaten, hunting grounds found |
| `easterEggs.ts` | Name remarks, the cat that knows, the spiderweb, quirks and other flavor |
| `huntReportData.ts` | The end-of-hunt report (Guild notices, verses, gossip, and location-specific versions) |
| `text.ts` | Writing names and numbers into sentences (`the()`, `plural()`) |

Names are type-checked almost everywhere, so a misspelled material, trait, form, location or tier
is a compile error. A few room and location references in `locationData.ts` (snowbound rooms, the
procession's order, starfall landings, creature rooms, `alwaysIncludes`) are plain strings; the
tests check those instead.

Alongside the code:

- `DECISIONS.md`: deliberate choices about how the game works that can look like gaps or bugs. Read it before "fixing" something.
- `IDEAS.md`: things that could make the game more fun (and code ideas that may never be needed). Nothing there is committed to.
- `OPTIMIZATIONS.md`: improvements to the code itself, worked through one at a time.

## Tests

`npm test` runs the checks in `tests/`: the game rules (`src/data/`), the data layer
(`src/api/db.ts`), and the screens. Source files are loaded through Vite with the app's own config,
so there is no separate build step. Screens render with React Testing Library onto a jsdom page that
`tests/run.mjs` sets up, and are clicked through with `userEvent`.

```sh
npm test                 # run everything
npm test -- magic        # only files whose name contains "magic"
npm test -- screen       # only the screen tests
npm test -- --verbose    # also print each passing check and extra info
```

Each test file default-exports `async function ({ gameData, db, storage, load, ok, log })`; see
`tests/run.mjs` for details (`load` loads any other source module, such as a component). Screen
tests share helpers from `tests/screen.mjs`: rendering inside the game's own `HuntContext`, a test
mimic, saving mimics to an emptied database, and pinning the date for seasonal content. Some rule
checks are statistical (they roll dice thousands of times and compare rates). Their margins are
wide, but if one fails once, rerun before assuming a bug.

### Game rules and data

| File | Covers |
|---|---|
| `hunt.test.mjs` | Whole turns: each action from one hunt state to the next, found out, bored parties, the cold, fireworks, stars, rivals, bites, Devotion, magic users eaten in a time form |
| `startHunt.test.mjs` | Starting a hunt: who's there, rivals, creatures, sickness, bounties, starting suspicion |
| `parties.test.mjs` | Who's at a location when a hunt starts |
| `movement.test.mjs` | Party movement on a Wait, and the small creatures' turn |
| `lure.test.mjs` | Luring, and the stealth checks anyone coming into the mimic's room faces |
| `allure.test.mjs` | Likes and dislikes when luring, partial bites |
| `strike.test.mjs` | Strikes: who gets struck, rival mimics, partial bites, swallowing whole |
| `suspicion.test.mjs` | Suspicion from eating a party member in front of witnesses |
| `dice.test.mjs` | Dice odds helpers and the Wait action's minimum success chance |
| `stats.test.mjs` | Effective stats after mass, sickness and form-tier penalties |
| `upgrade.test.mjs` | Spending AP: growing (and tier-ups), raising a stat |
| `massDecay.test.mjs` | Mass lost while unfed, charged once; the decay-free stretch it ends |
| `burns.test.mjs` | Burned lairs and forms: starting suspicion, stacking, expiry |
| `forms.test.mjs` | Which forms a mimic can choose, tier penalties, the one-form-above rule |
| `variants.test.mjs` | Variant forms: unlocks, availability, shared burns, Curiosity Cabinet |
| `holidays.test.mjs` | Seasonal forms: offered only in season and to their tiers |
| `thimblewood.test.mjs` | Thimblewood: the shrunk form tier, form range, penalties, forms kept |
| `magic.test.mjs` | Magic material effects and arcane residue |
| `appearance.test.mjs` | Choosing what to wear in a slot: on, off, swapping, a full slot |
| `honeyamber.test.mjs` | Honeyamber drawing small creatures toward the mimic |
| `traits.test.mjs` | Forms' built-in traits and flaw data; who likes, dislikes and teaches each symbolic mark |
| `scents.test.mjs` | Scent traits: all learned, slots by tier, who reacts, allure |
| `rooms.test.mjs` | Room modifiers: per-location keys, variant overrides, only wearable forms |
| `roomLayouts.test.mjs` | Floor plans: one cell per room, doors only between connected rooms |
| `monsters.test.mjs` | Adventurer data integrity, spawn gating (tier, mass, location), AP, special behaviors |
| `companions.test.mjs` | Companion stats and AP, per-companion overrides, Changeling familiars, Goose-Keeper geese |
| `giantRealm.test.mjs` | Giant's Castle and Cloud Kingdom rosters, giant-realm creatures, Titanic Feast |
| `mimicNest.test.mjs` | Mimic Nest roster, rival placement and escapes, the Elder ending the hunt |
| `sinkingShip.test.mjs` | Sinking Ship roster, the Captain's strongbox, the sinking clock |
| `rareLocations.test.mjs` | Rare locations opening and expiring, the Hollow Reliquary and Devotion |
| `snowboundLodge.test.mjs` | The Snowbound Lodge: nobody leaves, the cold, frozen meals |
| `spellOrSweet.test.mjs` | Spell or Sweet Street: the procession, answering the door, costumes |
| `foundersFair.test.mjs` | The Founders' Fair: fireworks, the crate rummage |
| `stargazersHill.test.mjs` | Stargazers' Hill: falling stars and the party running for them |
| `tearInTime.test.mjs` | The Tear in Time: who it opens to, its roster, strays and the Time Caster, becoming Primordial, kept out of the Codex |
| `branchTiers.test.mjs` | The branch tiers past Apex: taking Eternal, Primordial or Sovereign, losing Sovereign, one branch at a time |
| `achievements.test.mjs` | Achievements and thresholds (and the hidden ones, listed only once earned), every material and trait being learnable, lifetime stats |
| `discovery.test.mjs` | Codex discovery: met and eaten, pooled across mimics |
| `codexLocations.test.mjs` | The Codex's hunting grounds: groups, and what it reveals about each |
| `huntReport.test.mjs` | The end-of-hunt report for each ending, from the hunt's own data |
| `easterEggs.test.mjs` | Name remarks, the rival wearing your shape, quirks acted out in hunts |
| `creatureEmoji.test.mjs` | Every small creature gets its own emoji in hunts |
| `text.test.mjs` | `the()` and `plural()` |
| `imports.test.mjs` | The rule modules import each other directly (never through `gameData.ts`), with no circles |
| `db.test.mjs` | Saving and loading characters, validation, defaults, names, damaged saves |

### Screens (`screen*.test.mjs`)

| File | Covers |
|---|---|
| `screenGame.test.mjs` | The whole game page, played by clicking and typing: a hunt from start to supper, the keyboard, the character sheet dialog, winning, the party leaving, mass decay |
| `screenDevotion.test.mjs` | A Devotion ceremony in the game page: offerings saved as they come |
| `screenHome.test.mjs` | The home page: your mimics, deleting one (after confirming), the hall of fame |
| `screenCharacterCreation.test.mjs` | Making a new mimic, step by step, and saving it |
| `screenCodex.test.mjs` | The Codex page: every section, whose discoveries to read, seasonal forms |
| `screenAdventurers.test.mjs` | The Codex's adventurers: what's given away before meeting, once met, once eaten |
| `screenLocationCard.test.mjs` | A hunting ground in the Codex, closed and opened |
| `screenLocationSelect.test.mjs` | Choosing where (and in which room) to hunt |
| `screenFormSelector.test.mjs` | Choosing forms: what's offered, the limits, what's handed back |
| `screenAppearanceEditor.test.mjs` | Adjusting the mimic's look: slots, the magic cap, known traits, Thimblewood |
| `screenHuntHeader.test.mjs` | The top of the hunt: who's left, lure range, bounty, sickness, its buttons |
| `screenStatusPanel.test.mjs` | The form, stats (and what's lowering them), suspicion and AP |
| `screenActionBar.test.mjs` | The four hunt actions |
| `screenHuntPanels.test.mjs` | Switching forms, relocating, meals lying about |
| `screenPartyCard.test.mjs` | The party list and room map, and switching between them |
| `screenRoomMap.test.mjs` | The room map: who's drawn where, tooltips, rooms in reach |
| `screenLocationBanners.test.mjs` | The location's status strips: rivals, sinking, door to door, fireworks, stars, the cold, restlessness |
| `screenEventLog.test.mjs` | The event log: its lines, scrolling, and being announced |
| `screenEndScreens.test.mjs` | Winning, being found out or left, and the upgrade screen |
| `screenCharacterSheet.test.mjs` | The character sheet: stats, forms, what's known and worn, the lifetime record |

## Data storage

There is no backend yet. All game data goes through `src/api/db.ts`, which currently
saves records to the browser's `localStorage` (key `mm_entity_MimicCharacter`).
Clearing site data in the browser resets all saved characters. If what's saved there can't be read,
it's kept under a backup key (`mm_entity_MimicCharacter.unreadable-<time>`) before anything new is
saved over it.

The character schema is defined with zod in `src/api/schemas/mimicCharacter.ts`, the
single source of truth for the record's shape. Every create, update and read is validated
against it, and missing fields are filled with defaults so older saves keep loading. Reading is
forgiving where writing is strict: if a save holds something the game no longer has (a field since
removed, a renamed form, a place or material taken out), that part is dropped and the console says
so, rather than the whole character being skipped.
If you need JSON Schema (e.g. for database tooling), generate it with
`z.toJSONSchema(MimicCharacterSchema)`.

To move to a real database, swap the storage adapter in
`src/api/db.ts` (or make the entity methods call your API). The pages only use
`db.entities.MimicCharacter.{list, filter, get, create, update, delete}`, so they won't
need changes.
