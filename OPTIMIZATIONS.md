1. Move the remaining turn logic out of Game.tsx (high value, one piece at a time)

- Game.tsx is still about 1,600 lines, with 29 useStates and 13 refs. Its biggest handlers still mix rules with logging, as resolveStrike did.
- Starting a hunt (confirmRoom, about 100 lines): bounty, rivals, party, creatures, sickness, burns, rare locations. Could become a pure startHunt(...) that returns the opening state.
- Upgrading (handleEvolution, about 80 lines): tier-ups, the stat drop, forms lost at the new size, Peak of the Apex, Hatbox to Legend. Lots of edge cases and none are tested. Could become applyUpgrade(character, choice). Suggested first.
- Lure and stealth (doAllureTurn and runStealthChecks, about 120 lines): the same treatment as resolveStrike.
- Each is self-contained, like the strike refactor, with its own tests.

2. Hold the hunt as one state object (bigger, builds on 1)

- Once the turns are pure, the hunt's ~15 separate pieces of state (party, rivals, room, suspicion, turn, star, fireworks…) could become one HuntState, with each action taking one state to the next.
- That removes the two effects that set state as a workaround (the cold, Devotion) and the risk of stale values in handlers.
- Whole turns become testable ("a Wait at the Lodge freezes the cleric"), and it makes 3 easy.

3. Save a hunt in progress (a gap more than an optimization)

- Refreshing or closing the tab mid-hunt loses the hunt, and nothing gets recorded. Same root as the "Confirm New Hunt mid-hunt" note in IDEAS.md.
- With one hunt state (2), it's a small step to save it per mimic and offer to resume it on load.

4. Tests for the screens (medium)

- All the tests cover src/data. Everything on screen (costume names in the party list, the fireworks glow, the banners) has only been checked by one-off browser scripts.
- A few render tests using react-dom/server would fit the existing test runner and lock those in.

5. Finish splitting gameData.ts (low–medium)

- Still about 1,100 lines. The stealth and allure checks, and the behavior reactions, would split cleanly into checks.ts and behaviors.ts, the same way as the events/stats/codex/mealPrep split.

6. Move the log text out of Game.tsx (lower)

- Game.tsx writes 138 log lines inline. Moving the flavor text into a narration.ts, as the hunt report already does, would separate the writing from the rules.
- Mainly worth it if a lot more text is coming.

7. Clear the npm audit warnings (a todo more than an optimization)

- npm audit reports 19 issues (13 high, 6 moderate), all in the build and lint tools: vite, @vitejs/plugin-react, tailwindcss and typescript-eslint, plus the file-matching helpers under them (picomatch, micromatch, minimatch, chokidar, fast-glob, tinyglobby…). None of it ships to players, but it's worth clearing.
- Don't just run `npm audit fix --force`: some of its suggested fixes are downgrades (vite 8 → 6.2.7, @vitejs/plugin-react 6 → 5.2.0), and the Tailwind fix is a major upgrade (3 → 4).
- The likely path: first try plain `npm audit fix` and updating vite, @vitejs/plugin-react and typescript-eslint within their current majors, then re-run the audit. Tailwind 4 is a real migration (its config moves into CSS), so it's best treated as its own task, with a visual check of every screen afterwards.

Suggested order: 1, piece by piece (upgrading first), which leads into 2 and 3.
