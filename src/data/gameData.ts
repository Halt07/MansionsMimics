// ============================================================
// MANSIONS & MIMICS — Game rules (the front door)
// Everything in src/data, re-exported, so the app and the tests import from here. The modules
// themselves don't: each imports from the module a name lives in (so nothing imports this file
// from inside, and nothing loops back through it).
//   ./core       rooms, dice, magic materials and what a mimic knows, burns, which locations are open
//   ./forms      which forms a mimic can take (tiers, variants, seasonal forms) and their penalties
//   ./hunt       a hunt in progress (Hunt), and what every turn shares (Turn): suspicion, meals, the end of a turn
//   ./turns      each hunt action, from starting the hunt to Relocate, Lure, Strike, Wait and eating
//   ./lure       luring adventurers in, and the stealth and allure checks
//   ./strike     what happens when the mimic strikes (rivals, bites, swallowing whole), and the adhesion check
//   ./movement   where the party and the small creatures go each Wait
//   ./behaviors  how adventurers with a behavior react to what the mimic does
//   ./events     location events (rivals, the Sinking Ship, the seasonal twists)
//   ./devotion   Devotion at the Hollow Reliquary: who's ready, the offerings, the ceremony
//   ./mealPrep   setting up a hunt (the party, companions, small creatures, sickness)
//   ./stats      effective stats, mass decay, upgrades, achievements and lifetime stats
//   ./codex      what the Codex knows (adventurers met and eaten, hunting grounds found)
//   ./easterEggs name remarks, the cat that knows, the spiderweb, quirks and other flavor
//   ./huntReportData  the end-of-hunt report
//   ./text       writing names and numbers into sentences
// The data lives in ./vocabulary, ./mimicData, ./adventurerData, ./locationData, ./roomLayouts
// and ./holidays.
// ============================================================
export * from "./vocabulary";
export * from "./mimicData";
export * from "./adventurerData";
export * from "./locationData";
export * from "./roomLayouts";
export * from "./huntReportData";
export * from "./holidays";
export * from "./core";
export * from "./text";
export * from "./events";
export * from "./devotion";
export * from "./stats";
export * from "./codex";
export * from "./mealPrep";
export * from "./strike";
export * from "./lure";
export * from "./behaviors";
export * from "./easterEggs";
export * from "./movement";
export * from "./forms";
export * from "./hunt";
export * from "./turns";
