# Optimizations

Improvements to the code itself (refactors, splitting large files, test coverage, cleanup), as opposed to new features. Items are worked through one at a time and removed once done. Ideas for the game, or for code changes that may never be needed, go in IDEAS.md; deliberate choices that shouldn't be "fixed" go in DECISIONS.md.

From the final review (each checked against the code), most important first.

## Cleanup

1. **Six versions of "still in the hunt":** `stillInHunt` (hunt.ts), `stillHunting` (strike.ts), `isStillHunting` (events.ts), `isActive` (behaviors.ts, which doesn't check `isDisappeared`), and inline copies in `canStrike` and `relocate`. One shared helper.
2. **Soulglass sensing is written twice** (`beginHunt` and `changeAppearance`, worded slightly differently), and `changeAppearance` uses `today()` instead of the turn's `now`.
3. **eslint config:** `src/lib/**` is ignored as "vendored" but is now hand-written app code; the `cmdk-input-wrapper` and `toast-close` exceptions are leftovers.
4. **Git:** `package-lock.json` is git-ignored while the generated `tsconfig.tsbuildinfo` is tracked. Commit the lockfile (reproducible installs) and ignore the build info.
5. **Small dead branches in Game.tsx:** `else if (phase === "evolve")` in `handleEvolution` (always true there) and the `character ? … : "Codex"` check on the Codex link (always true). `strike()` also resets the spiderweb count before checking there's anything to strike.

## To decide

6. **The Lantern Festival window is fixed at Jan 20 – Feb 15,** which often misses the real festival (Feb 17 in 2026, Feb 20 in 2027). May be deliberate, like Springtide's fixed window; if so, record it in DECISIONS.md.
7. **`DiceRollDisplay` is unused,** but its comment says it's kept for showing rolls in the hunt later.
