1. The last bits of rules left in Game.tsx (small, low)

- The big pieces are done: starting a hunt (startHunt), upgrading (applyUpgrade), the Lure and stealth checks (resolveLure, resolveStealth), strikes (strike.ts) and party movement (moveParty) are all pure and tested. Game.tsx is down to about 1,475 lines (from about 2,500), most of it applying those results and writing the log.
- What's left with any rules in it is small: Wait's Patience roll (about 12 lines in doWaitTurn), the end-of-turn steps for the Fair's crate toss and the Hill's starfall (fireworksTurn, starfallTurn, mostly calling pure helpers already), and the Devotion ceremony's sequencing (findDevotee and rollOfferings are already pure).
- Worth doing as part of 2 rather than on its own.

2. Hold the hunt as one state object (bigger)

- Game.tsx has 28 useStates and 9 refs. About 17 of the states are the hunt itself (location, party, rivals, the mimic's room, suspicion, phase, the log, small creatures, bounty, sickness, action count, hunt turn, star fragment, fireworks room, acting, ceremony running, game-over reason), plus 6 per-hunt refs (still turns, cats that stared, peak suspicion, biggest meal, report seed, hunt recorded). The rest is screen state (open panels, notices, the sheet).
- Folding the hunt into one HuntState, with each action taking one state to the next, would remove the two effects that set state as a workaround (the cold, Devotion) and the risk of handlers reading stale values. HuntContext would then just be that state.
- Whole turns become testable ("a Wait at the Lodge freezes the cleric").

3. Tests for the screens (medium)

- All 40 test files cover src/data; nothing renders a component. Everything on screen (costume names in the party list, the fireworks glow, rival disguises on the map, the banners, which locations the setup screen offers) has only been checked by one-off browser scripts.
- The screen is now in small components (src/components/game/hunt and codex), most reading HuntContext, so render tests with react-dom/server (already installed) and a test HuntContext would fit the existing runner. Good first targets: RoomMap, PartyCard, LocationBanners, LocationSelect, LocationCard.

4. Finish splitting gameData.ts (low–medium)

- Still about 1,120 lines. Natural homes for what's left:
  - The combat checks (stealthCheck, allureCheck, adhesionCheck, allure interest, AP rewards; about 200 lines) next to the code that now uses them: lure.ts and strike.ts.
  - Behavior reactions (about 155) into behaviors.ts.
  - Easter eggs (about 130) into easterEggs.ts.
  - Party and creature movement (about 155) into movement.ts.
  - Form rules (valid forms, variants, seasonal forms, form-tier penalties; about 225) into forms.ts.
- That would leave gameData.ts with rooms, dice, burns and location availability (about 180 lines), plus the re-exports, the same way as the events/stats/codex/mealPrep split.

5. Move the log text out of Game.tsx (lower)

- Game.tsx writes 134 log lines inline. Moving the flavor text into a narration.ts, as the hunt report already does, would separate the writing from the rules.
- Mainly worth it if a lot more text is coming.

Suggested order: 2 next, with 1's leftovers folded in. 3–5 can be done any time.
