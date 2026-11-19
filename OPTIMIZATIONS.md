# Optimizations

Improvements to the code itself (refactors, splitting large files, test coverage, cleanup), as opposed to new features. Items are worked through one at a time and removed once done. Ideas for the game, or for code changes that may never be needed, go in IDEAS.md; deliberate choices that shouldn't be "fixed" go in DECISIONS.md.

From the final review and the fixes after it (each checked against the code), most important first.

## Cleanup

1. **The tests aren't linted.** `eslint.config.js` only covers `src/`, so `tests/` gets no rules at all (its resolved config is empty): typos, unused variables and leftover debug lines would slip through. Add a block for `tests/**/*.mjs` (Node and browser globals, the same unused-imports rules).
2. **The form limits are written in several places.** The three-form limit is a local `MAX_FORMS = 3` in `FormSelector.tsx`, a separate `.max(3)` in the save format (`mimicCharacter.ts`) and plain text elsewhere; the two starting forms are a bare `2`, written three times in `CharacterCreation.tsx`. Shared constants in `forms.ts`.

## Structure

3. **Game.tsx is still the biggest file (about 660 lines).** Three parts would lift out as small hooks: the Devotion ceremony and its timers, the hunt's keyboard shortcuts, and what happens when a mimic is loaded (mass decay, expired seasonal forms). Easier to follow, and it may let the two React lint rules switched off "because they misread Game.tsx" (`react-hooks/purity`, `react-hooks/refs`) come back on.
4. **CharacterCreation's appearance step repeats the appearance editor's rules** (its own one-material, one-trait-per-slot toggles). Reusing `AppearanceEditor` (or its toggle logic) would keep the two from drifting apart.
5. **Modules import each other through `gameData.ts`.** Most rule files import from `./gameData`, which re-exports them, so they import each other in a circle. It works because nothing runs at load time, but a top-level call added someday would fail confusingly. Import from the specific module instead.

## Tests and accessibility

6. **Two screen tests still use the string-based text helper.** `screenRoomMap` and `screenLocationBanners` check rendered HTML through `text()`/`roomCells()` in `tests/screen.mjs`, whose guesses about spacing between inline elements kept tripping things up. Convert them to Testing Library like the rest, and drop those helpers.
7. **Clickable cards have very long screen-reader names.** Cards made into buttons with `asButton` (locations, rooms, origins and forms in character creation, upgrade choices) are announced with all their text as the button's name, and their headings stop counting as headings. Name each by its heading (`aria-labelledby`) and describe it with the rest (`aria-describedby`).
8. **The Devotion test speeds up timers itself.** The ceremony's 2-second step (`CEREMONY_STEP_MS`) is fixed inside Game.tsx, so `tests/screenDevotion.test.mjs` patches `setTimeout`. Letting the step length be passed in would make the test plainer (may fold into the Game.tsx split, item 3).

## Last

9. **Git:** `package-lock.json` is git-ignored while the generated `tsconfig.tsbuildinfo` is tracked. Commit the lockfile (reproducible installs) and ignore the build info.
