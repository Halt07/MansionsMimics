# Optimizations

Improvements to the code itself (refactors, splitting large files, test coverage, cleanup), as opposed to new features. Items are worked through one at a time and removed once done. Ideas for the game, or for code changes that may never be needed, go in IDEAS.md; deliberate choices that shouldn't be "fixed" go in DECISIONS.md.

From the final review (each checked against the code), most important first.

## Accessibility

1. **The character sheet overlay isn't a dialog:** no `role="dialog"`/`aria-modal`, focus doesn't move into it, Tab reaches controls behind it, and Escape doesn't close it.
2. **The event log isn't announced** (no `role="log"`/`aria-live`), so screen-reader players hear nothing each turn.
3. **Selection shown by colour only:** FormSelector's form cards (disabled ones are still focusable, with no unavailable state), the AppearanceEditor's traits (materials only have `aria-disabled`), CharacterCreation's materials and traits, and the Codex section buttons (which one is open). `aria-pressed`/`aria-current` cover these.
4. **CharacterCreation's name field has no label,** only a placeholder.

## Robustness

5. **Old saves can vanish if a form id is renamed or a field removed:** the schema (`src/api/schemas/mimicCharacter.ts`) rejects unknown fields and form ids, so `list()` skips the character (with only a console warning) and `update()` throws. Nothing is affected today.
6. **`db` `limit` of 0 returns everything** (a falsy check). No caller passes 0.

## Docs

7. **README is out of date:** it says Node 18+ (Vite 8 and jsdom 31 need Node 22 or newer); its module list predates splitting gameData.ts (missing behaviors, easterEggs, forms, hunt, lure, movement, strike, text, turns); its test table lists 23 of about 60 test files, and the test signature leaves out `load`; and it says a misspelled room name is a compile error, though some room-name fields are plain strings (they're checked by tests instead).

## Cleanup

8. **Six versions of "still in the hunt":** `stillInHunt` (hunt.ts), `stillHunting` (strike.ts), `isStillHunting` (events.ts), `isActive` (behaviors.ts, which doesn't check `isDisappeared`), and inline copies in `canStrike` and `relocate`. One shared helper.
9. **Biased shuffles:** `sort(() => random() - 0.5)` in `dressParty`, `placeProcession`, `generateParty`, the stealth flaw draw and `rollLearning`. `placeRivals` already uses a proper (Fisher–Yates) shuffle; share it.
10. **Soulglass sensing is written twice** (`beginHunt` and `changeAppearance`, worded slightly differently), and `changeAppearance` uses `today()` instead of the turn's `now`.
11. **Unused:** `ALL_MATERIALS_FLAT` (mimicData.ts, duplicates `ALL_MATERIALS`), `eslint-plugin-react-refresh` (not in the eslint config), `@types/node` (not used by src). `tailwindcss-animate` belongs in devDependencies.
12. **eslint config:** `src/lib/**` is ignored as "vendored" but is now hand-written app code; the `cmdk-input-wrapper` and `toast-close` exceptions are leftovers.
13. **Git:** `package-lock.json` is git-ignored while the generated `tsconfig.tsbuildinfo` is tracked. Commit the lockfile (reproducible installs) and ignore the build info.
14. **Small dead branches in Game.tsx:** `else if (phase === "evolve")` in `handleEvolution` (always true there) and the `character ? … : "Codex"` check on the Codex link (always true). `strike()` also resets the spiderweb count before checking there's anything to strike.

## To decide

15. **The Lantern Festival window is fixed at Jan 20 – Feb 15,** which often misses the real festival (Feb 17 in 2026, Feb 20 in 2027). May be deliberate, like Springtide's fixed window; if so, record it in DECISIONS.md.
16. **`DiceRollDisplay` is unused,** but its comment says it's kept for showing rolls in the hunt later.
