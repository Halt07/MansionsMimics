1. Tests for the screens (medium)

- All 40 test files cover src/data; nothing renders a component. Everything on screen (costume names in the party list, the fireworks glow, rival disguises on the map, the banners, which locations the setup screen offers) has only been checked by one-off browser scripts.
- The screen is now in small components (src/components/game/hunt and codex), most reading HuntContext, so render tests with react-dom/server (already installed) and a test HuntContext would fit the existing runner. A real hunt to render is now one call (beginHunt, then any turns from turns.ts). Good first targets: RoomMap, PartyCard, LocationBanners, LocationSelect, LocationCard.

2. Finish splitting gameData.ts (low–medium)

- Down to about 620 lines (the combat checks now live in lure.ts and strike.ts, the action limit in hunt.ts, the behavior reactions in behaviors.ts, and the easter eggs in easterEggs.ts). Natural homes for what's left:
  - Party and creature movement (about 155) into movement.ts.
  - Form rules (valid forms, variants, seasonal forms, form-tier penalties; about 225) into forms.ts.
- That would leave gameData.ts with rooms, dice, burns and location availability (about 180 lines), plus the re-exports, the same way as the events/stats/codex/mealPrep split.

3. Move the log text out of the turns (lower)

- The hunt's log lines now live with the rules that write them: about 90 in turns.ts and 25 in hunt.ts (Game.tsx is down to a dozen, for upgrades and forms). Moving the flavor text into a narration.ts, as the hunt report already does, would separate the writing from the rules.
- Mainly worth it if a lot more text is coming.

Any order.
