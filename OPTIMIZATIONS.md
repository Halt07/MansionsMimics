6. Break up resolveStrike (large, highest risk)

- It's about 350 lines: rival strikes, partial bites and swallowing whole are all in one function.
- Splitting it into those three parts, and moving the dice and outcome math into gameData.ts, would help most. It's also the riskiest, since it has the most edge cases (treasure, achievements, fleeing, elusive targets) and no tests today.
