# Optimizations

Improvements to the code itself (refactors, splitting large files, test coverage, cleanup), as opposed to new features. Items are worked through one at a time and removed once done. Ideas for the game, or for code changes that may never be needed, go in IDEAS.md; deliberate choices that shouldn't be "fixed" go in DECISIONS.md.

From the final review and the fixes after it (each checked against the code), most important first.

## Structure

1. **Game.tsx is still the biggest file (about 660 lines).** Three parts would lift out as small hooks: the Devotion ceremony and its timers, the hunt's keyboard shortcuts, and what happens when a mimic is loaded (mass decay, expired seasonal forms). Easier to follow, and it may let the two React lint rules switched off "because they misread Game.tsx" (`react-hooks/purity`, `react-hooks/refs`) come back on.
2. **CharacterCreation's appearance step repeats the appearance editor's rules** (its own one-material, one-trait-per-slot toggles). Reusing `AppearanceEditor` (or its toggle logic) would keep the two from drifting apart.
3. **Modules import each other through `gameData.ts`.** Most rule files import from `./gameData`, which re-exports them, so they import each other in a circle. It works because nothing runs at load time, but a top-level call added someday would fail confusingly. Import from the specific module instead.

## Tests and accessibility

4. **Two screen tests still use the string-based text helper.** `screenRoomMap` and `screenLocationBanners` check rendered HTML through `text()`/`roomCells()` in `tests/screen.mjs`, whose guesses about spacing between inline elements kept tripping things up. Convert them to Testing Library like the rest, and drop those helpers.
5. **Clickable cards have very long screen-reader names.** Cards made into buttons with `asButton` (locations, rooms, origins and forms in character creation, upgrade choices) are announced with all their text as the button's name, and their headings stop counting as headings. Name each by its heading (`aria-labelledby`) and describe it with the rest (`aria-describedby`).
6. **The Devotion test speeds up timers itself.** The ceremony's 2-second step (`CEREMONY_STEP_MS`) is fixed inside Game.tsx, so `tests/screenDevotion.test.mjs` patches `setTimeout`. Letting the step length be passed in would make the test plainer (may fold into the Game.tsx split, item 1).

## Last

7. **Git:** `package-lock.json` is git-ignored while the generated `tsconfig.tsbuildinfo` is tracked. Commit the lockfile (reproducible installs) and ignore the build info.
