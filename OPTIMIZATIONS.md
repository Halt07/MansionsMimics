4. Party movement into gameData.ts (medium)

- doWaitTurn decides where everyone walks: random wandering, heading for a star, or the next house.
- That decision could be a pure moveParty(...) returning the moves, with the component only logging and applying them. Every location twist so far has added a branch here, so tests would pay off.

6. Break up resolveStrike (large, highest risk)

- It's about 350 lines: rival strikes, partial bites and swallowing whole are all in one function.
- Splitting it into those three parts, and moving the dice and outcome math into gameData.ts, would help most. It's also the riskiest, since it has the most edge cases (treasure, achievements, fleeing, elusive targets) and no tests today.

7. Split gameData.ts into modules (mechanical, low risk)

- At about 1,900 lines it's a grab bag. You've already started this pattern: holidays.ts and huntReportData.ts are re-exported from gameData.ts, so nothing else would have to change.
- Natural groupings: the location twists (sinking, devotion, rivals, snowbound, starfall, fireworks, door to door), achievements and stats, Codex helpers, and party and creature setup.

8. Codex.tsx (about 930 lines, mechanical)

- One component per section, and LocationCard in its own file.
