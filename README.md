# Mansions & Mimics

A text-based RPG where you play the mimic. Built with React, Vite and Tailwind.

## Running locally

Prerequisites: Node.js 18+.

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Data storage

There is no backend yet. All game data goes through `src/api/db.js`, which currently
saves records to the browser's `localStorage` (key `mm_entity_MimicCharacter`).
Clearing site data in the browser resets all saved characters.

The character schema is defined with zod in `src/api/schemas/mimicCharacter.js`, the
single source of truth for the record's shape. Every create, update and read is validated
against it, and missing fields are filled with defaults so older saves keep loading.
If you need JSON Schema (e.g. for database tooling), generate it with
`z.toJSONSchema(MimicCharacterSchema)`.

To move to a real database, swap the storage adapter in
`src/api/db.js` (or make the entity methods call your API). The pages only use
`db.entities.MimicCharacter.{list, filter, get, create, update, delete}`, so they won't
need changes.
