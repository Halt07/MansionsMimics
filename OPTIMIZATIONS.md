# Optimizations

Improvements to the code itself (refactors, splitting large files, test coverage, cleanup), as opposed to new features. Items are worked through one at a time and removed once done. Ideas for the game, or for code changes that may never be needed, go in IDEAS.md; deliberate choices that shouldn't be "fixed" go in DECISIONS.md.

From the final review and the fixes after it (each checked against the code), most important first.

## Tests and accessibility

1. **Clickable cards have very long screen-reader names.** Cards made into buttons with `asButton` (locations, rooms, origins and forms in character creation, upgrade choices) are announced with all their text as the button's name, and their headings stop counting as headings. Name each by its heading (`aria-labelledby`) and describe it with the rest (`aria-describedby`).

## Last

2. **Git:** `package-lock.json` is git-ignored while the generated `tsconfig.tsbuildinfo` is tracked. Commit the lockfile (reproducible installs) and ignore the build info.
