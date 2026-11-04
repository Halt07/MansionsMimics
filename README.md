# Mansions & Mimics

A text-based RPG where you play the mimic. Built with React, TypeScript (strict), Vite and Tailwind.

## Running locally

Prerequisites: Node.js 18+.

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run typecheck`, `npm test`.

The game's content lives in `src/components/game/`:

| File | Contains |
|---|---|
| `vocabulary.ts` | Word lists: tiers, materials, traits, tags, senses, adventurer types |
| `mimicData.ts` | Forms, appearance limits, starting stats, tier config, magic effects, sicknesses |
| `adventurerData.ts` | Adventurer groups and templates, companions, behaviors, AP rewards, loot fallbacks |
| `locationData.ts` | Hunting grounds, rooms, local creatures, room/form modifiers |
| `gameData.ts` | The rules (dice, checks, bites, spawning, behavior reactions…). Re-exports all of the above, so the rest of the app imports from here |

Names are type-checked everywhere, so a misspelled material, trait, form, location or room is a compile error.

## Tests

`npm test` runs the checks in `tests/` against the game rules (`src/components/game/gameData.ts`)
and the data layer (`src/api/db.ts`). Source files are loaded through Vite with the app's own
config, so there is no separate build step.

```sh
npm test                 # run everything
npm test -- magic        # only files whose name contains "magic"
npm test -- --verbose    # also print each passing check and extra info
```

| File | Covers |
|---|---|
| `tests/db.test.mjs` | Saving and loading characters, schema validation, defaults, corrupt records |
| `tests/monsters.test.mjs` | Adventurer data integrity, spawn gating (tier/mass/location), AP, special behaviors |
| `tests/allure.test.mjs` | Likes/dislikes when luring, partial bites |
| `tests/magic.test.mjs` | Magic material effects and arcane residue |
| `tests/traits.test.mjs` | Forms' built-in traits and flaw data |
| `tests/forms.test.mjs` | Form availability by tier, tier penalties, one-form-above rule |
| `tests/dice.test.mjs` | Dice odds helpers and the Wait action's minimum success chance |
| `tests/suspicion.test.mjs` | Suspicion from consuming a party member in front of witnesses |
| `tests/companions.test.mjs` | Companion stats/AP wiring, per-companion overrides, Changeling familiars, Goose-Keeper geese |
| `tests/giantRealm.test.mjs` | Giant's Castle and Cloud Kingdom rosters, giant-realm creatures, Titanic Feast |
| `tests/achievements.test.mjs` | From Hatbox to Legend eligibility |
| `tests/rareLocations.test.mjs` | Rare locations opening/expiring, the Hollow Reliquary roster, Devotion and offerings |
| `tests/mimicNest.test.mjs` | Mimic Nest roster, rival placement and escapes, the Elder ending the hunt |

Each test file default-exports `async function ({ gameData, db, storage, ok, log })`; see
`tests/run.mjs` for details. Some checks are statistical (they roll dice thousands of times and
compare rates). Their margins are wide, but if one fails once, rerun before assuming a bug.

## Data storage

There is no backend yet. All game data goes through `src/api/db.ts`, which currently
saves records to the browser's `localStorage` (key `mm_entity_MimicCharacter`).
Clearing site data in the browser resets all saved characters.

The character schema is defined with zod in `src/api/schemas/mimicCharacter.ts`, the
single source of truth for the record's shape. Every create, update and read is validated
against it, and missing fields are filled with defaults so older saves keep loading.
If you need JSON Schema (e.g. for database tooling), generate it with
`z.toJSONSchema(MimicCharacterSchema)`.

To move to a real database, swap the storage adapter in
`src/api/db.ts` (or make the entity methods call your API). The pages only use
`db.entities.MimicCharacter.{list, filter, get, create, update, delete}`, so they won't
need changes.
