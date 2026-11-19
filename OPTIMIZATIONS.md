1. More tests for the screens (medium)

- Screen tests now render components with react-dom/server inside the game's own HuntContext (tests/screen.mjs; HuntContext's huntState() builds it from a real hunt, the same way Game does). RoomMap, PartyCard, LocationBanners, LocationSelect/RoomSelect and the Codex LocationCard are covered (tests/screen*.test.mjs).
- Not yet covered: StatusPanel, HuntHeader, ActionBar, HuntPanels, EndScreens, the CharacterSheet, FormSelector and AppearanceEditor, and the rest of the Codex sections.
- Rendering without a browser can't click, so anything behind a click (an opened Codex card, the appearance editor's choices) needs either a way to render it already open or a DOM library (jsdom) to click with.

2. Move the log text out of the turns (lower)

- The hunt's log lines now live with the rules that write them: about 90 in turns.ts and 25 in hunt.ts (Game.tsx is down to a dozen, for upgrades and forms). Moving the flavor text into a narration.ts, as the hunt report already does, would separate the writing from the rules.
- Mainly worth it if a lot more text is coming.
